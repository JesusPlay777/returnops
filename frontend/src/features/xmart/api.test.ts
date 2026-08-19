import { describe, expect, it, vi } from "vitest";

import { createXmartApi } from "@/features/xmart/api";


describe("createXmartApi", () => {
  it("retrieves the current isolated provisioning scenario", async () => {
    const request = vi.fn().mockResolvedValue({ phase: "CUSTOMER_WORKSPACE" });
    const xmartApi = createXmartApi({ request });

    await xmartApi.retrieve();

    expect(request).toHaveBeenCalledWith("/api/v1/xmart/demo/");
  });

  it("advances only through the explicit synchronous command", async () => {
    const request = vi.fn().mockResolvedValue({ phase: "USER_ACCESS" });
    const xmartApi = createXmartApi({ request });

    await xmartApi.advance();

    expect(request).toHaveBeenCalledWith(
      "/api/v1/xmart/demo/advance/",
      { method: "POST", json: {} },
    );
  });

  it("resets through the dedicated visitor-scoped endpoint", async () => {
    const request = vi.fn().mockResolvedValue({ phase: "CUSTOMER_WORKSPACE" });
    const xmartApi = createXmartApi({ request });

    await xmartApi.reset();

    expect(request).toHaveBeenCalledWith(
      "/api/v1/xmart/demo/reset/",
      { method: "POST", json: {} },
    );
  });
});
