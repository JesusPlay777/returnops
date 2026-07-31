import { describe, expect, it, vi } from "vitest";

import { createSessionBootstrap } from "@/lib/api/session";

const session = {
  expires_at: "2026-08-01T16:00:00Z",
  available_roles: ["CUSTOMER", "OPERATIONS"] as const,
  supported_locales: ["en", "es"] as const,
  dataset_ready: true,
};

describe("createSessionBootstrap", () => {
  it("deduplicates bootstrap calls until explicitly invalidated", async () => {
    const request = vi.fn().mockResolvedValue(session);
    const bootstrap = createSessionBootstrap({ request });

    const first = bootstrap.bootstrap();
    const second = bootstrap.bootstrap();

    expect(first).toBe(second);
    await expect(first).resolves.toEqual(session);
    expect(request).toHaveBeenCalledOnce();

    bootstrap.invalidate();
    await bootstrap.bootstrap();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("allows retry after a failed bootstrap", async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(session);
    const bootstrap = createSessionBootstrap({ request });

    await expect(bootstrap.bootstrap()).rejects.toThrow("offline");
    await expect(bootstrap.bootstrap()).resolves.toEqual(session);
    expect(request).toHaveBeenCalledTimes(2);
  });
});
