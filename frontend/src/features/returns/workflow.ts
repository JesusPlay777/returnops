import type {
  EvidenceKind,
  ReturnItem,
} from "@/features/returns/types";

export const EVIDENCE_KINDS: readonly EvidenceKind[] = [
  "PRODUCT_PHOTO",
  "SERIAL_LABEL",
  "RECEIPT",
];

export function buildEvidenceAssetKey(
  reference: string,
  itemId: string,
  kind: EvidenceKind,
): string {
  return [
    "demo",
    reference.toLowerCase(),
    itemId.toLowerCase(),
    `${kind.toLowerCase()}.jpg`,
  ].join("/");
}

export function availableEvidenceKinds(item: ReturnItem): EvidenceKind[] {
  const attachedKinds = new Set(item.evidence.map((evidence) => evidence.kind));
  return EVIDENCE_KINDS.filter((kind) => !attachedKinds.has(kind));
}
