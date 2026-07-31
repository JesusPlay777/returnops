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
  listCustomerReturns,
  retrieveCustomerReturn,
  updateCustomerReturn,
} from "@/features/returns/api";
import CustomerReturnWorkflow from "@/features/returns/components/customer-return-workflow";
import type {
  PaginatedReturns,
  ReturnRequestDetail,
  ReturnRequestInput,
  ReturnStatus,
} from "@/features/returns/types";
import { ApiError, toApiError } from "@/lib/api/client";
import { useDemoSession } from "@/providers/demo-session-provider";

import styles from "./customer-returns-screen.module.css";

type Locale = "en" | "es";
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
  | { mode: "edit"; data: ReturnRequestDetail }
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
    editTitle: "Edit return details",
    formIntro:
      "Use fictional information only. You can add products and evidence in the next step.",
    orderReference: "Order reference",
    name: "Customer name",
    customerEmail: "Customer email",
    cancel: "Cancel",
    creating: "Creating…",
    saving: "Saving…",
    createDraft: "Create draft",
    saveChanges: "Save changes",
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
    editTitle: "Editar datos de la devolución",
    formIntro:
      "Usa solo información ficticia. Podrás agregar productos y evidencias en el siguiente paso.",
    orderReference: "Referencia del pedido",
    name: "Nombre del cliente",
    customerEmail: "Correo del cliente",
    cancel: "Cancelar",
    creating: "Creando…",
    saving: "Guardando…",
    createDraft: "Crear borrador",
    saveChanges: "Guardar cambios",
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
    (
      data: ReturnRequestDetail,
      message: string,
      mode: "create" | "edit",
    ) => {
      setEditor(null);
      setDetailState({ status: "ready", data });
      setNotice(message);
      if (mode === "create") {
        setWorkflowReturn(data);
      }
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

  return (
    <div className={styles.appShell}>
      <header className={styles.header}>
        <a className={styles.brand} href="#top" aria-label="ReturnOps home">
          <span className={styles.brandMark} aria-hidden="true">R</span>
          <span>ReturnOps</span>
        </a>

        <div className={styles.headerTools}>
          <span className={styles.demoBadge}>{t.demo}</span>
          <div className={styles.localeSwitch} aria-label="Language">
            <button
              className={locale === "en" ? styles.localeActive : undefined}
              onClick={() => setLocale("en")}
              type="button"
            >
              EN
            </button>
            <button
              className={locale === "es" ? styles.localeActive : undefined}
              onClick={() => setLocale("es")}
              type="button"
            >
              ES
            </button>
          </div>
        </div>
      </header>

      <div className={styles.roleBar} aria-label="Demo role">
        <button className={styles.roleActive} type="button">
          {t.customer}
        </button>
        <button disabled title={t.operationsPending} type="button">
          {t.operations}
          <span aria-hidden="true">{t.soon}</span>
        </button>
      </div>

      <main id="top">
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>{t.eyebrow}</p>
            <h1>{t.title}</h1>
            <p className={styles.intro}>{t.intro}</p>
            <button
              className={styles.primaryButton}
              disabled={!sessionReady}
              onClick={() => setEditor({ mode: "create" })}
              type="button"
            >
              <span aria-hidden="true">+</span>
              {t.newReturn}
            </button>
          </div>

          <aside className={styles.sessionCard}>
            <span className={styles.sessionIcon} aria-hidden="true">✓</span>
            <div>
              <strong>{t.sessionReady}</strong>
              <p>{t.sessionCopy}</p>
            </div>
          </aside>
        </section>

        <section className={styles.returnsSection} aria-labelledby="returns-title">
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>{t.customer}</p>
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
            <div className={styles.emptyState}>{t.empty}</div>
          )}

          {listState.status === "ready" && listState.data.results.length > 0 && (
            <>
              <div className={styles.tableFrame}>
                <table>
                  <thead>
                    <tr>
                      <th>{t.reference}</th>
                      <th>{t.customerName}</th>
                      <th>{t.items}</th>
                      <th>{t.value}</th>
                      <th>{t.status}</th>
                      <th>{t.updated}</th>
                      <th><span className={styles.srOnly}>{t.view}</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {listState.data.results.map((returnRequest) => (
                      <tr key={returnRequest.id}>
                        <td>
                          <button
                            className={styles.referenceButton}
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
                        <td className={styles.updatedCell}>
                          {formatDate(returnRequest.updated_at, locale)}
                        </td>
                        <td>
                          <button
                            className={styles.viewButton}
                            onClick={() => openDetail(returnRequest.id)}
                            type="button"
                          >
                            <span className={styles.srOnly}>{t.view}</span>
                            <span aria-hidden="true">→</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.pagination}>
                <button
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
            onEdit={(data) => setEditor({ mode: "edit", data })}
            onRetry={
              detailState.status === "loading"
                ? () => openDetail(detailState.returnId)
                : undefined
            }
            state={detailState}
          />
        )}
      </main>

      <footer className={styles.footer}>
        <span>ReturnOps</span>
        <span>Fictional data · Clean-room implementation</span>
      </footer>

      {editor && (
        <ReturnEditor
          editor={editor}
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
        <div className={styles.toast} role="status">
          <span aria-hidden="true">✓</span>
          {notice}
          <button onClick={() => setNotice(null)} type="button" aria-label={t.close}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className={styles.loadingState} role="status">
      <span className={styles.spinner} aria-hidden="true" />
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
    <div className={styles.errorState} role="alert">
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
      <button onClick={onRetry} type="button">{label}</button>
    </div>
  );
}

function StatusBadge({ label, status }: { label: string; status: ReturnStatus }) {
  return (
    <span className={styles.statusBadge} data-status={status}>
      <span aria-hidden="true" />
      {label}
    </span>
  );
}

function ReturnDetail({
  locale,
  onClose,
  onContinue,
  onEdit,
  state,
}: {
  locale: Locale;
  onClose: () => void;
  onContinue: (data: ReturnRequestDetail) => void;
  onEdit: (data: ReturnRequestDetail) => void;
  onRetry?: () => void;
  state: DetailState;
}) {
  const t = copy[locale];

  if (state.status === "loading") {
    return (
      <section className={styles.detailSection} id="return-detail" aria-live="polite">
        <LoadingState message={t.detailLoading} />
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className={styles.detailSection} id="return-detail">
        <div className={styles.errorState} role="alert">
          <div>
            <strong>{t.detailError}</strong>
            <p>{errorDetail(state.error, t.detailError)}</p>
          </div>
          <button onClick={onClose} type="button">{t.close}</button>
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
    <section className={styles.detailSection} id="return-detail" aria-labelledby="return-detail-title">
      <div className={styles.detailHeader}>
        <div>
          <div className={styles.detailReference}>
            <p className={styles.eyebrow}>{t.reference}</p>
            <StatusBadge label={statusCopy[locale][data.status]} status={data.status} />
          </div>
          <h2 id="return-detail-title">{data.reference}</h2>
          <p>{data.customer_name} · {data.order_reference}</p>
        </div>
        <div className={styles.detailActions}>
          {editable && (
            <>
              <button onClick={() => onEdit(data)} type="button">{t.edit}</button>
              <button onClick={() => onContinue(data)} type="button">
                {t.continueReturn}
              </button>
            </>
          )}
          <button className={styles.iconButton} onClick={onClose} type="button" aria-label={t.close}>×</button>
        </div>
      </div>

      <dl className={styles.detailMeta}>
        <div><dt>{t.order}</dt><dd>{data.order_reference}</dd></div>
        <div><dt>{t.email}</dt><dd>{data.customer_email}</dd></div>
        <div><dt>{t.value}</dt><dd>{formatMoney(data.total_value, data.currency, locale)}</dd></div>
        <div><dt>{t.updated}</dt><dd>{formatDate(data.updated_at, locale)}</dd></div>
      </dl>

      <div className={styles.detailGrid}>
        <div>
          <h3>{t.requestItems}</h3>
          <div className={styles.itemList}>
            {data.items.map((item) => (
              <article className={styles.itemCard} key={item.id}>
                <div>
                  <span>{item.sku}</span>
                  <h4>{item.product_name}</h4>
                  <p>{item.quantity} × {formatMoney(item.unit_price, data.currency, locale)}</p>
                </div>
                <div className={styles.itemValue}>
                  <strong>{formatMoney(item.line_total, data.currency, locale)}</strong>
                  <span>{t.evidence(item.evidence.length)}</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div>
          <h3>{t.timeline}</h3>
          <ol className={styles.timeline}>
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

function ReturnEditor({
  editor,
  locale,
  onCancel,
  onSaved,
}: {
  editor: Exclude<EditorState, null>;
  locale: Locale;
  onCancel: () => void;
  onSaved: (
    data: ReturnRequestDetail,
    message: string,
    mode: "create" | "edit",
  ) => void;
}) {
  const t = copy[locale];
  const initialData: ReturnRequestInput =
    editor.mode === "edit"
      ? {
          order_reference: editor.data.order_reference,
          customer_name: editor.data.customer_name,
          customer_email: editor.data.customer_email,
        }
      : { order_reference: "", customer_name: "", customer_email: "" };
  const [form, setForm] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) {
        onCancel();
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onCancel, saving]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const data =
        editor.mode === "create"
          ? await createCustomerReturn(form)
          : await updateCustomerReturn(editor.data.id, form);
      onSaved(
        data,
        editor.mode === "create" ? t.draftCreated : t.detailsSaved,
        editor.mode,
      );
    } catch (saveError) {
      setError(toApiError(saveError));
      setSaving(false);
    }
  }

  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={onCancel}>
      <section
        aria-labelledby="return-editor-title"
        aria-modal="true"
        className={styles.modal}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.eyebrow}>{t.customer}</p>
            <h2 id="return-editor-title">
              {editor.mode === "create" ? t.createTitle : t.editTitle}
            </h2>
            <p>{t.formIntro}</p>
          </div>
          <button className={styles.iconButton} onClick={onCancel} type="button" aria-label={t.close}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            <span>{t.orderReference}</span>
            <input
              autoFocus
              maxLength={40}
              onChange={(event) => setForm({ ...form, order_reference: event.target.value })}
              placeholder="ORD-90001"
              required
              value={form.order_reference}
            />
          </label>
          <label>
            <span>{t.name}</span>
            <input
              maxLength={120}
              onChange={(event) => setForm({ ...form, customer_name: event.target.value })}
              placeholder="Taylor Example"
              required
              value={form.customer_name}
            />
          </label>
          <label>
            <span>{t.customerEmail}</span>
            <input
              maxLength={254}
              onChange={(event) => setForm({ ...form, customer_email: event.target.value })}
              placeholder="taylor@example.com"
              required
              type="email"
              value={form.customer_email}
            />
          </label>

          {error && (
            <div className={styles.formError} role="alert">
              <strong>{t.formError}</strong>
              <span>{errorDetail(error, t.formError)}</span>
            </div>
          )}

          <div className={styles.formActions}>
            <button disabled={saving} onClick={onCancel} type="button">{t.cancel}</button>
            <button className={styles.primaryButton} disabled={saving} type="submit">
              {saving
                ? editor.mode === "create" ? t.creating : t.saving
                : editor.mode === "create" ? t.createDraft : t.saveChanges}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
