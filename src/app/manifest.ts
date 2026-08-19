import type { MetadataRoute } from "next";

// Mobile-First Execution (cahier des charges V3.0 §42) — rend l'application
// installable sur l'écran d'accueil mobile (icônes/couleurs dédiées,
// affichage plein écran sans barre d'adresse). Utilise le favicon existant
// en l'absence d'icônes dédiées 192x192/512x512 — à remplacer si un logo
// haute résolution est fourni.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AfriFlow — AfriSime Work-Flow",
    short_name: "AfriFlow",
    description: "Plateforme collaborative de gestion des projets, des tâches et de la performance.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
