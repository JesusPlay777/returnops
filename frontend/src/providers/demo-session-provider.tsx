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
  bootstrapVisitorSession,
  invalidateVisitorSession,
  type VisitorSession,
} from "@/lib/api/session";

type DemoSessionState =
  | { status: "bootstrapping" }
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

    bootstrapVisitorSession()
      .then((session) => {
        if (isCurrent) {
          setState({ status: "ready", session });
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setState({ status: "error", error: toApiError(error) });
        }
      });

    return () => {
      isCurrent = false;
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
