import { apiClient, type ApiClient } from "@/lib/api/client";

import type {
  CustomerReturnsQuery,
  Evidence,
  EvidenceInput,
  PaginatedReturns,
  ReturnItem,
  ReturnItemInput,
  ReturnItemUpdate,
  ReturnRequestDetail,
  ReturnRequestInput,
  ReturnRequestUpdate,
} from "@/features/returns/types";

type ReturnsClient = Pick<ApiClient, "request">;

function requirePositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${field} must be a positive integer.`);
  }
}

function returnPath(returnId: string): string {
  return `/api/v1/returns/${encodeURIComponent(returnId)}/`;
}

function itemPath(returnId: string, itemId: string): string {
  return `${returnPath(returnId)}items/${encodeURIComponent(itemId)}/`;
}

function evidencePath(
  returnId: string,
  itemId: string,
  evidenceId?: string,
): string {
  const collection = `${itemPath(returnId, itemId)}evidence/`;
  return evidenceId
    ? `${collection}${encodeURIComponent(evidenceId)}/`
    : collection;
}

export function createCustomerReturnsApi(client: ReturnsClient) {
  function list(query: CustomerReturnsQuery = {}): Promise<PaginatedReturns> {
    const search = new URLSearchParams();
    if (query.page !== undefined) {
      requirePositiveInteger(query.page, "page");
      search.set("page", String(query.page));
    }
    if (query.pageSize !== undefined) {
      requirePositiveInteger(query.pageSize, "pageSize");
      search.set("page_size", String(query.pageSize));
    }

    const suffix = search.size > 0 ? `?${search.toString()}` : "";
    return client.request<PaginatedReturns>(`/api/v1/returns/${suffix}`);
  }

  function retrieve(returnId: string): Promise<ReturnRequestDetail> {
    return client.request<ReturnRequestDetail>(returnPath(returnId));
  }

  function create(input: ReturnRequestInput): Promise<ReturnRequestDetail> {
    return client.request<ReturnRequestDetail>("/api/v1/returns/", {
      method: "POST",
      json: input,
    });
  }

  function update(
    returnId: string,
    input: ReturnRequestUpdate,
  ): Promise<ReturnRequestDetail> {
    return client.request<ReturnRequestDetail>(returnPath(returnId), {
      method: "PATCH",
      json: input,
    });
  }

  function remove(returnId: string): Promise<void> {
    return client.request<void>(returnPath(returnId), {
      method: "DELETE",
    });
  }

  function submit(
    returnId: string,
    responseNote = "",
  ): Promise<ReturnRequestDetail> {
    return client.request<ReturnRequestDetail>(
      `${returnPath(returnId)}submit/`,
      {
        method: "POST",
        json: { response_note: responseNote },
      },
    );
  }

  function addItem(
    returnId: string,
    input: ReturnItemInput,
  ): Promise<ReturnItem> {
    return client.request<ReturnItem>(`${returnPath(returnId)}items/`, {
      method: "POST",
      json: input,
    });
  }

  function updateItem(
    returnId: string,
    itemId: string,
    input: ReturnItemUpdate,
  ): Promise<ReturnItem> {
    return client.request<ReturnItem>(itemPath(returnId, itemId), {
      method: "PATCH",
      json: input,
    });
  }

  function removeItem(returnId: string, itemId: string): Promise<void> {
    return client.request<void>(itemPath(returnId, itemId), {
      method: "DELETE",
    });
  }

  function addEvidence(
    returnId: string,
    itemId: string,
    input: EvidenceInput,
  ): Promise<Evidence> {
    return client.request<Evidence>(evidencePath(returnId, itemId), {
      method: "POST",
      json: input,
    });
  }

  function removeEvidence(
    returnId: string,
    itemId: string,
    evidenceId: string,
  ): Promise<void> {
    return client.request<void>(
      evidencePath(returnId, itemId, evidenceId),
      { method: "DELETE" },
    );
  }

  return {
    list,
    retrieve,
    create,
    update,
    remove,
    submit,
    addItem,
    updateItem,
    removeItem,
    addEvidence,
    removeEvidence,
  };
}

const customerReturnsApi = createCustomerReturnsApi(apiClient);

export const listCustomerReturns = customerReturnsApi.list;
export const retrieveCustomerReturn = customerReturnsApi.retrieve;
export const createCustomerReturn = customerReturnsApi.create;
export const updateCustomerReturn = customerReturnsApi.update;
export const deleteCustomerDraft = customerReturnsApi.remove;
export const submitCustomerReturn = customerReturnsApi.submit;
export const addCustomerReturnItem = customerReturnsApi.addItem;
export const updateCustomerReturnItem = customerReturnsApi.updateItem;
export const deleteCustomerReturnItem = customerReturnsApi.removeItem;
export const addCustomerReturnEvidence = customerReturnsApi.addEvidence;
export const deleteCustomerReturnEvidence = customerReturnsApi.removeEvidence;
