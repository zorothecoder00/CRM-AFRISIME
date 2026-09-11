"use client";

import { usePathname } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";

/**
 * Lien "Retour à mon planning personnel" — hissé du haut de chaque sous-page
 * (répété identiquement 16 fois) vers le layout partagé du module, rendu
 * AVANT la barre d'outils (Demander un créneau, Nouvelle réunion...) plutôt
 * qu'après (demande utilisateur). Absent sur le hub lui-même : on ne "revient"
 * pas à la page où on est déjà.
 */
export function PersonalPlanningBackLink() {
  const pathname = usePathname();
  if (pathname === "/planning-personnel") return null;
  // Demande utilisateur — /journal se rejoint uniquement depuis /agenda
  // ("voir le journal complet") : le retour doit y ramener, pas au hub.
  if (pathname.startsWith("/planning-personnel/journal")) {
    return <BackLink href="/planning-personnel/agenda" label="Retour à l'agenda" />;
  }
  return <BackLink href="/planning-personnel" label="Retour à mon planning personnel" />;
}
