"use client";

import { useOffline } from "next/offline";
import { WifiOff } from "lucide-react";

// Offline Mode (cahier des charges V3.0 §43) — bannière globale utilisant
// le hook natif `useOffline` (Next.js 16, experimental.useOffline activé
// dans next.config.ts). Consultation/saisie hors-ligne : les navigations
// vers des routes déjà préchargées et les Server Actions restent en attente
// et se rejouent automatiquement au retour du réseau (comportement du
// framework, pas de code de retry ici) — ce qui évite structurellement les
// conflits d'écriture concurrente plutôt que d'avoir à les résoudre après
// coup. Un rechargement complet de page hors-ligne reste impossible sans
// service worker dédié (ex. Serwist) : delibérément hors-scope de cette
// passe, voir la doc Next.js "Progressive Web Apps".
export function OfflineBanner() {
  const isOffline = useOffline();

  if (!isOffline) return null;

  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-warning/10 px-4 py-1.5 text-xs font-medium text-warning dark:bg-warning/20">
      <WifiOff className="h-3.5 w-3.5" />
      Hors ligne — les actions en attente seront rejouées automatiquement au retour du réseau.
    </div>
  );
}
