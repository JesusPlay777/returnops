export type ReturnStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "NEEDS_INFORMATION"
  | "APPROVED"
  | "REJECTED";

export type ReturnReason =
  | "DAMAGED"
  | "WRONG_ITEM"
  | "NOT_AS_DESCRIBED"
  | "NO_LONGER_NEEDED"
  | "OTHER";

export type EvidenceKind =
  | "PRODUCT_PHOTO"
  | "SERIAL_LABEL"
  | "RECEIPT";

export type StatusActor = "CUSTOMER" | "OPERATIONS" | "SYSTEM";

export type Evidence = {
  id: string;
  kind: EvidenceKind;
  asset_key: string;
  caption: string;
  created_at: string;
};

export type ReturnItem = {
  id: string;
  sku: string;
  product_name: string;
  quantity: number;
  unit_price: string;
  line_total: string;
  reason: ReturnReason;
  details: string;
  evidence: Evidence[];
  created_at: string;
  updated_at: string;
};

export type StatusEvent = {
  id: string;
  from_status: ReturnStatus | null;
  to_status: ReturnStatus;
  actor: StatusActor;
  note: string;
  created_at: string;
};

export type ReturnRequestSummary = {
  id: string;
  reference: string;
  customer_name: string;
  item_count: number;
  total_value: string;
  currency: string;
  status: ReturnStatus;
  updated_at: string;
};

export type ReturnRequestDetail = ReturnRequestSummary & {
  order_reference: string;
  customer_email: string;
  items: ReturnItem[];
  status_events: StatusEvent[];
  created_at: string;
};

export type PaginatedReturns = {
  count: number;
  next: string | null;
  previous: string | null;
  results: ReturnRequestSummary[];
};

export type ReturnRequestInput = {
  order_reference: string;
  customer_name: string;
  customer_email: string;
};

export type ReturnRequestUpdate = Partial<ReturnRequestInput>;

export type ReturnItemInput = {
  sku: string;
  product_name: string;
  quantity: number;
  unit_price: string;
  reason: ReturnReason;
  details?: string;
};

export type ReturnItemUpdate = Partial<ReturnItemInput>;

export type EvidenceInput = {
  kind: EvidenceKind;
  asset_key: string;
  caption?: string;
};

export type CustomerReturnsQuery = {
  page?: number;
  pageSize?: number;
};
