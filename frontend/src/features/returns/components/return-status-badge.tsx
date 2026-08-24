import type { ReactNode } from "react";

import type { ReturnStatus } from "@/features/returns/types";

type ReturnStatusBadgeVariant = "customer" | "operations" | "review";

const baseStyles: Record<ReturnStatusBadgeVariant, string> = {
  customer:
    "inline-flex min-h-7 items-center gap-[7px] rounded-full px-2.5 text-[10px] font-[750] tracking-[0.025em] uppercase",
  operations:
    "inline-flex min-h-[26px] items-center rounded-[6px] border px-[9px] text-[9px] font-[760] uppercase max-[760px]:justify-self-start",
  review:
    "inline-flex min-h-[27px] items-center rounded-[6px] border px-[9px] text-[8px] font-[780] uppercase",
};

const customerToneStyles: Record<ReturnStatus, string> = {
  DRAFT: "bg-surface-muted text-text-secondary",
  SUBMITTED: "bg-primary-soft text-primary-dark",
  NEEDS_INFORMATION: "bg-warning-soft text-warning",
  APPROVED: "bg-success-soft text-success",
  REJECTED: "bg-danger-soft text-danger",
};

const operationsToneStyles: Record<ReturnStatus, string> = {
  DRAFT: "border-border-strong bg-primary-soft text-primary-dark",
  SUBMITTED: "border-border-strong bg-primary-soft text-primary-dark",
  NEEDS_INFORMATION: "border-warning/45 bg-warning-soft text-warning",
  APPROVED: "border-success/45 bg-success-soft text-success",
  REJECTED: "border-danger/45 bg-danger-soft text-danger",
};

export function ReturnStatusBadge({
  children,
  status,
  variant,
}: {
  children: ReactNode;
  status: ReturnStatus;
  variant: ReturnStatusBadgeVariant;
}) {
  const toneStyles =
    variant === "customer" ? customerToneStyles[status] : operationsToneStyles[status];

  return (
    <span
      className={`${baseStyles[variant]} ${toneStyles}`}
      data-status={status}
    >
      {variant === "customer" && (
        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      )}
      {children}
    </span>
  );
}
