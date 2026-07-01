import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Domain logic (scoring, calculator) is pure and infra-free, so tests run in a
 * plain Node environment with no DOM. The `@/*` alias mirrors tsconfig so tests
 * import modules exactly as app code does.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // `server-only` is a no-op guard in the real Next runtime; stub it so
      // server modules (lib/scores-service.ts, etc.) can be imported in tests.
      "server-only": path.resolve(__dirname, "tests/empty-module.ts"),
    },
  },
  // Use the automatic JSX runtime so tests can render @react-pdf components
  // (matches Next's transform; avoids a manual React import in .tsx files).
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
