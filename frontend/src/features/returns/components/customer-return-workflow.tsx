"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  addCustomerReturnEvidence,
  addCustomerReturnItem,
  deleteCustomerReturnEvidence,
  deleteCustomerReturnItem,
  retrieveCustomerReturn,
  submitCustomerReturn,
  updateCustomerReturnItem,
} from "@/features/returns/api";
import type {
  EvidenceKind,
  ReturnItem,
  ReturnItemInput,
  ReturnReason,
  ReturnRequestDetail,
} from "@/features/returns/types";
import {
  EVIDENCE_KINDS,
  availableEvidenceKinds,
  buildEvidenceAssetKey,
} from "@/features/returns/workflow";
import { ApiError, toApiError } from "@/lib/api/client";

import styles from "./customer-return-workflow.module.css";

type Locale = "en" | "es";
type Step = 1 | 2 | 3;
type ItemEditorState =
  | { mode: "create" }
  | { mode: "edit"; item: ReturnItem }
  | null;

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
    NO_LONGER_NEEDED: "Ya no lo necesito",
    OTHER: "Otro",
  },
};

const evidenceLabels: Record<
  Locale,
  Record<EvidenceKind, { title: string; description: string }>
> = {
  en: {
    PRODUCT_PHOTO: {
      title: "Product photo",
      description: "A curated fictional view of the product.",
    },
    SERIAL_LABEL: {
      title: "Serial label",
      description: "A fictional model and serial identifier.",
    },
    RECEIPT: {
      title: "Receipt",
      description: "A fictional proof-of-purchase document.",
    },
  },
  es: {
    PRODUCT_PHOTO: {
      title: "Foto del producto",
      description: "Una vista ficticia y predefinida del producto.",
    },
    SERIAL_LABEL: {
      title: "Etiqueta serial",
      description: "Un identificador ficticio de modelo y serial.",
    },
    RECEIPT: {
      title: "Recibo",
      description: "Un comprobante de compra completamente ficticio.",
    },
  },
};

const copy = {
  en: {
    workflow: "New return",
    editWorkflow: "Complete return",
    saveClose: "Save and close",
    close: "Close",
    step: (current: number) => `${current} / 3`,
    itemStep: "Items",
    evidenceStep: "Evidence",
    reviewStep: "Review",
    itemsTitle: "Which items are you returning?",
    itemsIntro:
      "Add fictional products to this request. At least one item is required.",
    addItem: "Add item",
    editItem: "Edit item",
    noItems: "No items added yet.",
    sku: "SKU",
    product: "Product name",
    quantity: "Quantity",
    price: "Unit price (USD)",
    reason: "Return reason",
    details: "Additional details",
    detailsPlaceholder: "Describe the fictional condition of this item.",
    cancel: "Cancel",
    saveItem: "Save item",
    saving: "Saving…",
    edit: "Edit",
    remove: "Remove",
    itemCount: (count: number) => `${count} ${count === 1 ? "item" : "items"}`,
    evidenceTitle: "Add supporting evidence",
    evidenceIntro:
      "Choose curated fictional evidence for each item. No personal file is uploaded.",
    evidenceAttached: "Attached",
    attachEvidence: "Attach sample",
    removeEvidence: "Remove",
    noEvidence: "No evidence attached",
    reviewTitle: "Review your request",
    reviewIntro: "Confirm the details before submitting.",
    order: "Order",
    estimatedValue: "Estimated value",
    evidenceCount: (count: number) =>
      `${count} evidence ${count === 1 ? "item" : "items"}`,
    confirmation:
      "I confirm this is a fictional demonstration and the information is correct for this session.",
    warning:
      "After submitting, the request is locked until an operations reviewer responds.",
    responseNote: "Response for operations",
    responseNoteHelp:
      "Operations requested more information. Explain what you updated before resubmitting.",
    responseNotePlaceholder: "I added the requested fictional evidence…",
    back: "Back",
    continue: "Continue",
    submit: "Submit request",
    resubmit: "Resubmit request",
    submitting: "Submitting…",
    mutationError: "We could not update this return.",
    submitError: "We could not submit this return.",
    itemRequired: "Add at least one item before continuing.",
  },
  es: {
    workflow: "Nueva devolución",
    editWorkflow: "Completar devolución",
    saveClose: "Guardar y cerrar",
    close: "Cerrar",
    step: (current: number) => `${current} / 3`,
    itemStep: "Artículos",
    evidenceStep: "Evidencia",
    reviewStep: "Revisión",
    itemsTitle: "¿Qué artículos deseas devolver?",
    itemsIntro:
      "Agrega productos ficticios a esta solicitud. Se requiere al menos un artículo.",
    addItem: "Agregar artículo",
    editItem: "Editar artículo",
    noItems: "Todavía no agregaste artículos.",
    sku: "SKU",
    product: "Nombre del producto",
    quantity: "Cantidad",
    price: "Precio unitario (USD)",
    reason: "Motivo de devolución",
    details: "Detalles adicionales",
    detailsPlaceholder: "Describe la condición ficticia de este artículo.",
    cancel: "Cancelar",
    saveItem: "Guardar artículo",
    saving: "Guardando…",
    edit: "Editar",
    remove: "Eliminar",
    itemCount: (count: number) =>
      `${count} ${count === 1 ? "artículo" : "artículos"}`,
    evidenceTitle: "Agrega evidencia de respaldo",
    evidenceIntro:
      "Selecciona evidencias ficticias predefinidas. No se carga ningún archivo personal.",
    evidenceAttached: "Adjunta",
    attachEvidence: "Adjuntar muestra",
    removeEvidence: "Eliminar",
    noEvidence: "Sin evidencias adjuntas",
    reviewTitle: "Revisa tu solicitud",
    reviewIntro: "Confirma los datos antes de enviarla.",
    order: "Pedido",
    estimatedValue: "Valor estimado",
    evidenceCount: (count: number) =>
      `${count} ${count === 1 ? "evidencia" : "evidencias"}`,
    confirmation:
      "Confirmo que esta es una demostración ficticia y que la información es correcta para esta sesión.",
    warning:
      "Al enviar, la solicitud se bloqueará hasta que responda un revisor de operaciones.",
    responseNote: "Respuesta para operaciones",
    responseNoteHelp:
      "Operaciones solicitó más información. Explica qué actualizaste antes de reenviar.",
    responseNotePlaceholder: "Agregué la evidencia ficticia solicitada…",
    back: "Volver",
    continue: "Continuar",
    submit: "Enviar solicitud",
    resubmit: "Reenviar solicitud",
    submitting: "Enviando…",
    mutationError: "No pudimos actualizar esta devolución.",
    submitError: "No pudimos enviar esta devolución.",
    itemRequired: "Agrega al menos un artículo antes de continuar.",
  },
} as const;

function formatMoney(value: string, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(locale === "es" ? "es-VE" : "en-US", {
    style: "currency",
    currency,
  }).format(Number(value));
}

export default function CustomerReturnWorkflow({
  initialReturn,
  locale,
  onClose,
  onSubmitted,
}: {
  initialReturn: ReturnRequestDetail;
  locale: Locale;
  onClose: (latestReturn: ReturnRequestDetail) => void;
  onSubmitted: (submittedReturn: ReturnRequestDetail) => void;
}) {
  const [returnRequest, setReturnRequest] = useState(initialReturn);
  const [step, setStep] = useState<Step>(1);
  const [itemEditor, setItemEditor] = useState<ItemEditorState>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [responseNote, setResponseNote] = useState("");
  const t = copy[locale];
  const isResubmission = returnRequest.status === "NEEDS_INFORMATION";
  const evidenceCount = useMemo(
    () => returnRequest.items.reduce((total, item) => total + item.evidence.length, 0),
    [returnRequest.items],
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy && itemEditor === null) {
        onClose(returnRequest);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [busy, itemEditor, onClose, returnRequest]);

  async function refreshReturn(): Promise<ReturnRequestDetail> {
    const refreshed = await retrieveCustomerReturn(returnRequest.id);
    setReturnRequest(refreshed);
    return refreshed;
  }

  async function mutate(action: () => Promise<unknown>): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refreshReturn();
      return true;
    } catch (mutationError) {
      setError(toApiError(mutationError));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveItem(input: ReturnItemInput): Promise<boolean> {
    const saved = await mutate(() =>
      itemEditor?.mode === "edit"
        ? updateCustomerReturnItem(returnRequest.id, itemEditor.item.id, input)
        : addCustomerReturnItem(returnRequest.id, input),
    );
    if (saved) {
      setItemEditor(null);
    }
    return saved;
  }

  async function removeItem(itemId: string) {
    await mutate(() => deleteCustomerReturnItem(returnRequest.id, itemId));
  }

  async function attachEvidence(item: ReturnItem, kind: EvidenceKind) {
    const label = evidenceLabels[locale][kind];
    await mutate(() =>
      addCustomerReturnEvidence(returnRequest.id, item.id, {
        kind,
        asset_key: buildEvidenceAssetKey(returnRequest.reference, item.id, kind),
        caption: label.title,
      }),
    );
  }

  async function removeEvidence(itemId: string, evidenceId: string) {
    await mutate(() =>
      deleteCustomerReturnEvidence(returnRequest.id, itemId, evidenceId),
    );
  }

  async function submitRequest() {
    setBusy(true);
    setError(null);
    try {
      const submitted = await submitCustomerReturn(returnRequest.id, responseNote);
      setReturnRequest(submitted);
      onSubmitted(submitted);
    } catch (submitError) {
      setError(toApiError(submitError));
      setBusy(false);
    }
  }

  function goToStep(nextStep: Step) {
    if (nextStep > 1 && returnRequest.items.length === 0) {
      setError(
        new ApiError({
          status: 400,
          code: "return_items_required",
          detail: t.itemRequired,
        }),
      );
      return;
    }
    setError(null);
    setItemEditor(null);
    setStep(nextStep);
  }

  const noteMissing = isResubmission && responseNote.trim().length === 0;
  const canSubmit = confirmed && returnRequest.items.length > 0 && !noteMissing && !busy;

  return (
    <div className={styles.overlay}>
      <section
        aria-label={t.workflow}
        aria-modal="true"
        className={styles.shell}
        role="dialog"
      >
        <header className={styles.header}>
          <div className={styles.brand}>ReturnOps</div>
          <span className={styles.demoBadge}>Demo</span>
          <span className={styles.locale}>{locale.toUpperCase()}</span>
        </header>

        <div className={styles.workflowHeader}>
          <button
            aria-label={t.close}
            disabled={busy}
            onClick={() => onClose(returnRequest)}
            type="button"
          >
            ←
          </button>
          <strong>{initialReturn.items.length > 0 ? t.editWorkflow : t.workflow}</strong>
          <span>{t.step(step)}</span>
        </div>

        <nav className={styles.progress} aria-label="Return progress">
          {([1, 2, 3] as const).map((progressStep) => {
            const labels = [t.itemStep, t.evidenceStep, t.reviewStep];
            const complete = progressStep < step;
            return (
              <button
                className={progressStep === step ? styles.currentStep : undefined}
                disabled={busy || (progressStep > 1 && returnRequest.items.length === 0)}
                key={progressStep}
                onClick={() => goToStep(progressStep)}
                type="button"
              >
                <span>{complete ? "✓" : progressStep}</span>
                {labels[progressStep - 1]}
              </button>
            );
          })}
        </nav>

        <div className={styles.content}>
          {error && (
            <div className={styles.error} role="alert">
              <strong>{step === 3 ? t.submitError : t.mutationError}</strong>
              <span>{error.message}</span>
              <button onClick={() => setError(null)} type="button">×</button>
            </div>
          )}

          {step === 1 && (
            <ItemsStep
              busy={busy}
              editor={itemEditor}
              locale={locale}
              onCancelEdit={() => setItemEditor(null)}
              onEdit={(item) => setItemEditor({ mode: "edit", item })}
              onNew={() => setItemEditor({ mode: "create" })}
              onRemove={removeItem}
              onSave={saveItem}
              returnRequest={returnRequest}
            />
          )}

          {step === 2 && (
            <EvidenceStep
              busy={busy}
              locale={locale}
              onAttach={attachEvidence}
              onRemove={removeEvidence}
              returnRequest={returnRequest}
            />
          )}

          {step === 3 && (
            <ReviewStep
              confirmed={confirmed}
              evidenceCount={evidenceCount}
              locale={locale}
              onConfirm={setConfirmed}
              onResponseNote={setResponseNote}
              responseNote={responseNote}
              returnRequest={returnRequest}
            />
          )}
        </div>

        <footer className={styles.footer}>
          <button
            disabled={busy}
            onClick={() => (step === 1 ? onClose(returnRequest) : goToStep((step - 1) as Step))}
            type="button"
          >
            {step === 1 ? t.saveClose : t.back}
          </button>
          {step < 3 ? (
            <button
              className={styles.primaryButton}
              disabled={busy || returnRequest.items.length === 0}
              onClick={() => goToStep((step + 1) as Step)}
              type="button"
            >
              {t.continue} →
            </button>
          ) : (
            <button
              className={styles.primaryButton}
              disabled={!canSubmit}
              onClick={submitRequest}
              type="button"
            >
              {busy ? t.submitting : isResubmission ? t.resubmit : t.submit}
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

function ItemsStep({
  busy,
  editor,
  locale,
  onCancelEdit,
  onEdit,
  onNew,
  onRemove,
  onSave,
  returnRequest,
}: {
  busy: boolean;
  editor: ItemEditorState;
  locale: Locale;
  onCancelEdit: () => void;
  onEdit: (item: ReturnItem) => void;
  onNew: () => void;
  onRemove: (itemId: string) => Promise<void>;
  onSave: (input: ReturnItemInput) => Promise<boolean>;
  returnRequest: ReturnRequestDetail;
}) {
  const t = copy[locale];
  return (
    <div>
      <div className={styles.stepHeading}>
        <div>
          <h1>{t.itemsTitle}</h1>
          <p>{t.itemsIntro}</p>
        </div>
        {!editor && (
          <button className={styles.addButton} disabled={busy} onClick={onNew} type="button">
            + {t.addItem}
          </button>
        )}
      </div>

      {editor && (
        <ItemForm
          busy={busy}
          editor={editor}
          key={editor.mode === "edit" ? editor.item.id : "new-item"}
          locale={locale}
          onCancel={onCancelEdit}
          onSave={onSave}
        />
      )}

      <div className={styles.itemList}>
        {returnRequest.items.length === 0 && !editor && (
          <div className={styles.emptyState}>
            <span aria-hidden="true">□</span>
            <p>{t.noItems}</p>
            <button onClick={onNew} type="button">+ {t.addItem}</button>
          </div>
        )}
        {returnRequest.items.map((item) => (
          <article className={styles.itemCard} key={item.id}>
            <span className={styles.itemIcon} aria-hidden="true">□</span>
            <div className={styles.itemCopy}>
              <span>{item.sku}</span>
              <h2>{item.product_name}</h2>
              <p>
                {item.quantity} × {formatMoney(item.unit_price, returnRequest.currency, locale)} · {reasonLabels[locale][item.reason]}
              </p>
            </div>
            <div className={styles.itemActions}>
              <strong>{formatMoney(item.line_total, returnRequest.currency, locale)}</strong>
              <button disabled={busy} onClick={() => onEdit(item)} type="button">{t.edit}</button>
              <button disabled={busy} onClick={() => onRemove(item.id)} type="button">{t.remove}</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ItemForm({
  busy,
  editor,
  locale,
  onCancel,
  onSave,
}: {
  busy: boolean;
  editor: Exclude<ItemEditorState, null>;
  locale: Locale;
  onCancel: () => void;
  onSave: (input: ReturnItemInput) => Promise<boolean>;
}) {
  const t = copy[locale];
  const initial: ReturnItemInput =
    editor.mode === "edit"
      ? {
          sku: editor.item.sku,
          product_name: editor.item.product_name,
          quantity: editor.item.quantity,
          unit_price: editor.item.unit_price,
          reason: editor.item.reason,
          details: editor.item.details,
        }
      : {
          sku: "",
          product_name: "",
          quantity: 1,
          unit_price: "",
          reason: "DAMAGED",
          details: "",
        };
  const [form, setForm] = useState(initial);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave(form);
  }

  return (
    <form className={styles.itemForm} onSubmit={submit}>
      <div className={styles.formHeading}>
        <h2>{editor.mode === "edit" ? t.editItem : t.addItem}</h2>
        <button disabled={busy} onClick={onCancel} type="button">×</button>
      </div>
      <div className={styles.formGrid}>
        <label>
          <span>{t.sku}</span>
          <input
            maxLength={64}
            onChange={(event) => setForm({ ...form, sku: event.target.value })}
            placeholder="DMO-ITEM-01"
            required
            value={form.sku}
          />
        </label>
        <label className={styles.wideField}>
          <span>{t.product}</span>
          <input
            maxLength={160}
            onChange={(event) => setForm({ ...form, product_name: event.target.value })}
            placeholder="Adjustable monitor arm"
            required
            value={form.product_name}
          />
        </label>
        <label>
          <span>{t.quantity}</span>
          <input
            min="1"
            onChange={(event) => setForm({ ...form, quantity: Number(event.target.value) })}
            required
            type="number"
            value={form.quantity}
          />
        </label>
        <label>
          <span>{t.price}</span>
          <input
            min="0"
            onChange={(event) => setForm({ ...form, unit_price: event.target.value })}
            required
            step="0.01"
            type="number"
            value={form.unit_price}
          />
        </label>
        <label>
          <span>{t.reason}</span>
          <select
            onChange={(event) => setForm({ ...form, reason: event.target.value as ReturnReason })}
            value={form.reason}
          >
            {(Object.keys(reasonLabels[locale]) as ReturnReason[]).map((reason) => (
              <option key={reason} value={reason}>{reasonLabels[locale][reason]}</option>
            ))}
          </select>
        </label>
        <label className={styles.fullField}>
          <span>{t.details}</span>
          <textarea
            onChange={(event) => setForm({ ...form, details: event.target.value })}
            placeholder={t.detailsPlaceholder}
            rows={3}
            value={form.details}
          />
        </label>
      </div>
      <div className={styles.formActions}>
        <button disabled={busy} onClick={onCancel} type="button">{t.cancel}</button>
        <button className={styles.primaryButton} disabled={busy} type="submit">
          {busy ? t.saving : t.saveItem}
        </button>
      </div>
    </form>
  );
}

function EvidenceStep({
  busy,
  locale,
  onAttach,
  onRemove,
  returnRequest,
}: {
  busy: boolean;
  locale: Locale;
  onAttach: (item: ReturnItem, kind: EvidenceKind) => Promise<void>;
  onRemove: (itemId: string, evidenceId: string) => Promise<void>;
  returnRequest: ReturnRequestDetail;
}) {
  const t = copy[locale];
  return (
    <div>
      <div className={styles.stepHeading}>
        <div><h1>{t.evidenceTitle}</h1><p>{t.evidenceIntro}</p></div>
      </div>
      <div className={styles.evidenceItems}>
        {returnRequest.items.map((item) => {
          const available = availableEvidenceKinds(item);
          return (
            <article className={styles.evidenceItem} key={item.id}>
              <div className={styles.evidenceItemHeader}>
                <div>
                  <span>{item.sku}</span>
                  <h2>{item.product_name}</h2>
                </div>
                <small>{t.evidenceCount(item.evidence.length)}</small>
              </div>
              <div className={styles.evidenceGrid}>
                {EVIDENCE_KINDS.map((kind) => {
                  const attached = item.evidence.find((evidence) => evidence.kind === kind);
                  const label = evidenceLabels[locale][kind];
                  return (
                    <div className={styles.evidenceCard} data-attached={Boolean(attached)} key={kind}>
                      <span className={styles.evidenceIcon} aria-hidden="true">
                        {kind === "RECEIPT" ? "▤" : kind === "SERIAL_LABEL" ? "#" : "◫"}
                      </span>
                      <div><strong>{label.title}</strong><p>{label.description}</p></div>
                      {attached ? (
                        <button disabled={busy} onClick={() => onRemove(item.id, attached.id)} type="button">
                          ✓ {t.evidenceAttached} · {t.removeEvidence}
                        </button>
                      ) : (
                        <button disabled={busy || !available.includes(kind)} onClick={() => onAttach(item, kind)} type="button">
                          + {t.attachEvidence}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ReviewStep({
  confirmed,
  evidenceCount,
  locale,
  onConfirm,
  onResponseNote,
  responseNote,
  returnRequest,
}: {
  confirmed: boolean;
  evidenceCount: number;
  locale: Locale;
  onConfirm: (confirmed: boolean) => void;
  onResponseNote: (note: string) => void;
  responseNote: string;
  returnRequest: ReturnRequestDetail;
}) {
  const t = copy[locale];
  const isResubmission = returnRequest.status === "NEEDS_INFORMATION";
  return (
    <div>
      <div className={styles.stepHeading}>
        <div><h1>{t.reviewTitle}</h1><p>{t.reviewIntro}</p></div>
      </div>
      <section className={styles.reviewCard}>
        <div className={styles.orderSummary}>
          <span aria-hidden="true">□</span>
          <div>
            <small>{t.order}</small>
            <h2>{returnRequest.order_reference}</h2>
            <p>
              {t.itemCount(returnRequest.items.length)} · {t.estimatedValue} {formatMoney(returnRequest.total_value, returnRequest.currency, locale)}
            </p>
          </div>
        </div>
        {returnRequest.items.map((item) => (
          <div className={styles.reviewItem} key={item.id}>
            <span aria-hidden="true">□</span>
            <div><h3>{item.product_name}</h3><p>{item.quantity} · {reasonLabels[locale][item.reason]} · {t.evidenceCount(item.evidence.length)}</p></div>
            <strong>{formatMoney(item.line_total, returnRequest.currency, locale)}</strong>
          </div>
        ))}
        <div className={styles.reviewTotals}>
          <span>{t.evidenceCount(evidenceCount)}</span>
          <strong>{formatMoney(returnRequest.total_value, returnRequest.currency, locale)}</strong>
        </div>
      </section>

      {isResubmission && (
        <label className={styles.responseNote}>
          <strong>{t.responseNote}</strong>
          <span>{t.responseNoteHelp}</span>
          <textarea
            maxLength={2000}
            onChange={(event) => onResponseNote(event.target.value)}
            placeholder={t.responseNotePlaceholder}
            required
            rows={4}
            value={responseNote}
          />
        </label>
      )}

      <label className={styles.confirmation}>
        <input checked={confirmed} onChange={(event) => onConfirm(event.target.checked)} type="checkbox" />
        <span>{t.confirmation}</span>
      </label>
      <div className={styles.warning}><span aria-hidden="true">!</span><p>{t.warning}</p></div>
    </div>
  );
}
