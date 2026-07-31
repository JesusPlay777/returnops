import { describe, expect, it } from "vitest";

import type { ReturnItem } from "@/features/returns/types";
import {
  availableEvidenceKinds,
  buildEvidenceAssetKey,
} from "@/features/returns/workflow";

const item: ReturnItem = {
  id: "AAA-BBB",
  catalog_item_id: "catalog-item-1",
  sku: "DMO-1",
  product_name: "Demo product",
  quantity: 1,
  max_quantity: 1,
  unit_price: "20.00",
  line_total: "20.00",
  reason: "DAMAGED",
  details: "",
  evidence: [
    {
      id: "evidence-1",
      kind: "PRODUCT_PHOTO",
      asset_key: "demo/rtn-205/aaa-bbb/product_photo.jpg",
      caption: "Product photo",
      created_at: "2026-07-31T12:00:00Z",
    },
  ],
  created_at: "2026-07-31T12:00:00Z",
  updated_at: "2026-07-31T12:00:00Z",
};

describe("return workflow helpers", () => {
  it("builds a normalized fictional evidence key", () => {
    expect(
      buildEvidenceAssetKey("RTN-205", "AAA-BBB", "SERIAL_LABEL"),
    ).toBe("demo/rtn-205/aaa-bbb/serial_label.jpg");
  });

  it("offers only evidence kinds not already attached", () => {
    expect(availableEvidenceKinds(item)).toEqual([
      "SERIAL_LABEL",
      "RECEIPT",
    ]);
  });
});
