export const energyControlStyles = {
  primary:
    "inline-flex min-h-12 cursor-pointer items-center justify-center gap-3 rounded-full border border-primary bg-primary px-6 text-[13px] font-[750] text-on-primary transition-[transform,background] duration-150 enabled:hover:-translate-y-px enabled:hover:bg-primary-dark disabled:cursor-wait disabled:opacity-50 motion-reduce:transition-none",
  secondary:
    "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-border bg-surface px-5 text-[12px] font-[720] text-ink transition-colors hover:border-primary hover:text-primary-dark disabled:cursor-wait disabled:opacity-50",
} as const;

export const energySurfaceStyles = {
  app: "min-h-screen overflow-hidden bg-canvas",
  skipLink:
    "sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-3 focus:text-[12px] focus:font-bold focus:text-ink focus:shadow-surface",
  header:
    "mx-auto flex min-h-[78px] w-[min(1180px,calc(100%-48px))] items-center justify-between gap-5 border-b border-border max-[620px]:w-[calc(100%-32px)]",
  headerTools: "flex items-center gap-3",
  main: "mx-auto w-[min(1180px,calc(100%-48px))] pb-20 max-[620px]:w-[calc(100%-32px)]",
  hero:
    "grid grid-cols-[minmax(0,1.15fr)_minmax(310px,0.65fr)] items-center gap-[clamp(42px,8vw,110px)] py-[clamp(64px,9vw,112px)] max-[860px]:grid-cols-1 max-[620px]:py-14",
  heroActions: "mt-8 flex flex-wrap items-center gap-3",
  scenarioCard:
    "relative overflow-hidden rounded-[28px] border border-primary/45 bg-primary p-[clamp(26px,4vw,38px)] text-on-primary shadow-[0_28px_80px_rgb(15_118_110_/_20%)] before:absolute before:-top-16 before:-right-16 before:size-48 before:rounded-full before:border before:border-on-primary/20 after:absolute after:-right-7 after:-bottom-16 after:size-36 after:rounded-full after:bg-on-primary/5",
  scenarioGrid: "relative z-10 mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-on-primary/20",
  scenarioMetric: "bg-primary-dark/60 p-4",
  section: "mt-6 rounded-[28px] border border-border bg-surface p-[clamp(24px,4vw,44px)] shadow-surface max-[620px]:rounded-[20px]",
  sectionHeader:
    "flex items-end justify-between gap-8 max-[720px]:flex-col max-[720px]:items-start",
  pipeline:
    "mt-9 grid list-none grid-cols-5 overflow-hidden rounded-2xl border border-border max-[900px]:grid-cols-1",
  stage:
    "relative min-h-[154px] border-r border-border p-5 last:border-r-0 data-[state=complete]:bg-primary-soft data-[state=current]:bg-warning-soft max-[900px]:min-h-0 max-[900px]:border-r-0 max-[900px]:border-b max-[900px]:last:border-b-0",
  workspace:
    "mt-6 grid grid-cols-[minmax(0,1.05fr)_minmax(320px,0.75fr)] gap-6 max-[900px]:grid-cols-1",
  panel: "rounded-[28px] border border-border bg-surface p-[clamp(24px,4vw,38px)] shadow-surface max-[620px]:rounded-[20px]",
  timeline: "mt-7 grid list-none gap-0",
  event: "grid grid-cols-[28px_1fr] gap-4 pb-6 last:pb-0",
  eventRail: "relative flex justify-center after:absolute after:top-6 after:bottom-[-8px] after:w-px after:bg-border last:after:hidden",
  eventDot: "relative z-10 mt-1 size-3 rounded-full bg-primary ring-4 ring-primary-soft",
  invoice:
    "mt-6 overflow-hidden rounded-2xl border border-border bg-surface-subtle",
  invoiceHeader:
    "flex items-start justify-between gap-4 border-b border-border bg-primary-soft p-5",
  invoiceBody: "grid gap-3 p-5",
  invoiceRow: "flex items-center justify-between gap-5 text-[12px]",
  invoiceTotal:
    "mt-2 flex items-end justify-between gap-5 border-t border-ink pt-4",
  stateMessage:
    "mt-8 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center",
  footer:
    "mx-auto flex min-h-20 w-[min(1180px,calc(100%-48px))] items-center justify-between gap-6 border-t border-border text-[11px] text-text-secondary max-[620px]:w-[calc(100%-32px)] max-[620px]:flex-col max-[620px]:justify-center max-[620px]:py-6",
} as const;

export const energyPatternStyles = {
  brand:
    "flex items-center gap-3 no-underline [&>span:first-child]:grid [&>span:first-child]:size-9 [&>span:first-child]:place-items-center [&>span:first-child]:rounded-xl [&>span:first-child]:bg-primary [&>span:first-child]:text-[12px] [&>span:first-child]:font-extrabold [&>span:first-child]:text-on-primary [&>strong]:text-[14px] [&>strong]:font-[750]",
  eyebrow:
    "text-[11px] font-[780] tracking-[0.13em] text-primary-dark uppercase",
  heroTitle:
    "mt-5 max-w-[760px] text-[clamp(44px,6.2vw,82px)] leading-[0.98] font-[690] tracking-[-0.055em] text-ink",
  heroCopy:
    "mt-6 max-w-[670px] text-[clamp(16px,1.7vw,21px)] leading-[1.55] text-text-secondary",
  architectureNote:
    "inline-flex items-center gap-2 text-[11px] font-[720] text-primary-dark before:size-2 before:rounded-full before:bg-success",
  scenarioLabel:
    "text-[10px] font-[760] tracking-[0.12em] text-on-primary/70 uppercase",
  scenarioTitle: "mt-3 text-[28px] leading-[1.15] font-[680] tracking-[-0.03em]",
  scenarioMeta: "mt-3 text-[12px] leading-[1.6] text-on-primary/75",
  scenarioMetric:
    "[&>span]:block [&>span]:text-[9px] [&>span]:tracking-[0.1em] [&>span]:text-on-primary/60 [&>span]:uppercase [&>strong]:mt-2 [&>strong]:block [&>strong]:text-[17px] [&>strong]:font-[680]",
  sectionTitle:
    "mt-2 text-[clamp(28px,4vw,44px)] leading-[1.05] font-[680] tracking-[-0.04em]",
  sectionCopy: "mt-3 max-w-[650px] text-[13px] leading-[1.65] text-text-secondary",
  stage:
    "[&>span]:text-[9px] [&>span]:font-[780] [&>span]:tracking-[0.12em] [&>span]:text-text-secondary [&>span]:uppercase [&>strong]:mt-8 [&>strong]:block [&>strong]:text-[13px] [&>strong]:font-[720] [&>p]:mt-2 [&>p]:text-[11px] [&>p]:leading-[1.55] [&>p]:text-text-secondary data-[state=complete]:[&>span]:text-primary-dark data-[state=current]:[&>span]:text-warning",
  panelEyebrow:
    "text-[9px] font-[780] tracking-[0.12em] text-primary-dark uppercase",
  panelTitle:
    "mt-2 text-[25px] font-[680] tracking-[-0.03em] text-ink",
  event:
    "[&_time]:mt-2 [&_time]:block [&_time]:text-[9px] [&_time]:text-text-secondary [&_strong]:block [&_strong]:text-[12px] [&_strong]:font-[720] [&_p]:mt-1 [&_p]:text-[11px] [&_p]:leading-[1.55] [&_p]:text-text-secondary",
  invoiceMeta:
    "[&>span]:block [&>span]:text-[9px] [&>span]:tracking-[0.08em] [&>span]:text-text-secondary [&>span]:uppercase [&>strong]:mt-1 [&>strong]:block [&>strong]:text-[14px]",
  invoiceRow:
    "[&>dt]:text-text-secondary [&>dd]:font-[680] [&>dd]:text-ink",
  invoiceTotal:
    "[&>span]:text-[10px] [&>span]:font-[760] [&>span]:tracking-[0.08em] [&>span]:uppercase [&>strong]:text-[30px] [&>strong]:font-[690] [&>strong]:tracking-[-0.04em]",
  preview:
    "mt-5 rounded-xl border border-primary/20 bg-primary-soft p-4 text-[11px] leading-[1.6] text-primary-dark",
  stateMessage:
    "[&>strong]:block [&>strong]:text-[16px] [&>p]:mx-auto [&>p]:mt-3 [&>p]:max-w-[560px] [&>p]:text-[12px] [&>p]:leading-[1.6] [&>p]:text-text-secondary",
} as const;
