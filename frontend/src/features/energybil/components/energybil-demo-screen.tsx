"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ThemeSwitch } from "@/components/theme-switch";
import {
  advanceEnergyDemo,
  resetEnergyDemo,
  retrieveEnergyDemo,
} from "@/features/energybil/api";
import {
  energyControlStyles,
  energyPatternStyles,
  energySurfaceStyles,
} from "@/features/energybil/components/styles";
import { DemoBadge } from "@/features/returns/components/demo-badge";
import { LocaleSwitch } from "@/features/returns/components/locale-switch";
import type {
  EnergyDemo,
  EnergyWorkflowPhase,
} from "@/features/energybil/types";
import { ApiError, toApiError } from "@/lib/api/client";
import { useDemoSession } from "@/providers/demo-session-provider";

type Locale = "en" | "es";
type DemoState =
  | { status: "loading" }
  | { status: "ready"; data: EnergyDemo }
  | { status: "error"; error: ApiError };

const phases: EnergyWorkflowPhase[] = [
  "READING_RECEIVED",
  "READING_VALIDATED",
  "CONSUMPTION_CALCULATED",
  "INVOICE_ISSUED",
  "NOTIFICATION_SIMULATED",
];

const copy = {
  en: {
    skip: "Skip to Energybil demo",
    demo: "Interactive demo",
    eyebrow: "Energy management · Billing",
    title: "Turn a meter pulse into an auditable invoice.",
    intro:
      "Run a real, isolated billing workflow—from gateway reading to customer notification—inside one synchronous Django service.",
    architecture: "One API · One database · No background worker",
    advance: "Run next stage",
    advancing: "Processing stage…",
    complete: "Workflow complete",
    reset: "Reset scenario",
    scenario: "Live fictional scenario",
    account: "Account",
    customer: "Customer",
    meter: "Meter",
    property: "Property",
    pipelineEyebrow: "Meter-to-invoice pipeline",
    pipelineTitle: "A five-stage operational story",
    pipelineCopy:
      "Each action commits one domain transition and its audit event in the same PostgreSQL transaction.",
    current: "Current stage",
    completed: "Completed",
    pending: "Pending",
    timelineEyebrow: "Audit trail",
    timelineTitle: "What the system has done",
    invoiceEyebrow: "Billing output",
    invoiceTitle: "Invoice preview",
    invoiceNumber: "Invoice",
    period: "Billing period",
    due: "Due date",
    usage: "Consumption",
    energyCharge: "Energy charge",
    serviceCharge: "Service charge",
    tax: "Tax",
    amountDue: "Amount due",
    notCalculated: "Calculated at stage 03",
    preview: "Simulated delivery preview",
    loading: "Preparing your private Energybil scenario…",
    waking: "The free backend is waking up",
    wakingCopy:
      "This can take up to 90 seconds after inactivity. The page will continue automatically.",
    error: "The Energybil scenario could not be loaded",
    retry: "Try again",
    privateData: "Fictional data isolated to this browser session.",
    footer: "Energybil portfolio demo · synchronous clean-room reduction",
    stages: {
      READING_RECEIVED: ["Gateway reading", "A meter payload enters the boundary."],
      READING_VALIDATED: ["Validation", "Timestamp and monotonic checks pass."],
      CONSUMPTION_CALCULATED: ["Consumption", "Usage and tariff charges are computed."],
      INVOICE_ISSUED: ["Invoice", "A bill is issued with an audit event."],
      NOTIFICATION_SIMULATED: ["Notification", "Delivery is previewed without a worker."],
    },
  },
  es: {
    skip: "Saltar a la demo Energybil",
    demo: "Demo interactiva",
    eyebrow: "Gestión de energía · Facturación",
    title: "Convierte un pulso del medidor en una factura auditable.",
    intro:
      "Ejecuta un flujo real y aislado—desde la lectura del gateway hasta la notificación—dentro de un único servicio Django síncrono.",
    architecture: "Una API · Una base de datos · Sin worker",
    advance: "Ejecutar siguiente etapa",
    advancing: "Procesando etapa…",
    complete: "Flujo completado",
    reset: "Restablecer escenario",
    scenario: "Escenario ficticio activo",
    account: "Cuenta",
    customer: "Cliente",
    meter: "Medidor",
    property: "Propiedad",
    pipelineEyebrow: "Flujo medidor-a-factura",
    pipelineTitle: "Una historia operativa en cinco etapas",
    pipelineCopy:
      "Cada acción confirma una transición de dominio y su evento de auditoría en la misma transacción PostgreSQL.",
    current: "Etapa actual",
    completed: "Completada",
    pending: "Pendiente",
    timelineEyebrow: "Auditoría",
    timelineTitle: "Lo que ha hecho el sistema",
    invoiceEyebrow: "Resultado de facturación",
    invoiceTitle: "Vista previa de factura",
    invoiceNumber: "Factura",
    period: "Período",
    due: "Vencimiento",
    usage: "Consumo",
    energyCharge: "Cargo de energía",
    serviceCharge: "Cargo de servicio",
    tax: "Impuesto",
    amountDue: "Total a pagar",
    notCalculated: "Se calcula en la etapa 03",
    preview: "Vista previa de entrega simulada",
    loading: "Preparando tu escenario privado de Energybil…",
    waking: "El backend gratuito está despertando",
    wakingCopy:
      "Puede tardar hasta 90 segundos después de estar inactivo. La página continuará automáticamente.",
    error: "No se pudo cargar el escenario Energybil",
    retry: "Intentar de nuevo",
    privateData: "Datos ficticios aislados para esta sesión del navegador.",
    footer: "Demo Energybil · reducción clean-room síncrona",
    stages: {
      READING_RECEIVED: ["Lectura del gateway", "Un payload del medidor entra al sistema."],
      READING_VALIDATED: ["Validación", "Se validan fecha, duplicados y monotonicidad."],
      CONSUMPTION_CALCULATED: ["Consumo", "Se calculan uso y cargos de tarifa."],
      INVOICE_ISSUED: ["Factura", "La factura se emite con evento auditable."],
      NOTIFICATION_SIMULATED: ["Notificación", "La entrega se previsualiza sin worker."],
    },
  },
} as const;

function formatMoney(value: string, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(locale === "es" ? "es-VE" : "en-US", {
    style: "currency",
    currency,
  }).format(Number(value));
}

function formatDate(value: string, locale: Locale): string {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly
    ? new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
      )
    : new Date(value);
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function EnergybilDemoScreen() {
  const session = useDemoSession();
  const [locale, setLocale] = useState<Locale>("en");
  const [state, setState] = useState<DemoState>({ status: "loading" });
  const [isMutating, setIsMutating] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const t = copy[locale];

  const loadDemo = useCallback(() => {
    setState({ status: "loading" });
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (session.status !== "ready" || state.status !== "loading") {
      return;
    }

    let isCurrent = true;
    retrieveEnergyDemo()
      .then((data) => {
        if (isCurrent) {
          setState({ status: "ready", data });
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setState({ status: "error", error: toApiError(error) });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [session.status, state.status]);

  const currentIndex = useMemo(() => {
    if (state.status !== "ready") {
      return 0;
    }
    return phases.indexOf(state.data.phase);
  }, [state]);

  async function mutate(action: "advance" | "reset") {
    if (isMutating) {
      return;
    }
    setIsMutating(true);
    setAnnouncement("");
    try {
      const data = action === "advance"
        ? await advanceEnergyDemo()
        : await resetEnergyDemo();
      setState({ status: "ready", data });
      setAnnouncement(
        action === "reset"
          ? t.reset
          : t.stages[data.phase][0],
      );
    } catch (error: unknown) {
      setState({ status: "error", error: toApiError(error) });
    } finally {
      setIsMutating(false);
    }
  }

  const ready = state.status === "ready" ? state.data : null;
  const sessionIsLoading =
    session.status === "bootstrapping" || session.status === "waking";

  return (
    <div id="top" className={energySurfaceStyles.app}>
      <a className={energySurfaceStyles.skipLink} href="#energybil-content">
        {t.skip}
      </a>

      <header className={energySurfaceStyles.header}>
        <a
          aria-label="Energybil home"
          className={energyPatternStyles.brand}
          href="#top"
        >
          <span aria-hidden="true">EB</span>
          <strong>Energybil</strong>
        </a>
        <div className={energySurfaceStyles.headerTools}>
          <DemoBadge variant="customer">{t.demo}</DemoBadge>
          <LocaleSwitch
            locale={locale}
            onLocaleChange={setLocale}
            variant="customer"
          />
          <ThemeSwitch locale={locale} variant="customer" />
        </div>
      </header>

      <main id="energybil-content" className={energySurfaceStyles.main}>
        <section className={energySurfaceStyles.hero} aria-labelledby="energybil-title">
          <div>
            <p className={energyPatternStyles.eyebrow}>{t.eyebrow}</p>
            <h1 id="energybil-title" className={energyPatternStyles.heroTitle}>{t.title}</h1>
            <p className={energyPatternStyles.heroCopy}>{t.intro}</p>
            <div className={energySurfaceStyles.heroActions}>
              <button
                className={energyControlStyles.primary}
                disabled={!ready || ready.is_complete || isMutating}
                onClick={() => void mutate("advance")}
                type="button"
              >
                {isMutating ? t.advancing : ready?.is_complete ? t.complete : t.advance}
                <span aria-hidden="true">→</span>
              </button>
              <span className={energyPatternStyles.architectureNote}>{t.architecture}</span>
            </div>
          </div>

          <aside className={energySurfaceStyles.scenarioCard} aria-label={t.scenario}>
            <p className={energyPatternStyles.scenarioLabel}>{t.scenario}</p>
            <h2 className={energyPatternStyles.scenarioTitle}>{ready?.property_name ?? "Riverside Operations Center"}</h2>
            <p className={energyPatternStyles.scenarioMeta}>{ready?.service_address ?? t.loading}</p>
            <dl className={energySurfaceStyles.scenarioGrid}>
              <div className={`${energySurfaceStyles.scenarioMetric} ${energyPatternStyles.scenarioMetric}`}>
                <span>{t.account}</span><strong>{ready?.account_reference ?? "—"}</strong>
              </div>
              <div className={`${energySurfaceStyles.scenarioMetric} ${energyPatternStyles.scenarioMetric}`}>
                <span>{t.customer}</span><strong>{ready?.customer_name ?? "—"}</strong>
              </div>
              <div className={`${energySurfaceStyles.scenarioMetric} ${energyPatternStyles.scenarioMetric}`}>
                <span>{t.meter}</span><strong>{ready?.meter.serial_number ?? "—"}</strong>
              </div>
              <div className={`${energySurfaceStyles.scenarioMetric} ${energyPatternStyles.scenarioMetric}`}>
                <span>{t.property}</span><strong>{ready?.meter.label ?? "—"}</strong>
              </div>
            </dl>
          </aside>
        </section>

        {sessionIsLoading || state.status === "loading" ? (
          <section className={`${energySurfaceStyles.stateMessage} ${energyPatternStyles.stateMessage}`} aria-live="polite">
            <strong>{session.status === "waking" ? t.waking : t.loading}</strong>
            <p>{session.status === "waking" ? t.wakingCopy : t.privateData}</p>
          </section>
        ) : session.status === "error" || state.status === "error" ? (
          <section className={`${energySurfaceStyles.stateMessage} ${energyPatternStyles.stateMessage}`} role="alert">
            <strong>{t.error}</strong>
            <p>{session.status === "error" ? session.error.message : state.status === "error" ? state.error.message : ""}</p>
            <button className={`${energyControlStyles.secondary} mt-5`} onClick={() => session.status === "error" ? session.retry() : loadDemo()} type="button">{t.retry}</button>
          </section>
        ) : ready ? (
          <>
            <section className={energySurfaceStyles.section} aria-labelledby="pipeline-title">
              <div className={energySurfaceStyles.sectionHeader}>
                <div>
                  <p className={energyPatternStyles.eyebrow}>{t.pipelineEyebrow}</p>
                  <h2 id="pipeline-title" className={energyPatternStyles.sectionTitle}>{t.pipelineTitle}</h2>
                  <p className={energyPatternStyles.sectionCopy}>{t.pipelineCopy}</p>
                </div>
                <button className={energyControlStyles.secondary} disabled={isMutating} onClick={() => void mutate("reset")} type="button">{t.reset}</button>
              </div>
              <ol className={energySurfaceStyles.pipeline}>
                {phases.map((phase, index) => {
                  const stateLabel = index < currentIndex ? "complete" : index === currentIndex ? "current" : "pending";
                  return (
                    <li className={`${energySurfaceStyles.stage} ${energyPatternStyles.stage}`} data-state={stateLabel} key={phase} aria-current={stateLabel === "current" ? "step" : undefined}>
                      <span>{String(index + 1).padStart(2, "0")} · {stateLabel === "complete" ? t.completed : stateLabel === "current" ? t.current : t.pending}</span>
                      <strong>{t.stages[phase][0]}</strong>
                      <p>{t.stages[phase][1]}</p>
                    </li>
                  );
                })}
              </ol>
            </section>

            <div className={energySurfaceStyles.workspace}>
              <section className={energySurfaceStyles.panel} aria-labelledby="timeline-title">
                <p className={energyPatternStyles.panelEyebrow}>{t.timelineEyebrow}</p>
                <h2 id="timeline-title" className={energyPatternStyles.panelTitle}>{t.timelineTitle}</h2>
                <ol className={energySurfaceStyles.timeline}>
                  {ready.events.map((event) => (
                    <li className={energySurfaceStyles.event} key={event.id}>
                      <span className={energySurfaceStyles.eventRail} aria-hidden="true"><span className={energySurfaceStyles.eventDot} /></span>
                      <div className={energyPatternStyles.event}>
                        <strong>{t.stages[event.phase][0]}</strong>
                        <p>{locale === "en" ? event.detail : t.stages[event.phase][1]}</p>
                        <time dateTime={event.occurred_at}>{formatDate(event.occurred_at, locale)}</time>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              <aside className={energySurfaceStyles.panel} aria-labelledby="invoice-title">
                <p className={energyPatternStyles.panelEyebrow}>{t.invoiceEyebrow}</p>
                <h2 id="invoice-title" className={energyPatternStyles.panelTitle}>{t.invoiceTitle}</h2>
                <div className={energySurfaceStyles.invoice}>
                  <div className={energySurfaceStyles.invoiceHeader}>
                    <div className={energyPatternStyles.invoiceMeta}><span>{t.invoiceNumber}</span><strong>{ready.invoice.invoice_number}</strong></div>
                    <div className={`${energyPatternStyles.invoiceMeta} text-right`}><span>{t.due}</span><strong>{formatDate(ready.invoice.due_date, locale)}</strong></div>
                  </div>
                  <dl className={energySurfaceStyles.invoiceBody}>
                    <div className={`${energySurfaceStyles.invoiceRow} ${energyPatternStyles.invoiceRow}`}><dt>{t.period}</dt><dd>{formatDate(ready.invoice.period_start, locale)} – {formatDate(ready.invoice.period_end, locale)}</dd></div>
                    <div className={`${energySurfaceStyles.invoiceRow} ${energyPatternStyles.invoiceRow}`}><dt>{t.usage}</dt><dd>{ready.invoice.consumption_kwh} kWh</dd></div>
                    <div className={`${energySurfaceStyles.invoiceRow} ${energyPatternStyles.invoiceRow}`}><dt>{t.energyCharge}</dt><dd>{formatMoney(ready.invoice.energy_charge, ready.currency, locale)}</dd></div>
                    <div className={`${energySurfaceStyles.invoiceRow} ${energyPatternStyles.invoiceRow}`}><dt>{t.serviceCharge}</dt><dd>{formatMoney(ready.fixed_charge, ready.currency, locale)}</dd></div>
                    <div className={`${energySurfaceStyles.invoiceRow} ${energyPatternStyles.invoiceRow}`}><dt>{t.tax}</dt><dd>{formatMoney(ready.invoice.tax, ready.currency, locale)}</dd></div>
                    <div className={`${energySurfaceStyles.invoiceTotal} ${energyPatternStyles.invoiceTotal}`}><span>{t.amountDue}</span><strong>{formatMoney(ready.invoice.total, ready.currency, locale)}</strong></div>
                  </dl>
                </div>
                <div className={energyPatternStyles.preview} role="status">
                  <strong>{t.preview}</strong><br />
                  {ready.invoice.notification_preview || t.notCalculated}
                </div>
              </aside>
            </div>

          </>
        ) : null}
        <p className="sr-only" aria-live="polite">{announcement}</p>
      </main>

      <footer className={energySurfaceStyles.footer}>
        <span>{t.footer}</span><span>{t.privateData}</span>
      </footer>
    </div>
  );
}
