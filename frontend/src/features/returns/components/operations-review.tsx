"use client";

import { useEffect, useId, useRef, useState } from "react";

import { transitionOperationsReturn } from "@/features/returns/api";
import type {
  EvidenceKind,
  OperationsReturnStatus,
  OperationsTransitionStatus,
  ReturnReason,
  ReturnRequestDetail,
  StatusActor,
} from "@/features/returns/types";
import { toApiError } from "@/lib/api/client";

import styles from "./operations-review.module.css";
import { buttonStyles, fieldStyles } from "./control-styles";
import { ReturnStatusBadge } from "./return-status-badge";

type Locale = "en" | "es";

const copy = {
  en: {
    eyebrow: "Operations review",
    close: "Close full request",
    order: "Order",
    customer: "Customer",
    email: "Email",
    submitted: "Created",
    total: "Return value",
    itemsTitle: "Returned items and evidence",
    itemQuantity: "Quantity",
    reason: "Reason",
    details: "Customer details",
    noDetails: "No additional details provided.",
    evidence: "Evidence",
    noEvidence: "No evidence attached to this item.",
    timeline: "Status history",
    noNote: "No note",
    decisionTitle: "Record an operations decision",
    decisionIntro:
      "Choose one decision. The customer will see the resulting status and note in this fictional session.",
    requestInfo: "Request information",
    requestInfoHint: "Return the request to the customer for clarification.",
    approve: "Approve return",
    approveHint: "Accept the fictional return request.",
    reject: "Reject return",
    rejectHint: "Close the request without approval.",
    note: "Decision note",
    noteOptional: "Optional for approvals",
    noteRequired: "Required for this decision",
    notePlaceholder: "Explain the fictional decision clearly…",
    noteError: "Add a note before continuing with this decision.",
    continue: "Review decision",
    confirmationTitle: "Confirm this decision",
    confirmation: (decision: string, reference: string) =>
      `This will mark ${reference} as ${decision}.`,
    back: "Go back",
    confirm: "Confirm decision",
    submitting: "Saving decision…",
    transitionError: "The decision could not be saved.",
    readOnlyTitle: "This request is waiting for the customer",
    readOnlyNeedsInfo:
      "Operations requested more information. The customer must respond and resubmit it before another review.",
    completedTitle: "Operations review completed",
    completedApproved: "This fictional return was approved.",
    completedRejected: "This fictional return was rejected.",
  },
  es: {
    eyebrow: "Revisión de operaciones",
    close: "Cerrar solicitud completa",
    order: "Pedido",
    customer: "Cliente",
    email: "Correo",
    submitted: "Creada",
    total: "Valor de devolución",
    itemsTitle: "Artículos devueltos y evidencias",
    itemQuantity: "Cantidad",
    reason: "Motivo",
    details: "Detalles del cliente",
    noDetails: "No se proporcionaron detalles adicionales.",
    evidence: "Evidencias",
    noEvidence: "Este artículo no tiene evidencias adjuntas.",
    timeline: "Historial de estados",
    noNote: "Sin nota",
    decisionTitle: "Registrar una decisión operacional",
    decisionIntro:
      "Selecciona una decisión. El cliente verá el estado y la nota resultantes en esta sesión ficticia.",
    requestInfo: "Solicitar información",
    requestInfoHint: "Devuelve la solicitud al cliente para que la complete.",
    approve: "Aprobar devolución",
    approveHint: "Acepta la solicitud de devolución ficticia.",
    reject: "Rechazar devolución",
    rejectHint: "Cierra la solicitud sin aprobarla.",
    note: "Nota de la decisión",
    noteOptional: "Opcional para aprobaciones",
    noteRequired: "Obligatoria para esta decisión",
    notePlaceholder: "Explica claramente la decisión ficticia…",
    noteError: "Agrega una nota antes de continuar con esta decisión.",
    continue: "Revisar decisión",
    confirmationTitle: "Confirma esta decisión",
    confirmation: (decision: string, reference: string) =>
      `Esto marcará ${reference} como ${decision}.`,
    back: "Volver",
    confirm: "Confirmar decisión",
    submitting: "Guardando decisión…",
    transitionError: "No se pudo guardar la decisión.",
    readOnlyTitle: "Esta solicitud espera una respuesta del cliente",
    readOnlyNeedsInfo:
      "Operaciones solicitó más información. El cliente debe responder y reenviarla antes de otra revisión.",
    completedTitle: "Revisión operacional completada",
    completedApproved: "Esta devolución ficticia fue aprobada.",
    completedRejected: "Esta devolución ficticia fue rechazada.",
  },
} as const;

const statusLabels: Record<Locale, Record<OperationsReturnStatus, string>> = {
  en: {
    SUBMITTED: "Submitted",
    NEEDS_INFORMATION: "Needs information",
    APPROVED: "Approved",
    REJECTED: "Rejected",
  },
  es: {
    SUBMITTED: "Enviada",
    NEEDS_INFORMATION: "Requiere información",
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

const evidenceLabels: Record<Locale, Record<EvidenceKind, string>> = {
  en: {
    PRODUCT_PHOTO: "Product photo",
    SERIAL_LABEL: "Serial label",
    RECEIPT: "Receipt",
  },
  es: {
    PRODUCT_PHOTO: "Foto del producto",
    SERIAL_LABEL: "Etiqueta serial",
    RECEIPT: "Recibo",
  },
};

const actorLabels: Record<Locale, Record<StatusActor, string>> = {
  en: { CUSTOMER: "Customer", OPERATIONS: "Operations", SYSTEM: "System" },
  es: { CUSTOMER: "Cliente", OPERATIONS: "Operaciones", SYSTEM: "Sistema" },
};

const decisions: OperationsTransitionStatus[] = [
  "NEEDS_INFORMATION",
  "APPROVED",
  "REJECTED",
];

function formatMoney(value: string, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(locale === "es" ? "es-VE" : "en-US", {
    style: "currency",
    currency,
  }).format(Number(value));
}

function formatDate(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function decisionLabel(
  locale: Locale,
  decision: OperationsTransitionStatus,
): string {
  const t = copy[locale];
  if (decision === "NEEDS_INFORMATION") return t.requestInfo;
  if (decision === "APPROVED") return t.approve;
  return t.reject;
}

function decisionHint(
  locale: Locale,
  decision: OperationsTransitionStatus,
): string {
  const t = copy[locale];
  if (decision === "NEEDS_INFORMATION") return t.requestInfoHint;
  if (decision === "APPROVED") return t.approveHint;
  return t.rejectHint;
}

export function operationsDecisionRequiresNote(
  decision: OperationsTransitionStatus | null,
): boolean {
  return decision === "NEEDS_INFORMATION" || decision === "REJECTED";
}

export default function OperationsReview({
  locale,
  request,
  onClose,
  onTransitioned,
}: {
  locale: Locale;
  request: ReturnRequestDetail;
  onClose: () => void;
  onTransitioned: (request: ReturnRequestDetail) => void;
}) {
  const [decision, setDecision] =
    useState<OperationsTransitionStatus | null>(null);
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const submittingRef = useRef(false);
  const t = copy[locale];
  const requiresNote = operationsDecisionRequiresNote(decision);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !submittingRef.current) onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  function selectDecision(nextDecision: OperationsTransitionStatus) {
    setDecision(nextDecision);
    setConfirming(false);
    setValidationError(false);
    setError(null);
  }

  function prepareConfirmation() {
    if (!decision) return;
    if (operationsDecisionRequiresNote(decision) && !note.trim()) {
      setValidationError(true);
      return;
    }
    setValidationError(false);
    setConfirming(true);
  }

  async function confirmDecision() {
    if (!decision || submitting) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await transitionOperationsReturn(request.id, {
        target_status: decision,
        note: note.trim(),
      });
      onTransitioned(updated);
    } catch (transitionError) {
      setError(toApiError(transitionError).message);
      setConfirming(false);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className={styles.dialog}
        role="dialog"
      >
        <header className={styles.header}>
          <div>
            <p>{t.eyebrow}</p>
            <div className={styles.titleRow}>
              <h2 id={titleId}>{request.reference}</h2>
              <ReturnStatusBadge status={request.status} variant="review">
                {statusLabels[locale][request.status as OperationsReturnStatus]}
              </ReturnStatusBadge>
            </div>
            <span id={descriptionId}>
              {request.item_count} {locale === "es" ? "artículos" : "items"} · {formatMoney(request.total_value, request.currency, locale)}
            </span>
          </div>
          <button
            aria-label={t.close}
            className={buttonStyles.operationsReviewClose}
            disabled={submitting}
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            ×
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.contentColumn}>
            <dl className={styles.summaryGrid}>
              <div><dt>{t.order}</dt><dd>{request.order_reference}</dd></div>
              <div><dt>{t.customer}</dt><dd>{request.customer_name}</dd></div>
              <div><dt>{t.email}</dt><dd>{request.customer_email}</dd></div>
              <div><dt>{t.submitted}</dt><dd>{formatDate(request.created_at, locale)}</dd></div>
              <div><dt>{t.total}</dt><dd>{formatMoney(request.total_value, request.currency, locale)}</dd></div>
            </dl>

            <section className={styles.detailSection}>
              <div className={styles.sectionHeading}>
                <span aria-hidden="true">▤</span>
                <h3>{t.itemsTitle}</h3>
              </div>
              <div className={styles.itemList}>
                {request.items.map((item, index) => (
                  <article className={styles.itemCard} key={item.id}>
                    <div className={styles.itemNumber}>{String(index + 1).padStart(2, "0")}</div>
                    <div className={styles.itemMain}>
                      <div className={styles.itemTitle}>
                        <div><h4>{item.product_name}</h4><span>{item.sku}</span></div>
                        <strong>{formatMoney(item.line_total, request.currency, locale)}</strong>
                      </div>
                      <dl className={styles.itemFacts}>
                        <div><dt>{t.itemQuantity}</dt><dd>{item.quantity}</dd></div>
                        <div><dt>{t.reason}</dt><dd>{reasonLabels[locale][item.reason]}</dd></div>
                      </dl>
                      <div className={styles.customerDetails}>
                        <strong>{t.details}</strong>
                        <p>{item.details || t.noDetails}</p>
                      </div>
                      <div className={styles.evidenceBlock}>
                        <strong>{t.evidence} · {item.evidence.length}</strong>
                        {item.evidence.length === 0 ? (
                          <p>{t.noEvidence}</p>
                        ) : (
                          <div className={styles.evidenceGrid}>
                            {item.evidence.map((evidence) => (
                              <div className={styles.evidenceCard} key={evidence.id}>
                                <span aria-hidden="true">⌕</span>
                                <div>
                                  <strong>{evidence.caption || evidenceLabels[locale][evidence.kind]}</strong>
                                  <small>{evidenceLabels[locale][evidence.kind]}</small>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.detailSection}>
              <div className={styles.sectionHeading}>
                <span aria-hidden="true">◷</span>
                <h3>{t.timeline}</h3>
              </div>
              <ol className={styles.timeline}>
                {[...request.status_events].reverse().map((event) => (
                  <li key={event.id}>
                    <span className={styles.timelineDot} data-status={event.to_status} />
                    <div>
                      <strong>{statusLabels[locale][event.to_status as OperationsReturnStatus] ?? event.to_status}</strong>
                      <small>{actorLabels[locale][event.actor]} · {formatDate(event.created_at, locale)}</small>
                      <p>{event.note || t.noNote}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <aside className={styles.decisionColumn}>
            {request.status === "SUBMITTED" ? (
              <div className={styles.decisionPanel}>
                <p className={styles.panelEyebrow}>{t.eyebrow}</p>
                <h3>{t.decisionTitle}</h3>
                <p className={styles.decisionIntro}>{t.decisionIntro}</p>
                <div className={styles.decisionOptions}>
                  {decisions.map((option) => (
                    <button
                      aria-pressed={decision === option}
                      data-active={decision === option}
                      data-decision={option}
                      key={option}
                      onClick={() => selectDecision(option)}
                      type="button"
                    >
                      <span aria-hidden="true">{option === "NEEDS_INFORMATION" ? "i" : option === "APPROVED" ? "✓" : "×"}</span>
                      <div><strong>{decisionLabel(locale, option)}</strong><small>{decisionHint(locale, option)}</small></div>
                    </button>
                  ))}
                </div>

                {decision && (
                  <div className={styles.noteField}>
                    <label htmlFor={`${titleId}-note`}>
                      {t.note}
                      <span>{requiresNote ? t.noteRequired : t.noteOptional}</span>
                    </label>
                    <textarea
                      aria-invalid={validationError}
                      className={fieldStyles.operationsNote}
                      disabled={submitting}
                      id={`${titleId}-note`}
                      maxLength={2000}
                      onChange={(event) => {
                        setNote(event.target.value);
                        if (event.target.value.trim()) setValidationError(false);
                        setConfirming(false);
                      }}
                      placeholder={t.notePlaceholder}
                      rows={5}
                      value={note}
                    />
                    <div className={styles.noteMeta}>
                      <span>{validationError ? t.noteError : ""}</span>
                      <small>{note.length}/2000</small>
                    </div>
                  </div>
                )}

                {error && <div className={styles.actionError} role="alert"><strong>{t.transitionError}</strong><span>{error}</span></div>}

                {!confirming || !decision ? (
                  <button className={buttonStyles.operationsReviewPrimary} disabled={!decision || submitting} onClick={prepareConfirmation} type="button">
                    {t.continue} →
                  </button>
                ) : (
                  <div className={styles.confirmation} role="alert">
                    <strong>{t.confirmationTitle}</strong>
                    <p>{t.confirmation(decisionLabel(locale, decision), request.reference)}</p>
                    <div>
                      <button className={buttonStyles.operationsConfirmationSecondary} disabled={submitting} onClick={() => setConfirming(false)} type="button">{t.back}</button>
                      <button className={buttonStyles.operationsConfirmationPrimary} disabled={submitting} onClick={confirmDecision} type="button">{submitting ? t.submitting : t.confirm}</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.readOnlyPanel} data-status={request.status}>
                <span className={styles.readOnlyIcon} aria-hidden="true">
                  {request.status === "NEEDS_INFORMATION" ? "i" : request.status === "APPROVED" ? "✓" : "×"}
                </span>
                <p>{request.status === "NEEDS_INFORMATION" ? t.readOnlyTitle : t.completedTitle}</p>
                <h3>{statusLabels[locale][request.status as OperationsReturnStatus]}</h3>
                <span>
                  {request.status === "NEEDS_INFORMATION"
                    ? t.readOnlyNeedsInfo
                    : request.status === "APPROVED"
                      ? t.completedApproved
                      : t.completedRejected}
                </span>
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
