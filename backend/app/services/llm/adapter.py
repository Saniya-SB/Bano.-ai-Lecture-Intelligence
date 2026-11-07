from abc import ABC, abstractmethod
from typing import Any, Type, TypeVar
import json
import logging
from pydantic import BaseModel, ValidationError
import httpx
from backend.app.core.config import settings
from backend.app.core.exceptions import AppException

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class LLMResponse:
    def __init__(
        self,
        parsed: Any,
        raw_text: str,
        model_name: str,
        prompt_tokens: int,
        completion_tokens: int,
        total_tokens: int,
        estimated_cost_usd: float,
    ):
        self.parsed = parsed
        self.raw_text = raw_text
        self.model_name = model_name
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens
        self.total_tokens = total_tokens
        self.estimated_cost_usd = estimated_cost_usd


class LLMProvider(ABC):
    """
    Abstract interface for provider-independent LLM completion with structured output decoding.
    """

    @abstractmethod
    async def generate_structured(
        self,
        prompt: str,
        system_instruction: str,
        response_model: Type[T],
        model_name: str | None = None,
        temperature: float = 0.2,
    ) -> LLMResponse:
        pass

    def calculate_cost(self, model_name: str, prompt_tokens: int, completion_tokens: int) -> float:
        pricing = settings.LLM_PRICING_PER_1M.get(
            model_name,
            settings.LLM_PRICING_PER_1M.get("gemini-3.1-flash-lite", {"input": 0.25, "output": 1.50})
        )
        cost_in = (prompt_tokens / 1_000_000.0) * pricing["input"]
        cost_out = (completion_tokens / 1_000_000.0) * pricing["output"]
        return round(cost_in + cost_out, 6)


import copy


def dereference_json_schema(schema: dict) -> dict:
    """
    Recursively inlines all $ref definitions from $defs into the schema,
    removing $defs entirely. Gemini's REST API generates 400 INVALID_ARGUMENT
    when $defs and $ref are sent in response_schema.
    """
    defs = schema.get("$defs", {})

    def _resolve(node):
        if isinstance(node, dict):
            if "$ref" in node:
                ref_path = node["$ref"]
                if ref_path.startswith("#/$defs/"):
                    def_name = ref_path.split("/")[-1]
                    if def_name in defs:
                        return _resolve(copy.deepcopy(defs[def_name]))
            return {k: _resolve(v) for k, v in node.items() if k != "$defs"}
        elif isinstance(node, list):
            return [_resolve(item) for item in node]
        return node

    clean = _resolve(copy.deepcopy(schema))
    clean.pop("$defs", None)
    return clean


class GeminiProvider(LLMProvider):
    """
    Adapter for Google Gemini API via REST (ai.google.dev / Google AI Studio endpoints).
    """

    def __init__(self, api_key: str | None = None, http_client: httpx.AsyncClient | None = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.http_client = http_client or httpx.AsyncClient(timeout=120.0)
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"

    async def generate_structured(
        self,
        prompt: str,
        system_instruction: str,
        response_model: Type[T],
        model_name: str | None = None,
        temperature: float = 0.2,
    ) -> LLMResponse:
        model = model_name or settings.GEMINI_DEFAULT_MODEL
        url = f"{self.base_url}/models/{model}:generateContent?key={self.api_key}"

        schema = dereference_json_schema(response_model.model_json_schema())
        req_body = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}]
                }
            ],
            "system_instruction": {
                "parts": [{"text": system_instruction}]
            },
            "generationConfig": {
                "temperature": temperature,
                "response_mime_type": "application/json",
                "response_schema": schema,
            }
        }

        async def _call_api(body: dict) -> httpx.Response:
            try:
                resp = await self.http_client.post(url, json=body)
                return resp
            except Exception as exc:
                logger.error(f"Gemini API request network failure: {exc}")
                raise AppException(
                    status_code=502,
                    message=f"Gemini API communication failure: {str(exc)}",
                    code="LLM_COMMUNICATION_ERROR"
                )

        response = await _call_api(req_body)

        if response.status_code != 200:
            err_msg = f"Gemini API error (HTTP {response.status_code}): {response.text}"
            logger.error(err_msg)
            # Never guess model names. Report exact error.
            raise AppException(
                status_code=502,
                message=err_msg,
                code="LLM_PROVIDER_ERROR"
            )

        data = response.json()
        candidates = data.get("candidates", [])
        if not candidates or "content" not in candidates[0]:
            raise AppException(
                status_code=502,
                message="Gemini returned an empty candidate list or blocked output.",
                code="LLM_EMPTY_RESPONSE"
            )

        text_part = candidates[0]["content"]["parts"][0].get("text", "")
        usage = data.get("usageMetadata", {})
        prompt_tokens = usage.get("promptTokenCount", 0)
        completion_tokens = usage.get("candidatesTokenCount", 0)
        total_tokens = usage.get("totalTokenCount", prompt_tokens + completion_tokens)

        # Parse & Validate with Pydantic; retry once on malformed JSON
        try:
            parsed_json = json.loads(text_part)
            parsed_instance = response_model.model_validate(parsed_json)
        except (json.JSONDecodeError, ValidationError) as parse_err:
            logger.warning(f"Malformed JSON or validation error on first try: {parse_err}. Retrying once...")
            # Retry once with explicit json correction prompt
            retry_body = dict(req_body)
            retry_body["contents"].append({
                "role": "model",
                "parts": [{"text": text_part}]
            })
            retry_body["contents"].append({
                "role": "user",
                "parts": [{"text": f"Your previous response produced a validation/JSON error: {str(parse_err)}. Please output strictly valid JSON adhering exactly to the schema."}]
            })
            retry_resp = await _call_api(retry_body)
            if retry_resp.status_code != 200:
                raise AppException(
                    status_code=502,
                    message=f"Gemini API retry failed: {retry_resp.text}",
                    code="LLM_PROVIDER_ERROR"
                )
            retry_data = retry_resp.json()
            retry_text = retry_data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            try:
                parsed_json = json.loads(retry_text)
                parsed_instance = response_model.model_validate(parsed_json)
                text_part = retry_text
                r_usage = retry_data.get("usageMetadata", {})
                prompt_tokens += r_usage.get("promptTokenCount", 0)
                completion_tokens += r_usage.get("candidatesTokenCount", 0)
                total_tokens = prompt_tokens + completion_tokens
            except Exception as final_exc:
                logger.error(f"Retry parsing also failed: {final_exc}")
                raise AppException(
                    status_code=502,
                    message=f"Failed to produce valid structured JSON after retry: {str(final_exc)}",
                    code="LLM_MALFORMED_OUTPUT"
                )

        cost = self.calculate_cost(model, prompt_tokens, completion_tokens)
        return LLMResponse(
            parsed=parsed_instance,
            raw_text=text_part,
            model_name=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            estimated_cost_usd=cost,
        )


class OpenAIProvider(LLMProvider):
    """
    Adapter for OpenAI API (gpt-4o-mini, etc.) using Structured Outputs.
    """

    def __init__(self, api_key: str | None = None, http_client: httpx.AsyncClient | None = None):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.http_client = http_client or httpx.AsyncClient(timeout=120.0)
        self.base_url = "https://api.openai.com/v1"

    async def generate_structured(
        self,
        prompt: str,
        system_instruction: str,
        response_model: Type[T],
        model_name: str | None = None,
        temperature: float = 0.2,
    ) -> LLMResponse:
        model = model_name or settings.OPENAI_DEFAULT_MODEL
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        schema = response_model.model_json_schema()
        req_body = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt},
            ],
            "temperature": temperature,
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": response_model.__name__,
                    "strict": False,
                    "schema": schema,
                }
            }
        }

        try:
            resp = await self.http_client.post(url, headers=headers, json=req_body)
        except Exception as exc:
            logger.error(f"OpenAI API request network failure: {exc}")
            raise AppException(
                status_code=502,
                message=f"OpenAI API communication failure: {str(exc)}",
                code="LLM_COMMUNICATION_ERROR"
            )

        if resp.status_code != 200:
            err_msg = f"OpenAI API error (HTTP {resp.status_code}): {resp.text}"
            logger.error(err_msg)
            raise AppException(
                status_code=502,
                message=err_msg,
                code="LLM_PROVIDER_ERROR"
            )

        data = resp.json()
        choices = data.get("choices", [])
        if not choices:
            raise AppException(
                status_code=502,
                message="OpenAI returned an empty choice list.",
                code="LLM_EMPTY_RESPONSE"
            )

        content = choices[0]["message"]["content"]
        usage = data.get("usage", {})
        prompt_tokens = usage.get("prompt_tokens", 0)
        completion_tokens = usage.get("completion_tokens", 0)
        total_tokens = usage.get("total_tokens", prompt_tokens + completion_tokens)

        try:
            parsed_json = json.loads(content)
            parsed_instance = response_model.model_validate(parsed_json)
        except (json.JSONDecodeError, ValidationError) as parse_err:
            logger.warning(f"OpenAI JSON parse error: {parse_err}. Retrying once...")
            retry_body = dict(req_body)
            retry_body["messages"].append({"role": "assistant", "content": content})
            retry_body["messages"].append({
                "role": "user",
                "content": f"Schema validation error: {str(parse_err)}. Please re-output purely valid JSON matching the schema."
            })
            retry_resp = await self.http_client.post(url, headers=headers, json=retry_body)
            if retry_resp.status_code != 200:
                raise AppException(
                    status_code=502,
                    message=f"OpenAI API retry failed: {retry_resp.text}",
                    code="LLM_PROVIDER_ERROR"
                )
            retry_data = retry_resp.json()
            content = retry_data.get("choices", [{}])[0].get("message", {}).get("content", "")
            try:
                parsed_json = json.loads(content)
                parsed_instance = response_model.model_validate(parsed_json)
            except Exception as final_exc:
                raise AppException(
                    status_code=502,
                    message=f"Failed to produce valid structured JSON from OpenAI: {str(final_exc)}",
                    code="LLM_MALFORMED_OUTPUT"
                )

        cost = self.calculate_cost(model, prompt_tokens, completion_tokens)
        return LLMResponse(
            parsed=parsed_instance,
            raw_text=content,
            model_name=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            estimated_cost_usd=cost,
        )


def get_llm_provider(
    provider_type: str | None = None,
    http_client: httpx.AsyncClient | None = None,
    api_key: str | None = None,
) -> LLMProvider:
    """
    Factory creating the configured provider instance.
    """
    ptype = (provider_type or settings.LLM_PROVIDER).lower()
    if ptype == "gemini":
        return GeminiProvider(api_key=api_key, http_client=http_client)
    elif ptype == "openai":
        return OpenAIProvider(api_key=api_key, http_client=http_client)
    else:
        raise AppException(
            status_code=500,
            message=f"Unsupported LLM_PROVIDER '{ptype}'. Allowed: 'gemini', 'openai'",
            code="CONFIG_ERROR"
        )

