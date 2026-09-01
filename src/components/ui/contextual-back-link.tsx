import { BackLink } from "@/components/ui/back-link";

/**
 * Lien de retour dont la destination dépend d'où vient la navigation : les
 * sous-menus de la sidebar Planning personnel (Mes tâches, Réunions, Mes
 * objectifs, Temps/Charge, Paramètres) ajoutent `?from=planning-personnel`
 * à leurs liens — sans ce contexte, le retour par défaut reste le tableau
 * de bord (comportement historique de ces pages).
 */
export function ContextualBackLink({ from }: { from?: string }) {
  if (from === "planning-personnel") {
    return <BackLink href="/planning-personnel" label="Retour au planning personnel" />;
  }
  return <BackLink href="/dashboard" label="Retour au tableau de bord" />;
}
