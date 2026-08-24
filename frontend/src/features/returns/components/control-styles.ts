const workflowField =
  "h-11 w-full rounded-[9px] border border-border bg-surface px-3 text-[12px] text-ink outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgb(15_118_110_/_11%)]";

export const buttonStyles = {
  customerPrimary:
    "inline-flex min-h-12 cursor-pointer items-center justify-center gap-[9px] rounded-[11px] border border-primary bg-primary px-5 text-[13px] font-[720] text-on-primary transition-[background,transform] duration-150 ease-[ease] enabled:hover:-translate-y-px enabled:hover:bg-primary-dark disabled:cursor-wait disabled:opacity-55 motion-reduce:transition-none",
  customerPrimaryCompact:
    "inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-[9px] rounded-[11px] border border-primary bg-primary px-5 text-[13px] font-[720] text-on-primary transition-[background,transform] duration-150 ease-[ease] enabled:hover:-translate-y-px enabled:hover:bg-primary-dark disabled:cursor-wait disabled:opacity-55 motion-reduce:transition-none",
  customerSecondary:
    "min-h-10 cursor-pointer rounded-[9px] border border-border bg-surface px-[14px] text-[12px] font-[680] text-ink",
  customerPagination:
    "min-h-10 cursor-pointer rounded-[9px] border border-border bg-surface px-[14px] text-[12px] font-[680] text-ink disabled:cursor-not-allowed disabled:opacity-40",
  customerIcon:
    "grid size-10 flex-none cursor-pointer place-items-center rounded-full border border-border bg-surface p-0 text-[19px] font-normal text-ink",
  workflowPrimary:
    "min-h-11 cursor-pointer whitespace-nowrap rounded-[10px] border border-primary bg-primary px-[17px] text-[12px] font-[720] text-on-primary disabled:cursor-not-allowed disabled:opacity-45",
  workflowSecondary:
    "min-h-[42px] cursor-pointer rounded-[9px] border border-border bg-surface px-4 text-[11px] font-[680]",
  workflowFooterSecondary:
    "min-h-[46px] cursor-pointer rounded-[10px] border border-primary bg-surface text-[12px] font-bold text-primary-dark",
  workflowHeaderIcon:
    "size-9 cursor-pointer rounded-full border-0 bg-transparent text-[21px] text-ink",
  workflowFormIcon:
    "size-[34px] cursor-pointer rounded-full border border-border bg-surface text-[18px]",
  operationsReset:
    "h-11 w-full cursor-pointer rounded-lg border border-primary bg-surface text-[12px] font-bold text-primary-dark disabled:cursor-wait disabled:opacity-55",
  operationsSecondary:
    "min-h-[38px] cursor-pointer rounded-lg border border-border bg-surface px-[14px] text-[11px] font-bold",
  operationsPagination:
    "min-h-[38px] cursor-pointer rounded-lg border border-border bg-surface px-[13px] text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-40",
  operationsReviewClose:
    "grid size-[42px] flex-none cursor-pointer place-items-center rounded-full border border-border bg-surface text-[24px] text-ink focus-visible:[outline:3px_solid_rgb(15_118_110_/_18%)] focus-visible:outline-offset-2",
  operationsReviewPrimary:
    "mt-[14px] min-h-11 w-full cursor-pointer rounded-lg border-0 bg-primary text-[10px] font-[760] text-on-primary focus-visible:[outline:3px_solid_rgb(15_118_110_/_18%)] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-45",
  operationsConfirmationSecondary:
    "min-h-[38px] cursor-pointer rounded-[7px] border border-border bg-surface text-[8px] font-[730] focus-visible:[outline:3px_solid_rgb(15_118_110_/_18%)] focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-55",
  operationsConfirmationPrimary:
    "min-h-[38px] cursor-pointer rounded-[7px] border border-primary bg-primary text-[8px] font-[730] text-on-primary focus-visible:[outline:3px_solid_rgb(15_118_110_/_18%)] focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-55",
} as const;

export const fieldStyles = {
  customerSearch:
    "h-12 w-full rounded-[10px] border border-border bg-surface px-[14px] text-[13px] text-ink outline-none transition-[border-color,box-shadow] duration-[120ms] ease-[ease] focus:border-primary focus:shadow-[0_0_0_3px_rgb(15_118_110_/_12%)]",
  customerCatalogInput:
    "h-[42px] w-full rounded-[9px] border border-border bg-surface px-[14px] text-[11px] text-ink outline-none transition-[border-color,box-shadow] duration-[120ms] ease-[ease] focus:border-primary focus:shadow-[0_0_0_3px_rgb(15_118_110_/_12%)]",
  customerCatalogSelect:
    "h-[42px] w-full cursor-pointer rounded-[9px] border border-border bg-surface px-[10px] text-[11px] text-ink outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgb(15_118_110_/_12%)]",
  customerCheckbox:
    "size-[18px] rounded-[10px] border border-border bg-surface p-0 text-[13px] text-ink accent-primary outline-none transition-[border-color,box-shadow] duration-[120ms] ease-[ease] focus:border-primary focus:shadow-[0_0_0_3px_rgb(15_118_110_/_12%)]",
  workflowInput: workflowField,
  workflowSelect: workflowField,
  workflowTextarea:
    "w-full resize-y rounded-[9px] border border-border bg-surface p-3 text-[12px] leading-normal text-ink outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgb(15_118_110_/_11%)]",
  operationsSearch:
    "h-11 w-full rounded-lg border border-border bg-surface pr-[14px] pl-[42px] text-[12px] text-ink outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgb(15_118_110_/_10%)]",
  operationsSelect:
    "h-11 w-full cursor-pointer rounded-lg border border-border bg-surface px-3 text-[12px] text-ink outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgb(15_118_110_/_10%)]",
  operationsNote:
    "mt-[7px] w-full resize-y rounded-lg border border-border bg-surface p-[11px] text-[10px] leading-normal text-ink outline-none focus:[outline:3px_solid_rgb(15_118_110_/_18%)] focus:outline-offset-2 [&[aria-invalid=true]]:border-danger",
} as const;
