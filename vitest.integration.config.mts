import { defineConfig } from "vitest/config";
import path from "node:path";

// Config dediee aux tests d'integration (*.integration.test.ts) — exige une
// vraie base + un role Postgres restreint deja provisionne, voir
// scripts/setup-local-rls-test-role.ts. Separee de vitest.config.mts (qui
// exclut ces fichiers) pour que `npm test` reste rapide et sans prerequis
// d'infrastructure ; lancee via `npm run test:integration`.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.integration.test.ts"],
  },
});
