"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  createCustomerReturn,
  listEligibleDemoOrders,
  listCustomerReturns,
  retrieveCustomerReturn,
} from "@/features/returns/api";
import CustomerReturnWorkflow from "@/features/returns/components/customer-return-workflow";
import { buttonStyles, fieldStyles } from "@/features/returns/components/control-styles";
import { DemoBadge } from "@/features/returns/components/demo-badge";
import { LoadingSpinner } from "@/features/returns/components/loading-spinner";
import { LocaleSwitch } from "@/features/returns/components/locale-switch";
import OperationsQueue from "@/features/returns/components/operations-queue";
import { customerPatternStyles } from "@/features/returns/components/pattern-styles";
import { ReturnStatusBadge } from "@/features/returns/components/return-status-badge";
import { customerSurfaceStyles } from "@/features/returns/components/surface-styles";
import type {
  CatalogReturnCreateInput,
  DemoOrder,
  PaginatedReturns,
  ReturnReason,
  ReturnRequestDetail,
  ReturnStatus,
} from "@/features/returns/types";
import { ApiError, toApiError } from "@/lib/api/client";
import { useDemoSession } from "@/providers/demo-session-provider";

type Locale = "en" | "es";
type DemoRole = "customer" | "operations";
type ListState =
  | { status: "idle" | "loading" }
  | { status: "ready"; data: PaginatedReturns }
  | { status: "error"; error: ApiError };
type DetailState =
  | { status: "idle" }
  | { status: "loading"; returnId: string }
  | { status: "ready"; data: ReturnRequestDetail }
  | { status: "error"; error: ApiError };
type EditorState =
  | { mode: "create" }
  | null;

const PAGE_SIZE = 5;

const copy = {
  en: {
    demo: "Interactive demo",
    customer: "Customer",
    operations: "Operations",
    soon: "Soon",
    operationsPending: "Operations view is the next interface slice",
    eyebrow: "Customer return center",
    title: "Returns, without the runaround.",
    intro:
      "Create a request, follow every decision, and keep the full return history in one place.",
    newReturn: "Start a return",
    sessionReady: "Private demo ready",
    sessionCopy: "Your fictional data is isolated in this browser.",
    requests: "Your return requests",
    requestCount: (count: number) =>
      `${count} fictional ${count === 1 ? "request" : "requests"}`,
    reference: "Reference",
    customerName: "Customer",
    items: "Items",
    value: "Value",
    status: "Status",
    updated: "Updated",
    view: "View",
    loading: "Loading your return requests…",
    bootstrap: "Preparing your private demo…",
    listError: "We could not load your returns.",
    retry: "Try again",
    empty: "No returns yet. Start the first fictional request.",
    previous: "Previous",
    next: "Next",
    page: (current: number, total: number) => `Page ${current} of ${total}`,
    detailLoading: "Loading request details…",
    detailError: "We could not load this request.",
    close: "Close",
    edit: "Edit details",
    continueReturn: "Continue return",
    order: "Order",
    email: "Email",
    requestItems: "Return items",
    evidence: (count: number) =>
      `${count} evidence ${count === 1 ? "file" : "files"}`,
    timeline: "Activity",
    noNote: "Status updated",
    createTitle: "Start a fictional return",
    orderSearch: "Find a fictional demo order",
    orderSearchPlaceholder: "Try ORD-90001",
    availableOrders: "Available demo orders",
    noOrderMatch: "No eligible fictional order matches that reference.",
    noOrders: "All demo orders are currently in use. Reset the demo to restore them.",
    orderCustomer: "Fictional customer",
    selectItems: "Select at least one item to return",
    purchased: (count: number) => `Purchased: ${count}`,
    quantity: "Return quantity",
    reason: "Reason",
    details: "Optional details",
    itemRequired: "Select at least one eligible item.",
    loadingOrders: "Loading eligible demo orders…",
    formIntro:
      "Choose a server-owned fictional order. Customer, product, quantity, and price data cannot be invented.",
    cancel: "Cancel",
    creating: "Creating…",
    createDraft: "Continue with selected items",
    formError: "We could not save these details.",
    draftCreated: "Draft created",
    detailsSaved: "Details saved",
    draftSaved: "Draft progress saved",
    submitted: "Return submitted to operations",
  },
  es: {
    demo: "Demo interactiva",
    customer: "Cliente",
    operations: "Operaciones",
    soon: "Pronto",
    operationsPending: "La vista de operaciones será el próximo bloque visual",
    eyebrow: "Centro de devoluciones",
    title: "Devoluciones, sin complicaciones.",
    intro:
      "Crea una solicitud, sigue cada decisión y conserva todo el historial en un solo lugar.",
    newReturn: "Iniciar devolución",
    sessionReady: "Demo privada lista",
    sessionCopy: "Tus datos ficticios están aislados en este navegador.",
    requests: "Tus solicitudes de devolución",
    requestCount: (count: number) =>
      `${count} ${count === 1 ? "solicitud ficticia" : "solicitudes ficticias"}`,
    reference: "Referencia",
    customerName: "Cliente",
    items: "Artículos",
    value: "Valor",
    status: "Estado",
    updated: "Actualizada",
    view: "Ver",
    loading: "Cargando tus solicitudes…",
    bootstrap: "Preparando tu demo privada…",
    listError: "No pudimos cargar tus devoluciones.",
    retry: "Intentar de nuevo",
    empty: "Aún no hay devoluciones. Inicia la primera solicitud ficticia.",
    previous: "Anterior",
    next: "Siguiente",
    page: (current: number, total: number) =>
      `Página ${current} de ${total}`,
    detailLoading: "Cargando los detalles…",
    detailError: "No pudimos cargar esta solicitud.",
    close: "Cerrar",
    edit: "Editar datos",
    continueReturn: "Continuar devolución",
    order: "Pedido",
    email: "Correo",
    requestItems: "Artículos a devolver",
    evidence: (count: number) =>
      `${count} ${count === 1 ? "evidencia" : "evidencias"}`,
    timeline: "Actividad",
    noNote: "Estado actualizado",
    createTitle: "Iniciar devolución ficticia",
    orderSearch: "Busca un pedido ficticio de demostración",
    orderSearchPlaceholder: "Prueba ORD-90001",
    availableOrders: "Pedidos demo disponibles",
    noOrderMatch: "Ningún pedido ficticio elegible coincide con esa referencia.",
    noOrders: "Todos los pedidos demo están en uso. Restablece la demo para recuperarlos.",
    orderCustomer: "Cliente ficticio",
    selectItems: "Selecciona al menos un artículo para devolver",
    purchased: (count: number) => `Comprados: ${count}`,
    quantity: "Cantidad a devolver",
    reason: "Motivo",
    details: "Detalles opcionales",
    itemRequired: "Selecciona al menos un artículo elegible.",
    loadingOrders: "Cargando pedidos demo elegibles…",
    formIntro:
      "Elige un pedido ficticio controlado por el servidor. No se pueden inventar clientes, productos, cantidades ni precios.",
    cancel: "Cancelar",
    creating: "Creando…",
    createDraft: "Continuar con los artículos",
    formError: "No pudimos guardar estos datos.",
    draftCreated: "Borrador creado",
    detailsSaved: "Datos actualizados",
    draftSaved: "Progreso del borrador guardado",
    submitted: "Devolución enviada a operaciones",
  },
} as const;

const statusCopy: Record<Locale, Record<ReturnStatus, string>> = {
  en: {
    DRAFT: "Draft",
    SUBMITTED: "Submitted",
    NEEDS_INFORMATION: "Needs information",
    APPROVED: "Approved",
    REJECTED: "Rejected",
  },
  es: {
    DRAFT: "Borrador",
    SUBMITTED: "Enviada",
    NEEDS_INFORMATION: "Requiere información",
    APPROVED: "Aprobada",
    REJECTED: "Rechazada",
  },
};

function formatMoney(value: string, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(locale === "es" ? "es-VE" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
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

function errorDetail(error: ApiError, fallback: string): string {
  return error.message || fallback;
}

export default function CustomerReturnsScreen() {
  const session = useDemoSession();
  const [locale, setLocale] = useState<Locale>("en");
  const [role, setRole] = useState<DemoRole>("customer");
  const [page, setPage] = useState(1);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [listState, setListState] = useState<ListState>({ status: "idle" });
  const [detailState, setDetailState] = useState<DetailState>({ status: "idle" });
  const [editor, setEditor] = useState<EditorState>(null);
  const [workflowReturn, setWorkflowReturn] =
    useState<ReturnRequestDetail | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const t = copy[locale];

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (detailState.status === "idle") {
      return;
    }

    document.getElementById("return-detail")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [detailState.status]);

  useEffect(() => {
    if (session.status !== "ready") {
      return;
    }

    let current = true;
    listCustomerReturns({ page, pageSize: PAGE_SIZE })
      .then((data) => {
        if (current) {
          setListState({ status: "ready", data });
        }
      })
      .catch((error: unknown) => {
        if (current) {
          setListState({ status: "error", error: toApiError(error) });
        }
      });

    return () => {
      current = false;
    };
  }, [page, refreshVersion, session.status]);

  const totalPages = useMemo(() => {
    if (listState.status !== "ready") {
      return 1;
    }
    return Math.max(1, Math.ceil(listState.data.count / PAGE_SIZE));
  }, [listState]);

  const refresh = useCallback(() => {
    setListState({ status: "loading" });
    setRefreshVersion((version) => version + 1);
  }, []);

  const openDetail = useCallback((returnId: string) => {
    setDetailState({ status: "loading", returnId });
    retrieveCustomerReturn(returnId)
      .then((data) => setDetailState({ status: "ready", data }))
      .catch((error: unknown) => {
        setDetailState({ status: "error", error: toApiError(error) });
      });
  }, []);

  const handleSaved = useCallback(
    (data: ReturnRequestDetail, message: string) => {
      setEditor(null);
      setDetailState({ status: "ready", data });
      setNotice(message);
      setWorkflowReturn(data);
      setListState({ status: "loading" });
      if (page !== 1) {
        setPage(1);
      } else {
        refresh();
      }
    },
    [page, refresh],
  );

  const handleWorkflowClose = useCallback(
    (data: ReturnRequestDetail) => {
      setWorkflowReturn(null);
      setDetailState({ status: "ready", data });
      setNotice(copy[locale].draftSaved);
      refresh();
    },
    [locale, refresh],
  );

  const handleWorkflowSubmitted = useCallback(
    (data: ReturnRequestDetail) => {
      setWorkflowReturn(null);
      setDetailState({ status: "ready", data });
      setNotice(copy[locale].submitted);
      refresh();
    },
    [locale, refresh],
  );

  const sessionReady = session.status === "ready";

  if (role === "operations") {
    return (
      <OperationsQueue
        locale={locale}
        onLocaleChange={setLocale}
        onResetCompleted={refresh}
        onSwitchToCustomer={() => {
          setRole("customer");
          refresh();
        }}
      />
    );
  }

  return (
    <div className={customerSurfaceStyles.appShell}>
      <header className={customerSurfaceStyles.header}>
        <a className={customerPatternStyles.brand} href="#top" aria-label="ReturnOps home">
          <span className={customerPatternStyles.brandMark} aria-hidden="true">R</span>
          <span>ReturnOps</span>
        </a>

        <div className={customerSurfaceStyles.headerTools}>
          <DemoBadge variant="customer">{t.demo}</DemoBadge>
          <LocaleSwitch
            locale={locale}
            onLocaleChange={setLocale}
            variant="customer"
          />
        </div>
      </header>

      <div className={`${customerSurfaceStyles.roleBar} ${customerPatternStyles.roleBar}`} aria-label="Demo role">
        <button className={customerPatternStyles.roleActive} type="button">
          {t.customer}
        </button>
        <button
          disabled={!sessionReady}
          onClick={() => setRole("operations")}
          type="button"
        >
          {t.operations}
        </button>
      </div>

      <main id="top">
        <section className={`${customerSurfaceStyles.hero} ${customerPatternStyles.hero}`}>
          <div>
            <p className={customerPatternStyles.eyebrow}>{t.eyebrow}</p>
            <h1>{t.title}</h1>
            <p className={customerPatternStyles.intro}>{t.intro}</p>
            <button
              className={`${buttonStyles.customerPrimary} mt-[34px]`}
              disabled={!sessionReady}
              onClick={() => setEditor({ mode: "create" })}
              type="button"
            >
              <span aria-hidden="true">+</span>
              {t.newReturn}
            </button>
          </div>

          <aside className={`${customerSurfaceStyles.sessionCard} ${customerPatternStyles.sessionCard}`}>
            <span className={customerPatternStyles.sessionIcon} aria-hidden="true">✓</span>
            <div>
              <strong>{t.sessionReady}</strong>
              <p>{t.sessionCopy}</p>
            </div>
          </aside>
        </section>

        <section className={customerSurfaceStyles.returnsPanel} aria-labelledby="returns-title">
          <div className={`${customerSurfaceStyles.sectionHeader} ${customerPatternStyles.sectionHeader}`}>
            <div>
              <p className={customerPatternStyles.eyebrow}>{t.customer}</p>
              <h2 id="returns-title">{t.requests}</h2>
            </div>
            {listState.status === "ready" && (
              <p>{t.requestCount(listState.data.count)}</p>
            )}
          </div>

          {session.status === "bootstrapping" && (
            <LoadingState message={t.bootstrap} />
          )}

          {session.status === "error" && (
            <ErrorState
              detail={errorDetail(session.error, t.listError)}
              label={t.retry}
              onRetry={session.retry}
              title={t.listError}
            />
          )}

          {sessionReady &&
            (listState.status === "idle" || listState.status === "loading") && (
            <LoadingState message={t.loading} />
          )}

          {sessionReady && listState.status === "error" && (
            <ErrorState
              detail={errorDetail(listState.error, t.listError)}
              label={t.retry}
              onRetry={refresh}
              title={t.listError}
            />
          )}

          {listState.status === "ready" && listState.data.results.length === 0 && (
            <div className={customerSurfaceStyles.emptyState}>{t.empty}</div>
          )}

          {listState.status === "ready" && listState.data.results.length > 0 && (
            <>
              <div className={`${customerSurfaceStyles.tableFrame} ${customerPatternStyles.tableFrame}`}>
                <table>
                  <thead>
                    <tr>
                      <th>{t.reference}</th>
                      <th>{t.customerName}</th>
                      <th>{t.items}</th>
                      <th>{t.value}</th>
                      <th>{t.status}</th>
                      <th>{t.updated}</th>
                      <th><span className="sr-only">{t.view}</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {listState.data.results.map((returnRequest) => (
                      <tr key={returnRequest.id}>
                        <td>
                          <button
                            className={customerPatternStyles.referenceButton}
                            onClick={() => openDetail(returnRequest.id)}
                            type="button"
                          >
                            {returnRequest.reference}
                          </button>
                        </td>
                        <td>{returnRequest.customer_name}</td>
                        <td>{returnRequest.item_count}</td>
                        <td>
                          {formatMoney(
                            returnRequest.total_value,
                            returnRequest.currency,
                            locale,
                          )}
                        </td>
                        <td>
                          <StatusBadge
                            label={statusCopy[locale][returnRequest.status]}
                            status={returnRequest.status}
                          />
                        </td>
                        <td className={customerPatternStyles.updatedCell}>
                          {formatDate(returnRequest.updated_at, locale)}
                        </td>
                        <td>
                          <button
                            className={customerPatternStyles.viewButton}
                            onClick={() => openDetail(returnRequest.id)}
                            type="button"
                          >
                            <span className="sr-only">{t.view}</span>
                            <span aria-hidden="true">→</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={customerSurfaceStyles.mobileReturns} aria-label={t.requests}>
                {listState.data.results.map((returnRequest) => (
                  <article className={`${customerSurfaceStyles.mobileReturnCard} ${customerPatternStyles.mobileReturnCard}`} key={returnRequest.id}>
                    <button
                      aria-label={returnRequest.reference}
                      onClick={() => openDetail(returnRequest.id)}
                      type="button"
                    >
                      <span className={customerPatternStyles.mobileReturnTop}>
                        <strong>{returnRequest.reference}</strong>
                        <StatusBadge
                          label={statusCopy[locale][returnRequest.status]}
                          status={returnRequest.status}
                        />
                      </span>
                      <strong className={customerPatternStyles.mobileCustomerName}>
                        {returnRequest.customer_name}
                      </strong>
                      <span className={customerPatternStyles.mobileReturnMeta}>
                        <span>{returnRequest.item_count} {t.items.toLowerCase()}</span>
                        <span>
                          {formatMoney(
                            returnRequest.total_value,
                            returnRequest.currency,
                            locale,
                          )}
                        </span>
                        <time dateTime={returnRequest.updated_at}>
                          {formatDate(returnRequest.updated_at, locale)}
                        </time>
                      </span>
                    </button>
                  </article>
                ))}
              </div>

              <div className={`${customerSurfaceStyles.pagination} ${customerPatternStyles.pagination}`}>
                <button
                  className={buttonStyles.customerPagination}
                  disabled={!listState.data.previous}
                  onClick={() => {
                    setListState({ status: "loading" });
                    setPage((current) => Math.max(1, current - 1));
                  }}
                  type="button"
                >
                  ← {t.previous}
                </button>
                <span>{t.page(page, totalPages)}</span>
                <button
                  className={`${buttonStyles.customerPagination} justify-self-end`}
                  disabled={!listState.data.next}
                  onClick={() => {
                    setListState({ status: "loading" });
                    setPage((current) => current + 1);
                  }}
                  type="button"
                >
                  {t.next} →
                </button>
              </div>
            </>
          )}
        </section>

        {detailState.status !== "idle" && (
          <ReturnDetail
            locale={locale}
            onClose={() => setDetailState({ status: "idle" })}
            onContinue={setWorkflowReturn}
            onRetry={
              detailState.status === "loading"
                ? () => openDetail(detailState.returnId)
                : undefined
            }
            state={detailState}
          />
        )}
      </main>

      <footer className={`${customerSurfaceStyles.footer} ${customerPatternStyles.footer}`}>
        <span>ReturnOps</span>
        <span>Fictional data · Clean-room implementation</span>
      </footer>

      {editor && (
        <ReturnEditor
          locale={locale}
          onCancel={() => setEditor(null)}
          onSaved={handleSaved}
        />
      )}

      {workflowReturn && (
        <CustomerReturnWorkflow
          initialReturn={workflowReturn}
          locale={locale}
          onClose={handleWorkflowClose}
          onSubmitted={handleWorkflowSubmitted}
        />
      )}

      {notice && (
        <div className={customerSurfaceStyles.toast} role="status">
          <span aria-hidden="true">✓</span>
          {notice}
          <button className={customerPatternStyles.toastClose} onClick={() => setNotice(null)} type="button" aria-label={t.close}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className={customerSurfaceStyles.loadingState} role="status">
      <LoadingSpinner />
      {message}
    </div>
  );
}

function ErrorState({
  detail,
  label,
  onRetry,
  title,
}: {
  detail: string;
  label: string;
  onRetry: () => void;
  title: string;
}) {
  return (
    <div className={`${customerSurfaceStyles.errorState} ${customerPatternStyles.errorState}`} role="alert">
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
      <button className={buttonStyles.customerSecondary} onClick={onRetry} type="button">{label}</button>
    </div>
  );
}

function StatusBadge({ label, status }: { label: string; status: ReturnStatus }) {
  return (
    <ReturnStatusBadge status={status} variant="customer">
      {label}
    </ReturnStatusBadge>
  );
}

function ReturnDetail({
  locale,
  onClose,
  onContinue,
  state,
}: {
  locale: Locale;
  onClose: () => void;
  onContinue: (data: ReturnRequestDetail) => void;
  onRetry?: () => void;
  state: DetailState;
}) {
  const t = copy[locale];

  if (state.status === "loading") {
    return (
      <section className={customerSurfaceStyles.detailPanel} id="return-detail" aria-live="polite">
        <LoadingState message={t.detailLoading} />
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className={customerSurfaceStyles.detailPanel} id="return-detail">
        <div className={`${customerSurfaceStyles.errorState} ${customerPatternStyles.errorState}`} role="alert">
          <div>
            <strong>{t.detailError}</strong>
            <p>{errorDetail(state.error, t.detailError)}</p>
          </div>
          <button className={buttonStyles.customerSecondary} onClick={onClose} type="button">{t.close}</button>
        </div>
      </section>
    );
  }

  if (state.status !== "ready") {
    return null;
  }

  const data = state.data;
  const editable = data.status === "DRAFT" || data.status === "NEEDS_INFORMATION";

  return (
    <section className={customerSurfaceStyles.detailPanel} id="return-detail" aria-labelledby="return-detail-title">
      <div className={`${customerSurfaceStyles.detailHeader} ${customerPatternStyles.detailHeader}`}>
        <div>
          <div className={customerPatternStyles.detailReference}>
            <p className={customerPatternStyles.eyebrow}>{t.reference}</p>
            <StatusBadge label={statusCopy[locale][data.status]} status={data.status} />
          </div>
          <h2 id="return-detail-title">{data.reference}</h2>
          <p>{data.customer_name} · {data.order_reference}</p>
        </div>
        <div className={customerSurfaceStyles.detailActions}>
          {editable && (
            <button className={buttonStyles.customerSecondary} onClick={() => onContinue(data)} type="button">
              {t.continueReturn}
            </button>
          )}
          <button className={buttonStyles.customerIcon} onClick={onClose} type="button" aria-label={t.close}>×</button>
        </div>
      </div>

      <dl className={`${customerSurfaceStyles.detailMeta} ${customerPatternStyles.detailMeta}`}>
        <div><dt>{t.order}</dt><dd>{data.order_reference}</dd></div>
        <div><dt>{t.email}</dt><dd>{data.customer_email}</dd></div>
        <div><dt>{t.value}</dt><dd>{formatMoney(data.total_value, data.currency, locale)}</dd></div>
        <div><dt>{t.updated}</dt><dd>{formatDate(data.updated_at, locale)}</dd></div>
      </dl>

      <div className={`${customerSurfaceStyles.detailGrid} ${customerPatternStyles.detailGrid}`}>
        <div>
          <h3>{t.requestItems}</h3>
          <div className={customerSurfaceStyles.detailItemList}>
            {data.items.map((item) => (
              <article className={`${customerSurfaceStyles.detailItemCard} ${customerPatternStyles.itemCard}`} key={item.id}>
                <div>
                  <span>{item.sku}</span>
                  <h4>{item.product_name}</h4>
                  <p>{item.quantity} × {formatMoney(item.unit_price, data.currency, locale)}</p>
                </div>
                <div className={customerPatternStyles.itemValue}>
                  <strong>{formatMoney(item.line_total, data.currency, locale)}</strong>
                  <span>{t.evidence(item.evidence.length)}</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div>
          <h3>{t.timeline}</h3>
          <ol className={customerPatternStyles.timeline}>
            {data.status_events.map((event) => (
              <li key={event.id}>
                <span aria-hidden="true" />
                <div>
                  <strong>{statusCopy[locale][event.to_status]}</strong>
                  <p>{event.note || t.noNote}</p>
                  <time dateTime={event.created_at}>{formatDate(event.created_at, locale)}</time>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

const catalogReasonLabels: Record<Locale, Record<ReturnReason, string>> = {
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
    NO_LONGER_NEEDED: "Ya no lo necesito",
    OTHER: "Otro",
  },
};

type CatalogItemSelectionState = Record<
  string,
  {
    selected: boolean;
    quantity: number;
    reason: ReturnReason;
    details: string;
  }
>;

function ReturnEditor({
  locale,
  onCancel,
  onSaved,
}: {
  locale: Locale;
  onCancel: () => void;
  onSaved: (data: ReturnRequestDetail, message: string) => void;
}) {
  const t = copy[locale];
  const [orders, setOrders] = useState<DemoOrder[] | null>(null);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [query, setQuery] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selections, setSelections] = useState<CatalogItemSelectionState>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const loadOrders = useCallback(() => {
    setOrders(null);
    setLoadError(null);
    listEligibleDemoOrders()
      .then(setOrders)
      .catch((loadFailure: unknown) => {
        setLoadError(toApiError(loadFailure));
      });
  }, []);

  useEffect(() => {
    let current = true;
    listEligibleDemoOrders()
      .then((availableOrders) => {
        if (current) setOrders(availableOrders);
      })
      .catch((loadFailure: unknown) => {
        if (current) setLoadError(toApiError(loadFailure));
      });
    return () => {
      current = false;
    };
  }, []);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onCancel();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onCancel, saving]);

  const visibleOrders = useMemo(() => {
    const normalized = query.trim().toLocaleUpperCase();
    if (!orders || !normalized) return orders ?? [];
    return orders.filter((order) =>
      order.order_reference.toLocaleUpperCase().includes(normalized),
    );
  }, [orders, query]);

  const selectedOrder = useMemo(
    () => orders?.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

  const selectedCount = Object.values(selections).filter(
    (selection) => selection.selected,
  ).length;

  function chooseOrder(order: DemoOrder) {
    setSelectedOrderId(order.id);
    setQuery(order.order_reference);
    setError(null);
    setSelections(
      Object.fromEntries(
        order.items.map((item) => [
          item.id,
          {
            selected: false,
            quantity: 1,
            reason: "DAMAGED" as ReturnReason,
            details: "",
          },
        ]),
      ),
    );
  }

  function updateSelection(
    itemId: string,
    next: Partial<CatalogItemSelectionState[string]>,
  ) {
    setSelections((current) => ({
      ...current,
      [itemId]: { ...current[itemId], ...next },
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOrder || selectedCount === 0) {
      setError(
        new ApiError({
          status: 400,
          code: "return_items_required",
          detail: t.itemRequired,
        }),
      );
      return;
    }

    const input: CatalogReturnCreateInput = {
      order_id: selectedOrder.id,
      items: selectedOrder.items
        .filter((item) => selections[item.id]?.selected)
        .map((item) => ({
          order_item_id: item.id,
          quantity: selections[item.id].quantity,
          reason: selections[item.id].reason,
          details: selections[item.id].details,
        })),
    };

    setSaving(true);
    setError(null);
    try {
      const data = await createCustomerReturn(input);
      onSaved(data, t.draftCreated);
    } catch (saveError) {
      setError(toApiError(saveError));
      setSaving(false);
    }
  }

  return (
    <div className={customerSurfaceStyles.modalBackdrop} role="presentation" onMouseDown={onCancel}>
      <section
        aria-labelledby="return-editor-title"
        aria-modal="true"
        className={`${customerSurfaceStyles.catalogModal} ${customerPatternStyles.modal}`}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className={`${customerSurfaceStyles.modalHeader} ${customerPatternStyles.modalHeader}`}>
          <div>
            <p className={customerPatternStyles.eyebrow}>{t.customer}</p>
            <h2 id="return-editor-title">{t.createTitle}</h2>
            <p>{t.formIntro}</p>
          </div>
          <button className={buttonStyles.customerIcon} onClick={onCancel} type="button" aria-label={t.close}>×</button>
        </div>

        <form className={customerSurfaceStyles.modalForm} onSubmit={handleSubmit}>
          <label>
            <span>{t.orderSearch}</span>
            <input
              autoFocus
              className={fieldStyles.customerSearch}
              maxLength={40}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.orderSearchPlaceholder}
              value={query}
            />
          </label>

          {orders === null && !loadError && (
            <div className={customerSurfaceStyles.catalogMessage} role="status">
              <LoadingSpinner />
              {t.loadingOrders}
            </div>
          )}

          {loadError && (
            <div className={`${customerSurfaceStyles.formError} ${customerPatternStyles.formError}`} role="alert">
              <strong>{t.formError}</strong>
              <span>{errorDetail(loadError, t.formError)}</span>
              <button className={customerPatternStyles.compactAction} onClick={loadOrders} type="button">{t.retry}</button>
            </div>
          )}

          {orders && orders.length === 0 && (
            <div className={customerSurfaceStyles.catalogMessage}>{t.noOrders}</div>
          )}

          {orders && orders.length > 0 && !selectedOrder && (
            <section className={`${customerSurfaceStyles.orderResults} ${customerPatternStyles.orderResults}`} aria-label={t.availableOrders}>
              <strong>{t.availableOrders}</strong>
              {visibleOrders.length === 0 && (
                <p className={customerSurfaceStyles.catalogMessage}>{t.noOrderMatch}</p>
              )}
              {visibleOrders.map((order) => (
                <button className={customerSurfaceStyles.orderResultButton} key={order.id} onClick={() => chooseOrder(order)} type="button">
                  <span><b>{order.order_reference}</b><small>{order.customer_name}</small></span>
                  <span><b>{order.items.length}</b><small>{t.items}</small></span>
                  <span>→</span>
                </button>
              ))}
            </section>
          )}

          {selectedOrder && (
            <>
              <section className={`${customerSurfaceStyles.selectedOrder} ${customerPatternStyles.selectedOrder}`}>
                <div>
                  <small>{t.orderCustomer}</small>
                  <strong>{selectedOrder.customer_name}</strong>
                  <span>{selectedOrder.customer_email}</span>
                </div>
                <button className={customerPatternStyles.compactAction} onClick={() => { setSelectedOrderId(null); setSelections({}); }} type="button">
                  {t.orderSearch}
                </button>
              </section>

              <section className={`${customerSurfaceStyles.catalogItems} ${customerPatternStyles.catalogItems}`} aria-label={t.selectItems}>
                <h3>{t.selectItems}</h3>
                {selectedOrder.items.map((item) => {
                  const selection = selections[item.id];
                  return (
                    <article className={customerSurfaceStyles.catalogItemCard} data-selected={selection?.selected} key={item.id}>
                      <label className={`${customerSurfaceStyles.catalogItemHeader} ${customerPatternStyles.catalogItemHeader}`}>
                        <input
                          checked={selection?.selected ?? false}
                          className={fieldStyles.customerCheckbox}
                          onChange={(event) => updateSelection(item.id, { selected: event.target.checked })}
                          type="checkbox"
                        />
                        <span><b>{item.product_name}</b><small>{item.sku} · {t.purchased(item.quantity)}</small></span>
                        <strong>{formatMoney(item.unit_price, selectedOrder.currency, locale)}</strong>
                      </label>
                      {selection?.selected && (
                        <div className={customerSurfaceStyles.catalogItemFields}>
                          <label>
                            <span>{t.quantity}</span>
                            <input
                              className={fieldStyles.customerCatalogInput}
                              max={item.quantity}
                              min="1"
                              onChange={(event) => updateSelection(item.id, { quantity: Number(event.target.value) })}
                              required
                              type="number"
                              value={selection.quantity}
                            />
                          </label>
                          <label>
                            <span>{t.reason}</span>
                            <select
                              className={fieldStyles.customerCatalogSelect}
                              onChange={(event) => updateSelection(item.id, { reason: event.target.value as ReturnReason })}
                              value={selection.reason}
                            >
                              {(Object.keys(catalogReasonLabels[locale]) as ReturnReason[]).map((reason) => (
                                <option key={reason} value={reason}>{catalogReasonLabels[locale][reason]}</option>
                              ))}
                            </select>
                          </label>
                          <label className={customerPatternStyles.catalogDetails}>
                            <span>{t.details}</span>
                            <input
                              className={fieldStyles.customerCatalogInput}
                              maxLength={2000}
                              onChange={(event) => updateSelection(item.id, { details: event.target.value })}
                              value={selection.details}
                            />
                          </label>
                        </div>
                      )}
                    </article>
                  );
                })}
              </section>
            </>
          )}

          {error && (
            <div className={`${customerSurfaceStyles.formError} ${customerPatternStyles.formError}`} role="alert">
              <strong>{t.formError}</strong>
              <span>{errorDetail(error, t.formError)}</span>
            </div>
          )}

          <div className={customerSurfaceStyles.formActions}>
            <button className={buttonStyles.customerSecondary} disabled={saving} onClick={onCancel} type="button">{t.cancel}</button>
            <button
              className={buttonStyles.customerPrimaryCompact}
              disabled={saving || !selectedOrder || selectedCount === 0}
              type="submit"
            >
              {saving ? t.creating : t.createDraft}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
