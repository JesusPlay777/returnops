"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ApiError, toApiError } from "@/lib/api/client";
import {
  PlatformUnavailableError,
  waitForPlatform,
} from "@/lib/api/platform-health";
import {
  bootstrapVisitorSession,
  invalidateVisitorSession,
  type VisitorSession,
} from "@/lib/api/session";

type DemoSessionState =
  | { status: "bootstrapping" }
  | { status: "waking" }
  | { status: "ready"; session: VisitorSession }
  | { status: "error"; error: ApiError };

type DemoSessionContextValue = DemoSessionState & {
  retry: () => void;
};

const DemoSessionContext = createContext<
  DemoSessionContextValue | undefined
>(undefined);

export function DemoSessionProvider({ children }: { children: ReactNode }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<DemoSessionState>({
    status: "bootstrapping",
  });

  useEffect(() => {
    let isCurrent = true;
    const controller = new AbortController();

    async function initializeDemo() {
      try {
        await waitForPlatform({
          signal: controller.signal,
          onWaiting: () => {
            if (isCurrent) {
              setState({ status: "waking" });
            }
          },
        });
        const session = await bootstrapVisitorSession();
        if (isCurrent) {
          setState({ status: "ready", session });
        }
      } catch (error: unknown) {
        if (isCurrent) {
          const apiError =
            error instanceof PlatformUnavailableError
              ? new ApiError({
                  status: 503,
                  code: "platform_unavailable",
                  detail: error.message,
                })
              : toApiError(error);
          setState({ status: "error", error: apiError });
        }
      }
    }

    void initializeDemo();

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [attempt]);

  const retry = useCallback(() => {
    invalidateVisitorSession();
    setState({ status: "bootstrapping" });
    setAttempt((current) => current + 1);
  }, []);

  const value = useMemo(() => ({ ...state, retry }), [retry, state]);

  return (
    <DemoSessionContext.Provider value={value}>
      {children}
    </DemoSessionContext.Provider>
  );
}

export function useDemoSession(): DemoSessionContextValue {
  const context = useContext(DemoSessionContext);
  if (!context) {
    throw new Error(
      "useDemoSession must be used within DemoSessionProvider.",
    );
  }

  return context;
}
