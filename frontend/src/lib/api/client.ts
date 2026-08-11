export const CSRF_COOKIE_NAME = "returnops_csrftoken";

export type ApiErrorFields = Record<string, unknown>;

export type ApiRequestOptions = Omit<
  RequestInit,
  "body" | "credentials"
> & {
  json?: unknown;
};

export type ApiClientDependencies = {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  getCookie?: (name: string) => string | undefined;
};

type ApiErrorPayload = {
  code: string;
  detail: string;
  fields: ApiErrorFields;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: ApiErrorFields;

  constructor({
    status,
    code,
    detail,
    fields = {},
  }: {
    status: number;
    code: string;
    detail: string;
    fields?: ApiErrorFields;
  }) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function readCookie(
  name: string,
  cookieHeader: string,
): string | undefined {
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) {
      continue;
    }

    const key = decodeCookiePart(part.slice(0, separator).trim());
    if (key === name) {
      return decodeCookiePart(part.slice(separator + 1).trim());
    }
  }

  return undefined;
}

function decodeCookiePart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getBrowserCookie(name: string): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }

  return readCookie(name, document.cookie);
}

function normalizeBaseUrl(value?: string): string {
  const candidate = value?.trim();
  if (!candidate) {
    return "";
  }

  const url = new URL(candidate);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError("NEXT_PUBLIC_API_URL must use HTTP or HTTPS.");
  }

  return url.toString().replace(/\/$/, "");
}

function isUnsafeMethod(method: string): boolean {
  return !["GET", "HEAD", "OPTIONS"].includes(method);
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ApiErrorPayload>;
  return (
    typeof candidate.code === "string" &&
    typeof candidate.detail === "string" &&
    !!candidate.fields &&
    typeof candidate.fields === "object" &&
    !Array.isArray(candidate.fields)
  );
}

async function readResponsePayload(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const text = await response.text();
  if (!text) {
    return undefined;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) {
    return text;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError({
      status: response.status,
      code: "invalid_api_response",
      detail: "The API returned malformed JSON.",
    });
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error && error.name === "AbortError") {
    return new ApiError({
      status: 0,
      code: "request_aborted",
      detail: "The API request was cancelled.",
    });
  }

  return new ApiError({
    status: 0,
    code: "network_error",
    detail: "The API could not be reached.",
  });
}

export function createApiClient(dependencies: ApiClientDependencies = {}) {
  const baseUrl = normalizeBaseUrl(
    dependencies.baseUrl ?? process.env.NEXT_PUBLIC_API_URL,
  );
  const fetchRequest = dependencies.fetch ?? globalThis.fetch;
  const getCookie = dependencies.getCookie ?? getBrowserCookie;

  async function request<T>(
    path: string,
    options: ApiRequestOptions = {},
  ): Promise<T> {
    if (!path.startsWith("/api/")) {
      throw new TypeError("API paths must begin with /api/.");
    }

    const { json, ...requestOptions } = options;
    const method = (requestOptions.method ?? "GET").toUpperCase();
    const headers = new Headers(requestOptions.headers);
    headers.set("Accept", "application/json");

    let body: BodyInit | undefined;
    if (json !== undefined) {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(json);
    }

    if (isUnsafeMethod(method)) {
      const csrfToken = getCookie(CSRF_COOKIE_NAME);
      if (!csrfToken) {
        throw new ApiError({
          status: 403,
          code: "csrf_cookie_missing",
          detail: "Bootstrap the visitor session before modifying data.",
        });
      }
      headers.set("X-CSRFToken", csrfToken);
    }

    let response: Response;
    try {
      response = await fetchRequest(`${baseUrl}${path}`, {
        ...requestOptions,
        method,
        headers,
        body,
        credentials: "include",
        cache: requestOptions.cache ?? "no-store",
      });
    } catch (error) {
      throw toApiError(error);
    }

    const payload = await readResponsePayload(response);
    if (!response.ok) {
      if (isApiErrorPayload(payload)) {
        throw new ApiError({
          status: response.status,
          ...payload,
        });
      }

      throw new ApiError({
        status: response.status,
        code: `http_${response.status}`,
        detail: response.statusText || "The API request failed.",
      });
    }

    return payload as T;
  }

  return { request };
}

export type ApiClient = ReturnType<typeof createApiClient>;

export const apiClient = createApiClient();
