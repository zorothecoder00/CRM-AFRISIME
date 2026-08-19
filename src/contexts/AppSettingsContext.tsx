"use client";

import { ThemeProvider } from "next-themes";

// Cette enveloppe s'appelait a l'origine "AppSettingsContext" avec un
// state client language/currency (localStorage, par utilisateur) — retire
// car jamais consomme nulle part (useAppSettings() n'avait aucun
// appelant) et desormais en conflit conceptuel avec les mecanismes reels :
// la devise est globale a l'organisation (OrganizationProfile.devise /
// Entity.devise, voir src/lib/currency.ts) et ne peut pas etre reformatee
// par preference utilisateur sans un moteur de conversion de change qui
// n'existe pas ; la locale est geree cote serveur par next-intl
// (src/i18n/request.ts, statique "fr" tant qu'aucune deuxieme langue
// n'est fournie), pas par un toggle client. Ne conserve que ThemeProvider
// (next-themes), la seule partie reellement utilisee (voir sonner.tsx).
export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}
