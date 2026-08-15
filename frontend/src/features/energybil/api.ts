import { apiClient, type ApiClient } from "@/lib/api/client";

import type { EnergyDemo } from "@/features/energybil/types";

type EnergybilClient = Pick<ApiClient, "request">;

export function createEnergybilApi(client: EnergybilClient) {
  function retrieve(): Promise<EnergyDemo> {
    return client.request<EnergyDemo>("/api/v1/energybil/demo/");
  }

  function advance(): Promise<EnergyDemo> {
    return client.request<EnergyDemo>("/api/v1/energybil/demo/advance/", {
      method: "POST",
      json: {},
    });
  }

  function reset(): Promise<EnergyDemo> {
    return client.request<EnergyDemo>("/api/v1/energybil/demo/reset/", {
      method: "POST",
      json: {},
    });
  }

  return { retrieve, advance, reset };
}

const energybilApi = createEnergybilApi(apiClient);

export const retrieveEnergyDemo = energybilApi.retrieve;
export const advanceEnergyDemo = energybilApi.advance;
export const resetEnergyDemo = energybilApi.reset;
