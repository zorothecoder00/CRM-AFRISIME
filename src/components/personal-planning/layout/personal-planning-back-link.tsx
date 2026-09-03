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
  return <BackLink href="/planning-personnel" label="Retour à mon planning personnel" />;
}
