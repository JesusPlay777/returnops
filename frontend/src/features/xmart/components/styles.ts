export const xmartControlStyles = {
  primary:
    "inline-flex min-h-12 cursor-pointer items-center justify-center gap-3 rounded-full border border-primary bg-primary px-6 text-[13px] font-[750] text-on-primary transition-[transform,background] duration-150 enabled:hover:-translate-y-px enabled:hover:bg-primary-dark disabled:cursor-wait disabled:opacity-50 motion-reduce:transition-none",
  secondary:
    "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-border bg-surface px-5 text-[12px] font-[720] text-ink transition-colors hover:border-primary hover:text-primary-dark disabled:cursor-wait disabled:opacity-50",
} as const;

export const xmartSurfaceStyles = {
  app: "min-h-screen overflow-hidden bg-canvas",
  skipLink:
    "sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-3 focus:text-[12px] focus:font-bold focus:text-ink focus:shadow-surface",
  header:
    "mx-auto flex min-h-[78px] w-[min(1180px,calc(100%-48px))] items-center justify-between gap-5 border-b border-border max-[620px]:w-[calc(100%-32px)]",
  headerTools: "flex items-center gap-3",
  main:
    "mx-auto w-[min(1180px,calc(100%-48px))] pb-20 max-[620px]:w-[calc(100%-32px)]",
  hero:
    "grid grid-cols-[minmax(0,1.12fr)_minmax(320px,0.68fr)] items-center gap-[clamp(42px,8vw,104px)] py-[clamp(64px,9vw,108px)] max-[860px]:grid-cols-1 max-[620px]:py-14",
  heroActions: "mt-8 flex flex-wrap items-center gap-3",
  scenarioCard:
    "relative overflow-hidden rounded-[28px] border border-primary/45 bg-primary p-[clamp(26px,4vw,38px)] text-on-primary shadow-[0_28px_80px_rgb(15_118_110_/_20%)]",
  scenarioGrid:
    "relative z-10 mt-7 grid gap-px overflow-hidden rounded-2xl bg-on-primary/20",
  scenarioRow:
    "grid grid-cols-[96px_minmax(0,1fr)] gap-4 bg-primary-dark/60 p-4 max-[420px]:grid-cols-1 max-[420px]:gap-1",
  section:
    "mt-6 rounded-[28px] border border-border bg-surface p-[clamp(24px,4vw,44px)] shadow-surface max-[620px]:rounded-[20px]",
  sectionHeader:
    "flex items-end justify-between gap-8 max-[720px]:flex-col max-[720px]:items-start",
  pipeline:
    "mt-9 grid list-none grid-cols-5 overflow-hidden rounded-2xl border border-border max-[900px]:grid-cols-1",
  stage:
    "relative min-h-[154px] border-r border-border p-5 last:border-r-0 data-[state=complete]:bg-primary-soft data-[state=current]:bg-warning-soft max-[900px]:min-h-0 max-[900px]:border-r-0 max-[900px]:border-b max-[900px]:last:border-b-0",
  workspace:
    "mt-6 grid grid-cols-[minmax(0,1.05fr)_minmax(320px,0.75fr)] gap-6 max-[920px]:grid-cols-1",
  panel:
    "rounded-[28px] border border-border bg-surface p-[clamp(24px,4vw,38px)] shadow-surface max-[620px]:rounded-[20px]",
  capacityGrid:
    "mt-7 grid grid-cols-3 gap-3 max-[680px]:grid-cols-1",
  capacityCard:
    "rounded-2xl border border-border bg-surface-subtle p-5",
  meterTrack:
    "mt-5 h-2 overflow-hidden rounded-full bg-primary-soft",
  meterFill:
    "h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none",
  moduleList: "mt-6 flex list-none flex-wrap gap-2",
  module:
    "rounded-full border border-primary/20 bg-primary-soft px-3 py-2 text-[10px] font-[720] text-primary-dark",
  provisioningStack: "mt-7 grid gap-3",
  record:
    "rounded-2xl border border-border bg-surface-subtle p-5",
  recordHeader: "flex items-start justify-between gap-4",
  recordGrid:
    "mt-5 grid grid-cols-2 gap-x-5 gap-y-4 max-[480px]:grid-cols-1",
  auditPanel:
    "mt-6 rounded-[28px] border border-border bg-surface p-[clamp(24px,4vw,38px)] shadow-surface max-[620px]:rounded-[20px]",
  auditList:
    "mt-7 grid list-none grid-cols-2 gap-3 max-[760px]:grid-cols-1",
  auditEvent:
    "grid grid-cols-[36px_minmax(0,1fr)] gap-4 rounded-2xl border border-border bg-surface-subtle p-5",
  auditSequence:
    "grid size-9 place-items-center rounded-full bg-primary-soft text-[10px] font-[780] text-primary-dark",
  stateMessage:
    "mt-8 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center",
  footer:
    "mx-auto flex min-h-20 w-[min(1180px,calc(100%-48px))] items-center justify-between gap-6 border-t border-border text-[11px] text-text-secondary max-[620px]:w-[calc(100%-32px)] max-[620px]:flex-col max-[620px]:justify-center max-[620px]:py-6",
} as const;

export const xmartPatternStyles = {
  brand:
    "flex items-center gap-3 no-underline [&>span:first-child]:grid [&>span:first-child]:size-9 [&>span:first-child]:place-items-center [&>span:first-child]:rounded-xl [&>span:first-child]:bg-primary [&>span:first-child]:text-[11px] [&>span:first-child]:font-extrabold [&>span:first-child]:text-on-primary [&>strong]:text-[14px] [&>strong]:font-[750]",
  eyebrow:
    "text-[11px] font-[780] tracking-[0.13em] text-primary-dark uppercase",
  heroTitle:
    "mt-5 max-w-[760px] text-[clamp(44px,6.2vw,82px)] leading-[0.98] font-[690] tracking-[-0.055em] text-ink",
  heroCopy:
    "mt-6 max-w-[680px] text-[clamp(16px,1.7vw,21px)] leading-[1.55] text-text-secondary",
  architectureNote:
    "inline-flex items-center gap-2 text-[11px] font-[720] text-primary-dark before:size-2 before:rounded-full before:bg-success",
  scenarioLabel:
    "text-[10px] font-[760] tracking-[0.12em] text-on-primary/70 uppercase",
  scenarioTitle:
    "mt-3 text-[28px] leading-[1.15] font-[680] tracking-[-0.03em]",
  scenarioMeta: "mt-3 text-[12px] leading-[1.6] text-on-primary/75",
  scenarioRow:
    "[&>dt]:text-[9px] [&>dt]:tracking-[0.1em] [&>dt]:text-on-primary/60 [&>dt]:uppercase [&>dd]:min-w-0 [&>dd]:overflow-wrap-anywhere [&>dd]:text-[12px] [&>dd]:font-[680]",
  sectionTitle:
    "mt-2 text-[clamp(28px,4vw,44px)] leading-[1.05] font-[680] tracking-[-0.04em]",
  sectionCopy:
    "mt-3 max-w-[690px] text-[13px] leading-[1.65] text-text-secondary",
  stage:
    "[&>span]:text-[9px] [&>span]:font-[780] [&>span]:tracking-[0.12em] [&>span]:text-text-secondary [&>span]:uppercase [&>strong]:mt-8 [&>strong]:block [&>strong]:text-[13px] [&>strong]:font-[720] [&>p]:mt-2 [&>p]:text-[11px] [&>p]:leading-[1.55] [&>p]:text-text-secondary data-[state=complete]:[&>span]:text-primary-dark data-[state=current]:[&>span]:text-warning",
  panelEyebrow:
    "text-[9px] font-[780] tracking-[0.12em] text-primary-dark uppercase",
  panelTitle:
    "mt-2 text-[25px] font-[680] tracking-[-0.03em] text-ink",
  capacity:
    "[&>span]:text-[9px] [&>span]:font-[760] [&>span]:tracking-[0.08em] [&>span]:text-text-secondary [&>span]:uppercase [&>strong]:mt-3 [&>strong]:block [&>strong]:text-[24px] [&>strong]:font-[690] [&>strong]:tracking-[-0.03em] [&>small]:mt-2 [&>small]:block [&>small]:text-[10px] [&>small]:text-text-secondary",
  status:
    "shrink-0 rounded-full border px-3 py-1.5 text-[9px] font-[780] tracking-[0.08em] uppercase data-[state=active]:border-success/20 data-[state=active]:bg-success-soft data-[state=active]:text-success data-[state=pending]:border-warning/20 data-[state=pending]:bg-warning-soft data-[state=pending]:text-warning",
  recordTitle: "text-[15px] font-[720] text-ink",
  recordMeta:
    "mt-1 overflow-wrap-anywhere text-[11px] leading-[1.55] text-text-secondary",
  recordField:
    "[&>dt]:text-[9px] [&>dt]:tracking-[0.08em] [&>dt]:text-text-secondary [&>dt]:uppercase [&>dd]:mt-1 [&>dd]:overflow-wrap-anywhere [&>dd]:text-[11px] [&>dd]:font-[680] [&>dd]:text-ink",
  auditEvent:
    "[&>div>strong]:block [&>div>strong]:text-[12px] [&>div>strong]:font-[720] [&>div>p]:mt-2 [&>div>p]:text-[11px] [&>div>p]:leading-[1.55] [&>div>p]:text-text-secondary [&>div>small]:mt-3 [&>div>small]:block [&>div>small]:overflow-wrap-anywhere [&>div>small]:text-[9px] [&>div>small]:leading-[1.5] [&>div>small]:text-primary-dark",
  stateMessage:
    "[&>strong]:block [&>strong]:text-[16px] [&>p]:mx-auto [&>p]:mt-3 [&>p]:max-w-[560px] [&>p]:text-[12px] [&>p]:leading-[1.6] [&>p]:text-text-secondary",
} as const;
