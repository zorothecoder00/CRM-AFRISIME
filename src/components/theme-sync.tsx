"use client";

import { useEffect } from "react";

/**
 * Remplace next-themes (retiré — sa balise <script> interne déclenchait
 * l'avertissement dev de Next.js 16 "Encountered a script tag while
 * rendering React component", voir layout.tsx pour le script anti-FOUC
 * équivalent). Aucun bouton de bascule clair/sombre n'existe dans l'app
 * (aucun autre appelant de useTheme trouvé) : seule la préférence système
 * compte, en direct — ce Client Component ne fait que suivre les
 * changements de prefers-color-scheme après le premier rendu (le script
 * inline gère déjà l'état initial avant peinture) et réapplique la classe
 * après le remount React Strict Mode en dev (voir la doc citée ci-dessus,
 * section "Re-applying attributes in development").
 */
export function ThemeSync() {
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => document.documentElement.classList.toggle("dark", mql.matches);
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  return null;
}
