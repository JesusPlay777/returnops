import { describe, expect, it, vi } from "vitest";

import {
  PlatformUnavailableError,
  waitForPlatform,
} from "@/lib/api/platform-health";

function healthResponse(status: number, healthy: boolean): Response {
  return new Response(
    JSON.stringify({
      service: "returnops-api",
      status: healthy ? "ok" : "unavailable",
      database: healthy ? "ok" : "unavailable",
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}

describe("waitForPlatform", () => {
  it("continues immediately when the platform is healthy", async () => {
    const fetchRequest = vi.fn().mockResolvedValue(healthResponse(200, true));
    const wait = vi.fn();
    const onWaiting = vi.fn();

    await waitForPlatform({
      fetch: fetchRequest,
      delay: wait,
      onWaiting,
    });

    expect(fetchRequest).toHaveBeenCalledOnce();
    expect(wait).not.toHaveBeenCalled();
    expect(onWaiting).not.toHaveBeenCalled();
  });

  it("reports a cold start and retries until the platform is healthy", async () => {
    const fetchRequest = vi
      .fn()
      .mockResolvedValueOnce(healthResponse(503, false))
      .mockResolvedValueOnce(healthResponse(200, true));
    const wait = vi.fn().mockResolvedValue(undefined);
    const onWaiting = vi.fn();

    await waitForPlatform({
      fetch: fetchRequest,
      delay: wait,
      intervalMs: 25,
      maxAttempts: 3,
      onWaiting,
    });

    expect(fetchRequest).toHaveBeenCalledTimes(2);
    expect(onWaiting).toHaveBeenCalledOnce();
    expect(wait).toHaveBeenCalledWith(25, undefined);
  });

  it("stops after the bounded retry window", async () => {
    const fetchRequest = vi.fn().mockRejectedValue(new Error("offline"));
    const wait = vi.fn().mockResolvedValue(undefined);

    await expect(
      waitForPlatform({
        fetch: fetchRequest,
        delay: wait,
        intervalMs: 0,
        maxAttempts: 2,
      }),
    ).rejects.toBeInstanceOf(PlatformUnavailableError);

    expect(fetchRequest).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledOnce();
  });
});
