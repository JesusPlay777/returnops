"use client";

import { useEffect, useState } from "react";
import styles from "./api-status.module.css";

type Health = {
  service: string;
  status: "ok" | "unavailable";
  database: "ok" | "unavailable";
};

type RequestState =
  | { kind: "loading" }
  | { kind: "ready"; health: Health }
  | { kind: "error" };

export default function ApiStatus() {
  const [request, setRequest] = useState<RequestState>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4000);

    async function loadHealth() {
      try {
        const response = await fetch("/api/platform-health", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("API health check failed");
        }

        const health = (await response.json()) as Health;
        setRequest({ kind: "ready", health });
      } catch {
        if (!controller.signal.aborted) {
          setRequest({ kind: "error" });
        }
      } finally {
        window.clearTimeout(timeout);
      }
    }

    void loadHealth();

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const apiReady = request.kind === "ready" && request.health.status === "ok";
  const databaseReady =
    request.kind === "ready" && request.health.database === "ok";
  const isLoading = request.kind === "loading";

  return (
    <div className={styles.group} aria-live="polite">
      <ServiceRow
        code="D"
        label="Django REST"
        detail={isLoading ? "API · checking" : `API · ${apiReady ? "ready" : "unavailable"}`}
        state={isLoading ? "loading" : apiReady ? "ready" : "error"}
      />
      <ServiceRow
        code="P"
        label="PostgreSQL"
        detail={
          isLoading
            ? "Database · checking"
            : `Database · ${databaseReady ? "ready" : "unavailable"}`
        }
        state={isLoading ? "loading" : databaseReady ? "ready" : "error"}
      />
    </div>
  );
}

function ServiceRow({
  code,
  label,
  detail,
  state,
}: {
  code: string;
  label: string;
  detail: string;
  state: "loading" | "ready" | "error";
}) {
  return (
    <div className={styles.service}>
      <span className={styles.serviceIcon} aria-hidden="true">
        {code}
      </span>
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <span
        className={`${styles.statusDot} ${styles[state]}`}
        aria-label={state === "loading" ? "Checking" : state}
      />
    </div>
  );
}
