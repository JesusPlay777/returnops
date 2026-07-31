import { apiClient, type ApiClient } from "@/lib/api/client";

export type VisitorRole = "CUSTOMER" | "OPERATIONS";
export type SupportedLocale = "en" | "es";

export type VisitorSession = {
  expires_at: string;
  available_roles: VisitorRole[];
  supported_locales: SupportedLocale[];
  dataset_ready: boolean;
};

type SessionClient = Pick<ApiClient, "request">;

export function createSessionBootstrap(client: SessionClient) {
  let pending: Promise<VisitorSession> | undefined;

  function bootstrap(): Promise<VisitorSession> {
    if (!pending) {
      pending = client
        .request<VisitorSession>("/api/v1/session/")
        .catch((error: unknown) => {
          pending = undefined;
          throw error;
        });
    }

    return pending;
  }

  function invalidate(): void {
    pending = undefined;
  }

  return { bootstrap, invalidate };
}

const visitorSessionBootstrap = createSessionBootstrap(apiClient);

export const bootstrapVisitorSession = visitorSessionBootstrap.bootstrap;
export const invalidateVisitorSession = visitorSessionBootstrap.invalidate;
