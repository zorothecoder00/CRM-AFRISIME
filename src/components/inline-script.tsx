// Next.js 16 avertit (dev uniquement) quand un rendu produit une balise
// <script> — cas de next-themes (retiré, voir theme-sync.tsx) et de tout
// script inline "anti-FOUC" écrit à la main. Solution documentée par
// Next.js lui-même (node_modules/next/dist/docs/01-app/02-guides/
// preventing-flash-before-hydration.md, section "Extracting a reusable
// component") : type="text/javascript" côté serveur (le navigateur
// l'exécute), type="text/plain" côté client (React ne le ré-exécute pas et
// l'avertissement disparaît) — suppressHydrationWarning gère l'écart de type.
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
