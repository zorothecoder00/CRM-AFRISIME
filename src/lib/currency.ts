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

// Devise par entité (V2.2 §23, "multi-pays") — Entity.devise existait déjà
// mais n'était jamais lue pour reformater des montants ("hors périmètre de
// ce lot" à l'époque, voir le commentaire sur le modèle dans schema.prisma).
// Utilisée uniquement pour les vues agrégées PAR entité (consolidation,
// benchmarking) où afficher tout sous la devise globale de l'organisation
// induirait en erreur pour une entité qui opère dans une autre devise —
// pas propagée aux projets/programmes individuels (qui n'ont pas
// d'entityId direct, seulement via departmentId ; ce niveau de granularité
// resterait un chantier séparé si demandé).
export const getDeviseForEntity = cache(async (entityId: string): Promise<string> => {
  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    select: { devise: true },
  });
  return entity?.devise || (await getOrganizationDevise());
});

/** Formate un montant avec la devise fournie (à récupérer via getOrganizationDevise côté serveur, ou passée en prop côté client). */
export function formatMontant(value: number, devise: string): string {
  return `${value.toLocaleString("fr-FR")} ${devise}`;
}
