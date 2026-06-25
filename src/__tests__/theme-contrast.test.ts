// Property-based test for Theme_Token contrast (WCAG 2.1 AA).
//
// Feature: chatbot-refactor, Property 32: Theme_Token contrast meets WCAG AA thresholds
// Validates: Requirements 25.7, 25.8
//
// Property 32 — "Theme_Token contrast meets WCAG AA thresholds": for every
// text/background Theme_Token pairing the refactored UI actually uses for text,
// across BOTH the light and dark Color_Mode token sets, the WCAG 2.1
// Contrast_Ratio computed from the token hex values meets its size-appropriate
// threshold — at least 4.5:1 for normal-size text (below 18pt, or below 14pt
// bold) and at least 3.0:1 for large-size text (≥18pt, or ≥14pt bold)
// (Requirement 25.7, 25.8).
//
// The ratio is a pure, deterministic function of two hex colors (via relative
// luminance), so this property needs no rendering and no mocks. The light/dark
// token hex values are parsed from `src/app/globals.css` at test time so the
// property stays in sync with the source of truth (tasks 15.1/15.2).
//
// SCOPE: Requirements 25.7/25.8 govern *text* Theme_Token over *background*
// Theme_Token. Only pairings genuinely used as text-on-background in the
// refactored UI (page.tsx, ModelResultCard, DatasetCard, TurnError, the empty-
// history guidance, and the Send button) are included. The rating-star tokens
// (`--color-star-filled`, `--color-star-empty`) are GRAPHICAL icon fills, not
// text, and the empty-star token is intentionally low-contrast (inactive), so
// they are governed by non-text contrast rather than 25.7/25.8 and are excluded
// here by design.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import fc from "fast-check";

const NUM_RUNS = 200;

// Resolve the botfront project root from this test file's location
// (src/__tests__/ -> project root) so the test is independent of the cwd.
const __filename = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(__filename), "..", "..");
const globalsCss = readFileSync(
  resolve(projectRoot, "src", "app", "globals.css"),
  "utf8",
);

// ---------------------------------------------------------------------------
// Parse the light and dark Theme_Token hex maps from globals.css.
// ---------------------------------------------------------------------------

type TokenMap = Record<string, string>;

/** Extract every `--color-x: #rrggbb;` declaration from a CSS block. */
function parseTokens(block: string): TokenMap {
  const map: TokenMap = {};
  const re = /(--color-[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    map[m[1]] = m[2].toUpperCase();
  }
  return map;
}

/** Return the body of the first `selector { ... }` block that follows `marker`. */
function blockAfter(css: string, marker: string): string {
  const start = css.indexOf(marker);
  if (start === -1) throw new Error(`globals.css: marker not found: ${marker}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  if (open === -1 || close === -1) {
    throw new Error(`globals.css: malformed block after ${marker}`);
  }
  return css.slice(open + 1, close);
}

// Light Color_Mode = the first `:root {` block (the unconditional default).
const LIGHT: TokenMap = parseTokens(blockAfter(globalsCss, ":root {"));
// Dark Color_Mode = the explicit `:root[data-theme="dark"]` block (flat, no
// nesting), which mirrors the prefers-color-scheme dark values (task 15.2).
const DARK: TokenMap = parseTokens(
  blockAfter(globalsCss, ':root[data-theme="dark"]'),
);

const COLOR_MODES = { light: LIGHT, dark: DARK } as const;
type ColorModeName = keyof typeof COLOR_MODES;

// Sanity: both maps must carry the core tokens we pair below.
const REQUIRED_TOKENS = [
  "--color-bg",
  "--color-surface",
  "--color-text",
  "--color-text-muted",
  "--color-brand",
  "--color-success",
  "--color-warning",
  "--color-error",
];

// ---------------------------------------------------------------------------
// WCAG 2.1 relative luminance + Contrast_Ratio.
// https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
// https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function relativeLuminance(hex: string): number {
  const channel = (c8: number) => {
    const c = c8 / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// The intended text/background pairings actually used in the refactored UI.
//
// A color is either a Theme_Token name (resolved per Color_Mode) or a literal
// hex (e.g. Tailwind `text-white` on the Send button, which does not re-theme).
// `size` is the pairing's real text-size class in the UI, which selects the
// WCAG threshold (Requirement 25.7 normal -> 4.5, 25.8 large -> 3.0).
// ---------------------------------------------------------------------------

type SizeClass = "normal" | "large";
type Color = { token: string } | { literal: string };

type Pairing = {
  label: string;
  fg: Color;
  bg: Color;
  size: SizeClass;
};

const tok = (name: string): Color => ({ token: name });
const lit = (hex: string): Color => ({ literal: hex.toUpperCase() });

const PAIRINGS: Pairing[] = [
  // page.tsx — h1 title "Assistant Assurances Maghrebia": text-brand, text-3xl
  // font-bold (large) over the page background.
  { label: "title brand-on-bg", fg: tok("--color-brand"), bg: tok("--color-bg"), size: "large" },

  // page.tsx — empty-history guidance: text-text-muted (text-lg + text-sm) over
  // the page background. text-sm is normal-size, the stricter threshold.
  { label: "guidance muted-on-bg", fg: tok("--color-text-muted"), bg: tok("--color-bg"), size: "normal" },

  // page.tsx — "You asked" box: text-text, text-lg font-semibold (large) over a
  // brand/10 tint of the page background (≈ bg).
  { label: "you-asked text-on-bg", fg: tok("--color-text"), bg: tok("--color-bg"), size: "large" },

  // page.tsx — pending indicator "Thinking…" LABEL: text-text-muted, text-sm
  // (normal) over the page background. The warning token now appears only as the
  // GRAPHICAL pulse dot (bg-warning), which is governed by non-text contrast
  // rather than 25.7/25.8 — consistent with how the rating-star icon fills are
  // excluded above — so there is no warning-as-text pairing.

  // page.tsx / TurnError — network & status errors: text-error, text-sm (normal)
  // over the page background.
  { label: "turn-error error-on-bg", fg: tok("--color-error"), bg: tok("--color-bg"), size: "normal" },

  // page.tsx — Send button: text-white on bg-brand-dark (#006259 in BOTH light
  // and dark modes). The button label is normal size; text-white is a literal
  // that does not re-theme, while bg-brand-dark resolves per Color_Mode.
  { label: "send-button white-on-brand-dark", fg: lit("#FFFFFF"), bg: tok("--color-brand-dark"), size: "normal" },

  // ModelResultCard — response body text-text (normal) on bg-surface.
  { label: "model-card text-on-surface", fg: tok("--color-text"), bg: tok("--color-surface"), size: "normal" },
  // ModelResultCard — model label text-text-muted (text-sm) on bg-surface.
  { label: "model-card muted-on-surface", fg: tok("--color-text-muted"), bg: tok("--color-surface"), size: "normal" },
  // ModelResultCard — "OK" status text-success (text-xs) on bg-surface.
  { label: "model-card success-on-surface", fg: tok("--color-success"), bg: tok("--color-surface"), size: "normal" },
  // ModelResultCard — "Failed" / error body text-error (text-xs) on bg-surface.
  { label: "model-card error-on-surface", fg: tok("--color-error"), bg: tok("--color-surface"), size: "normal" },

  // DatasetCard — body text-text (normal) on bg-surface.
  { label: "dataset-card text-on-surface", fg: tok("--color-text"), bg: tok("--color-surface"), size: "normal" },
  // DatasetCard — model label & intent text-text-muted on bg-surface.
  { label: "dataset-card muted-on-surface", fg: tok("--color-text-muted"), bg: tok("--color-surface"), size: "normal" },
  // DatasetCard — source label text-brand (text-xs uppercase) on bg-surface.
  { label: "dataset-card brand-on-surface", fg: tok("--color-brand"), bg: tok("--color-surface"), size: "normal" },

  // CardErrorBoundary — fallback heading text-error (text-sm) on bg-surface.
  { label: "card-fallback error-on-surface", fg: tok("--color-error"), bg: tok("--color-surface"), size: "normal" },
];

/** WCAG AA threshold for a text-size class (Requirement 25.7, 25.8). */
const THRESHOLD: Record<SizeClass, number> = { normal: 4.5, large: 3.0 };

/** Resolve a Color to its hex value within a Color_Mode. */
function resolve_color(color: Color, mode: TokenMap): string {
  if ("literal" in color) return color.literal;
  const hex = mode[color.token];
  if (!hex) throw new Error(`token not defined in this Color_Mode: ${color.token}`);
  return hex;
}

// ---------------------------------------------------------------------------
// Property.
// ---------------------------------------------------------------------------

describe("Property 32: Theme_Token contrast meets WCAG AA thresholds (R25.7, R25.8)", () => {
  it("parses both Color_Mode token sets with the core tokens present", () => {
    for (const token of REQUIRED_TOKENS) {
      expect(LIGHT[token], `light ${token}`).toMatch(/^#[0-9A-F]{6}$/);
      expect(DARK[token], `dark ${token}`).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("every intended text/background pairing meets its WCAG AA threshold in both Color_Modes", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ColorModeName>("light", "dark"),
        fc.constantFrom(...PAIRINGS),
        (modeName, pairing) => {
          const mode = COLOR_MODES[modeName];
          const fgHex = resolve_color(pairing.fg, mode);
          const bgHex = resolve_color(pairing.bg, mode);
          const ratio = contrastRatio(fgHex, bgHex);
          const required = THRESHOLD[pairing.size];

          expect(
            ratio,
            `[${modeName}] ${pairing.label} (${pairing.size}): ` +
              `${fgHex} on ${bgHex} -> ${ratio.toFixed(2)}:1, ` +
              `requires >= ${required.toFixed(1)}:1`,
          ).toBeGreaterThanOrEqual(required);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
