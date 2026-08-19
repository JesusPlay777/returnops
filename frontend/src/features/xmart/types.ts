export type XmartWorkflowPhase =
  | "CUSTOMER_WORKSPACE"
  | "USER_ACCESS"
  | "DEVICE_ASSIGNMENT"
  | "SECURITY_AUDIT"
  | "WORKFLOW_COMPLETE";

export type XmartCountCapacity = {
  used: number;
  limit: number;
};

export type XmartStorageCapacity = {
  used: string;
  limit: string;
  unit: "GB";
};

export type XmartCapacities = {
  users: XmartCountCapacity;
  storage: XmartStorageCapacity;
  imeis: XmartCountCapacity;
};

export type XmartContractedModule = {
  name: string;
  position: number;
};

export type XmartDemoUser = {
  email: string;
  role: string;
  status: "PENDING" | "ACTIVE";
  seat_consumed: boolean;
  verification_resends: number;
  activated_at: string | null;
};

export type XmartDemoDevice = {
  model_name: string;
  synthetic_imei: string;
  status: "AVAILABLE" | "ASSIGNED";
  assigned_project: string;
  assigned_at: string | null;
};

export type XmartAuditEventType =
  | "WORKSPACE_REVIEWED"
  | "USER_ACTIVATED"
  | "VERIFICATION_RESENT"
  | "DEVICE_ASSIGNED"
  | "SECURITY_AUDIT_REVIEWED"
  | "WORKFLOW_COMPLETED";

export type XmartAuditEvent = {
  id: string;
  sequence: number;
  phase: XmartWorkflowPhase;
  event_type: XmartAuditEventType;
  actor_email: string;
  subject_reference: string;
  source_ip: string;
  reason: string;
  occurred_at: string;
};

export type XmartDemo = {
  customer_name: string;
  project_name: string;
  actor_email: string;
  actor_ip: string;
  disclosure: string;
  phase: XmartWorkflowPhase;
  next_phase: XmartWorkflowPhase | null;
  is_complete: boolean;
  did_advance: boolean;
  capacities: XmartCapacities;
  modules: XmartContractedModule[];
  target_user: XmartDemoUser;
  device: XmartDemoDevice;
  audit_events: XmartAuditEvent[];
  updated_at: string;
};
