import type { PersonalPlanningEntryRow } from "@/components/personal-planning/personal-planning-week";

/** Champs minimum attendus depuis une requête PersonalPlanningEntry avec `include: { participants: { select: { userId: true } } }`. */
type EntryWithParticipants = {
  id: string;
  titre: string;
  notes: string | null;
  dateDebut: Date;
  dateFin: Date;
  type: PersonalPlanningEntryRow["type"];
  statut: PersonalPlanningEntryRow["statut"];
  motifBlocage: PersonalPlanningEntryRow["motifBlocage"];
  priorite: PersonalPlanningEntryRow["priorite"];
  lieu: string | null;
  projetId: string | null;
  tacheId: string | null;
  objectifId: string | null;
  participants: { userId: string }[];
  repetition: PersonalPlanningEntryRow["repetition"];
  repetitionFin: Date | null;
  rappels: PersonalPlanningEntryRow["rappels"];
  rappelPersonnaliseDate: Date | null;
  piecesJointes: string[];
  missionDestination: string | null;
  missionBudget: { toString(): string } | null;
  missionMoyenTransport: string | null;
  missionHebergement: string | null;
  missionRapport: string | null;
  recurrenceGroupId: string | null;
  // §34 — présent seulement si la requête l'inclut (voir
  // TACHE_DEPENDENCIES_INCLUDE ci-dessous) ; undefined sinon (todayEntries
  // n'a pas besoin de ce coût de requête supplémentaire).
  tache?: { dependsOn: { dependsOnTask: { titre: string; statut: string } }[] } | null;
};

/** Champ `select` Prisma à ajouter sur `tache` pour peupler `blockedByTitre` (§34) — réutilisé par les pages qui affichent ce badge. */
export const TACHE_DEPENDENCIES_SELECT = {
  dependsOn: { select: { dependsOnTask: { select: { titre: true, statut: true } } } },
} as const;

/** Convertit une PersonalPlanningEntry brute (Prisma) en ligne sérialisable pour les composants client — partagé entre /planning-personnel et /ma-journee. */
export function toPersonalPlanningEntryRow(e: EntryWithParticipants, tagsByEntry: Map<string, string[]>): PersonalPlanningEntryRow {
  return {
    id: e.id,
    titre: e.titre,
    notes: e.notes,
    dateDebut: e.dateDebut.toISOString(),
    dateFin: e.dateFin.toISOString(),
    type: e.type,
    statut: e.statut,
    motifBlocage: e.motifBlocage,
    priorite: e.priorite,
    lieu: e.lieu,
    projetId: e.projetId,
    tacheId: e.tacheId,
    objectifId: e.objectifId,
    participantIds: e.participants.map((p) => p.userId),
    etiquettes: tagsByEntry.get(e.id) ?? [],
    repetition: e.repetition,
    repetitionFin: e.repetitionFin ? e.repetitionFin.toISOString() : null,
    rappels: e.rappels,
    rappelPersonnaliseDate: e.rappelPersonnaliseDate ? e.rappelPersonnaliseDate.toISOString() : null,
    piecesJointes: e.piecesJointes,
    missionDestination: e.missionDestination,
    missionBudget: e.missionBudget ? e.missionBudget.toString() : null,
    missionMoyenTransport: e.missionMoyenTransport,
    missionHebergement: e.missionHebergement,
    missionRapport: e.missionRapport,
    recurrenceGroupId: e.recurrenceGroupId,
    blockedByTitre: e.tache?.dependsOn.find((d) => d.dependsOnTask.statut !== "TERMINEE")?.dependsOnTask.titre ?? null,
  };
}
