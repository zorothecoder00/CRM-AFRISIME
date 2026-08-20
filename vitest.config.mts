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
  },
});
