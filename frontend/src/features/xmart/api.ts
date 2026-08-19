import { apiClient, type ApiClient } from "@/lib/api/client";

import type { XmartDemo } from "@/features/xmart/types";

type XmartClient = Pick<ApiClient, "request">;

export function createXmartApi(client: XmartClient) {
  function retrieve(): Promise<XmartDemo> {
    return client.request<XmartDemo>("/api/v1/xmart/demo/");
  }

  function advance(): Promise<XmartDemo> {
    return client.request<XmartDemo>("/api/v1/xmart/demo/advance/", {
      method: "POST",
      json: {},
    });
  }

  function reset(): Promise<XmartDemo> {
    return client.request<XmartDemo>("/api/v1/xmart/demo/reset/", {
      method: "POST",
      json: {},
    });
  }

  return { retrieve, advance, reset };
}

const xmartApi = createXmartApi(apiClient);

export const retrieveXmartDemo = xmartApi.retrieve;
export const advanceXmartDemo = xmartApi.advance;
export const resetXmartDemo = xmartApi.reset;
