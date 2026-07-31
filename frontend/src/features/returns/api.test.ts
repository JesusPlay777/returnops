import { describe, expect, it, vi } from "vitest";

import {
  createCustomerReturnsApi,
  createOperationsReturnsApi,
} from "@/features/returns/api";

describe("createCustomerReturnsApi", () => {
  it("lists returns with the API pagination parameter names", async () => {
    const request = vi.fn().mockResolvedValue({ count: 0, results: [] });
    const returnsApi = createCustomerReturnsApi({ request });

    await returnsApi.list({ page: 2, pageSize: 5 });

    expect(request).toHaveBeenCalledWith(
      "/api/v1/returns/?page=2&page_size=5",
    );
  });

  it("rejects invalid pagination locally", () => {
    const request = vi.fn();
    const returnsApi = createCustomerReturnsApi({ request });

    expect(() => returnsApi.list({ page: 0 })).toThrow(RangeError);
    expect(request).not.toHaveBeenCalled();
  });

  it("retrieves an encoded return identifier", async () => {
    const request = vi.fn().mockResolvedValue({ id: "return/id" });
    const returnsApi = createCustomerReturnsApi({ request });

    await returnsApi.retrieve("return/id");

    expect(request).toHaveBeenCalledWith(
      "/api/v1/returns/return%2Fid/",
    );
  });

  it("lists eligible fictional orders", async () => {
    const request = vi.fn().mockResolvedValue([]);
    const returnsApi = createCustomerReturnsApi({ request });

    await returnsApi.listEligibleOrders();

    expect(request).toHaveBeenCalledWith("/api/v1/demo/orders/");
  });

  it("creates a draft using catalog identifiers and selections", async () => {
    const request = vi.fn().mockResolvedValue({ status: "DRAFT" });
    const returnsApi = createCustomerReturnsApi({ request });
    const input = {
      order_id: "order-1",
      items: [
        {
          order_item_id: "order-item-1",
          quantity: 1,
          reason: "DAMAGED" as const,
        },
      ],
    };

    await returnsApi.create(input);

    expect(request).toHaveBeenCalledWith("/api/v1/returns/", {
      method: "POST",
      json: input,
    });
  });

  it("patches only mutable item fields", async () => {
    const request = vi.fn().mockResolvedValue({ status: "DRAFT" });
    const returnsApi = createCustomerReturnsApi({ request });

    await returnsApi.updateItem("82f4", "item-1", {
      quantity: 2,
      reason: "WRONG_ITEM",
    });

    expect(request).toHaveBeenCalledWith(
      "/api/v1/returns/82f4/items/item-1/",
      {
      method: "PATCH",
        json: { quantity: 2, reason: "WRONG_ITEM" },
      },
    );
  });

  it("keeps nested item and evidence mutations scoped to the return", async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    const returnsApi = createCustomerReturnsApi({ request });

    await returnsApi.removeEvidence("return-1", "item-1", "evidence-1");

    expect(request).toHaveBeenCalledWith(
      "/api/v1/returns/return-1/items/item-1/evidence/evidence-1/",
      { method: "DELETE" },
    );
  });
});

describe("createOperationsReturnsApi", () => {
  it("serializes search, filters, ordering, and pagination", async () => {
    const request = vi.fn().mockResolvedValue({ count: 0, results: [] });
    const operationsApi = createOperationsReturnsApi({ request });

    await operationsApi.list({
      search: "  RTN-204  ",
      status: "SUBMITTED",
      ordering: "-total_value",
      page: 2,
      pageSize: 10,
    });

    expect(request).toHaveBeenCalledWith(
      "/api/v1/operations/returns/?search=RTN-204&status=SUBMITTED&ordering=-total_value&page=2&page_size=10",
    );
  });

  it("rejects page sizes above the operations contract maximum", () => {
    const request = vi.fn();
    const operationsApi = createOperationsReturnsApi({ request });

    expect(() => operationsApi.list({ pageSize: 51 })).toThrow(RangeError);
    expect(request).not.toHaveBeenCalled();
  });

  it("retrieves an expandable operations aggregate", async () => {
    const request = vi.fn().mockResolvedValue({ id: "return/id" });
    const operationsApi = createOperationsReturnsApi({ request });

    await operationsApi.retrieve("return/id");

    expect(request).toHaveBeenCalledWith(
      "/api/v1/operations/returns/return%2Fid/",
    );
  });

  it("derives status counts from lightweight filtered requests", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({ count: 4, results: [] })
      .mockResolvedValueOnce({ count: 2, results: [] })
      .mockResolvedValueOnce({ count: 7, results: [] })
      .mockResolvedValueOnce({ count: 1, results: [] });
    const operationsApi = createOperationsReturnsApi({ request });

    await expect(operationsApi.statusCounts()).resolves.toEqual({
      SUBMITTED: 4,
      NEEDS_INFORMATION: 2,
      APPROVED: 7,
      REJECTED: 1,
    });
    expect(request).toHaveBeenCalledTimes(4);
  });

  it("resets only the current visitor demo through the shared client", async () => {
    const request = vi.fn().mockResolvedValue({
      message_code: "demo_reset_complete",
    });
    const operationsApi = createOperationsReturnsApi({ request });

    await operationsApi.resetDemo();

    expect(request).toHaveBeenCalledWith("/api/v1/demo/reset/", {
      method: "POST",
      json: {},
    });
  });
});
