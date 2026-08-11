"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getOperationsStatusCounts,
  listOperationsReturns,
  resetDemoDataset,
  retrieveOperationsReturn,
} from "@/features/returns/api";
import type {
  OperationsOrdering,
  OperationsReturnStatus,
  OperationsStatusCounts,
  PaginatedReturns,
  ReturnReason,
  ReturnRequestDetail,
  ReturnRequestSummary,
} from "@/features/returns/types";
import { ApiError, toApiError } from "@/lib/api/client";

import { buttonStyles, fieldStyles } from "./control-styles";
import { DemoBadge } from "./demo-badge";
import { LoadingSpinner } from "./loading-spinner";
import { LocaleSwitch } from "./locale-switch";
import OperationsReview from "./operations-review";
import { operationsPatternStyles } from "./pattern-styles";
import { ReturnStatusBadge } from "./return-status-badge";
import { operationsSurfaceStyles } from "./surface-styles";

type Locale = "en" | "es";
type QueueState =
  | { status: "idle" | "loading" }
  | { status: "ready"; data: PaginatedReturns }
  | { status: "error"; error: ApiError };
type CountsState =
  | { status: "idle" | "loading" }
  | { status: "ready"; data: OperationsStatusCounts }
  | { status: "error" };
type ExpandedState =
  | { status: "loading" }
  | { status: "ready"; data: ReturnRequestDetail }
  | { status: "error"; error: ApiError };

const PAGE_SIZE = 5;

const copy = {
  en: {
    role: "Operations",
    demo: "Demo",
    overview: "Overview",
    requestsNav: "Return requests",
    notifications: "Notifications",
    settings: "Demo settings",
    customerView: "Customer view",
    switchRole: "Switch role",
    title: "Return requests",
    intro: "Review fictional requests across your current demo session.",
    submitted: "Submitted",
    needsInfo: "Needs information",
    approved: "Approved",
    rejected: "Rejected",
    search: "Search reference or customer",
    allStatuses: "Status: All",
    newest: "Newest first",
    oldest: "Oldest first",
    highest: "Highest value",
    lowest: "Lowest value",
    referenceOrder: "Reference",
    reset: "Reset demo",
    resetting: "Resetting…",
    reference: "Reference",
    customer: "Customer",
    items: "Items",
    value: "Value",
    status: "Status",
    updated: "Updated",
    loading: "Loading operations queue…",
    error: "We could not load the operations queue.",
    retry: "Try again",
    empty: "No requests match the current filters.",
    previous: "Previous",
    next: "Next",
    page: (current: number, total: number) => `Page ${current} of ${total}`,
    returnItems: (count: number) =>
      `Return ${count === 1 ? "item" : "items"} · ${count}`,
    evidence: (count: number) =>
      `${count} evidence ${count === 1 ? "file" : "files"}`,
    noEvidence: "No evidence",
    openFull: "Open full request",
    fullPending: "Full operations review is the next interface slice",
    detailError: "We could not open this request.",
    resetComplete: "Demo data restored",
    decisionComplete: "Operations decision saved",
  },
  es: {
    role: "Operaciones",
    demo: "Demo",
    overview: "Resumen",
    requestsNav: "Solicitudes",
    notifications: "Notificaciones",
    settings: "Configuración demo",
    customerView: "Vista cliente",
    switchRole: "Cambiar rol",
    title: "Solicitudes de devolución",
    intro: "Revisa solicitudes ficticias de la sesión de demostración actual.",
    submitted: "Enviadas",
    needsInfo: "Requieren información",
    approved: "Aprobadas",
    rejected: "Rechazadas",
    search: "Buscar referencia o cliente",
    allStatuses: "Estado: Todos",
    newest: "Más recientes",
    oldest: "Más antiguas",
    highest: "Mayor valor",
    lowest: "Menor valor",
    referenceOrder: "Referencia",
    reset: "Restablecer demo",
    resetting: "Restableciendo…",
    reference: "Referencia",
    customer: "Cliente",
    items: "Artículos",
    value: "Valor",
    status: "Estado",
    updated: "Actualizada",
    loading: "Cargando cola de operaciones…",
    error: "No pudimos cargar la cola de operaciones.",
    retry: "Intentar de nuevo",
    empty: "Ninguna solicitud coincide con los filtros.",
    previous: "Anterior",
    next: "Siguiente",
    page: (current: number, total: number) =>
      `Página ${current} de ${total}`,
    returnItems: (count: number) =>
      `${count === 1 ? "Artículo devuelto" : "Artículos devueltos"} · ${count}`,
    evidence: (count: number) =>
      `${count} ${count === 1 ? "evidencia" : "evidencias"}`,
    noEvidence: "Sin evidencias",
    openFull: "Abrir solicitud completa",
    fullPending: "La revisión operacional completa es el siguiente bloque",
    detailError: "No pudimos abrir esta solicitud.",
    resetComplete: "Datos de demostración restaurados",
    decisionComplete: "Decisión operacional guardada",
  },
} as const;

const statusLabels: Record<Locale, Record<OperationsReturnStatus, string>> = {
  en: {
    SUBMITTED: "Submitted",
    NEEDS_INFORMATION: "Needs info",
    APPROVED: "Approved",
    REJECTED: "Rejected",
  },
  es: {
    SUBMITTED: "Enviada",
    NEEDS_INFORMATION: "Requiere info",
    APPROVED: "Aprobada",
    REJECTED: "Rechazada",
  },
};

const reasonLabels: Record<Locale, Record<ReturnReason, string>> = {
  en: {
    DAMAGED: "Damaged",
    WRONG_ITEM: "Wrong item",
    NOT_AS_DESCRIBED: "Not as described",
    NO_LONGER_NEEDED: "No longer needed",
    OTHER: "Other",
  },
  es: {
    DAMAGED: "Dañado",
    WRONG_ITEM: "Artículo equivocado",
    NOT_AS_DESCRIBED: "No coincide con la descripción",
    NO_LONGER_NEEDED: "Ya no lo necesita",
    OTHER: "Otro",
  },
};

const statusCards: Array<{
  status: OperationsReturnStatus;
  symbol: string;
}> = [
  { status: "SUBMITTED", symbol: "▤" },
  { status: "NEEDS_INFORMATION", symbol: "i" },
  { status: "APPROVED", symbol: "✓" },
  { status: "REJECTED", symbol: "×" },
];

function formatMoney(value: string, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(locale === "es" ? "es-VE" : "en-US", {
    style: "currency",
    currency,
  }).format(Number(value));
}

function formatDate(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function OperationsQueue({
  locale,
  onLocaleChange,
  onResetCompleted,
  onSwitchToCustomer,
}: {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onResetCompleted: () => void;
  onSwitchToCustomer: () => void;
}) {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<OperationsReturnStatus | "">("");
  const [ordering, setOrdering] =
    useState<OperationsOrdering>("-updated_at");
  const [version, setVersion] = useState(0);
  const [queue, setQueue] = useState<QueueState>({ status: "idle" });
  const [counts, setCounts] = useState<CountsState>({ status: "idle" });
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [details, setDetails] = useState<Record<string, ExpandedState>>({});
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [review, setReview] = useState<ReturnRequestDetail | null>(null);
  const initializedExpansion = useRef(false);
  const t = copy[locale];

  const loadExpandedDetail = useCallback(async (returnId: string) => {
    setDetails((current) => ({
      ...current,
      [returnId]: { status: "loading" },
    }));
    try {
      const data = await retrieveOperationsReturn(returnId);
      setDetails((current) => ({
        ...current,
        [returnId]: { status: "ready", data },
      }));
    } catch (detailError) {
      setDetails((current) => ({
        ...current,
        [returnId]: { status: "error", error: toApiError(detailError) },
      }));
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const normalized = searchInput.trim();
      if (normalized !== search) {
        setQueue({ status: "loading" });
        setPage(1);
        setExpanded(new Set());
        setSearch(normalized);
      }
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search, searchInput]);

  useEffect(() => {
    let current = true;
    listOperationsReturns({
      page,
      pageSize: PAGE_SIZE,
      search,
      status: statusFilter || undefined,
      ordering,
    })
      .then((data) => {
        if (!current) return;
        setQueue({ status: "ready", data });
        if (!initializedExpansion.current && data.results.length > 0) {
          const initialRequest =
            data.results.find((request) => request.reference === "RTN-204") ??
            data.results[0];
          initializedExpansion.current = true;
          setExpanded(new Set([initialRequest.id]));
          void loadExpandedDetail(initialRequest.id);
        }
      })
      .catch((error: unknown) => {
        if (current) setQueue({ status: "error", error: toApiError(error) });
      });
    return () => {
      current = false;
    };
  }, [loadExpandedDetail, ordering, page, search, statusFilter, version]);

  useEffect(() => {
    let current = true;
    getOperationsStatusCounts()
      .then((data) => {
        if (current) setCounts({ status: "ready", data });
      })
      .catch(() => {
        if (current) setCounts({ status: "error" });
      });
    return () => {
      current = false;
    };
  }, [version]);

  const totalPages = useMemo(
    () =>
      queue.status === "ready"
        ? Math.max(1, Math.ceil(queue.data.count / PAGE_SIZE))
        : 1,
    [queue],
  );

  const refresh = useCallback(() => {
    setQueue({ status: "loading" });
    setCounts({ status: "loading" });
    setVersion((current) => current + 1);
  }, []);

  async function toggleExpanded(returnId: string) {
    if (expanded.has(returnId)) {
      setExpanded((current) => {
        const next = new Set(current);
        next.delete(returnId);
        return next;
      });
      return;
    }

    setExpanded((current) => new Set(current).add(returnId));
    if (details[returnId]?.status === "ready") return;
    await loadExpandedDetail(returnId);
  }

  function changeStatus(nextStatus: OperationsReturnStatus | "") {
    setQueue({ status: "loading" });
    setPage(1);
    setExpanded(new Set());
    setStatusFilter(nextStatus);
  }

  function changeOrdering(nextOrdering: OperationsOrdering) {
    setQueue({ status: "loading" });
    setPage(1);
    setExpanded(new Set());
    setOrdering(nextOrdering);
  }

  async function resetDemo() {
    setResetting(true);
    setNotice(null);
    try {
      await resetDemoDataset();
      setSearchInput("");
      setSearch("");
      setStatusFilter("");
      setOrdering("-updated_at");
      setPage(1);
      setExpanded(new Set());
      setDetails({});
      setReview(null);
      initializedExpansion.current = false;
      setNotice(t.resetComplete);
      onResetCompleted();
      refresh();
    } catch {
      setQueue({
        status: "error",
        error: new ApiError({
          status: 0,
          code: "demo_reset_failed",
          detail: t.error,
        }),
      });
    } finally {
      setResetting(false);
    }
  }

  function handleTransitioned(updated: ReturnRequestDetail) {
    setReview(updated);
    setDetails((current) => ({
      ...current,
      [updated.id]: { status: "ready", data: updated },
    }));
    setNotice(t.decisionComplete);
    refresh();
  }

  return (
    <div className={operationsSurfaceStyles.page}>
      <aside className={`${operationsSurfaceStyles.sidebar} ${operationsPatternStyles.sidebar}`}>
        <div className={operationsPatternStyles.sidebarBrand}>ReturnOps</div>
        <DemoBadge variant="operations">{t.demo}</DemoBadge>
        <nav aria-label="Operations navigation">
          <span><b aria-hidden="true">⌂</b>{t.overview}</span>
          <span className={operationsPatternStyles.navActive}><b aria-hidden="true">▤</b>{t.requestsNav}</span>
          <span><b aria-hidden="true">○</b>{t.notifications}</span>
          <span><b aria-hidden="true">⚙</b>{t.settings}</span>
          <button onClick={onSwitchToCustomer} type="button"><b aria-hidden="true">♙</b>{t.customerView}</button>
        </nav>
        <button className={operationsPatternStyles.switchRole} onClick={onSwitchToCustomer} type="button">
          {t.switchRole} <span aria-hidden="true">→</span>
        </button>
      </aside>

      <div className={operationsSurfaceStyles.workspace}>
        <header className={operationsSurfaceStyles.topbar}>
          <span className={operationsPatternStyles.mobileBrand}>ReturnOps</span>
          <button
            aria-label={`${t.switchRole}: ${t.customerView}`}
            className={operationsPatternStyles.roleButton}
            onClick={onSwitchToCustomer}
            title={t.switchRole}
            type="button"
          >
            {t.role}
          </button>
          <LocaleSwitch
            locale={locale}
            onLocaleChange={onLocaleChange}
            variant="operations"
          />
          <button className={operationsPatternStyles.mobileSwitch} onClick={onSwitchToCustomer} type="button">{t.customerView}</button>
        </header>

        <main className={operationsSurfaceStyles.main}>
          <div className={operationsPatternStyles.heading}>
            <div><p>{t.role}</p><h1>{t.title}</h1><span>{t.intro}</span></div>
          </div>

          <section className={`${operationsSurfaceStyles.stats} ${operationsPatternStyles.stats}`} aria-label="Return status summary">
            {statusCards.map((card) => {
              const label = card.status === "SUBMITTED" ? t.submitted : card.status === "NEEDS_INFORMATION" ? t.needsInfo : card.status === "APPROVED" ? t.approved : t.rejected;
              return (
                <button
                  className={operationsSurfaceStyles.statCard}
                  data-active={statusFilter === card.status}
                  data-status={card.status}
                  key={card.status}
                  onClick={() => changeStatus(statusFilter === card.status ? "" : card.status)}
                  type="button"
                >
                  <span className={operationsPatternStyles.statIcon} data-status={card.status} aria-hidden="true">{card.symbol}</span>
                  <strong>{counts.status === "ready" ? counts.data[card.status] : "—"}</strong>
                  <small>{label}</small>
                </button>
              );
            })}
          </section>

          <section className={operationsSurfaceStyles.queueSection} aria-labelledby="operations-queue-title">
            <h2 className="sr-only" id="operations-queue-title">{t.title}</h2>
            <div className={`${operationsSurfaceStyles.filters} ${operationsPatternStyles.filters}`}>
              <label className={operationsPatternStyles.searchField}>
                <span className="sr-only">{t.search}</span>
                <b className={operationsPatternStyles.searchIcon} aria-hidden="true">⌕</b>
                <input className={fieldStyles.operationsSearch} maxLength={120} onChange={(event) => setSearchInput(event.target.value)} placeholder={t.search} value={searchInput} />
              </label>
              <label>
                <span className="sr-only">{t.status}</span>
                <select className={fieldStyles.operationsSelect} onChange={(event) => changeStatus(event.target.value as OperationsReturnStatus | "")} value={statusFilter}>
                  <option value="">{t.allStatuses}</option>
                  <option value="SUBMITTED">{t.submitted}</option>
                  <option value="NEEDS_INFORMATION">{t.needsInfo}</option>
                  <option value="APPROVED">{t.approved}</option>
                  <option value="REJECTED">{t.rejected}</option>
                </select>
              </label>
              <label className={operationsPatternStyles.thirdFilter}>
                <span className="sr-only">Ordering</span>
                <select className={fieldStyles.operationsSelect} onChange={(event) => changeOrdering(event.target.value as OperationsOrdering)} value={ordering}>
                  <option value="-updated_at">{t.newest}</option>
                  <option value="updated_at">{t.oldest}</option>
                  <option value="-total_value">{t.highest}</option>
                  <option value="total_value">{t.lowest}</option>
                  <option value="reference">{t.referenceOrder}</option>
                </select>
              </label>
              <button className={`${operationsPatternStyles.resetButton} ${buttonStyles.operationsReset}`} disabled={resetting} onClick={resetDemo} type="button">
                {resetting ? t.resetting : t.reset}
              </button>
            </div>

            {(queue.status === "idle" || queue.status === "loading") && <QueueMessage loading message={t.loading} />}
            {queue.status === "error" && (
                <div className={`${operationsSurfaceStyles.errorState} ${operationsPatternStyles.errorState}`} role="alert">
                <div><strong>{t.error}</strong><p>{queue.error.message}</p></div>
                <button className={buttonStyles.operationsSecondary} onClick={refresh} type="button">{t.retry}</button>
              </div>
            )}
            {queue.status === "ready" && queue.data.results.length === 0 && <QueueMessage message={t.empty} />}
            {queue.status === "ready" && queue.data.results.length > 0 && (
              <>
                <DesktopQueue
                  details={details}
                  expanded={expanded}
                  locale={locale}
                  onOpenReview={setReview}
                  onToggle={toggleExpanded}
                  requests={queue.data.results}
                />
                <MobileQueue
                  details={details}
                  expanded={expanded}
                  locale={locale}
                  onOpenReview={setReview}
                  onToggle={toggleExpanded}
                  requests={queue.data.results}
                />
                <div className={`${operationsSurfaceStyles.pagination} ${operationsPatternStyles.pagination}`}>
                  <button className={buttonStyles.operationsPagination} disabled={!queue.data.previous} onClick={() => { setQueue({ status: "loading" }); setPage((current) => Math.max(1, current - 1)); }} type="button">← {t.previous}</button>
                  <span>{t.page(page, totalPages)}</span>
                  <button className={`${buttonStyles.operationsPagination} justify-self-end`} disabled={!queue.data.next} onClick={() => { setQueue({ status: "loading" }); setPage((current) => current + 1); }} type="button">{t.next} →</button>
                </div>
              </>
            )}
          </section>
        </main>
      </div>

      {review && (
        <OperationsReview
          key={`${review.id}:${review.status}`}
          locale={locale}
          onClose={() => setReview(null)}
          onTransitioned={handleTransitioned}
          request={review}
        />
      )}
      {notice && <div className={operationsSurfaceStyles.toast} role="status">✓ {notice}<button className={operationsPatternStyles.toastClose} aria-label="Close" onClick={() => setNotice(null)} type="button">×</button></div>}
    </div>
  );
}

function DesktopQueue({
  details,
  expanded,
  locale,
  onOpenReview,
  onToggle,
  requests,
}: {
  details: Record<string, ExpandedState>;
  expanded: Set<string>;
  locale: Locale;
  onOpenReview: (request: ReturnRequestDetail) => void;
  onToggle: (returnId: string) => void;
  requests: ReturnRequestSummary[];
}) {
  const t = copy[locale];
  return (
    <div className={`${operationsSurfaceStyles.tableFrame} ${operationsPatternStyles.tableFrame}`}>
      <table>
        <thead><tr><th>{t.reference}</th><th>{t.customer}</th><th>{t.items}</th><th>{t.value}</th><th>{t.status}</th><th>{t.updated}</th></tr></thead>
        <tbody>
          {requests.map((request) => (
            <Fragment key={request.id}>
              <tr data-expanded={expanded.has(request.id)}>
                <td><button className={operationsPatternStyles.rowToggle} aria-expanded={expanded.has(request.id)} onClick={() => onToggle(request.id)} type="button"><span aria-hidden="true">{expanded.has(request.id) ? "⌄" : "›"}</span>{request.reference}</button></td>
                <td>{request.customer_name}</td>
                <td>{request.item_count}</td>
                <td>{formatMoney(request.total_value, request.currency, locale)}</td>
                <td><StatusBadge locale={locale} status={request.status as OperationsReturnStatus} /></td>
                <td>{formatDate(request.updated_at, locale)}</td>
              </tr>
              {expanded.has(request.id) && (
                <tr className={operationsPatternStyles.expandedRow}><td colSpan={6}><ExpandedRequest locale={locale} onOpenReview={onOpenReview} state={details[request.id]} /></td></tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileQueue(props: Parameters<typeof DesktopQueue>[0]) {
  const { details, expanded, locale, onOpenReview, onToggle, requests } = props;
  const t = copy[locale];
  return (
    <div className={operationsSurfaceStyles.mobileQueue}>
      {requests.map((request) => (
        <article className={operationsSurfaceStyles.mobileCard} key={request.id}>
          <button className={`${operationsSurfaceStyles.mobileCardHeader} ${operationsPatternStyles.mobileCardHeader}`} aria-expanded={expanded.has(request.id)} onClick={() => onToggle(request.id)} type="button">
            <span className={operationsPatternStyles.mobileChevron} aria-hidden="true">{expanded.has(request.id) ? "⌃" : "⌄"}</span>
            <strong>{request.reference}</strong>
            <StatusBadge locale={locale} status={request.status as OperationsReturnStatus} />
            <span className={operationsPatternStyles.mobileMenu} aria-hidden="true">⋮</span>
            <span className={operationsPatternStyles.mobileCustomer}>{request.customer_name}</span>
            <small>{request.item_count} {t.items.toLowerCase()} · {formatMoney(request.total_value, request.currency, locale)} · {formatDate(request.updated_at, locale)}</small>
          </button>
          {expanded.has(request.id) && <ExpandedRequest locale={locale} onOpenReview={onOpenReview} state={details[request.id]} />}
        </article>
      ))}
    </div>
  );
}

function ExpandedRequest({
  locale,
  onOpenReview,
  state,
}: {
  locale: Locale;
  onOpenReview: (request: ReturnRequestDetail) => void;
  state?: ExpandedState;
}) {
  const t = copy[locale];
  if (!state || state.status === "loading") return <QueueMessage loading message={t.loading} compact />;
  if (state.status === "error") return <div className={operationsPatternStyles.inlineError}>{t.detailError}: {state.error.message}</div>;
  return (
    <div className={operationsSurfaceStyles.expandedPanel}>
      <div className={`${operationsSurfaceStyles.expandedHeader} ${operationsPatternStyles.expandedHeader}`}><strong>{t.returnItems(state.data.item_count)}</strong><button onClick={() => onOpenReview(state.data)} type="button">{t.openFull} →</button></div>
      <div className={`${operationsSurfaceStyles.hierarchy} ${operationsPatternStyles.hierarchy}`}>
        {state.data.items.map((item) => (
          <article className={`${operationsSurfaceStyles.expandedItem} ${operationsPatternStyles.expandedItem}`} key={item.id}>
            <span className={operationsPatternStyles.productIcon} aria-hidden="true">□</span>
            <div className={operationsPatternStyles.productCopy}><strong>{item.product_name}</strong><p>{item.sku} · {item.quantity} × {formatMoney(item.unit_price, state.data.currency, locale)} · {reasonLabels[locale][item.reason]}</p></div>
            <span className={operationsPatternStyles.evidenceCount}>{item.evidence.length ? t.evidence(item.evidence.length) : t.noEvidence}</span>
            {item.evidence.length > 0 && (
              <div className={operationsPatternStyles.evidenceList}>
                {item.evidence.map((evidence) => <span key={evidence.id}>⌕ {evidence.caption || evidence.kind.replaceAll("_", " ")}</span>)}
              </div>
            )}
          </article>
        ))}
      </div>
      <p className={operationsPatternStyles.evidenceNote}>ⓘ {locale === "es" ? "La evidencia pertenece a cada artículo devuelto." : "Evidence belongs to each returned item."}</p>
    </div>
  );
}

function StatusBadge({ locale, status }: { locale: Locale; status: OperationsReturnStatus }) {
  return (
    <ReturnStatusBadge status={status} variant="operations">
      {statusLabels[locale][status]}
    </ReturnStatusBadge>
  );
}

function QueueMessage({ compact = false, loading = false, message }: { compact?: boolean; loading?: boolean; message: string }) {
  return <div className={compact ? operationsSurfaceStyles.compactMessage : operationsSurfaceStyles.queueMessage} role="status">{loading && <LoadingSpinner />}{message}</div>;
}
