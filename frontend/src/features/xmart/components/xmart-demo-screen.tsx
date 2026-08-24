"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ThemeSwitch } from "@/components/theme-switch";
import {
  advanceXmartDemo,
  resetXmartDemo,
  retrieveXmartDemo,
} from "@/features/xmart/api";
import {
  xmartControlStyles,
  xmartPatternStyles,
  xmartSurfaceStyles,
} from "@/features/xmart/components/styles";
import type {
  XmartAuditEventType,
  XmartDemo,
  XmartWorkflowPhase,
} from "@/features/xmart/types";
import { DemoBadge } from "@/features/returns/components/demo-badge";
import { LocaleSwitch } from "@/features/returns/components/locale-switch";
import { ApiError, toApiError } from "@/lib/api/client";
import { useDemoSession } from "@/providers/demo-session-provider";

type Locale = "en" | "es";
type DemoState =
  | { status: "loading" }
  | { status: "ready"; data: XmartDemo }
  | { status: "error"; error: ApiError };

const phases: XmartWorkflowPhase[] = [
  "CUSTOMER_WORKSPACE",
  "USER_ACCESS",
  "DEVICE_ASSIGNMENT",
  "SECURITY_AUDIT",
  "WORKFLOW_COMPLETE",
];

const eventTypes: XmartAuditEventType[] = [
  "WORKSPACE_REVIEWED",
  "USER_ACTIVATED",
  "VERIFICATION_RESENT",
  "DEVICE_ASSIGNED",
  "SECURITY_AUDIT_REVIEWED",
  "WORKFLOW_COMPLETED",
];

const copy = {
  en: {
    skip: "Skip to Xmart demo",
    demo: "Interactive demo",
    eyebrow: "Field operations · Provisioning",
    title: "Provision a field team with every change accounted for.",
    intro:
      "Activate an operator, assign a synthetic device, and review the resulting security trail inside one isolated customer workspace.",
    architecture: "One API · One database · No external side effects",
    advance: "Run next stage",
    advancing: "Applying change…",
    complete: "Workflow complete",
    reset: "Reset scenario",
    scenario: "Live fictional workspace",
    customer: "Customer",
    project: "Project",
    actor: "Actor",
    sourceIp: "Audit IP",
    workflowEyebrow: "Provisioning workflow",
    workflowTitle: "Four decisions, one auditable result",
    workflowCopy:
      "Each action locks this visitor-owned workspace and commits one domain transition with its security record.",
    current: "Current stage",
    completed: "Completed",
    pending: "Pending",
    capacityEyebrow: "Customer workspace",
    capacityTitle: "Contracted capacity",
    capacityCopy:
      "Limits move only when the workflow consumes a user seat or assigns an existing synthetic IMEI.",
    users: "Users",
    storage: "Storage",
    imeis: "IMEIs",
    used: "used",
    remaining: "remaining",
    modules: "Contracted modules",
    accessEyebrow: "Operational records",
    accessTitle: "User and device provisioning",
    targetUser: "Target operator",
    device: "Synthetic device",
    role: "Role",
    verification: "Verification previews",
    seat: "Seat consumed",
    model: "Model",
    identifier: "Identifier",
    assignment: "Assigned project",
    yes: "Yes",
    no: "No",
    unassigned: "Not assigned yet",
    auditEyebrow: "Security audit",
    auditTitle: "Immutable fictional activity",
    auditCopy:
      "Every entry names the actor, subject, documentation-only IP, and visible reason for the operation.",
    loading: "Preparing your private Xmart workspace…",
    waking: "The free backend is waking up",
    wakingCopy:
      "This can take up to 90 seconds after inactivity. The page will continue automatically.",
    error: "The Xmart scenario could not be loaded",
    retry: "Try again",
    privateData: "Fictional data isolated to this browser session.",
    footer: "Xmart portfolio demo · synchronous clean-room recreation",
    statuses: {
      PENDING: "Pending",
      ACTIVE: "Active",
      AVAILABLE: "Available",
      ASSIGNED: "Assigned",
    },
    stages: {
      CUSTOMER_WORKSPACE: [
        "Customer workspace",
        "Review customer limits, project, and contracted modules.",
      ],
      USER_ACCESS: [
        "User access",
        "Activate the field operator and preview verification.",
      ],
      DEVICE_ASSIGNMENT: [
        "Device assignment",
        "Assign the synthetic IMEI to the rollout project.",
      ],
      SECURITY_AUDIT: [
        "Security audit",
        "Consolidate actor, subject, IP, and reasons.",
      ],
      WORKFLOW_COMPLETE: [
        "Complete",
        "Preserve the final provisioning result without duplicates.",
      ],
    },
    events: {
      WORKSPACE_REVIEWED: [
        "Workspace reviewed",
        "Customer limits and contracted modules were reviewed.",
      ],
      USER_ACTIVATED: [
        "Operator activated",
        "Field operator access was activated for the rollout project.",
      ],
      VERIFICATION_RESENT: [
        "Verification previewed",
        "An in-app preview was recorded without sending email.",
      ],
      DEVICE_ASSIGNED: [
        "Device assigned",
        "The synthetic demo device was linked to the project.",
      ],
      SECURITY_AUDIT_REVIEWED: [
        "Audit reviewed",
        "The accumulated fictional operations were reviewed together.",
      ],
      WORKFLOW_COMPLETED: [
        "Provisioning completed",
        "The final user and device allocation was recorded.",
      ],
    },
  },
  es: {
    skip: "Saltar a la demo Xmart",
    demo: "Demo interactiva",
    eyebrow: "Operaciones de campo · Aprovisionamiento",
    title: "Aprovisiona un equipo de campo con cada cambio registrado.",
    intro:
      "Activa un operador, asigna un dispositivo sintético y revisa la auditoría resultante dentro de un espacio de cliente aislado.",
    architecture: "Una API · Una base de datos · Sin efectos externos",
    advance: "Ejecutar siguiente etapa",
    advancing: "Aplicando cambio…",
    complete: "Flujo completado",
    reset: "Restablecer escenario",
    scenario: "Workspace ficticio activo",
    customer: "Cliente",
    project: "Proyecto",
    actor: "Actor",
    sourceIp: "IP de auditoría",
    workflowEyebrow: "Flujo de aprovisionamiento",
    workflowTitle: "Cuatro decisiones, un resultado auditable",
    workflowCopy:
      "Cada acción bloquea el workspace de este visitante y confirma una transición de dominio con su registro de seguridad.",
    current: "Etapa actual",
    completed: "Completada",
    pending: "Pendiente",
    capacityEyebrow: "Workspace del cliente",
    capacityTitle: "Capacidad contratada",
    capacityCopy:
      "Los límites cambian solo cuando el flujo consume un usuario o asigna un IMEI sintético existente.",
    users: "Usuarios",
    storage: "Almacenamiento",
    imeis: "IMEIs",
    used: "usados",
    remaining: "disponibles",
    modules: "Módulos contratados",
    accessEyebrow: "Registros operativos",
    accessTitle: "Aprovisionamiento de usuario y dispositivo",
    targetUser: "Operador objetivo",
    device: "Dispositivo sintético",
    role: "Rol",
    verification: "Vistas de verificación",
    seat: "Licencia consumida",
    model: "Modelo",
    identifier: "Identificador",
    assignment: "Proyecto asignado",
    yes: "Sí",
    no: "No",
    unassigned: "Aún sin asignar",
    auditEyebrow: "Auditoría de seguridad",
    auditTitle: "Actividad ficticia inmutable",
    auditCopy:
      "Cada registro identifica actor, sujeto, IP reservada para documentación y motivo visible de la operación.",
    loading: "Preparando tu workspace privado de Xmart…",
    waking: "El backend gratuito está despertando",
    wakingCopy:
      "Puede tardar hasta 90 segundos después de estar inactivo. La página continuará automáticamente.",
    error: "No se pudo cargar el escenario Xmart",
    retry: "Intentar de nuevo",
    privateData: "Datos ficticios aislados para esta sesión del navegador.",
    footer: "Demo Xmart · recreación clean-room síncrona",
    statuses: {
      PENDING: "Pendiente",
      ACTIVE: "Activo",
      AVAILABLE: "Disponible",
      ASSIGNED: "Asignado",
    },
    stages: {
      CUSTOMER_WORKSPACE: [
        "Workspace del cliente",
        "Revisa límites, proyecto y módulos contratados.",
      ],
      USER_ACCESS: [
        "Acceso de usuario",
        "Activa el operador y previsualiza su verificación.",
      ],
      DEVICE_ASSIGNMENT: [
        "Asignación de dispositivo",
        "Vincula el IMEI sintético al proyecto de despliegue.",
      ],
      SECURITY_AUDIT: [
        "Auditoría de seguridad",
        "Consolida actor, sujeto, IP y motivos.",
      ],
      WORKFLOW_COMPLETE: [
        "Completado",
        "Conserva el resultado final sin crear duplicados.",
      ],
    },
    events: {
      WORKSPACE_REVIEWED: [
        "Workspace revisado",
        "Se revisaron límites y módulos contratados.",
      ],
      USER_ACTIVATED: [
        "Operador activado",
        "Se activó el acceso al proyecto para el operador.",
      ],
      VERIFICATION_RESENT: [
        "Verificación previsualizada",
        "Se registró una vista interna sin enviar correo.",
      ],
      DEVICE_ASSIGNED: [
        "Dispositivo asignado",
        "El dispositivo sintético fue vinculado al proyecto.",
      ],
      SECURITY_AUDIT_REVIEWED: [
        "Auditoría revisada",
        "Se revisaron juntas las operaciones ficticias acumuladas.",
      ],
      WORKFLOW_COMPLETED: [
        "Aprovisionamiento completado",
        "Se registró la asignación final de usuario y dispositivo.",
      ],
    },
  },
} as const;

function formatDate(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function ratio(used: number, limit: number): number {
  return Math.min(100, Math.max(0, (used / limit) * 100));
}

type CapacityCardProps = {
  label: string;
  used: number;
  limit: number;
  unit?: string;
  usedLabel: string;
  remainingLabel: string;
};

function CapacityCard({
  label,
  used,
  limit,
  unit = "",
  usedLabel,
  remainingLabel,
}: CapacityCardProps) {
  const suffix = unit ? ` ${unit}` : "";
  return (
    <div className={`${xmartSurfaceStyles.capacityCard} ${xmartPatternStyles.capacity}`}>
      <span>{label}</span>
      <strong>
        {used} / {limit}{suffix}
      </strong>
      <div
        aria-label={`${label}: ${used} ${usedLabel}`}
        aria-valuemax={limit}
        aria-valuemin={0}
        aria-valuenow={used}
        className={xmartSurfaceStyles.meterTrack}
        role="progressbar"
      >
        <div
          className={xmartSurfaceStyles.meterFill}
          style={{ width: `${ratio(used, limit)}%` }}
        />
      </div>
      <small>{limit - used}{suffix} {remainingLabel}</small>
    </div>
  );
}

export default function XmartDemoScreen() {
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
    retrieveXmartDemo()
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
        ? await advanceXmartDemo()
        : await resetXmartDemo();
      setState({ status: "ready", data });
      setAnnouncement(
        action === "reset" ? t.reset : t.stages[data.phase][0],
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
    <div id="top" className={xmartSurfaceStyles.app}>
      <a className={xmartSurfaceStyles.skipLink} href="#xmart-content">
        {t.skip}
      </a>

      <header className={xmartSurfaceStyles.header}>
        <a
          aria-label="Xmart home"
          className={xmartPatternStyles.brand}
          href="#top"
        >
          <span aria-hidden="true">XM</span>
          <strong>Xmart</strong>
        </a>
        <div className={xmartSurfaceStyles.headerTools}>
          <DemoBadge variant="customer">{t.demo}</DemoBadge>
          <LocaleSwitch
            locale={locale}
            onLocaleChange={setLocale}
            variant="customer"
          />
          <ThemeSwitch locale={locale} variant="customer" />
        </div>
      </header>

      <main id="xmart-content" className={xmartSurfaceStyles.main}>
        <section
          aria-labelledby="xmart-title"
          className={xmartSurfaceStyles.hero}
        >
          <div>
            <p className={xmartPatternStyles.eyebrow}>{t.eyebrow}</p>
            <h1 id="xmart-title" className={xmartPatternStyles.heroTitle}>
              {t.title}
            </h1>
            <p className={xmartPatternStyles.heroCopy}>{t.intro}</p>
            <div className={xmartSurfaceStyles.heroActions}>
              <button
                className={xmartControlStyles.primary}
                disabled={!ready || ready.is_complete || isMutating}
                onClick={() => void mutate("advance")}
                type="button"
              >
                {isMutating
                  ? t.advancing
                  : ready?.is_complete
                    ? t.complete
                    : t.advance}
                <span aria-hidden="true">→</span>
              </button>
              <span className={xmartPatternStyles.architectureNote}>
                {t.architecture}
              </span>
            </div>
          </div>

          <aside
            aria-label={t.scenario}
            className={xmartSurfaceStyles.scenarioCard}
          >
            <p className={xmartPatternStyles.scenarioLabel}>{t.scenario}</p>
            <h2 className={xmartPatternStyles.scenarioTitle}>
              {ready?.customer_name ?? "Atlas Field Services"}
            </h2>
            <p className={xmartPatternStyles.scenarioMeta}>
              {ready?.disclosure ?? t.loading}
            </p>
            <dl className={xmartSurfaceStyles.scenarioGrid}>
              {[
                [t.project, ready?.project_name ?? "—"],
                [t.actor, ready?.actor_email ?? "—"],
                [t.sourceIp, ready?.actor_ip ?? "—"],
              ].map(([label, value]) => (
                <div
                  className={`${xmartSurfaceStyles.scenarioRow} ${xmartPatternStyles.scenarioRow}`}
                  key={label}
                >
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </section>

        {sessionIsLoading || state.status === "loading" ? (
          <section
            aria-live="polite"
            className={`${xmartSurfaceStyles.stateMessage} ${xmartPatternStyles.stateMessage}`}
          >
            <strong>{session.status === "waking" ? t.waking : t.loading}</strong>
            <p>{session.status === "waking" ? t.wakingCopy : t.privateData}</p>
          </section>
        ) : session.status === "error" || state.status === "error" ? (
          <section
            className={`${xmartSurfaceStyles.stateMessage} ${xmartPatternStyles.stateMessage}`}
            role="alert"
          >
            <strong>{t.error}</strong>
            <p>
              {session.status === "error"
                ? session.error.message
                : state.status === "error"
                  ? state.error.message
                  : ""}
            </p>
            <button
              className={`${xmartControlStyles.secondary} mt-5`}
              onClick={() => {
                if (session.status === "error") {
                  session.retry();
                } else {
                  loadDemo();
                }
              }}
              type="button"
            >
              {t.retry}
            </button>
          </section>
        ) : ready ? (
          <>
            <section
              aria-labelledby="xmart-workflow-title"
              className={xmartSurfaceStyles.section}
            >
              <div className={xmartSurfaceStyles.sectionHeader}>
                <div>
                  <p className={xmartPatternStyles.eyebrow}>
                    {t.workflowEyebrow}
                  </p>
                  <h2
                    className={xmartPatternStyles.sectionTitle}
                    id="xmart-workflow-title"
                  >
                    {t.workflowTitle}
                  </h2>
                  <p className={xmartPatternStyles.sectionCopy}>
                    {t.workflowCopy}
                  </p>
                </div>
                <button
                  className={xmartControlStyles.secondary}
                  disabled={isMutating}
                  onClick={() => void mutate("reset")}
                  type="button"
                >
                  {t.reset}
                </button>
              </div>
              <ol className={xmartSurfaceStyles.pipeline}>
                {phases.map((phase, index) => {
                  const stateLabel = index < currentIndex
                    ? "complete"
                    : index === currentIndex
                      ? "current"
                      : "pending";
                  return (
                    <li
                      aria-current={stateLabel === "current" ? "step" : undefined}
                      className={`${xmartSurfaceStyles.stage} ${xmartPatternStyles.stage}`}
                      data-state={stateLabel}
                      key={phase}
                    >
                      <span>
                        {String(index + 1).padStart(2, "0")} · {stateLabel === "complete"
                          ? t.completed
                          : stateLabel === "current"
                            ? t.current
                            : t.pending}
                      </span>
                      <strong>{t.stages[phase][0]}</strong>
                      <p>{t.stages[phase][1]}</p>
                    </li>
                  );
                })}
              </ol>
            </section>

            <div className={xmartSurfaceStyles.workspace}>
              <section
                aria-labelledby="xmart-capacity-title"
                className={xmartSurfaceStyles.panel}
              >
                <p className={xmartPatternStyles.panelEyebrow}>
                  {t.capacityEyebrow}
                </p>
                <h2
                  className={xmartPatternStyles.panelTitle}
                  id="xmart-capacity-title"
                >
                  {t.capacityTitle}
                </h2>
                <p className={xmartPatternStyles.sectionCopy}>
                  {t.capacityCopy}
                </p>
                <div className={xmartSurfaceStyles.capacityGrid}>
                  <CapacityCard
                    label={t.users}
                    limit={ready.capacities.users.limit}
                    remainingLabel={t.remaining}
                    used={ready.capacities.users.used}
                    usedLabel={t.used}
                  />
                  <CapacityCard
                    label={t.storage}
                    limit={Number(ready.capacities.storage.limit)}
                    remainingLabel={t.remaining}
                    unit={ready.capacities.storage.unit}
                    used={Number(ready.capacities.storage.used)}
                    usedLabel={t.used}
                  />
                  <CapacityCard
                    label={t.imeis}
                    limit={ready.capacities.imeis.limit}
                    remainingLabel={t.remaining}
                    used={ready.capacities.imeis.used}
                    usedLabel={t.used}
                  />
                </div>
                <p className={`${xmartPatternStyles.panelEyebrow} mt-7`}>
                  {t.modules}
                </p>
                <ul className={xmartSurfaceStyles.moduleList}>
                  {ready.modules.map((module) => (
                    <li className={xmartSurfaceStyles.module} key={module.name}>
                      {module.name}
                    </li>
                  ))}
                </ul>
              </section>

              <section
                aria-labelledby="xmart-access-title"
                className={xmartSurfaceStyles.panel}
              >
                <p className={xmartPatternStyles.panelEyebrow}>
                  {t.accessEyebrow}
                </p>
                <h2
                  className={xmartPatternStyles.panelTitle}
                  id="xmart-access-title"
                >
                  {t.accessTitle}
                </h2>
                <div className={xmartSurfaceStyles.provisioningStack}>
                  <article className={xmartSurfaceStyles.record}>
                    <div className={xmartSurfaceStyles.recordHeader}>
                      <div>
                        <h3 className={xmartPatternStyles.recordTitle}>
                          {t.targetUser}
                        </h3>
                        <p className={xmartPatternStyles.recordMeta}>
                          {ready.target_user.email}
                        </p>
                      </div>
                      <span
                        className={xmartPatternStyles.status}
                        data-state={ready.target_user.status === "ACTIVE" ? "active" : "pending"}
                      >
                        {t.statuses[ready.target_user.status]}
                      </span>
                    </div>
                    <dl className={xmartSurfaceStyles.recordGrid}>
                      <div className={xmartPatternStyles.recordField}>
                        <dt>{t.role}</dt>
                        <dd>{ready.target_user.role}</dd>
                      </div>
                      <div className={xmartPatternStyles.recordField}>
                        <dt>{t.verification}</dt>
                        <dd>{ready.target_user.verification_resends}</dd>
                      </div>
                      <div className={xmartPatternStyles.recordField}>
                        <dt>{t.seat}</dt>
                        <dd>{ready.target_user.seat_consumed ? t.yes : t.no}</dd>
                      </div>
                    </dl>
                  </article>

                  <article className={xmartSurfaceStyles.record}>
                    <div className={xmartSurfaceStyles.recordHeader}>
                      <div>
                        <h3 className={xmartPatternStyles.recordTitle}>
                          {t.device}
                        </h3>
                        <p className={xmartPatternStyles.recordMeta}>
                          {ready.device.synthetic_imei}
                        </p>
                      </div>
                      <span
                        className={xmartPatternStyles.status}
                        data-state={ready.device.status === "ASSIGNED" ? "active" : "pending"}
                      >
                        {t.statuses[ready.device.status]}
                      </span>
                    </div>
                    <dl className={xmartSurfaceStyles.recordGrid}>
                      <div className={xmartPatternStyles.recordField}>
                        <dt>{t.model}</dt>
                        <dd>{ready.device.model_name}</dd>
                      </div>
                      <div className={xmartPatternStyles.recordField}>
                        <dt>{t.identifier}</dt>
                        <dd>{ready.device.synthetic_imei}</dd>
                      </div>
                      <div className={xmartPatternStyles.recordField}>
                        <dt>{t.assignment}</dt>
                        <dd>{ready.device.assigned_project || t.unassigned}</dd>
                      </div>
                    </dl>
                  </article>
                </div>
              </section>
            </div>

            <section
              aria-labelledby="xmart-audit-title"
              className={xmartSurfaceStyles.auditPanel}
            >
              <p className={xmartPatternStyles.panelEyebrow}>
                {t.auditEyebrow}
              </p>
              <h2
                className={xmartPatternStyles.panelTitle}
                id="xmart-audit-title"
              >
                {t.auditTitle}
              </h2>
              <p className={xmartPatternStyles.sectionCopy}>{t.auditCopy}</p>
              <ol className={xmartSurfaceStyles.auditList}>
                {ready.audit_events.map((event) => {
                  const eventCopy = eventTypes.includes(event.event_type)
                    ? t.events[event.event_type]
                    : [event.event_type, event.reason];
                  return (
                    <li
                      className={`${xmartSurfaceStyles.auditEvent} ${xmartPatternStyles.auditEvent}`}
                      key={event.id}
                    >
                      <span className={xmartSurfaceStyles.auditSequence}>
                        {String(event.sequence).padStart(2, "0")}
                      </span>
                      <div>
                        <strong>{eventCopy[0]}</strong>
                        <p>{eventCopy[1]}</p>
                        <small>
                          {event.actor_email} · {event.source_ip}<br />
                          {event.subject_reference} · {formatDate(event.occurred_at, locale)}
                        </small>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          </>
        ) : null}

        <p aria-live="polite" className="sr-only">{announcement}</p>
      </main>

      <footer className={xmartSurfaceStyles.footer}>
        <span>{t.footer}</span>
        <span>{t.privateData}</span>
      </footer>
    </div>
  );
}
