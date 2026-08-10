import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit lit ses fichiers de police (.afm) via __dirname au moment de
  // l'exécution ; empaqueté par Turbopack, ce chemin relatif casse (ENOENT).
  // Externalisé, il est chargé par require() Node normal depuis node_modules.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
