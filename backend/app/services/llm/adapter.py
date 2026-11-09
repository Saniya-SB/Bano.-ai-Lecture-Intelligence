from abc import ABC, abstractmethod
from typing import Any, Type, TypeVar, Optional
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
        provider_name: str = "generic",
    ):
        self.parsed = parsed
        self.raw_text = raw_text
        self.model_name = model_name
        self.provider_name = provider_name
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens
        self.total_tokens = total_tokens
        self.estimated_cost_usd = estimated_cost_usd


class LLMProvider(ABC):
    """
    Abstract interface for provider-independent LLM completion with structured output decoding.
    """

    provider_name: str = "generic"

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

    def calculate_cost(self, model: str, prompt_tokens: int, completion_tokens: int) -> float:
        pricing = settings.LLM_PRICING_PER_1M.get(model)
        if not pricing:
            return 0.0
        input_cost = (prompt_tokens / 1_000_000) * pricing["input"]
        output_cost = (completion_tokens / 1_000_000) * pricing["output"]
        return round(input_cost + output_cost, 6)


class GeminiProvider(LLMProvider):
    provider_name: str = "gemini"

    def __init__(self, api_key: str | None = None, http_client: httpx.AsyncClient | None = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.http_client = http_client or httpx.AsyncClient(timeout=60.0)

    async def generate_structured(
        self,
        prompt: str,
        system_instruction: str,
        response_model: Type[T],
        model_name: str | None = None,
        temperature: float = 0.2,
    ) -> LLMResponse:
        if not self.api_key:
            raise AppException(
                status_code=500,
                message="GEMINI_API_KEY is not configured",
                code="CONFIG_ERROR"
            )

        model = model_name or settings.GEMINI_DEFAULT_MODEL
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"

        schema = response_model.model_json_schema()
        cleaned_schema = self._clean_schema_for_gemini(schema)

        req_body = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}],
                }
            ],
            "system_instruction": {
                "parts": [{"text": system_instruction}]
            },
            "generationConfig": {
                "temperature": temperature,
                "response_mime_type": "application/json",
                "response_schema": cleaned_schema,
            },
        }

        headers = {"Content-Type": "application/json"}

        async def _call_api(body: dict) -> httpx.Response:
            try:
                resp = await self.http_client.post(url, headers=headers, json=body)
                return resp
            except Exception as exc:
                logger.error(f"Gemini API request network failure: {exc}")
                raise AppException(
                    status_code=502,
                    message=f"Gemini API communication failure: {str(exc)}",
                    code="LLM_COMMUNICATION_ERROR"
                )

        response = await _call_api(req_body)

        if response.status_code == 429:
            raise AppException(status_code=429, message="Gemini rate limit exceeded", code="LLM_RATE_LIMIT")
        elif response.status_code >= 500:
            raise AppException(status_code=502, message=f"Gemini server error: {response.text}", code="LLM_PROVIDER_ERROR")
        elif response.status_code != 200:
            raise AppException(status_code=response.status_code, message=f"Gemini API error: {response.text}", code="LLM_API_ERROR")

        data = response.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise AppException(status_code=502, message="Gemini returned no candidates", code="LLM_EMPTY_RESPONSE")

        candidate = candidates[0]
        text_content = ""
        try:
            parts = candidate.get("content", {}).get("parts", [])
            for p in parts:
                text_content += p.get("text", "")
        except Exception:
            pass

        usage = data.get("usageMetadata", {})
        prompt_tokens = usage.get("promptTokenCount", 0)
        completion_tokens = usage.get("candidatesTokenCount", 0)
        total_tokens = usage.get("totalTokenCount", 0)

        try:
            parsed_json = json.loads(text_content)
            parsed_instance = response_model.model_validate(parsed_json)
        except (json.JSONDecodeError, ValidationError) as parse_err:
            logger.warning(f"Gemini JSON parse/validation error: {parse_err}. Retrying once...")
            retry_body = dict(req_body)
            retry_body["contents"].append({"role": "model", "parts": [{"text": text_content}]})
            retry_body["contents"].append({
                "role": "user",
                "parts": [{"text": f"Output failed schema validation: {str(parse_err)}. Please re-output strict JSON adhering to schema."}],
            })
            retry_resp = await _call_api(retry_body)
            if retry_resp.status_code != 200:
                raise AppException(status_code=502, message="Gemini retry call failed", code="LLM_PROVIDER_ERROR")
            retry_data = retry_resp.json()
            r_parts = retry_data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
            text_content = "".join([p.get("text", "") for p in r_parts])
            try:
                parsed_json = json.loads(text_content)
                parsed_instance = response_model.model_validate(parsed_json)
            except Exception as final_exc:
                raise AppException(
                    status_code=502,
                    message=f"Failed to produce valid structured JSON from Gemini: {str(final_exc)}",
                    code="LLM_MALFORMED_OUTPUT"
                )

        cost = self.calculate_cost(model, prompt_tokens, completion_tokens)
        return LLMResponse(
            parsed=parsed_instance,
            raw_text=text_content,
            model_name=model,
            provider_name=self.provider_name,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            estimated_cost_usd=cost,
        )

    def _clean_schema_for_gemini(self, schema: dict) -> dict:
        """
        Removes unsupported properties and fully inlines/dereferences $defs/$ref
        so Gemini accepts valid structured JSON schemas without $ref errors.
        """
        import copy
        defs = schema.get("$defs", {}) or schema.get("definitions", {})

        def _resolve(node):
            if isinstance(node, dict):
                if "$ref" in node:
                    ref_key = node["$ref"].split("/")[-1]
                    if ref_key in defs:
                        resolved = _resolve(copy.deepcopy(defs[ref_key]))
                        for k, v in node.items():
                            if k != "$ref":
                                resolved[k] = _resolve(v)
                        return resolved
                cleaned = {}
                for k, v in node.items():
                    if k not in ("$defs", "definitions", "title"):
                        cleaned[k] = _resolve(v)
                return cleaned
            elif isinstance(node, list):
                return [_resolve(item) for item in node]
            return node

        return _resolve(copy.deepcopy(schema))


class GroqProvider(LLMProvider):
    provider_name: str = "groq"

    def __init__(self, api_key: str | None = None, http_client: httpx.AsyncClient | None = None):
        self.api_key = api_key or settings.GROQ_API_KEY
        self.http_client = http_client or httpx.AsyncClient(timeout=60.0)

    async def generate_structured(
        self,
        prompt: str,
        system_instruction: str,
        response_model: Type[T],
        model_name: str | None = None,
        temperature: float = 0.2,
    ) -> LLMResponse:
        if not self.api_key:
            raise AppException(
                status_code=500,
                message="GROQ_API_KEY is not configured",
                code="CONFIG_ERROR"
            )

        model = model_name or settings.GROQ_DEFAULT_MODEL
        url = "https://api.groq.com/openai/v1/chat/completions"

        schema = response_model.model_json_schema()

        req_body = {
            "model": model,
            "messages": [
                {"role": "system", "content": f"{system_instruction}\nYou MUST output valid JSON conforming strictly to the requested schema."},
                {"role": "user", "content": prompt},
            ],
            "temperature": temperature,
            "response_format": {
                "type": "json_object"
            },
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        async def _call_api(body: dict) -> httpx.Response:
            try:
                resp = await self.http_client.post(url, headers=headers, json=body)
                return resp
            except Exception as exc:
                logger.error(f"Groq API request network failure: {exc}")
                raise AppException(
                    status_code=502,
                    message=f"Groq API communication failure: {str(exc)}",
                    code="LLM_COMMUNICATION_ERROR"
                )

        response = await _call_api(req_body)

        if response.status_code == 429:
            raise AppException(status_code=429, message="Groq rate limit exceeded", code="LLM_RATE_LIMIT")
        elif response.status_code >= 500:
            raise AppException(status_code=502, message=f"Groq server error: {response.text}", code="LLM_PROVIDER_ERROR")
        elif response.status_code != 200:
            raise AppException(status_code=response.status_code, message=f"Groq API error: {response.text}", code="LLM_API_ERROR")

        data = response.json()
        choices = data.get("choices", [])
        if not choices:
            raise AppException(status_code=502, message="Groq returned empty choices", code="LLM_EMPTY_RESPONSE")

        content = choices[0].get("message", {}).get("content", "")
        usage = data.get("usage", {})
        prompt_tokens = usage.get("prompt_tokens", 0)
        completion_tokens = usage.get("completion_tokens", 0)
        total_tokens = usage.get("total_tokens", prompt_tokens + completion_tokens)

        try:
            parsed_json = json.loads(content)
            parsed_instance = response_model.model_validate(parsed_json)
        except (json.JSONDecodeError, ValidationError) as parse_err:
            logger.warning(f"Groq JSON parse/validation error: {parse_err}. Retrying once...")
            retry_body = dict(req_body)
            retry_body["messages"].append({"role": "assistant", "content": content})
            retry_body["messages"].append({
                "role": "user",
                "content": f"Schema validation error: {str(parse_err)}. Please output only valid JSON matching the schema."
            })
            retry_resp = await _call_api(retry_body)
            if retry_resp.status_code != 200:
                raise AppException(status_code=502, message=f"Groq API retry failed: {retry_resp.text}", code="LLM_PROVIDER_ERROR")
            retry_data = retry_resp.json()
            content = retry_data.get("choices", [{}])[0].get("message", {}).get("content", "")
            try:
                parsed_json = json.loads(content)
                parsed_instance = response_model.model_validate(parsed_json)
            except Exception as final_exc:
                raise AppException(
                    status_code=502,
                    message=f"Failed to produce valid structured JSON from Groq: {str(final_exc)}",
                    code="LLM_MALFORMED_OUTPUT"
                )

        cost = self.calculate_cost(model, prompt_tokens, completion_tokens)
        return LLMResponse(
            parsed=parsed_instance,
            raw_text=content,
            model_name=model,
            provider_name=self.provider_name,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            estimated_cost_usd=cost,
        )


class OpenAIProvider(LLMProvider):
    provider_name: str = "openai"

    def __init__(self, api_key: str | None = None, http_client: httpx.AsyncClient | None = None):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.http_client = http_client or httpx.AsyncClient(timeout=60.0)

    async def generate_structured(
        self,
        prompt: str,
        system_instruction: str,
        response_model: Type[T],
        model_name: str | None = None,
        temperature: float = 0.2,
    ) -> LLMResponse:
        if not self.api_key:
            raise AppException(status_code=500, message="OPENAI_API_KEY is not configured", code="CONFIG_ERROR")

        model = model_name or settings.OPENAI_DEFAULT_MODEL
        url = "https://api.openai.com/v1/chat/completions"
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
                    "strict": True,
                    "schema": schema,
                },
            },
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            response = await self.http_client.post(url, headers=headers, json=req_body)
        except Exception as exc:
            raise AppException(status_code=502, message=f"OpenAI API network failure: {str(exc)}", code="LLM_COMMUNICATION_ERROR")

        if response.status_code == 429:
            raise AppException(status_code=429, message="OpenAI rate limit exceeded", code="LLM_RATE_LIMIT")
        elif response.status_code >= 500:
            raise AppException(status_code=502, message=f"OpenAI server error: {response.text}", code="LLM_PROVIDER_ERROR")
        elif response.status_code != 200:
            raise AppException(status_code=response.status_code, message=f"OpenAI API error: {response.text}", code="LLM_API_ERROR")

        data = response.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        usage = data.get("usage", {})
        prompt_tokens = usage.get("prompt_tokens", 0)
        completion_tokens = usage.get("completion_tokens", 0)
        total_tokens = usage.get("total_tokens", prompt_tokens + completion_tokens)

        try:
            parsed_json = json.loads(content)
            parsed_instance = response_model.model_validate(parsed_json)
        except Exception as parse_err:
            raise AppException(status_code=502, message=f"Failed to parse OpenAI JSON: {str(parse_err)}", code="LLM_MALFORMED_OUTPUT")

        cost = self.calculate_cost(model, prompt_tokens, completion_tokens)
        return LLMResponse(
            parsed=parsed_instance,
            raw_text=content,
            model_name=model,
            provider_name=self.provider_name,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            estimated_cost_usd=cost,
        )


class FallbackLLMProvider(LLMProvider):
    """
    Orchestrates primary provider with automatic fallback on rate-limits,
    5xx server errors, timeouts, or unrecoverable malformed JSON.
    """

    def __init__(self, primary: LLMProvider, fallback: LLMProvider | None = None):
        self.primary = primary
        self.fallback = fallback
        self.provider_name = primary.provider_name

    async def generate_structured(
        self,
        prompt: str,
        system_instruction: str,
        response_model: Type[T],
        model_name: str | None = None,
        temperature: float = 0.2,
    ) -> LLMResponse:
        try:
            return await self.primary.generate_structured(
                prompt=prompt,
                system_instruction=system_instruction,
                response_model=response_model,
                model_name=model_name,
                temperature=temperature,
            )
        except AppException as primary_err:
            # Fall back on 429 (rate limit), 502/5xx (server error/timeout), or LLM_MALFORMED_OUTPUT
            should_fallback = primary_err.status_code in (429, 500, 502, 503, 504) or primary_err.code in (
                "LLM_RATE_LIMIT",
                "LLM_PROVIDER_ERROR",
                "LLM_COMMUNICATION_ERROR",
                "LLM_MALFORMED_OUTPUT",
                "LLM_EMPTY_RESPONSE",
            )
            if not should_fallback or not self.fallback:
                raise primary_err

            logger.warning(
                f"Primary LLM provider '{self.primary.provider_name}' failed with {primary_err.code} ({primary_err.message}). "
                f"Attempting fallback to '{self.fallback.provider_name}'..."
            )
            try:
                fallback_resp = await self.fallback.generate_structured(
                    prompt=prompt,
                    system_instruction=system_instruction,
                    response_model=response_model,
                    model_name=None,  # Use fallback's default configured model
                    temperature=temperature,
                )
                logger.info(f"Fallback to '{self.fallback.provider_name}' ({fallback_resp.model_name}) succeeded.")
                return fallback_resp
            except Exception as fb_err:
                logger.error(f"Fallback provider '{self.fallback.provider_name}' also failed: {fb_err}")
                raise primary_err


def get_llm_provider(
    provider_type: str | None = None,
    http_client: httpx.AsyncClient | None = None,
    api_key: str | None = None,
    with_fallback: bool = True,
) -> LLMProvider:
    """
    Factory creating the configured provider instance.
    """
    ptype = (provider_type or settings.LLM_PROVIDER).lower()
    
    def create_single(name: str) -> LLMProvider:
        if name == "gemini":
            return GeminiProvider(api_key=api_key, http_client=http_client)
        elif name == "groq":
            return GroqProvider(api_key=api_key, http_client=http_client)
        elif name == "openai":
            return OpenAIProvider(api_key=api_key, http_client=http_client)
        else:
            raise AppException(
                status_code=500,
                message=f"Unsupported LLM_PROVIDER '{name}'. Allowed: 'gemini', 'groq', 'openai'",
                code="CONFIG_ERROR"
            )

    primary = create_single(ptype)
    if not with_fallback or not settings.LLM_FALLBACK_PROVIDER or settings.LLM_FALLBACK_PROVIDER == ptype:
        return primary

    fallback = create_single(settings.LLM_FALLBACK_PROVIDER)
    return FallbackLLMProvider(primary=primary, fallback=fallback)
