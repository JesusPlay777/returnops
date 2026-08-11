"use client";

import {
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  addCustomerReturnEvidence,
  deleteCustomerReturnEvidence,
  retrieveCustomerReturn,
  submitCustomerReturn,
  updateCustomerReturnItem,
} from "@/features/returns/api";
import type {
  EvidenceKind,
  ReturnItem,
  ReturnItemUpdate,
  ReturnReason,
  ReturnRequestDetail,
} from "@/features/returns/types";
import {
  EVIDENCE_KINDS,
  availableEvidenceKinds,
  buildEvidenceAssetKey,
} from "@/features/returns/workflow";
import { ApiError, toApiError } from "@/lib/api/client";
import { useModalDialog } from "@/lib/a11y/use-modal-dialog";

import { buttonStyles, fieldStyles } from "./control-styles";
import { DemoBadge } from "./demo-badge";
import { workflowPatternStyles } from "./pattern-styles";
import { workflowSurfaceStyles } from "./surface-styles";

type Locale = "en" | "es";
type Step = 1 | 2 | 3;
type ItemEditorState =
  | { item: ReturnItem }
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
    progress: "Return progress",
    step: (current: number) => `${current} / 3`,
    itemStep: "Items",
    evidenceStep: "Evidence",
    reviewStep: "Review",
    itemsTitle: "Which items are you returning?",
    itemsIntro:
      "Review the products selected from your eligible fictional order.",
    editItem: "Edit item",
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
    progress: "Progreso de la devolución",
    step: (current: number) => `${current} / 3`,
    itemStep: "Artículos",
    evidenceStep: "Evidencia",
    reviewStep: "Revisión",
    itemsTitle: "¿Qué artículos deseas devolver?",
    itemsIntro:
      "Revisa los productos seleccionados desde tu pedido ficticio elegible.",
    editItem: "Editar artículo",
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
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const t = copy[locale];
  const isResubmission = returnRequest.status === "NEEDS_INFORMATION";
  const evidenceCount = useMemo(
    () => returnRequest.items.reduce((total, item) => total + item.evidence.length, 0),
    [returnRequest.items],
  );

  useModalDialog({
    canClose: !busy && itemEditor === null,
    dialogRef,
    initialFocusRef: closeButtonRef,
    onClose: () => onClose(returnRequest),
  });

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

  async function saveItem(input: ReturnItemUpdate): Promise<boolean> {
    const saved = await mutate(() =>
      updateCustomerReturnItem(
        returnRequest.id,
        itemEditor!.item.id,
        input,
      ),
    );
    if (saved) {
      setItemEditor(null);
    }
    return saved;
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
    <div className={workflowSurfaceStyles.overlay} role="presentation">
      <section
        aria-label={t.workflow}
        aria-modal="true"
        className={workflowSurfaceStyles.shell}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className={workflowSurfaceStyles.header}>
          <div className={workflowPatternStyles.brand}>ReturnOps</div>
          <DemoBadge variant="workflow">Demo</DemoBadge>
          <span className={workflowPatternStyles.locale}>{locale.toUpperCase()}</span>
        </header>

        <div className={`${workflowSurfaceStyles.workflowHeader} ${workflowPatternStyles.workflowHeader}`}>
          <button
            aria-label={t.close}
            className={buttonStyles.workflowHeaderIcon}
            disabled={busy}
            onClick={() => onClose(returnRequest)}
            ref={closeButtonRef}
            type="button"
          >
            ←
          </button>
          <strong>{initialReturn.items.length > 0 ? t.editWorkflow : t.workflow}</strong>
          <span>{t.step(step)}</span>
        </div>

        <nav className={`${workflowSurfaceStyles.progress} ${workflowPatternStyles.progress}`} aria-label={t.progress}>
          {([1, 2, 3] as const).map((progressStep) => {
            const labels = [t.itemStep, t.evidenceStep, t.reviewStep];
            const complete = progressStep < step;
            return (
              <button
                aria-current={progressStep === step ? "step" : undefined}
                className={`${workflowPatternStyles.progressButton} ${progressStep === step ? workflowPatternStyles.progressButtonActive : ""}`}
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

        <div className={workflowSurfaceStyles.content}>
          {error && (
            <div className={workflowSurfaceStyles.error} role="alert">
              <strong>{step === 3 ? t.submitError : t.mutationError}</strong>
              <span>{error.message}</span>
              <button aria-label={t.close} className={workflowPatternStyles.errorClose} onClick={() => setError(null)} type="button">×</button>
            </div>
          )}

          {step === 1 && (
            <ItemsStep
              busy={busy}
              editor={itemEditor}
              locale={locale}
              onCancelEdit={() => setItemEditor(null)}
              onEdit={(item) => setItemEditor({ item })}
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

        <footer className={workflowSurfaceStyles.footer}>
          <button
            className={buttonStyles.workflowFooterSecondary}
            disabled={busy}
            onClick={() => (step === 1 ? onClose(returnRequest) : goToStep((step - 1) as Step))}
            type="button"
          >
            {step === 1 ? t.saveClose : t.back}
          </button>
          {step < 3 ? (
            <button
              className={buttonStyles.workflowPrimary}
              disabled={busy || returnRequest.items.length === 0}
              onClick={() => goToStep((step + 1) as Step)}
              type="button"
            >
              {t.continue} →
            </button>
          ) : (
            <button
              className={buttonStyles.workflowPrimary}
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
  onSave,
  returnRequest,
}: {
  busy: boolean;
  editor: ItemEditorState;
  locale: Locale;
  onCancelEdit: () => void;
  onEdit: (item: ReturnItem) => void;
  onSave: (input: ReturnItemUpdate) => Promise<boolean>;
  returnRequest: ReturnRequestDetail;
}) {
  const t = copy[locale];
  return (
    <div>
      <div className={`${workflowSurfaceStyles.stepHeading} ${workflowPatternStyles.stepHeading}`}>
        <div>
          <h1>{t.itemsTitle}</h1>
          <p>{t.itemsIntro}</p>
        </div>
      </div>

      {editor && (
        <ItemForm
          busy={busy}
          editor={editor}
          key={editor.item.id}
          locale={locale}
          onCancel={onCancelEdit}
          onSave={onSave}
        />
      )}

      <div className={workflowSurfaceStyles.itemList}>
        {returnRequest.items.map((item) => (
          <article className={workflowSurfaceStyles.itemCard} key={item.id}>
            <span className={workflowPatternStyles.itemIcon} aria-hidden="true">□</span>
            <div className={workflowPatternStyles.itemCopy}>
              <span>{item.sku}</span>
              <h2>{item.product_name}</h2>
              <p>
                {item.quantity} × {formatMoney(item.unit_price, returnRequest.currency, locale)} · {reasonLabels[locale][item.reason]}
              </p>
            </div>
            <div className={workflowPatternStyles.itemActions}>
              <strong>{formatMoney(item.line_total, returnRequest.currency, locale)}</strong>
              <button aria-label={`${t.edit}: ${item.product_name}`} disabled={busy} onClick={() => onEdit(item)} type="button">{t.edit}</button>
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
  onSave: (input: ReturnItemUpdate) => Promise<boolean>;
}) {
  const t = copy[locale];
  const initial: ReturnItemUpdate = {
    quantity: editor.item.quantity,
    reason: editor.item.reason,
    details: editor.item.details,
  };
  const [form, setForm] = useState(initial);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave(form);
  }

  return (
    <form className={workflowSurfaceStyles.itemForm} onSubmit={submit}>
      <div className={`${workflowSurfaceStyles.formHeading} ${workflowPatternStyles.formHeading}`}>
        <div>
          <h2>{t.editItem}</h2>
          <p>{editor.item.sku} · {editor.item.product_name} · {formatMoney(editor.item.unit_price, "USD", locale)}</p>
        </div>
        <button aria-label={t.close} className={buttonStyles.workflowFormIcon} disabled={busy} onClick={onCancel} type="button">×</button>
      </div>
      <div className={`${workflowSurfaceStyles.formGrid} ${workflowPatternStyles.formGrid}`}>
        <label>
          <span>{t.quantity}</span>
          <input
            className={fieldStyles.workflowInput}
            max={editor.item.max_quantity}
            min="1"
            onChange={(event) => setForm({ ...form, quantity: Number(event.target.value) })}
            required
            type="number"
            value={form.quantity}
          />
        </label>
        <label>
          <span>{t.reason}</span>
          <select
            className={fieldStyles.workflowSelect}
            onChange={(event) => setForm({ ...form, reason: event.target.value as ReturnReason })}
            value={form.reason}
          >
            {(Object.keys(reasonLabels[locale]) as ReturnReason[]).map((reason) => (
              <option key={reason} value={reason}>{reasonLabels[locale][reason]}</option>
            ))}
          </select>
        </label>
        <label className={workflowPatternStyles.fullField}>
          <span>{t.details}</span>
          <textarea
            className={fieldStyles.workflowTextarea}
            onChange={(event) => setForm({ ...form, details: event.target.value })}
            placeholder={t.detailsPlaceholder}
            rows={3}
            value={form.details}
          />
        </label>
      </div>
      <div className={workflowSurfaceStyles.formActions}>
        <button className={buttonStyles.workflowSecondary} disabled={busy} onClick={onCancel} type="button">{t.cancel}</button>
        <button className={buttonStyles.workflowPrimary} disabled={busy} type="submit">
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
      <div className={`${workflowSurfaceStyles.stepHeading} ${workflowPatternStyles.stepHeading}`}>
        <div><h1>{t.evidenceTitle}</h1><p>{t.evidenceIntro}</p></div>
      </div>
      <div className={workflowSurfaceStyles.evidenceItems}>
        {returnRequest.items.map((item) => {
          const available = availableEvidenceKinds(item);
          return (
            <article className={workflowSurfaceStyles.evidenceItem} key={item.id}>
              <div className={`${workflowSurfaceStyles.evidenceItemHeader} ${workflowPatternStyles.evidenceItemHeader}`}>
                <div>
                  <span>{item.sku}</span>
                  <h2>{item.product_name}</h2>
                </div>
                <small>{t.evidenceCount(item.evidence.length)}</small>
              </div>
              <div className={workflowSurfaceStyles.evidenceGrid}>
                {EVIDENCE_KINDS.map((kind) => {
                  const attached = item.evidence.find((evidence) => evidence.kind === kind);
                  const label = evidenceLabels[locale][kind];
                  return (
                    <div className={`${workflowSurfaceStyles.evidenceCard} ${workflowPatternStyles.evidenceCard}`} data-attached={Boolean(attached)} key={kind}>
                      <span className={workflowPatternStyles.evidenceIcon} aria-hidden="true">
                        {kind === "RECEIPT" ? "▤" : kind === "SERIAL_LABEL" ? "#" : "◫"}
                      </span>
                      <div><strong>{label.title}</strong><p>{label.description}</p></div>
                      {attached ? (
                        <button aria-label={`${t.evidenceAttached}: ${label.title}, ${item.product_name}. ${t.removeEvidence}`} disabled={busy} onClick={() => onRemove(item.id, attached.id)} type="button">
                          ✓ {t.evidenceAttached} · {t.removeEvidence}
                        </button>
                      ) : (
                        <button aria-label={`${t.attachEvidence}: ${label.title}, ${item.product_name}`} disabled={busy || !available.includes(kind)} onClick={() => onAttach(item, kind)} type="button">
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
      <div className={`${workflowSurfaceStyles.stepHeading} ${workflowPatternStyles.stepHeading}`}>
        <div><h1>{t.reviewTitle}</h1><p>{t.reviewIntro}</p></div>
      </div>
      <section className={workflowSurfaceStyles.reviewCard}>
        <div className={`${workflowSurfaceStyles.reviewRow} ${workflowPatternStyles.orderSummary}`}>
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
          <div className={`${workflowSurfaceStyles.reviewRow} ${workflowPatternStyles.reviewItem}`} key={item.id}>
            <span aria-hidden="true">□</span>
            <div><h3>{item.product_name}</h3><p>{item.quantity} · {reasonLabels[locale][item.reason]} · {t.evidenceCount(item.evidence.length)}</p></div>
            <strong>{formatMoney(item.line_total, returnRequest.currency, locale)}</strong>
          </div>
        ))}
        <div className={`${workflowSurfaceStyles.reviewTotals} ${workflowPatternStyles.reviewTotals}`}>
          <span>{t.evidenceCount(evidenceCount)}</span>
          <strong>{formatMoney(returnRequest.total_value, returnRequest.currency, locale)}</strong>
        </div>
      </section>

      {isResubmission && (
        <label className={`${workflowSurfaceStyles.responseNote} ${workflowPatternStyles.responseNote}`}>
          <strong>{t.responseNote}</strong>
          <span>{t.responseNoteHelp}</span>
          <textarea
            className={fieldStyles.workflowTextarea}
            maxLength={2000}
            onChange={(event) => onResponseNote(event.target.value)}
            placeholder={t.responseNotePlaceholder}
            required
            rows={4}
            value={responseNote}
          />
        </label>
      )}

      <label className={`${workflowSurfaceStyles.confirmation} ${workflowPatternStyles.confirmation}`}>
        <input checked={confirmed} onChange={(event) => onConfirm(event.target.checked)} type="checkbox" />
        <span>{t.confirmation}</span>
      </label>
      <div className={workflowSurfaceStyles.warning}><span className={workflowPatternStyles.warningIcon} aria-hidden="true">!</span><p>{t.warning}</p></div>
    </div>
  );
}
