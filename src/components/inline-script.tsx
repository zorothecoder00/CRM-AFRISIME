"use client";

/**
 * Script inline anti-FOUC (voir node_modules/next/dist/docs/01-app/02-guides/
 * preventing-flash-before-hydration.md, "Extracting a reusable component").
 * DOIT rester un Client Component : le ternaire `typeof window` doit etre
 * reevalue dans le navigateur. Rendu serveur -> type="text/javascript"
 * (execute pendant le parsing HTML) ; tout re-rendu client (recuperation
 * apres erreur, navigation) -> type="text/plain", inerte, ce qui evite
 * l'avertissement dev React "Encountered a script tag". Un essai precedent
 * appelait ce wrapper depuis le RootLayout Server Component : le ternaire y
 * etait fige cote serveur et l'avertissement persistait.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
