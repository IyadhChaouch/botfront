import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  test: {
    // React Testing Library needs a DOM; jsdom provides it.
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    css: true,
    // Property-based tests render the full chat page many times per run; give
    // them headroom beyond the default 5s so they don't flake on slower runs.
    testTimeout: 30000,
  },
  resolve: {
    // Mirror the "@/*" -> "./src/*" path alias from tsconfig.json.
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
