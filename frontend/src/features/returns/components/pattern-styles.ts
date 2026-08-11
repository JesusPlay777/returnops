export const customerPatternStyles = {
  brand:
    "inline-flex items-center gap-[11px] text-[16px] font-[750] tracking-[-0.025em] text-ink no-underline",
  brandMark:
    "grid size-[34px] place-items-center rounded-[10px] bg-primary text-[14px] font-extrabold text-surface",
  roleBar:
    "[&_button]:relative [&_button]:flex [&_button]:h-[62px] [&_button]:items-center [&_button]:gap-2 [&_button]:border-0 [&_button]:bg-transparent [&_button]:p-0 [&_button]:text-[13px] [&_button]:font-[650] [&_button]:text-text-secondary [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-[0.58] [&_button_span]:rounded-full [&_button_span]:bg-border [&_button_span]:px-[6px] [&_button_span]:py-[3px] [&_button_span]:text-[8px] [&_button_span]:tracking-[0.08em] [&_button_span]:uppercase",
  roleActive:
    "text-ink! after:absolute after:right-0 after:bottom-[-1px] after:left-0 after:h-0.5 after:bg-primary after:content-['']",
  hero:
    "[&>div]:min-w-0 [&_h1]:mt-[18px] [&_h1]:max-w-[790px] [&_h1]:text-[clamp(48px,6.7vw,80px)] [&_h1]:leading-[0.98] [&_h1]:font-[610] [&_h1]:tracking-[-0.064em] [&_h1]:[text-wrap:balance] [&_h1]:max-[620px]:text-[clamp(40px,12.5vw,56px)]",
  eyebrow:
    "text-[11px] leading-[1.4] font-[780] tracking-[0.12em] text-primary uppercase",
  intro:
    "mt-[26px] max-w-[650px] text-[clamp(16px,1.6vw,19px)] leading-[1.65] text-text-secondary",
  sessionCard:
    "[&_strong]:text-[13px] [&_strong]:font-bold [&_p]:mt-[6px] [&_p]:text-[12px] [&_p]:leading-normal [&_p]:text-text-secondary",
  sessionIcon:
    "grid size-10 place-items-center rounded-full bg-primary-soft text-[14px] font-extrabold text-primary-dark",
  sectionHeader:
    "[&_h2]:mt-2 [&_h2]:text-[clamp(26px,3vw,36px)] [&_h2]:font-[620] [&_h2]:tracking-[-0.045em] [&>p]:text-[12px] [&>p]:text-text-secondary",
  tableFrame:
    "[&_table]:w-full [&_table]:min-w-[850px] [&_table]:border-collapse [&_table]:text-left [&_th]:h-[54px] [&_th]:bg-[#f8faf9] [&_th]:px-[18px] [&_th]:text-[10px] [&_th]:font-[750] [&_th]:tracking-[0.075em] [&_th]:text-text-secondary [&_th]:uppercase [&_td]:h-[76px] [&_td]:whitespace-nowrap [&_td]:border-t [&_td]:border-[#e6ebe9] [&_td]:px-[18px] [&_td]:text-[13px] [&_td]:text-ink [&_tbody_tr]:transition-colors [&_tbody_tr]:duration-[120ms] [&_tbody_tr]:ease-[ease] [&_tbody_tr:hover]:bg-[#f8fbfa]",
  referenceButton:
    "cursor-pointer border-0 bg-transparent font-[750] text-primary hover:underline hover:underline-offset-[3px]",
  viewButton:
    "grid size-[34px] cursor-pointer place-items-center rounded-full border border-border bg-transparent font-[750] text-primary",
  updatedCell: "text-[12px]! text-text-secondary!",
  pagination: "[&>span]:text-[11px] [&>span]:text-text-secondary",
  errorState:
    "[&_strong]:text-[13px] [&_strong]:text-danger [&_p]:mt-[6px] [&_p]:text-[12px] [&_p]:text-text-secondary",
  detailHeader:
    "[&_h2]:mt-2 [&_h2]:text-[clamp(26px,3vw,36px)] [&_h2]:font-[620] [&_h2]:tracking-[-0.045em] [&>div:first-child>p:last-child]:mt-[10px] [&>div:first-child>p:last-child]:text-[13px] [&>div:first-child>p:last-child]:leading-[1.55] [&>div:first-child>p:last-child]:text-text-secondary",
  detailReference: "flex items-center gap-[14px]",
  detailMeta:
    "[&_dt]:text-[10px] [&_dt]:font-[720] [&_dt]:tracking-[0.06em] [&_dt]:text-text-secondary [&_dt]:uppercase [&_dd]:mt-2 [&_dd]:overflow-hidden [&_dd]:text-ellipsis [&_dd]:text-[13px] [&_dd]:font-[650]",
  detailGrid:
    "[&_h3]:text-[15px] [&_h3]:font-bold [&_h3]:tracking-[-0.02em]",
  itemCard:
    "[&_span]:text-[10px] [&_span]:font-[680] [&_span]:tracking-[0.04em] [&_span]:text-text-secondary [&_h4]:mt-[7px] [&_h4]:text-[14px] [&_h4]:font-[680] [&_p]:mt-[6px] [&_p]:text-[11px] [&_p]:text-text-secondary",
  itemValue:
    "grid flex-none gap-2 text-right [&_strong]:text-[13px] max-[620px]:w-full max-[620px]:text-left",
  timeline:
    "mt-[22px] list-none [&_li]:relative [&_li]:grid [&_li]:min-h-[92px] [&_li]:grid-cols-[20px_1fr] [&_li]:gap-3 [&_li]:pb-6 [&_li]:before:absolute [&_li]:before:top-[10px] [&_li]:before:bottom-[-2px] [&_li]:before:left-[5px] [&_li]:before:w-px [&_li]:before:bg-border [&_li]:before:content-[''] [&_li:last-child]:before:hidden [&_li>span]:relative [&_li>span]:z-[1] [&_li>span]:mt-[3px] [&_li>span]:size-[11px] [&_li>span]:rounded-full [&_li>span]:border-[3px] [&_li>span]:border-surface [&_li>span]:bg-primary [&_li>span]:shadow-[0_0_0_1px_var(--color-primary)] [&_strong]:text-[12px] [&_p]:mt-[5px] [&_p]:block [&_p]:text-[11px] [&_p]:leading-[1.45] [&_p]:text-text-secondary [&_time]:mt-[5px] [&_time]:block [&_time]:text-[11px] [&_time]:leading-[1.45] [&_time]:text-text-secondary",
  footer: "[&>span:first-child]:font-[750] [&>span:first-child]:text-ink",
  modal:
    "[&_h2]:mt-2 [&_h2]:text-[clamp(26px,3vw,36px)] [&_h2]:font-[620] [&_h2]:tracking-[-0.045em] [&_label]:grid [&_label]:gap-2 [&_label]:text-[11px] [&_label]:font-[680] [&_label]:text-ink",
  modalHeader:
    "[&_p:last-child]:mt-[10px] [&_p:last-child]:text-[13px] [&_p:last-child]:leading-[1.55] [&_p:last-child]:text-text-secondary",
  orderResults:
    "[&>strong]:mb-0.5 [&>strong]:text-[11px] [&>strong]:font-[750] [&>strong]:tracking-[0.055em] [&>strong]:uppercase [&>button_span]:grid [&>button_span]:gap-[5px] [&>button_span:nth-child(2)]:text-center [&_b]:text-[13px] [&_small]:text-[10px] [&_small]:text-text-secondary",
  selectedOrder:
    "[&>div]:grid [&>div]:gap-1 [&_small]:text-[10px] [&_small]:text-text-secondary [&_span]:text-[10px] [&_span]:text-text-secondary [&_strong]:text-[13px]",
  compactAction:
    "min-h-[34px] cursor-pointer rounded-lg border border-border bg-surface px-[11px] text-[10px] font-bold text-primary-dark",
  catalogItems:
    "[&>h3]:mb-0.5 [&>h3]:text-[11px] [&>h3]:font-[750] [&>h3]:tracking-[0.055em] [&>h3]:uppercase",
  catalogItemHeader:
    "[&>span]:grid [&>span]:gap-[5px] [&_b]:text-[12px] [&_small]:text-[10px] [&_small]:font-medium [&_small]:text-text-secondary [&>strong]:text-[12px]",
  catalogDetails: "col-span-full max-[620px]:col-span-1",
  formError: "[&_button]:mt-[5px] [&_button]:justify-self-start",
  toastClose:
    "size-[30px] cursor-pointer rounded-full border-0 bg-transparent text-[18px] text-text-secondary",
  mobileReturnCard:
    "[&>button]:grid [&>button]:w-full [&>button]:cursor-pointer [&>button]:gap-[10px] [&>button]:border-0 [&>button]:bg-transparent [&>button]:p-[17px] [&>button]:text-left [&>button]:text-ink",
  mobileReturnTop:
    "flex items-center justify-between gap-3 [&>strong]:text-[15px] [&>strong]:text-primary",
  mobileCustomerName: "text-[13px]",
  mobileReturnMeta:
    "flex flex-wrap gap-x-[14px] gap-y-[6px] text-[11px] leading-[1.45] text-text-secondary",
} as const;

export const workflowPatternStyles = {
  brand: "mr-auto text-[21px] font-[760] tracking-[-0.04em]",
  locale:
    "border-l border-[rgb(255_255_255_/_30%)] pl-[14px] text-[11px] font-bold",
  workflowHeader:
    "[&_strong]:text-[14px] [&>span]:text-[12px] [&>span]:font-bold [&>span]:text-text-secondary",
  progress:
    "before:absolute before:top-[47px] before:right-[18%] before:left-[18%] before:h-0.5 before:bg-[#b7d9d4] before:content-[''] max-[640px]:before:right-[19%] max-[640px]:before:left-[19%]",
  progressButton:
    "relative z-[1] grid cursor-pointer justify-items-center gap-2 border-0 bg-transparent text-[11px] font-bold text-primary-dark disabled:cursor-not-allowed disabled:opacity-42 [&>span]:grid [&>span]:size-10 [&>span]:place-items-center [&>span]:rounded-full [&>span]:border-2 [&>span]:border-primary [&>span]:bg-surface [&>span]:text-[13px] [&>span]:text-primary",
  progressButtonActive: "[&>span]:bg-primary! [&>span]:text-surface!",
  stepHeading:
    "[&_h1]:text-[clamp(28px,5vw,38px)] [&_h1]:leading-[1.05] [&_h1]:font-[630] [&_h1]:tracking-[-0.045em] [&_p]:mt-3 [&_p]:max-w-[570px] [&_p]:text-[13px] [&_p]:leading-[1.6] [&_p]:text-text-secondary",
  itemIcon:
    "grid size-[50px] place-items-center rounded-[11px] bg-primary-soft text-[22px] text-primary max-[640px]:size-11",
  itemCopy:
    "[&>span]:text-[9px] [&>span]:font-[750] [&>span]:tracking-[0.06em] [&>span]:text-text-secondary [&>span]:uppercase [&_h2]:mt-[5px] [&_h2]:text-[14px] [&_h2]:font-bold [&_p]:mt-[7px] [&_p]:text-[11px] [&_p]:leading-[1.45] [&_p]:text-text-secondary",
  itemActions:
    "grid grid-cols-[auto_auto] justify-items-end gap-x-3 gap-y-[5px] [&_strong]:col-span-full [&_strong]:text-[12px] [&_button]:cursor-pointer [&_button]:border-0 [&_button]:bg-transparent [&_button]:text-[10px] [&_button]:font-bold [&_button]:text-danger max-[640px]:col-start-2 max-[640px]:grid-cols-[1fr_auto_auto] max-[640px]:justify-items-start max-[640px]:[&_strong]:col-span-1",
  formHeading: "[&_h2]:text-[17px] [&_h2]:font-[680]",
  formGrid:
    "[&_label]:grid [&_label]:gap-[7px] [&_label]:text-[10px] [&_label]:font-bold [&_label]:text-ink",
  fullField: "col-span-full max-[640px]:col-span-1",
  evidenceItemHeader:
    "[&_span]:text-[9px] [&_span]:font-[750] [&_span]:tracking-[0.06em] [&_span]:text-text-secondary [&_span]:uppercase [&_h2]:mt-[5px] [&_h2]:text-[14px] [&_h2]:font-bold [&_small]:text-[10px] [&_small]:text-text-secondary",
  evidenceCard:
    "[&_strong]:text-[11px] [&_p]:mt-[5px] [&_p]:text-[9px] [&_p]:leading-normal [&_p]:text-text-secondary [&_button]:mt-auto [&_button]:cursor-pointer [&_button]:self-end [&_button]:justify-self-start [&_button]:border-0 [&_button]:bg-transparent [&_button]:p-0 [&_button]:text-left [&_button]:text-[10px] [&_button]:font-bold [&_button]:text-primary-dark max-[640px]:[&_button]:col-start-2",
  evidenceIcon:
    "grid size-[38px] place-items-center rounded-[9px] bg-primary-soft text-[17px] text-primary-dark",
  orderSummary:
    "[&>span]:grid [&>span]:size-[50px] [&>span]:place-items-center [&>span]:rounded-[11px] [&>span]:bg-primary-soft [&>span]:text-[22px] [&>span]:text-primary [&_small]:text-[9px] [&_small]:font-bold [&_small]:tracking-[0.06em] [&_small]:text-text-secondary [&_small]:uppercase [&_h2]:mt-[3px] [&_h2]:text-[15px] [&_p]:mt-[6px] [&_p]:text-[11px] [&_p]:text-text-secondary max-[640px]:[&>span]:size-11",
  reviewItem:
    "[&>span]:grid [&>span]:size-[50px] [&>span]:place-items-center [&>span]:rounded-[11px] [&>span]:bg-primary-soft [&>span]:text-[22px] [&>span]:text-primary [&_h3]:text-[13px] [&_p]:mt-[7px] [&_p]:text-[11px] [&_p]:leading-[1.45] [&_p]:text-text-secondary [&>strong]:text-[12px] max-[640px]:[&>span]:size-11 max-[640px]:[&>strong]:col-start-2",
  reviewTotals: "[&_strong]:text-[14px] [&_strong]:text-ink",
  responseNote:
    "[&>span]:font-normal [&>span]:leading-normal [&>span]:text-text-secondary",
  confirmation: "[&_input]:size-5 [&_input]:accent-primary",
  warningIcon:
    "grid size-[25px] place-items-center rounded-full border border-current font-extrabold",
  errorClose:
    "absolute top-1/2 right-[10px] size-7 -translate-y-1/2 cursor-pointer border-0 bg-transparent text-danger",
} as const;

export const operationsPatternStyles = {
  sidebar:
    "[&_nav]:mt-12 [&_nav]:-mx-[14px] [&_nav]:grid [&_nav]:gap-[6px] [&_nav_span]:grid [&_nav_span]:min-h-[52px] [&_nav_span]:grid-cols-[24px_1fr] [&_nav_span]:items-center [&_nav_span]:gap-[10px] [&_nav_span]:rounded-[7px] [&_nav_span]:border-0 [&_nav_span]:bg-transparent [&_nav_span]:px-[14px] [&_nav_span]:text-left [&_nav_span]:text-[13px] [&_nav_span]:text-[#c6d4d1] [&_nav_button]:grid [&_nav_button]:min-h-[52px] [&_nav_button]:cursor-pointer [&_nav_button]:grid-cols-[24px_1fr] [&_nav_button]:items-center [&_nav_button]:gap-[10px] [&_nav_button]:rounded-[7px] [&_nav_button]:border-0 [&_nav_button]:bg-transparent [&_nav_button]:px-[14px] [&_nav_button]:text-left [&_nav_button]:text-[13px] [&_nav_button]:text-[#c6d4d1] [&_nav_b]:text-center [&_nav_b]:text-[17px] [&_nav_b]:font-normal",
  sidebarBrand: "text-[25px] font-[760] tracking-[-0.045em]",
  navActive:
    "bg-[#0b756e]! text-surface! shadow-[inset_3px_0_#27c1b4]",
  switchRole:
    "mt-auto flex min-h-12 cursor-pointer items-center justify-between rounded-lg border border-[#67807c] bg-transparent px-[14px] text-[12px] text-[#eef7f5]",
  mobileBrand:
    "hidden max-[760px]:mr-auto max-[760px]:inline max-[760px]:text-[20px] max-[760px]:font-[760] max-[760px]:tracking-[-0.04em]",
  roleButton:
    "min-h-10 rounded-[7px] border border-primary bg-surface px-5 text-[11px] font-[750] tracking-[0.04em] text-primary-dark uppercase max-[760px]:min-h-[34px] max-[760px]:border-[rgb(255_255_255_/_38%)] max-[760px]:bg-[rgb(0_0_0_/_8%)] max-[760px]:px-[10px] max-[760px]:text-surface",
  mobileSwitch: "hidden",
  heading:
    "[&_p]:text-[10px] [&_p]:font-extrabold [&_p]:tracking-[0.1em] [&_p]:text-primary [&_p]:uppercase [&_h1]:mt-2 [&_h1]:text-[clamp(32px,4vw,46px)] [&_h1]:font-[650] [&_h1]:tracking-[-0.045em] [&_h1]:max-[760px]:text-[31px] [&_span]:mt-[10px] [&_span]:block [&_span]:text-[14px] [&_span]:text-text-secondary [&_span]:max-[760px]:text-[12px] [&_span]:max-[760px]:leading-normal",
  stats:
    "[&_strong]:self-end [&_strong]:text-[26px] [&_strong]:font-[650] [&_small]:self-start [&_small]:text-[11px] [&_small]:text-text-secondary",
  statIcon:
    "row-span-2 grid size-12 place-items-center rounded-full bg-primary-soft text-[19px] text-primary-dark data-[status=NEEDS_INFORMATION]:bg-warning-soft data-[status=NEEDS_INFORMATION]:text-warning data-[status=APPROVED]:bg-success-soft data-[status=APPROVED]:text-success data-[status=REJECTED]:bg-danger-soft data-[status=REJECTED]:text-danger",
  filters: "[&>label]:block",
  searchField:
    "relative max-[1080px]:col-span-full max-[760px]:col-span-1 max-[420px]:col-span-1",
  searchIcon:
    "absolute top-1/2 left-[14px] -translate-y-1/2 text-[20px] font-normal text-text-secondary",
  thirdFilter:
    "max-[760px]:col-start-1 max-[420px]:col-span-1",
  resetButton:
    "max-[1080px]:col-start-3 max-[760px]:col-start-2 max-[420px]:col-start-1",
  tableFrame:
    "[&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_th]:h-[52px] [&_th]:bg-[#fafbfb] [&_th]:px-[18px] [&_th]:text-[9px] [&_th]:font-[780] [&_th]:tracking-[0.07em] [&_th]:text-text-secondary [&_th]:uppercase [&_td]:h-[66px] [&_td]:whitespace-nowrap [&_td]:border-t [&_td]:border-[#e6ebe9] [&_td]:px-[18px] [&_td]:text-[12px] [&_tbody_tr[data-expanded=true]]:bg-[#f2f8f7] [&_td:last-child]:text-[11px] [&_td:last-child]:text-text-secondary",
  rowToggle:
    "inline-flex cursor-pointer items-center gap-3 border-0 bg-transparent text-[13px] font-[760] text-primary-dark [&>span]:grid [&>span]:size-[22px] [&>span]:place-items-center [&>span]:text-[20px]",
  expandedRow:
    "[&>td]:h-auto [&>td]:whitespace-normal [&>td]:bg-[#f2f8f7] [&>td]:px-[10px] [&>td]:pt-0 [&>td]:pb-[10px]",
  expandedHeader:
    "[&_strong]:text-[10px] [&_strong]:tracking-[0.045em] [&_strong]:uppercase [&_button]:cursor-pointer [&_button]:border-0 [&_button]:bg-transparent [&_button]:text-[11px] [&_button]:font-bold [&_button]:text-primary-dark [&_button:hover]:underline [&_button:hover]:underline-offset-[3px]",
  hierarchy:
    "before:absolute before:inset-y-0 before:left-[27px] before:w-px before:bg-[#a9c8c4] before:content-[''] max-[760px]:before:left-[22px]",
  expandedItem:
    "before:absolute before:top-1/2 before:left-[-21px] before:h-px before:w-5 before:bg-[#a9c8c4] before:content-[''] max-[760px]:before:left-[-18px] max-[760px]:before:w-[17px]",
  productIcon:
    "grid size-[46px] place-items-center rounded-[9px] border border-border bg-[#fbfcfc] text-[20px] text-primary max-[760px]:size-[42px]",
  productCopy:
    "[&_strong]:text-[12px] [&_p]:mt-[6px] [&_p]:text-[10px] [&_p]:leading-[1.4] [&_p]:text-text-secondary",
  evidenceCount:
    "rounded-[6px] border border-[#b8d9d4] bg-primary-soft px-[9px] py-[6px] text-[9px] font-[760] text-primary-dark uppercase max-[760px]:col-start-2 max-[760px]:justify-self-start",
  evidenceList:
    "col-start-2 col-end-4 flex flex-wrap gap-[7px] [&_span]:rounded-[6px] [&_span]:bg-[#f0f3f2] [&_span]:px-2 [&_span]:py-[6px] [&_span]:text-[9px] [&_span]:text-text-secondary max-[760px]:col-end-3",
  evidenceNote:
    "border-t border-border bg-[#fafbfb] px-[18px] py-3 text-[10px] text-text-secondary",
  mobileCardHeader:
    "[&>strong]:text-[17px] [&_small]:col-start-2 [&_small]:col-end-5 [&_small]:text-[9px] [&_small]:text-text-secondary",
  mobileChevron:
    "row-span-2 grid size-[30px] place-items-center rounded-[7px] bg-primary-soft text-primary-dark",
  mobileMenu: "justify-self-end text-[20px]",
  mobileCustomer: "col-start-2 col-end-5 text-[12px] font-[650]",
  errorState:
    "[&_strong]:text-[12px] [&_strong]:text-danger [&_p]:mt-[5px] [&_p]:text-[10px]",
  inlineError: "p-[22px] text-[11px] text-danger",
  pagination: "[&>span]:text-[10px] [&>span]:text-text-secondary",
  toastClose:
    "size-7 cursor-pointer border-0 bg-transparent text-[17px]",
} as const;

export const reviewPatternStyles = {
  header:
    "[&_p]:text-[9px] [&_p]:font-extrabold [&_p]:tracking-[0.11em] [&_p]:text-primary [&_p]:uppercase [&>div>span]:mt-[7px] [&>div>span]:block [&>div>span]:text-[11px] [&>div>span]:text-text-secondary",
  titleRow:
    "[&_h2]:text-[clamp(27px,3vw,38px)] [&_h2]:font-[670] [&_h2]:tracking-[-0.045em]",
  summaryGrid:
    "[&>div]:min-w-0 [&>div]:border-r [&>div]:border-border [&>div]:px-[15px] [&>div:first-child]:pl-0 [&>div:last-child]:border-r-0 [&>div:last-child]:pr-0 [&_dt]:text-[8px] [&_dt]:font-[780] [&_dt]:tracking-[0.08em] [&_dt]:text-text-secondary [&_dt]:uppercase [&_dd]:mt-[7px] [&_dd]:overflow-hidden [&_dd]:text-ellipsis [&_dd]:whitespace-nowrap [&_dd]:text-[10px] [&_dd]:font-bold max-[900px]:[&>div]:border-r-0 max-[900px]:[&>div:nth-child(odd)]:border-r max-[900px]:[&>div:nth-child(odd)]:border-border max-[900px]:[&>div:nth-child(odd)]:pl-0 max-[560px]:[&>div]:border-r-0 max-[560px]:[&>div]:border-b max-[560px]:[&>div]:border-border max-[560px]:[&>div]:p-0 max-[560px]:[&>div]:pb-3 max-[560px]:[&>div:nth-child(odd)]:border-r-0 max-[560px]:[&>div:last-child]:border-b-0 max-[560px]:[&>div:last-child]:pb-0",
  sectionHeading:
    "[&>span]:grid [&>span]:size-[29px] [&>span]:place-items-center [&>span]:rounded-lg [&>span]:bg-primary-soft [&>span]:text-[13px] [&>span]:text-primary-dark [&_h3]:text-[13px] [&_h3]:font-[730]",
  itemNumber:
    "grid size-[38px] place-items-center rounded-[9px] bg-primary-soft text-[10px] font-extrabold text-primary-dark max-[560px]:size-8",
  itemTitle:
    "[&_h4]:text-[13px] [&_h4]:font-[730] [&_span]:mt-1 [&_span]:block [&_span]:text-[9px] [&_span]:text-text-secondary [&>strong]:text-[12px] [&>strong]:text-primary-dark",
  itemFacts:
    "[&_dt]:text-[8px] [&_dt]:font-[780] [&_dt]:tracking-[0.08em] [&_dt]:text-text-secondary [&_dt]:uppercase [&_dd]:mt-1 [&_dd]:text-[10px] [&_dd]:font-[650]",
  detailBlock:
    "mt-[15px] border-t border-[#e8edeb] pt-[14px] [&>strong]:text-[9px] [&>strong]:tracking-[0.035em] [&>strong]:uppercase [&>p]:mt-[6px] [&>p]:text-[10px] [&>p]:leading-[1.55] [&>p]:text-text-secondary",
  evidenceCard:
    "[&>span]:grid [&>span]:size-[30px] [&>span]:flex-none [&>span]:place-items-center [&>span]:rounded-[7px] [&>span]:bg-primary-soft [&>span]:text-primary [&_div]:min-w-0 [&_strong]:block [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_strong]:text-[9px] [&_small]:mt-[3px] [&_small]:block [&_small]:overflow-hidden [&_small]:text-ellipsis [&_small]:whitespace-nowrap [&_small]:text-[8px] [&_small]:text-text-secondary",
  timeline:
    "mt-[14px] ml-3 list-none border-l border-[#bdd3cf] pl-[22px] [&_li]:relative [&_li]:pb-5 [&_li:last-child]:pb-0 [&_strong]:block [&_strong]:text-[10px] [&_small]:mt-[3px] [&_small]:block [&_small]:text-[8px] [&_small]:text-text-secondary [&_p]:mt-[5px] [&_p]:text-[9px] [&_p]:leading-[1.45] [&_p]:text-text-secondary",
  timelineDot:
    "absolute top-0.5 left-[-28px] size-[11px] rounded-full border-[3px] border-[#f6f8f7] bg-primary shadow-[0_0_0_1px_#8bb9b3] data-[status=NEEDS_INFORMATION]:bg-warning data-[status=APPROVED]:bg-success data-[status=REJECTED]:bg-danger",
  panelEyebrow:
    "text-[9px] font-extrabold tracking-[0.11em] text-primary uppercase",
  panelTitle: "mt-[7px] text-[20px] font-[670] tracking-[-0.03em]",
  decisionIntro: "mt-[9px] text-[10px] leading-[1.55] text-text-secondary",
  decisionOptions: "mt-5 grid gap-2",
  decisionButton:
    "grid min-h-[68px] w-full cursor-pointer grid-cols-[36px_minmax(0,1fr)] items-center gap-[10px] rounded-[9px] border border-border bg-surface p-[11px] text-left text-ink focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[rgb(15_118_110_/_18%)] data-[active=true]:border-primary data-[active=true]:shadow-[0_0_0_2px_rgb(15_118_110_/_10%)]",
  decisionIcon:
    "grid size-9 place-items-center rounded-lg bg-primary-soft text-[14px] font-extrabold text-primary-dark data-[decision=APPROVED]:bg-success-soft data-[decision=APPROVED]:text-success data-[decision=REJECTED]:bg-danger-soft data-[decision=REJECTED]:text-danger",
  decisionCopy:
    "[&_strong]:block [&_strong]:text-[10px] [&_small]:mt-1 [&_small]:block [&_small]:text-[8px] [&_small]:leading-[1.35] [&_small]:text-text-secondary",
  noteField:
    "mt-[18px] [&_label]:flex [&_label]:items-center [&_label]:justify-between [&_label]:gap-3 [&_label]:text-[9px] [&_label]:font-[750] [&_label_span]:text-[7px] [&_label_span]:font-semibold [&_label_span]:text-text-secondary",
  noteMeta:
    "mt-1 flex min-h-[18px] justify-between gap-[10px] text-[8px] text-danger [&_small]:ml-auto [&_small]:text-text-secondary",
  feedback:
    "[&>strong]:block [&>strong]:text-[9px] [&>p]:mt-[5px] [&>p]:block [&>p]:text-[8px] [&>p]:leading-[1.45] [&>p]:text-text-secondary [&>span]:mt-[5px] [&>span]:block [&>span]:text-[8px] [&>span]:leading-[1.45] [&>span]:text-text-secondary",
  confirmationActions:
    "mt-3 grid grid-cols-[1fr_1.35fr] gap-[7px]",
  actionError: "[&>strong]:text-danger",
  readOnlyPanel:
    "[&_h3]:mt-[7px] [&_h3]:text-[20px] [&_h3]:font-[670] [&_h3]:tracking-[-0.03em]",
  readOnlyIcon:
    "mx-auto mb-[14px] grid size-[46px] place-items-center rounded-full bg-surface text-[18px] font-extrabold text-warning data-[status=APPROVED]:text-success data-[status=REJECTED]:text-danger",
  readOnlyEyebrow:
    "text-[8px] font-extrabold tracking-[0.07em] text-warning uppercase data-[status=APPROVED]:text-success data-[status=REJECTED]:text-danger",
  readOnlyCopy:
    "mt-[9px] block text-[9px] leading-[1.55] text-text-secondary",
} as const;
