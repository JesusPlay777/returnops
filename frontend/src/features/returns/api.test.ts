import { describe, expect, it, vi } from "vitest";

import { createCustomerReturnsApi } from "@/features/returns/api";

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

  it("creates a draft using the documented write contract", async () => {
    const request = vi.fn().mockResolvedValue({ status: "DRAFT" });
    const returnsApi = createCustomerReturnsApi({ request });
    const input = {
      order_reference: "ORD-90001",
      customer_name: "Taylor Example",
      customer_email: "taylor@example.com",
    };

    await returnsApi.create(input);

    expect(request).toHaveBeenCalledWith("/api/v1/returns/", {
      method: "POST",
      json: input,
    });
  });

  it("patches only the supplied customer fields", async () => {
    const request = vi.fn().mockResolvedValue({ status: "DRAFT" });
    const returnsApi = createCustomerReturnsApi({ request });

    await returnsApi.update("82f4", { customer_name: "Changed name" });

    expect(request).toHaveBeenCalledWith("/api/v1/returns/82f4/", {
      method: "PATCH",
      json: { customer_name: "Changed name" },
    });
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
