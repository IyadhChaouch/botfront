// Unit/smoke tests for the Maghrebia theming criteria (Task 15.5).
//
// These verify three theming "smoke" guarantees from Requirement 25:
//
//   1. Token centralization (R25.1) — the refactored components reference
//      centralized Theme_Token utility classes (bg-surface, text-text,
//      text-brand, text-success, text-error, text-star-filled, …) and contain
//      NO ad-hoc Tailwind numbered color literals (text-red-600, bg-blue-50,
//      text-gray-500, text-yellow-400, …). Verified by reading the component
//      source from disk so a stray literal slipping back in is caught.
//
//   2. Dark-mode role parity (R25.9) — for every Theme_Token color role defined
//      in the light :root block, both dark blocks (@media prefers-color-scheme:
//      dark and :root[data-theme="dark"]) define the SAME token name with a
//      value, the two dark blocks agree, the documented role-defining surface/
//      brand tokens take a distinct dark value (so no role collapses to its
//      light value or goes missing), and the core semantic state roles stay
//      visually distinct from one another.
//
//   3. Documented element application — brand/accent/semantic tokens are applied
//      to the documented UI elements (Send button → bg-brand, success badge →
//      text-success, error states → text-error/border-error, rating stars →
//      text-star-filled / text-star-empty, section header → text-brand, dataset
//      card → border-brand/text-brand). Verified by a mix of rendering the
//      components and reading source.
//
// Covers: R25.1, R25.9 (with supporting checks for R25.2–R25.6).
//
// Feature: chatbot-refactor

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ChatProvider } from "@/hooks/useChat";
import { StarRating } from "@/components/StarRating";
import { ModelResultCard } from "@/components/ModelResultCard";
import { CardErrorBoundary } from "@/components/CardErrorBoundary";
import type { ModelResult } from "@/lib/types";

// Resolve the botfront project root from this test file's location
// (src/__tests__/ -> project root) so the test is independent of cwd.
const __filename = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(__filename), "..", "..");
const fromRoot = (...segments: string[]) => resolve(projectRoot, ...segments);
const readText = (...segments: string[]) =>
  readFileSync(fromRoot(...segments), "utf8");

// ---------------------------------------------------------------------------
// The set of components refactored by Task 15.3 to consume semantic tokens.
// ---------------------------------------------------------------------------
const REFACTORED_COMPONENTS: Array<{ name: string; segments: string[] }> = [
  { name: "page.tsx", segments: ["src", "app", "page.tsx"] },
  { name: "ModelResultCard.tsx", segments: ["src", "components", "ModelResultCard.tsx"] },
  { name: "DatasetCard.tsx", segments: ["src", "components", "DatasetCard.tsx"] },
  { name: "StarRating.tsx", segments: ["src", "components", "StarRating.tsx"] },
  { name: "CardErrorBoundary.tsx", segments: ["src", "components", "CardErrorBoundary.tsx"] },
];

// The Brand_Palette / Semantic_Color Theme_Token utility class roots that the
// refactored components are expected to reference instead of raw palette hues.
const THEME_TOKEN_CLASS_ROOTS = [
  "surface",
  "brand",
  "brand-dark",
  "brand-light",
  "accent",
  "bg",
  "border",
  "text",
  "text-muted",
  "success",
  "warning",
  "error",
  "star-filled",
  "star-empty",
];

// Standard Tailwind palette hue names that carry a numeric shade. A class like
// `text-red-600` / `bg-blue-50` / `text-gray-500` is an ad-hoc color literal and
// is forbidden in the refactored components (R25.1).
const TAILWIND_HUES = [
  "slate",
  "gray",
  "grey",
  "zinc",
  "neutral",
  "stone",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
];

// Tailwind color-utility prefixes that can take a `<hue>-<shade>` literal.
const COLOR_UTILITY_PREFIXES = [
  "bg",
  "text",
  "border",
  "fill",
  "stroke",
  "ring",
  "from",
  "via",
  "to",
  "divide",
  "outline",
  "decoration",
  "accent",
  "caret",
  "shadow",
  "ring-offset",
];

// Matches an ad-hoc Tailwind numbered color literal, optionally with a variant
// prefix (e.g. `hover:bg-blue-500`, `dark:text-gray-300`). Example matches:
//   text-red-600  bg-blue-50  text-gray-500  text-yellow-400  border-blue-500
const adHocColorLiteral = new RegExp(
  String.raw`\b(?:[a-z-]+:)*(?:${COLOR_UTILITY_PREFIXES.join("|")})-(?:${TAILWIND_HUES.join("|")})-(?:50|100|200|300|400|500|600|700|800|900|950)\b`,
  "g",
);

// DECISION on `text-white`: the Send button label sits on the `bg-brand-dark`
// teal surface, where a fixed white label is the correct, accessible choice and
// is not a per-component "ad-hoc hue" — `white`/`black` carry no numeric palette
// shade and are not part of the centralized hue palette this rule guards
// against. It is therefore intentionally NOT flagged. (If a numbered literal
// like `text-gray-300` were used instead, the rule above WOULD flag it.)

describe("Token centralization: no ad-hoc Tailwind color literals (R25.1)", () => {
  it.each(REFACTORED_COMPONENTS)(
    "$name contains no numbered Tailwind color literal",
    ({ segments }) => {
      const source = readText(...segments);
      const matches = source.match(adHocColorLiteral) ?? [];
      // If this fails, Task 15.3 left (or re-introduced) a hardcoded literal:
      // the failing class name(s) are reported here rather than weakening the rule.
      expect(matches).toEqual([]);
    },
  );

  it.each(REFACTORED_COMPONENTS)(
    "$name references at least one centralized Theme_Token class",
    ({ segments }) => {
      const source = readText(...segments);
      const tokenClass = new RegExp(
        String.raw`\b(?:[a-z-]+:)*(?:${COLOR_UTILITY_PREFIXES.join("|")})-(?:${THEME_TOKEN_CLASS_ROOTS.join("|")})\b`,
      );
      expect(tokenClass.test(source)).toBe(true);
    },
  );
});

// ---------------------------------------------------------------------------
// Dark-mode role parity (R25.9): parse globals.css token blocks.
// ---------------------------------------------------------------------------
const globalsCss = readText("src", "app", "globals.css");

/** Extract `--color-*: <value>;` declarations from a CSS block body. */
function parseColorTokens(blockBody: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  const re = /(--color-[a-z-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(blockBody)) !== null) {
    tokens[m[1]] = m[2].trim();
  }
  return tokens;
}

/**
 * Extract the body of a brace-delimited block whose opening `<selector> {`
 * starts at `startIndex` within `css`. Walks braces so nested blocks (e.g. a
 * `:root` inside an `@media`) are captured correctly.
 */
function extractBlockBody(css: string, headerRegex: RegExp): string | null {
  const header = headerRegex.exec(css);
  if (header === null) return null;
  const open = css.indexOf("{", header.index);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") {
      depth--;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  return null;
}

// Light :root block = the first top-level `:root {` (not the data-theme one).
const lightBlock = extractBlockBody(globalsCss, /(^|\n)\s*:root\s*\{/);
// Dark via prefers-color-scheme media query (its inner :root tokens).
const mediaBlock = extractBlockBody(
  globalsCss,
  /@media\s*\(prefers-color-scheme:\s*dark\)/,
);
// Dark via explicit attribute selector.
const attrBlock = extractBlockBody(globalsCss, /:root\[data-theme="dark"\]/);

const lightTokens = lightBlock ? parseColorTokens(lightBlock) : {};
const darkMediaTokens = mediaBlock ? parseColorTokens(mediaBlock) : {};
const darkAttrTokens = attrBlock ? parseColorTokens(attrBlock) : {};

// Only the real palette roles (exclude compatibility aliases like --background).
const lightRoleNames = Object.keys(lightTokens);

// Tokens documented in R25.9 as taking a DISTINCT dark value (background
// #0E1716, surface #16221F, primary text #E6EDEB, primary brand #4FB3A9).
const DARK_DISTINCT_ROLES = [
  "--color-bg",
  "--color-surface",
  "--color-text",
  "--color-brand",
];

describe("Dark-mode role parity (R25.9)", () => {
  it("parsed a light :root block and both dark blocks", () => {
    expect(lightRoleNames.length).toBeGreaterThan(0);
    expect(Object.keys(darkMediaTokens).length).toBeGreaterThan(0);
    expect(Object.keys(darkAttrTokens).length).toBeGreaterThan(0);
  });

  it.each(lightRoleNames)(
    "light role %s is also defined (same role) in the prefers-color-scheme dark block",
    (role) => {
      expect(darkMediaTokens[role]).toBeDefined();
      expect(darkMediaTokens[role]).not.toEqual("");
    },
  );

  it.each(lightRoleNames)(
    "light role %s is also defined (same role) in the data-theme dark block",
    (role) => {
      expect(darkAttrTokens[role]).toBeDefined();
      expect(darkAttrTokens[role]).not.toEqual("");
    },
  );

  it("the two dark blocks assign identical values for every role", () => {
    expect(darkAttrTokens).toEqual(darkMediaTokens);
  });

  it.each(DARK_DISTINCT_ROLES)(
    "documented role %s has a distinct dark value (does not collapse to its light value)",
    (role) => {
      expect(lightTokens[role]).toBeDefined();
      expect(darkMediaTokens[role]).toBeDefined();
      expect(darkMediaTokens[role]?.toLowerCase()).not.toEqual(
        lightTokens[role]?.toLowerCase(),
      );
    },
  );

  it("keeps the core semantic state roles visually distinct in dark mode", () => {
    // success / warning / error must not collapse onto each other, else the
    // R6 card states would be indistinguishable.
    const { "--color-success": ok, "--color-warning": warn, "--color-error": err } =
      darkMediaTokens;
    expect(ok).toBeDefined();
    expect(warn).toBeDefined();
    expect(err).toBeDefined();
    expect(ok?.toLowerCase()).not.toEqual(err?.toLowerCase());
    expect(ok?.toLowerCase()).not.toEqual(warn?.toLowerCase());
    expect(err?.toLowerCase()).not.toEqual(warn?.toLowerCase());
  });

  it("keeps surface, page background, and primary text distinct in dark mode", () => {
    const bg = darkMediaTokens["--color-bg"]?.toLowerCase();
    const surface = darkMediaTokens["--color-surface"]?.toLowerCase();
    const text = darkMediaTokens["--color-text"]?.toLowerCase();
    expect(bg).not.toEqual(surface);
    expect(bg).not.toEqual(text);
    expect(surface).not.toEqual(text);
  });

  it("preserves the brand, accent, surface, text, and semantic roles in the dark set", () => {
    for (const role of [
      "--color-brand",
      "--color-accent",
      "--color-surface",
      "--color-text",
      "--color-success",
      "--color-warning",
      "--color-error",
      "--color-star-filled",
      "--color-star-empty",
    ]) {
      expect(darkMediaTokens[role], `${role} missing in dark mode`).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Documented element application (R25.2–R25.6): render + source assertions.
// ---------------------------------------------------------------------------
describe("Documented element application: brand/accent/semantic tokens", () => {
  it("Send button uses bg-brand-dark for the primary action (R25.2)", () => {
    const page = readText("src", "app", "page.tsx");
    const composer = readText("src", "components", "Composer.tsx");
    // The Send button (in the extracted Composer) is the disabled-gated primary
    // action. It uses the dark brand token so white-on-brand-dark meets WCAG AA
    // in both Color_Modes.
    expect(composer).toMatch(/className="[^"]*\bbg-brand-dark\b[^"]*"/);
    // Section header uses the brand color (R25.2).
    expect(page).toMatch(/text-brand/);
    // Pending indicator maps to the warning token via its GRAPHICAL pulse dot
    // (R25.4); the label text uses an accessible text token (text-text-muted)
    // so the indicator meets WCAG AA text contrast (R25.7).
    expect(page).toMatch(/bg-warning/);
    expect(page).toMatch(/text-text-muted/);
  });

  it("renders a successful model card OK badge with the success token (R25.4)", () => {
    const result: ModelResult = {
      success: true,
      response: "Bonjour, voici l'information.",
      error: null,
      model: "llama-3.3-70b-versatile",
    };
    render(
      <ChatProvider>
        <ModelResultCard modelId="llama3" result={result} question="Q?" />
      </ChatProvider>,
    );
    const badge = screen.getByText("OK");
    expect(badge.className).toContain("text-success");
  });

  it("renders a failed model card with the error token (R25.4)", () => {
    const result: ModelResult = {
      success: false,
      response: null,
      error: "Model unavailable",
      model: "tinyllama",
    };
    render(
      <ChatProvider>
        <ModelResultCard modelId="tinyllama" result={result} question="Q?" />
      </ChatProvider>,
    );
    const badge = screen.getByText("Failed");
    expect(badge.className).toContain("text-error");
    expect(screen.getByText("Model unavailable").className).toContain("text-error");
  });

  it("renders rating stars with the star-filled / star-empty tokens (R25.5)", () => {
    render(
      <ChatProvider>
        <StarRating modelIdentifier="llama3" question="Q?" response="A." />
      </ChatProvider>,
    );
    // With no persisted rating, all five stars render empty.
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(5);
    const svgs = radios
      .map((btn) => btn.querySelector("svg"))
      .filter((el): el is SVGElement => el !== null);
    expect(svgs).toHaveLength(5);
    for (const svg of svgs) {
      expect(svg.getAttribute("class") ?? "").toContain("text-star-empty");
    }
    // The component must be capable of the filled token too (R25.5).
    expect(readText("src", "components", "StarRating.tsx")).toContain("text-star-filled");
  });

  it("contains a card render error with the error token in the boundary fallback (R25.4)", () => {
    const Boom = () => {
      throw new Error("kaboom");
    };
    render(
      <CardErrorBoundary label="llama3">
        <Boom />
      </CardErrorBoundary>,
    );
    const alert = screen.getByRole("alert");
    // Fallback surface uses the error border + error text tokens.
    expect(alert.className).toContain("border-error");
    expect(alert.querySelector(".text-error")).not.toBeNull();
  });

  it("dataset card applies brand tokens to its distinct framing (R25.2)", () => {
    const dataset = readText("src", "components", "DatasetCard.tsx");
    expect(dataset).toMatch(/border-brand/);
    expect(dataset).toMatch(/text-brand/);
  });
});
