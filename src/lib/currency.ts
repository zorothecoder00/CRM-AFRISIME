import { cache } from "react";
import { prisma } from "@/lib/prisma";

// Devise configurable (cahier des charges V3.0 §3, "préparer la plateforme
// à fonctionner à l'échelle internationale") — remplace le "FCFA" codé en
// dur dans ~20 fichiers. `getOrganizationDevise` est mise en cache par
// requête (React cache()) : plusieurs Server Components de la même page
// peuvent l'appeler sans multiplier les requêtes DB.
export const getOrganizationDevise = cache(async (): Promise<string> => {
  const profile = await prisma.organizationProfile.findUnique({
    where: { id: "org-profile" },
    select: { devise: true },
  });
  return profile?.devise ?? "FCFA";
});

/** Formate un montant avec la devise fournie (à récupérer via getOrganizationDevise côté serveur, ou passée en prop côté client). */
export function formatMontant(value: number, devise: string): string {
  return `${value.toLocaleString("fr-FR")} ${devise}`;
}
