import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit lit ses fichiers de police (.afm) via __dirname au moment de
  // l'exécution ; empaqueté par Turbopack, ce chemin relatif casse (ENOENT).
  // Externalisé, il est chargé par require() Node normal depuis node_modules.
  serverExternalPackages: ["pdfkit"],
  // Offline Mode (cahier des charges V3.0 §43) — détection de connectivité +
  // retry automatique des navigations/Server Actions en attente (voir
  // src/components/pwa/offline-banner.tsx). Un rechargement complet de page
  // hors-ligne reste hors-scope (nécessiterait un service worker dédié).
  experimental: {
    useOffline: true,
  },
};

export default nextConfig;
