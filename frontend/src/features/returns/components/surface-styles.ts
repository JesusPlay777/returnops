const customerContainer =
  "mx-auto w-[min(1180px,calc(100%-48px))] max-[620px]:w-[min(calc(100%-32px),1180px)]";
const customerMessageSurface =
  "mt-8 flex min-h-[170px] items-center justify-center gap-3 rounded-2xl border border-dashed border-border text-[13px] text-text-secondary";
const workflowHeadingRow = "flex items-center justify-between gap-4";

export const sharedSurfaceStyles = {
  skipLink:
    "sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-3 focus:text-[12px] focus:font-bold focus:text-ink focus:shadow-surface",
} as const;

export const customerSurfaceStyles = {
  appShell:
    "min-h-screen bg-[radial-gradient(circle_at_92%_4%,rgb(213_235_231_/_52%),transparent_24rem),var(--color-canvas)]",
  header: `${customerContainer} flex min-h-20 items-center justify-between border-b border-border max-[620px]:min-h-[70px]`,
  headerTools: "flex items-center gap-[18px]",
  roleBar: `${customerContainer} flex min-h-[62px] items-center gap-[30px]`,
  hero: `${customerContainer} grid grid-cols-[minmax(0,1fr)_minmax(300px,0.42fr)] items-end gap-[clamp(48px,10vw,132px)] py-[clamp(64px,9vw,112px)] pb-20 max-[900px]:grid-cols-1 max-[620px]:gap-9 max-[620px]:py-[54px] max-[620px]:pb-[60px]`,
  sessionCard:
    "grid grid-cols-[40px_1fr] items-start gap-[14px] rounded-[18px] border border-[#c5ddd8] bg-[rgb(255_255_255_/_66%)] p-[22px] backdrop-blur-[12px] max-[900px]:max-w-[540px]",
  returnsPanel: `${customerContainer} mb-[34px] rounded-3xl border border-border bg-surface p-[clamp(28px,5vw,52px)] shadow-surface max-[620px]:rounded-[19px] max-[620px]:px-5 max-[620px]:py-6`,
  detailPanel: `${customerContainer} mb-20 scroll-mt-6 rounded-3xl border border-border bg-surface p-[clamp(28px,5vw,52px)] shadow-surface max-[620px]:rounded-[19px] max-[620px]:px-5 max-[620px]:py-6`,
  sectionHeader:
    "flex items-end justify-between gap-6 max-[620px]:flex-col max-[620px]:items-start",
  tableFrame:
    "mt-9 overflow-x-auto rounded-2xl border border-border max-[620px]:hidden",
  mobileReturns: "hidden max-[620px]:mt-[26px] max-[620px]:grid max-[620px]:gap-[10px]",
  mobileReturnCard:
    "overflow-hidden rounded-[14px] border border-border bg-surface",
  pagination:
    "mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-[18px] max-[620px]:grid-cols-2 [&>span]:max-[620px]:col-span-full [&>span]:max-[620px]:row-start-1 [&>span]:max-[620px]:text-center [&>button]:max-[620px]:w-full",
  loadingState: customerMessageSurface,
  emptyState: customerMessageSurface,
  errorState:
    "mt-8 flex min-h-[170px] items-center justify-between gap-6 rounded-2xl border border-dashed border-[#edc8c4] bg-[#fffafa] p-6",
  detailHeader:
    "flex items-start justify-between gap-6 max-[620px]:flex-col",
  detailActions:
    "flex items-center gap-2 max-[620px]:w-full [&>button:first-child]:max-[620px]:flex-1",
  detailMeta:
    "mt-9 grid grid-cols-4 gap-7 rounded-[15px] bg-[#f5f8f7] p-6 max-[900px]:grid-cols-2 max-[620px]:grid-cols-1 max-[620px]:p-5",
  detailGrid:
    "mt-[38px] grid grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] gap-12 max-[900px]:grid-cols-1",
  detailItemList: "mt-[18px] grid gap-[10px]",
  detailItemCard:
    "flex min-h-[106px] items-center justify-between gap-6 rounded-[14px] border border-border p-5 max-[620px]:flex-col max-[620px]:items-start",
  footer: `${customerContainer} flex min-h-[90px] items-center justify-between border-t border-border text-[11px] text-text-secondary max-[620px]:min-h-[110px] max-[620px]:flex-col max-[620px]:items-start max-[620px]:justify-center max-[620px]:gap-[6px]`,
  modalBackdrop:
    "fixed inset-0 z-20 grid place-items-center bg-[rgb(10_22_20_/_58%)] p-6 backdrop-blur-[4px] max-[620px]:items-end max-[620px]:justify-items-center max-[620px]:p-3",
  catalogModal:
    "max-h-[calc(100vh-48px)] w-[min(760px,100%)] overflow-y-auto rounded-[22px] bg-surface p-8 shadow-[0_32px_100px_rgb(0_0_0_/_24%)] max-[620px]:max-h-[calc(100vh-24px)] max-[620px]:rounded-[20px] max-[620px]:px-5 max-[620px]:py-[26px]",
  modalHeader: "flex items-start justify-between gap-5",
  modalForm: "mt-[30px] grid gap-[18px]",
  catalogMessage:
    "flex min-h-[76px] items-center justify-center gap-[10px] rounded-xl border border-dashed border-border p-[18px] text-center text-[12px] leading-normal text-text-secondary",
  orderResults: "grid gap-[9px]",
  orderResultButton:
    "grid min-h-[70px] cursor-pointer grid-cols-[1fr_auto_22px] items-center gap-[18px] rounded-xl border border-border bg-[#fbfcfc] px-4 py-[13px] text-left text-ink hover:border-primary hover:bg-primary-soft",
  selectedOrder:
    "flex items-center justify-between gap-[18px] rounded-[13px] border border-[#bddbd6] bg-primary-soft p-4",
  catalogItems: "grid gap-[10px]",
  catalogItemCard:
    "overflow-hidden rounded-[13px] border border-border bg-surface data-[selected=true]:border-[#9dcfc8]",
  catalogItemHeader:
    "grid min-h-[72px] cursor-pointer grid-cols-[22px_1fr_auto] items-center gap-3 px-[15px] py-[13px]",
  catalogItemFields:
    "grid grid-cols-[130px_minmax(190px,1fr)] gap-3 border-t border-border bg-[#f9fbfa] px-[15px] pt-[14px] pb-4 pl-[49px] max-[620px]:grid-cols-1 max-[620px]:pl-[15px]",
  formError:
    "grid gap-1 rounded-[10px] bg-danger-soft px-[15px] py-[13px] text-[11px] text-danger",
  formActions:
    "mt-2 flex items-center justify-end gap-[10px] max-[620px]:grid max-[620px]:grid-cols-2",
  toast:
    "fixed right-6 bottom-6 z-30 flex min-h-[54px] items-center gap-[10px] rounded-xl border border-[#b8d8c5] bg-surface py-0 pr-3 pl-[17px] text-[12px] font-[680] text-success shadow-surface max-[620px]:right-4 max-[620px]:bottom-4 max-[620px]:left-4",
} as const;

export const workflowSurfaceStyles = {
  overlay:
    "fixed inset-0 z-50 grid items-start justify-items-center overflow-y-auto bg-[rgb(11_28_25_/_62%)] backdrop-blur-[7px] min-[860px]:py-7 motion-reduce:scroll-auto",
  shell:
    "grid min-h-screen w-[min(820px,100%)] grid-rows-[auto_auto_auto_1fr_auto] bg-canvas text-ink shadow-[0_0_90px_rgb(0_0_0_/_28%)] min-[860px]:min-h-[calc(100vh-56px)] min-[860px]:overflow-hidden min-[860px]:rounded-[22px]",
  header:
    "flex min-h-[68px] items-center gap-[14px] bg-[linear-gradient(135deg,#0f766e,#087f78)] px-[clamp(20px,5vw,40px)] text-surface max-[640px]:min-h-[62px]",
  workflowHeader:
    "grid min-h-[66px] grid-cols-[38px_1fr_auto] items-center gap-[10px] border-b border-border bg-surface px-[clamp(20px,5vw,40px)] max-[640px]:min-h-[60px]",
  progress:
    "relative grid grid-cols-3 bg-surface px-[clamp(24px,8vw,76px)] pt-7 pb-[30px] max-[640px]:px-[18px]",
  content:
    "px-[clamp(20px,6vw,48px)] pt-[clamp(30px,6vw,52px)] pb-[120px] max-[640px]:pb-[108px]",
  stepHeading:
    "flex items-end justify-between gap-6 max-[640px]:flex-col max-[640px]:items-start",
  itemList: "mt-7 grid gap-3",
  itemCard:
    "grid min-h-[108px] grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-4 rounded-[14px] border border-border bg-surface p-[19px] max-[640px]:grid-cols-[44px_1fr]",
  itemForm:
    "mt-7 rounded-2xl border border-[#b8d9d4] bg-surface p-6 shadow-[0_18px_45px_rgb(23_35_33_/_7%)]",
  formHeading: workflowHeadingRow,
  formGrid:
    "mt-[22px] grid grid-cols-[0.7fr_0.7fr_1.2fr] gap-4 max-[640px]:grid-cols-1",
  formActions: "mt-5 flex items-center justify-end gap-4",
  evidenceItems: "mt-7 grid gap-3",
  evidenceItem:
    "rounded-2xl border border-border bg-surface p-[22px]",
  evidenceItemHeader: workflowHeadingRow,
  evidenceGrid:
    "mt-5 grid grid-cols-3 gap-[10px] max-[640px]:grid-cols-1",
  evidenceCard:
    "grid min-h-[175px] content-start gap-3 rounded-xl border border-border bg-[#fbfcfc] p-4 data-[attached=true]:border-[#9bc9c2] data-[attached=true]:bg-[#f1f9f7] max-[640px]:min-h-[128px] max-[640px]:grid-cols-[38px_1fr]",
  reviewCard:
    "mt-7 overflow-hidden rounded-[15px] border border-border bg-surface",
  reviewRow:
    "grid grid-cols-[50px_minmax(0,1fr)_auto] items-center gap-[15px] border-b border-border p-[18px] max-[640px]:grid-cols-[44px_minmax(0,1fr)]",
  reviewTotals:
    "flex items-center justify-between gap-4 px-[18px] py-[15px] text-[10px] text-text-secondary",
  responseNote:
    "mt-5 grid gap-[7px] rounded-[13px] border border-[#e7c878] bg-[#fffbef] p-5 text-[10px] font-bold text-ink",
  confirmation:
    "mt-5 grid grid-cols-[22px_1fr] items-start gap-3 rounded-t-[13px] border border-border bg-surface p-[19px] text-[11px] leading-[1.55]",
  warning:
    "grid grid-cols-[28px_1fr] items-center gap-[10px] rounded-b-[13px] border border-t-0 border-[#e8cc86] bg-warning-soft px-[19px] py-[17px] text-[11px] leading-normal text-warning",
  error:
    "relative mb-[22px] grid grid-cols-1 gap-1 rounded-[10px] border border-[#edc3bf] bg-danger-soft py-[14px] pr-[46px] pl-4 text-[11px] text-danger",
  footer:
    "sticky bottom-0 z-[2] grid min-h-[84px] grid-cols-[1fr_1.3fr] items-center gap-[14px] border-t border-border bg-[rgb(255_255_255_/_96%)] px-[clamp(20px,6vw,48px)] py-4 backdrop-blur-[10px]",
} as const;

export const operationsSurfaceStyles = {
  page: "min-h-screen bg-[#f6f8f7] text-ink",
  sidebar:
    "fixed inset-y-0 left-0 z-[5] flex min-h-screen w-[232px] flex-col bg-[linear-gradient(180deg,#0b2927,#071f1d)] px-[22px] pt-7 pb-6 text-[#eef7f5] max-[760px]:hidden",
  workspace: "ml-[232px] min-h-screen max-[760px]:ml-0",
  topbar:
    "flex min-h-[78px] items-center justify-end gap-6 border-b border-border bg-[rgb(255_255_255_/_88%)] px-[clamp(28px,5vw,70px)] backdrop-blur-[10px] max-[760px]:sticky max-[760px]:top-0 max-[760px]:z-[5] max-[760px]:min-h-16 max-[760px]:gap-[10px] max-[760px]:border-b-0 max-[760px]:bg-[linear-gradient(100deg,#087c75,#006c67)] max-[760px]:px-[18px] max-[760px]:text-surface max-[420px]:overflow-x-auto",
  main:
    "mx-auto w-[min(1320px,calc(100%-64px))] pt-[46px] pb-[72px] max-[760px]:w-[min(calc(100%-28px),680px)] max-[760px]:pt-[30px]",
  stats:
    "mt-8 grid grid-cols-4 gap-4 max-[1080px]:grid-cols-2 max-[760px]:hidden",
  statCard:
    "grid min-h-[108px] cursor-pointer grid-cols-[48px_1fr] grid-rows-2 items-center gap-x-[15px] rounded-xl border border-border bg-surface p-[18px] text-left text-ink transition-[border-color,transform] duration-[120ms] ease-[ease] hover:-translate-y-px hover:border-primary data-[active=true]:-translate-y-px data-[active=true]:border-primary motion-reduce:transition-none",
  queueSection: "mt-[18px] max-[760px]:mt-6",
  filters:
    "grid grid-cols-[minmax(260px,1fr)_190px_190px_150px] gap-3 rounded-t-xl border border-border bg-surface p-[14px] max-[1080px]:grid-cols-3 max-[760px]:grid-cols-[minmax(0,1fr)_124px] max-[760px]:p-[10px] max-[420px]:grid-cols-1",
  tableFrame:
    "overflow-hidden rounded-b-xl border border-t-0 border-border bg-surface max-[760px]:hidden",
  expandedPanel:
    "overflow-hidden rounded-[10px] border border-[#cddbd8] bg-surface max-[760px]:rounded-none max-[760px]:border-x-0 max-[760px]:border-b-0",
  expandedHeader:
    "flex min-h-12 items-center justify-between gap-[18px] border-b border-border px-[18px] max-[760px]:px-[14px]",
  hierarchy:
    "relative py-0 pr-[18px] pl-12 max-[760px]:pr-[14px] max-[760px]:pl-10",
  expandedItem:
    "relative grid min-h-[84px] grid-cols-[46px_minmax(0,1fr)_auto] items-center gap-[14px] border-b border-[#e8edeb] py-[14px] last:border-b-0 max-[760px]:grid-cols-[42px_1fr]",
  mobileQueue: "hidden max-[760px]:mt-[10px] max-[760px]:grid max-[760px]:gap-[10px]",
  mobileCard:
    "overflow-hidden rounded-[11px] border border-border bg-surface",
  mobileCardHeader:
    "grid min-h-28 w-full cursor-pointer grid-cols-[30px_auto_1fr_20px] items-center gap-2 border-0 bg-surface p-4 text-left text-ink",
  queueMessage:
    "flex min-h-[180px] items-center justify-center gap-3 rounded-b-xl border border-t-0 border-border bg-surface text-[12px] text-text-secondary",
  compactMessage:
    "flex min-h-[90px] items-center justify-center gap-[10px] text-[11px] text-text-secondary",
  errorState:
    "flex min-h-[180px] items-center justify-between gap-3 rounded-b-xl border border-t-0 border-[#efc3be] bg-[#fffafa] p-6 text-[12px] text-text-secondary",
  pagination:
    "mt-[18px] grid grid-cols-[1fr_auto_1fr] items-center gap-4 max-[760px]:mb-5",
  toast:
    "fixed right-6 bottom-6 z-20 flex min-h-[50px] items-center gap-[10px] rounded-[10px] border border-[#b8d9c5] bg-surface py-0 pr-[10px] pl-4 text-[11px] font-bold text-success shadow-surface max-[760px]:right-[14px] max-[760px]:bottom-[14px] max-[760px]:left-[14px]",
} as const;

export const reviewSurfaceStyles = {
  backdrop:
    "fixed inset-0 z-50 grid place-items-center bg-[rgb(6_27_25_/_72%)] p-7 backdrop-blur-[8px] max-[900px]:p-[14px] max-[560px]:place-items-stretch max-[560px]:p-0 motion-reduce:backdrop-blur-none",
  dialog:
    "max-h-[calc(100vh-56px)] w-[min(1180px,100%)] overflow-hidden rounded-[18px] border border-[rgb(255_255_255_/_45%)] bg-[#f6f8f7] shadow-[0_30px_90px_rgb(0_0_0_/_35%)] max-[900px]:max-h-[calc(100vh-28px)] max-[560px]:max-h-screen max-[560px]:w-full max-[560px]:rounded-none max-[560px]:border-0",
  header:
    "flex min-h-[132px] items-start justify-between gap-6 border-b border-border bg-surface px-[30px] py-[26px] max-[900px]:p-[23px] max-[560px]:min-h-[142px] max-[560px]:px-[18px] max-[560px]:py-[22px]",
  body:
    "grid max-h-[calc(100vh-188px)] grid-cols-[minmax(0,1fr)_340px] items-start overflow-y-auto max-[900px]:max-h-[calc(100vh-160px)] max-[900px]:grid-cols-1 max-[560px]:max-h-[calc(100vh-142px)]",
  contentColumn:
    "min-w-0 px-[30px] pt-[26px] pb-10 max-[900px]:p-[22px] max-[560px]:px-4 max-[560px]:pt-5 max-[560px]:pb-7",
  summaryGrid:
    "grid grid-cols-5 gap-0 rounded-[11px] border border-border bg-surface p-[18px] max-[900px]:grid-cols-2 max-[900px]:gap-y-4 max-[560px]:grid-cols-1",
  titleRow:
    "mt-[7px] flex items-center gap-[13px] max-[560px]:flex-col max-[560px]:items-start max-[560px]:gap-[7px]",
  detailSection: "mt-7",
  sectionHeading: "flex items-center gap-[9px]",
  itemList: "mt-3 grid gap-3",
  itemCard:
    "grid grid-cols-[38px_minmax(0,1fr)] gap-[15px] rounded-[11px] border border-border bg-surface p-[18px] max-[560px]:grid-cols-[32px_minmax(0,1fr)] max-[560px]:gap-[11px] max-[560px]:p-[14px]",
  evidenceGrid:
    "mt-[9px] grid grid-cols-2 gap-2 max-[560px]:grid-cols-1",
  evidenceCard:
    "flex min-w-0 items-center gap-[9px] rounded-lg border border-[#dce6e3] bg-[#fafcfc] p-[10px]",
  itemTitle:
    "flex items-start justify-between gap-[18px] max-[560px]:flex-col max-[560px]:gap-[7px]",
  itemFacts:
    "mt-[14px] flex gap-[30px] max-[560px]:flex-col max-[560px]:gap-[9px]",
  decisionColumn:
    "sticky top-0 min-h-[calc(100vh-188px)] border-l border-border bg-surface px-[26px] pt-[26px] pb-10 max-[900px]:static max-[900px]:min-h-0 max-[900px]:border-t max-[900px]:border-l-0 max-[900px]:p-[22px] max-[560px]:px-4 max-[560px]:pt-5 max-[560px]:pb-7",
  confirmation:
    "mt-[14px] rounded-[9px] border border-[#ecd18f] bg-[#fffaf0] p-[13px]",
  actionError:
    "mt-[14px] rounded-[9px] border border-[#efc3be] bg-[#fff8f7] p-[13px]",
  readOnlyPanel:
    "rounded-[11px] border border-[#efd08a] bg-warning-soft px-[18px] py-6 text-center data-[status=APPROVED]:border-[#bbd9c6] data-[status=APPROVED]:bg-success-soft data-[status=REJECTED]:border-[#efc3be] data-[status=REJECTED]:bg-danger-soft",
} as const;
