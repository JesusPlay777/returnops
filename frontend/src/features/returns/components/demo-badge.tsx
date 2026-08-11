import type { ReactNode } from "react";

type DemoBadgeVariant = "customer" | "operations" | "workflow";

const variantStyles: Record<DemoBadgeVariant, string> = {
  customer:
    "text-[11px] font-[750] tracking-[0.08em] text-primary-dark uppercase max-[620px]:hidden",
  operations:
    "mt-2.5 self-start rounded-[6px] border border-[#1aa79c] px-[9px] py-[5px] text-[10px] font-extrabold tracking-[0.08em] text-[#8ce1d9] uppercase",
  workflow:
    "rounded-[6px] border border-[rgb(255_255_255_/_42%)] px-2 py-[5px] text-[9px] font-extrabold tracking-[0.09em] uppercase",
};

export function DemoBadge({
  children,
  variant,
}: {
  children: ReactNode;
  variant: DemoBadgeVariant;
}) {
  return <span className={variantStyles[variant]}>{children}</span>;
}
