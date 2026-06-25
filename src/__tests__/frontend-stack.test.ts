// Integration/smoke test for the Frontend_App technology stack (Requirement 26).
//
// These are declarative technology-stack guarantees rather than input-varying
// logic, so they are verified by reading the project's config files and source
// tree from disk and asserting the agreed toolchain is present (and that the
// forbidden libraries are absent). See design.md "Frontend Technology Stack".
//
// Covers: R26.1, R26.2, R26.3, R26.5, R26.9, R26.10, R26.11, R26.12, R26.13, R26.14
//
// Feature: chatbot-refactor

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Resolve the botfront project root from this test file's location
// (src/__tests__/ -> project root) so the test is independent of the
// process working directory.
const __filename = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(__filename), "..", "..");

const fromRoot = (...segments: string[]) => resolve(projectRoot, ...segments);
const readText = (...segments: string[]) =>
  readFileSync(fromRoot(...segments), "utf8");
const readJson = (...segments: string[]) =>
  JSON.parse(readText(...segments)) as Record<string, unknown>;

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const pkg = readJson("package.json") as PackageJson;
const deps = pkg.dependencies ?? {};
const devDeps = pkg.devDependencies ?? {};
const allDeps: Record<string, string> = { ...deps, ...devDeps };

describe("Frontend stack: package.json runtime & framework (R26.1)", () => {
  it("declares Next.js 15.x", () => {
    expect(deps.next).toBeDefined();
    // Accept "15.3.2", "^15.0.0", "15", etc.
    expect(deps.next).toMatch(/(^|[\^~>=\s])15(\.|$)/);
  });

  it("declares React 19.x and react-dom 19.x", () => {
    expect(deps.react).toBeDefined();
    expect(deps.react).toMatch(/(^|[\^~>=\s])19(\.|$)/);
    expect(deps["react-dom"]).toBeDefined();
    expect(deps["react-dom"]).toMatch(/(^|[\^~>=\s])19(\.|$)/);
  });
});

describe("Frontend stack: Heroicons present (R26.5)", () => {
  it("declares @heroicons/react as a dependency", () => {
    expect(allDeps["@heroicons/react"]).toBeDefined();
  });
});

describe("Frontend stack: test tooling devDependencies (R26.9, R26.10, R26.11)", () => {
  it("declares vitest as the test runner", () => {
    expect(devDeps.vitest).toBeDefined();
  });

  it("declares @testing-library/react for component tests", () => {
    expect(devDeps["@testing-library/react"]).toBeDefined();
  });

  it("declares fast-check for property tests", () => {
    expect(devDeps["fast-check"]).toBeDefined();
  });
});

describe("Frontend stack: Prettier present (R26.13)", () => {
  it("declares prettier as a devDependency", () => {
    expect(devDeps.prettier).toBeDefined();
  });

  it("has a .prettierrc config file", () => {
    expect(existsSync(fromRoot(".prettierrc"))).toBe(true);
  });
});

describe("Frontend stack: forbidden libraries are absent (R26.6, R26.7, R26.8)", () => {
  const forbidden = [
    "axios",
    "@tanstack/react-query",
    "redux",
    "react-redux",
    "zustand",
  ];

  it.each(forbidden)("does not declare %s anywhere in deps/devDeps", (name) => {
    expect(allDeps[name]).toBeUndefined();
  });
});

describe("Frontend stack: TypeScript Strict_Mode (R26.2)", () => {
  it("enables compilerOptions.strict in tsconfig.json", () => {
    const tsconfig = readJson("tsconfig.json") as {
      compilerOptions?: { strict?: unknown };
    };
    expect(tsconfig.compilerOptions?.strict).toBe(true);
  });
});

describe("Frontend stack: Tailwind CSS v4 is the only CSS framework (R26.3)", () => {
  it("declares tailwindcss v4 and @tailwindcss/postcss", () => {
    expect(allDeps.tailwindcss).toBeDefined();
    expect(allDeps.tailwindcss).toMatch(/(^|[\^~>=\s])4(\.|$)/);
    expect(allDeps["@tailwindcss/postcss"]).toBeDefined();
  });

  it("uses @tailwindcss/postcss in postcss.config.mjs", () => {
    const postcss = readText("postcss.config.mjs");
    expect(postcss).toContain("@tailwindcss/postcss");
  });

  it('imports tailwindcss via @import "tailwindcss" in globals.css', () => {
    const globals = readText("src", "app", "globals.css");
    expect(globals).toMatch(/@import\s+["']tailwindcss["']/);
  });

  it("does not depend on any other CSS framework", () => {
    const otherCssFrameworks = [
      "bootstrap",
      "bulma",
      "foundation-sites",
      "@chakra-ui/react",
      "@mui/material",
      "styled-components",
      "@emotion/react",
    ];
    for (const name of otherCssFrameworks) {
      expect(allDeps[name]).toBeUndefined();
    }
  });
});

describe("Frontend stack: ESLint uses eslint-config-next (R26.12)", () => {
  it("declares eslint-config-next as a devDependency", () => {
    expect(devDeps["eslint-config-next"]).toBeDefined();
  });

  it("extends a next config in eslint.config.mjs", () => {
    const eslintConfig = readText("eslint.config.mjs");
    // Either next/core-web-vitals or plain "next" via FlatCompat.extends(...)
    expect(eslintConfig).toMatch(/["']next(\/[\w-]+)?["']/);
  });
});

describe("Frontend stack: feature-based src/ tree (R26.14)", () => {
  const featureDirs = [
    ["src", "app"],
    ["src", "components"],
    ["src", "lib", "api"],
    ["src", "lib", "types"],
    ["src", "hooks"],
  ];

  it.each(featureDirs)("has the %s/%s/%s directory", (...segments) => {
    expect(existsSync(fromRoot(...segments))).toBe(true);
  });

  it("has lib/api/client.ts as the single API_Client", () => {
    expect(existsSync(fromRoot("src", "lib", "api", "client.ts"))).toBe(true);
  });

  it("has the shared types module lib/types/index.ts", () => {
    expect(existsSync(fromRoot("src", "lib", "types", "index.ts"))).toBe(true);
  });
});
