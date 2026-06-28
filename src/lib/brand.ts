// Brand configuration — single source of truth for the insurer identity shown
// in the frontend. Swapping insurers should be a one-file edit here (plus the
// backend `brand.py` and the knowledge base). Phone numbers are PLACEHOLDERS
// until the real published values are confirmed, so nothing misleading ships.

export const BRAND = {
  /** Full brand name used in titles and headings. */
  name: "AMI Assurances",
  /** Short wordmark used in the compact header/sidebar lockups. */
  shortName: "AMI",
  /** Legal entity name. */
  legalName: "Assurances Mutuelles Ittihad",
  /** 24/7 assistance line shown on the Urgence card (PLACEHOLDER). */
  assistanceLine: "<LIGNE ASSISTANCE>",
  /** General service line (PLACEHOLDER). */
  serviceLine: "<LIGNE SERVICE>",
} as const;
