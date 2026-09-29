import { BackLink } from "@/components/ui/back-link";

type BackTarget = { href: string; label: string };

const DASHBOARD_TARGET: BackTarget = { href: "/dashboard", label: "Retour au tableau de bord" };

/** Libellé du retour selon la page d'origine — du plus spécifique au plus
 * général (un préfixe ne matche que sur une frontière de segment). */
const PATH_LABELS: [string, string][] = [
  ["/projets/portefeuille", "Retour au portefeuille de projets"],
  ["/projets/studio", "Retour au Project Studio"],
  ["/projets/idees", "Retour au laboratoire d'idées"],
  ["/projets/appels-a-projets", "Retour aux appels à projets"],
  ["/projets", "Retour aux projets"],
  ["/dashboard", "Retour au tableau de bord"],
];

/** N'accepte qu'un chemin interne ("/..."), jamais une URL absolue ou
 * protocol-relative ("//evil.com", "/\\evil.com") — `from` vient de l'URL,
 * donc d'une source non fiable (open redirect sinon). */
export function safeInternalPath(from?: string): string | null {
  if (!from || !from.startsWith("/") || from.startsWith("//") || from.startsWith("/\\")) return null;
  return from;
}

/** Ajoute `from=<chemin courant>` à un lien, pour que la page cible sache où
 * renvoyer son lien de retour. */
export function withFrom(href: string, from: string): string {
  return `${href}${href.includes("?") ? "&" : "?"}from=${encodeURIComponent(from)}`;
}

function labelForPath(path: string): string {
  const pathname = path.split("?")[0];
  const match = PATH_LABELS.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return match ? match[1] : "Retour";
}

/**
 * Lien de retour dont la destination dépend d'où vient la navigation, lue
 * dans `?from=` :
 * - `planning-personnel` : les sous-menus de la sidebar Planning personnel
 *   (Mes tâches, Réunions, Mes objectifs, Temps/Charge, Paramètres) ;
 * - un chemin interne (`/projets/portefeuille?statut=...`) : retour exact à
 *   la page d'origine, filtres compris (voir `withFrom`).
 * Sans contexte, `fallback` (tableau de bord par défaut, comportement
 * historique de ces pages).
 */
export function ContextualBackLink({ from, fallback = DASHBOARD_TARGET }: { from?: string; fallback?: BackTarget }) {
  if (from === "planning-personnel") {
    return <BackLink href="/planning-personnel" label="Retour au planning personnel" />;
  }
  const path = safeInternalPath(from);
  if (path) {
    return <BackLink href={path} label={labelForPath(path)} />;
  }
  return <BackLink href={fallback.href} label={fallback.label} />;
}
