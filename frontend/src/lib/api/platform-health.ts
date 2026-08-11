export type PlatformHealth = {
  service: string;
  status: "ok" | "unavailable";
  database: "ok" | "unavailable";
};

type PlatformFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type Delay = (milliseconds: number, signal?: AbortSignal) => Promise<void>;

export type WaitForPlatformOptions = {
  fetch?: PlatformFetch;
  delay?: Delay;
  intervalMs?: number;
  maxAttempts?: number;
  onWaiting?: () => void;
  signal?: AbortSignal;
};

const DEFAULT_INTERVAL_MS = 2_000;
const DEFAULT_MAX_ATTEMPTS = 18;

export class PlatformUnavailableError extends Error {
  constructor() {
    super("The demo backend did not become available in time.");
    this.name = "PlatformUnavailableError";
  }
}

function abortError(signal: AbortSignal): unknown {
  return (
    signal.reason ??
    new DOMException("The request was cancelled.", "AbortError")
  );
}

const delay: Delay = (milliseconds, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError(signal));
      return;
    }

    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, milliseconds);

    function handleAbort() {
      clearTimeout(timeout);
      reject(abortError(signal as AbortSignal));
    }

    signal?.addEventListener("abort", handleAbort, { once: true });
  });

function isHealthy(value: unknown): value is PlatformHealth {
  if (!value || typeof value !== "object") {
    return false;
  }

  const health = value as Partial<PlatformHealth>;
  return health.status === "ok" && health.database === "ok";
}

async function checkPlatformHealth(
  fetchRequest: PlatformFetch,
  signal?: AbortSignal,
): Promise<boolean> {
  try {
    const response = await fetchRequest("/api/platform-health", {
      cache: "no-store",
      signal,
    });
    if (!response.ok) {
      return false;
    }

    return isHealthy(await response.json());
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    return false;
  }
}

export async function waitForPlatform({
  fetch: fetchRequest = globalThis.fetch,
  delay: wait = delay,
  intervalMs = DEFAULT_INTERVAL_MS,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  onWaiting,
  signal,
}: WaitForPlatformOptions = {}): Promise<void> {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new RangeError("maxAttempts must be a positive integer.");
  }
  if (intervalMs < 0) {
    throw new RangeError("intervalMs must not be negative.");
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (await checkPlatformHealth(fetchRequest, signal)) {
      return;
    }

    onWaiting?.();
    if (attempt === maxAttempts) {
      throw new PlatformUnavailableError();
    }
    await wait(intervalMs, signal);
  }
}
