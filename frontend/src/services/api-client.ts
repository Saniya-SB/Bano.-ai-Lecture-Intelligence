import { env } from "@/config/env";
import { ApiError } from "@/types/domain/common";
import { ApiErrorKind, getErrorMessage } from "@/lib/error-messages";
import { ApiErrorDto } from "@/types/api/common";
import { authManager } from "./auth-provider";

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  skipAuth?: boolean;
}

type UnauthorizedHandler = () => void;
let unauthorizedListener: UnauthorizedHandler | null = null;

export function setUnauthorizedListener(handler: UnauthorizedHandler | null) {
  unauthorizedListener = handler;
}

export function parseErrorResponse(status: number, data: unknown): {
  kind: ApiErrorKind;
  userMessage: string;
  fieldErrors?: Record<string, string>;
  requestId?: string;
} {
  let kind: ApiErrorKind = "unknown";
  let userMessage = getErrorMessage("unknown");
  let fieldErrors: Record<string, string> | undefined;
  let requestId: string | undefined;

  switch (status) {
    case 400:
    case 422:
      kind = "validation";
      userMessage = getErrorMessage("validation");
      break;
    case 401:
      kind = "unauthorized";
      userMessage = getErrorMessage("unauthorized");
      break;
    case 403:
      kind = "forbidden";
      userMessage = getErrorMessage("forbidden");
      break;
    case 404:
      kind = "not-found";
      userMessage = getErrorMessage("not-found");
      break;
    case 409:
      kind = "conflict";
      userMessage = getErrorMessage("conflict");
      break;
    case 429:
      kind = "rate-limited";
      userMessage = getErrorMessage("rate-limited");
      break;
    case 500:
    case 502:
    case 503:
    case 504:
      kind = "server";
      userMessage = getErrorMessage("server");
      break;
    default:
      kind = "unknown";
      userMessage = getErrorMessage("unknown");
  }

  if (data && typeof data === "object") {
    const errorDto = data as ApiErrorDto;
    if (errorDto.request_id) {
      requestId = errorDto.request_id;
    }

    if (errorDto.field_errors && typeof errorDto.field_errors === "object") {
      fieldErrors = errorDto.field_errors;
    }

    if (typeof errorDto.detail === "string") {
      userMessage = errorDto.detail;
    } else if (typeof errorDto.message === "string") {
      userMessage = errorDto.message;
    } else if (Array.isArray(errorDto.detail)) {
      // FastAPI 422 validation error format: [{loc: [...], msg: "..."}]
      const map: Record<string, string> = {};
      for (const item of errorDto.detail) {
        if (item && typeof item === "object") {
          const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : "field";
          if (field && item.msg) {
            map[String(field)] = item.msg;
          }
        }
      }
      if (Object.keys(map).length > 0) {
        fieldErrors = map;
      }
    }
  }

  return { kind, userMessage, fieldErrors, requestId };
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    timeoutMs = 20000,
    retries = options.method === "GET" || !options.method ? 2 : 0,
    skipAuth = false,
    headers: customHeaders = {},
    ...customOptions
  } = options;

  const baseUrl = env.API_URL || env.API_BASE_URL;
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${baseUrl.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;

  let attemptsLeft = retries + 1;
  let lastError: unknown = null;

  while (attemptsLeft > 0) {
    attemptsLeft--;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers = new Headers(customHeaders);
      if (!headers.has("Content-Type") && !(customOptions.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
      }
      if (!headers.has("Accept")) {
        headers.set("Accept", "application/json");
      }

      // Automatically attach Bearer auth token if available and not skipped
      if (!skipAuth && !headers.has("Authorization")) {
        const token = await authManager.getValidToken();
        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }
      }

      const response = await fetch(url, {
        ...customOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        let responseData: unknown = null;
        try {
          responseData = await response.json();
        } catch {
          // If response body is not JSON, leave as null
        }

        const { kind, userMessage, fieldErrors, requestId } = parseErrorResponse(
          response.status,
          responseData
        );

        if (response.status === 401 && unauthorizedListener) {
          unauthorizedListener();
        }

        throw new ApiError({
          kind,
          status: response.status,
          userMessage,
          fieldErrors,
          requestId,
        });
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      clearTimeout(timer);

      if (err instanceof ApiError) {
        throw err;
      }

      const isAbort = (err as Error)?.name === "AbortError";
      const isNetwork = !isAbort && (err instanceof TypeError || (err as Error)?.message?.includes("fetch"));

      if (isAbort) {
        throw new ApiError({
          kind: "timeout",
          status: 408,
          userMessage: getErrorMessage("timeout"),
        });
      }

      if (isNetwork && attemptsLeft > 0) {
        // Wait before retry
        await new Promise((res) => setTimeout(res, 500));
        lastError = err;
        continue;
      }

      throw new ApiError({
        kind: "network",
        status: 0,
        userMessage: getErrorMessage("network"),
      });
    }
  }

  throw lastError;
}
