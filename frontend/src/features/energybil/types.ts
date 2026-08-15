export type EnergyWorkflowPhase =
  | "READING_RECEIVED"
  | "READING_VALIDATED"
  | "CONSUMPTION_CALCULATED"
  | "INVOICE_ISSUED"
  | "NOTIFICATION_SIMULATED";

export type EnergyMeter = {
  serial_number: string;
  label: string;
  previous_reading_kwh: string;
  current_reading_kwh: string;
  received_at: string;
};

export type EnergyInvoice = {
  invoice_number: string;
  period_start: string;
  period_end: string;
  due_date: string;
  consumption_kwh: string;
  energy_charge: string;
  subtotal: string;
  tax: string;
  total: string;
  issued_at: string | null;
  notification_preview: string;
  notification_simulated_at: string | null;
};

export type EnergyWorkflowEvent = {
  id: string;
  phase: EnergyWorkflowPhase;
  title: string;
  detail: string;
  occurred_at: string;
};

export type EnergyDemo = {
  account_reference: string;
  customer_name: string;
  property_name: string;
  service_address: string;
  currency: string;
  tariff_rate: string;
  fixed_charge: string;
  tax_rate: string;
  phase: EnergyWorkflowPhase;
  next_phase: EnergyWorkflowPhase | null;
  is_complete: boolean;
  did_advance: boolean;
  meter: EnergyMeter;
  invoice: EnergyInvoice;
  events: EnergyWorkflowEvent[];
  updated_at: string;
};
