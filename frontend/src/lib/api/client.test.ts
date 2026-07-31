import { describe, expect, it, vi } from "vitest";

import {
  ApiError,
  CSRF_COOKIE_NAME,
  createApiClient,
  readCookie,
} from "@/lib/api/client";

function jsonResponse(payload: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
}

describe("readCookie", () => {
  it("reads and decodes the selected cookie", () => {
    expect(
      readCookie(
        CSRF_COOKIE_NAME,
        "theme=light; returnops_csrftoken=token%2Fvalue; other=1",
      ),
    ).toBe("token/value");
  });

  it("does not confuse cookie name prefixes", () => {
    expect(
      readCookie("session", "session_backup=wrong; session=right"),
    ).toBe("right");
  });
});

describe("createApiClient", () => {
  it("sends safe requests with cookies and without a CSRF header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ dataset_ready: true }),
    );
    const client = createApiClient({
      baseUrl: "http://api.test/",
      fetch: fetchMock as typeof fetch,
      getCookie: vi.fn(),
    });

    await client.request("/api/v1/session/");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe("http://api.test/api/v1/session/");
    expect(options.credentials).toBe("include");
    expect(options.cache).toBe("no-store");
    expect(new Headers(options.headers).has("X-CSRFToken")).toBe(false);
  });

  it("serializes JSON and applies the CSRF cookie to unsafe requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ message_code: "demo_reset_complete" }),
    );
    const client = createApiClient({
      baseUrl: "https://api.test",
      fetch: fetchMock as typeof fetch,
      getCookie: () => "csrf-token",
    });

    await client.request("/api/v1/demo/reset/", {
      method: "POST",
      json: {},
    });

    const [, options] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    const headers = new Headers(options.headers);
    expect(headers.get("X-CSRFToken")).toBe("csrf-token");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(options.body).toBe("{}");
  });

  it("rejects unsafe requests before fetch when CSRF is unavailable", async () => {
    const fetchMock = vi.fn();
    const client = createApiClient({
      baseUrl: "https://api.test",
      fetch: fetchMock as typeof fetch,
      getCookie: () => undefined,
    });

    await expect(
      client.request("/api/v1/returns/", {
        method: "POST",
        json: {},
      }),
    ).rejects.toMatchObject({
      status: 403,
      code: "csrf_cookie_missing",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("converts the API error envelope into ApiError", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          code: "return_request_immutable",
          detail: "The return cannot be modified in its current state.",
          fields: {},
        },
        { status: 409 },
      ),
    );
    const client = createApiClient({
      baseUrl: "https://api.test",
      fetch: fetchMock as typeof fetch,
      getCookie: () => "csrf-token",
    });

    const request = client.request("/api/v1/returns/example/", {
      method: "PATCH",
      json: { customer_name: "Changed" },
    });

    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toMatchObject({
      status: 409,
      code: "return_request_immutable",
      fields: {},
    });
  });

  it("normalizes connection failures", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("offline"));
    const client = createApiClient({
      baseUrl: "https://api.test",
      fetch: fetchMock as typeof fetch,
    });

    await expect(client.request("/api/v1/session/")).rejects.toMatchObject({
      status: 0,
      code: "network_error",
    });
  });
});
