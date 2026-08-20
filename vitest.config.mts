import { defineConfig } from "vitest/config";
import path from "node:path";

// Alias @ -> src, meme mapping que tsconfig.json ("@/*": ["./src/*"]) —
// vitest n'utilise pas tsconfig.json nativement, il faut le redeclarer ici
// pour que les tests puissent importer comme le reste du code (@/lib/...).
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // *.integration.test.ts (ex. tenant-scoped-prisma) exigent une vraie
    // base + un role Postgres restreint deja provisionne (voir
    // scripts/setup-local-rls-test-role.ts) — exclus du run rapide par
    // defaut (npm test), lances via npm run test:integration. Complete la
    // liste d'exclusions par defaut de Vitest plutot que de l'ecraser.
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
      "**/*.integration.test.ts",
    ],
  },
});
