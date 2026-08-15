import { describe, expect, it, vi } from "vitest";

import { createEnergybilApi } from "@/features/energybil/api";


describe("createEnergybilApi", () => {
  it("retrieves the current isolated scenario", async () => {
    const request = vi.fn().mockResolvedValue({ phase: "READING_RECEIVED" });
    const energybilApi = createEnergybilApi({ request });

    await energybilApi.retrieve();

    expect(request).toHaveBeenCalledWith("/api/v1/energybil/demo/");
  });

  it("advances exactly through the explicit command endpoint", async () => {
    const request = vi.fn().mockResolvedValue({ phase: "READING_VALIDATED" });
    const energybilApi = createEnergybilApi({ request });

    await energybilApi.advance();

    expect(request).toHaveBeenCalledWith(
      "/api/v1/energybil/demo/advance/",
      { method: "POST", json: {} },
    );
  });

  it("resets only through the dedicated visitor-scoped endpoint", async () => {
    const request = vi.fn().mockResolvedValue({ phase: "READING_RECEIVED" });
    const energybilApi = createEnergybilApi({ request });

    await energybilApi.reset();

    expect(request).toHaveBeenCalledWith(
      "/api/v1/energybil/demo/reset/",
      { method: "POST", json: {} },
    );
  });
});
