import { apiClient, type ApiClient } from "@/lib/api/client";

import type {
  CatalogReturnCreateInput,
  CustomerReturnsQuery,
  DemoOrder,
  DemoResetResponse,
  Evidence,
  EvidenceInput,
  OperationsReturnsQuery,
  OperationsStatusCounts,
  PaginatedReturns,
  ReturnItem,
  ReturnItemUpdate,
  ReturnRequestDetail,
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

  function listEligibleOrders(): Promise<DemoOrder[]> {
    return client.request<DemoOrder[]>("/api/v1/demo/orders/");
  }

  function create(
    input: CatalogReturnCreateInput,
  ): Promise<ReturnRequestDetail> {
    return client.request<ReturnRequestDetail>("/api/v1/returns/", {
      method: "POST",
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
    listEligibleOrders,
    retrieve,
    create,
    remove,
    submit,
    updateItem,
    removeItem,
    addEvidence,
    removeEvidence,
  };
}

const customerReturnsApi = createCustomerReturnsApi(apiClient);

const OPERATION_STATUSES = [
  "SUBMITTED",
  "NEEDS_INFORMATION",
  "APPROVED",
  "REJECTED",
] as const;

export function createOperationsReturnsApi(client: ReturnsClient) {
  function list(
    query: OperationsReturnsQuery = {},
  ): Promise<PaginatedReturns> {
    const search = new URLSearchParams();
    if (query.search?.trim()) {
      search.set("search", query.search.trim());
    }
    if (query.status) {
      search.set("status", query.status);
    }
    if (query.ordering) {
      search.set("ordering", query.ordering);
    }
    if (query.page !== undefined) {
      requirePositiveInteger(query.page, "page");
      search.set("page", String(query.page));
    }
    if (query.pageSize !== undefined) {
      requirePositiveInteger(query.pageSize, "pageSize");
      if (query.pageSize > 50) {
        throw new RangeError("pageSize cannot exceed 50.");
      }
      search.set("page_size", String(query.pageSize));
    }

    const suffix = search.size > 0 ? `?${search.toString()}` : "";
    return client.request<PaginatedReturns>(
      `/api/v1/operations/returns/${suffix}`,
    );
  }

  function retrieve(returnId: string): Promise<ReturnRequestDetail> {
    return client.request<ReturnRequestDetail>(
      `/api/v1/operations/returns/${encodeURIComponent(returnId)}/`,
    );
  }

  async function statusCounts(): Promise<OperationsStatusCounts> {
    const responses = await Promise.all(
      OPERATION_STATUSES.map((status) => list({ status, pageSize: 1 })),
    );
    return OPERATION_STATUSES.reduce<OperationsStatusCounts>(
      (counts, status, index) => {
        counts[status] = responses[index].count;
        return counts;
      },
      {
        SUBMITTED: 0,
        NEEDS_INFORMATION: 0,
        APPROVED: 0,
        REJECTED: 0,
      },
    );
  }

  function resetDemo(): Promise<DemoResetResponse> {
    return client.request<DemoResetResponse>("/api/v1/demo/reset/", {
      method: "POST",
      json: {},
    });
  }

  return { list, retrieve, statusCounts, resetDemo };
}

const operationsReturnsApi = createOperationsReturnsApi(apiClient);

export const listCustomerReturns = customerReturnsApi.list;
export const listEligibleDemoOrders = customerReturnsApi.listEligibleOrders;
export const retrieveCustomerReturn = customerReturnsApi.retrieve;
export const createCustomerReturn = customerReturnsApi.create;
export const deleteCustomerDraft = customerReturnsApi.remove;
export const submitCustomerReturn = customerReturnsApi.submit;
export const updateCustomerReturnItem = customerReturnsApi.updateItem;
export const deleteCustomerReturnItem = customerReturnsApi.removeItem;
export const addCustomerReturnEvidence = customerReturnsApi.addEvidence;
export const deleteCustomerReturnEvidence = customerReturnsApi.removeEvidence;
export const listOperationsReturns = operationsReturnsApi.list;
export const retrieveOperationsReturn = operationsReturnsApi.retrieve;
export const getOperationsStatusCounts = operationsReturnsApi.statusCounts;
export const resetDemoDataset = operationsReturnsApi.resetDemo;
