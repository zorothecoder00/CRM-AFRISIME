import type { PersonalPlanningEntryRow } from "@/components/personal-planning/personal-planning-week";

/**
 * §25 — les Meeting existants (module Réunions, hors Planning personnel)
 * sont fusionnés en lecture seule dans les vues du planning personnel
 * plutôt que dupliqués sur PersonalPlanningEntry : compte rendu/décisions
 * restent gérés sur /reunions/[id], seule la plage horaire est affichée ici.
 */
export type MeetingLite = {
  id: string;
  titre: string;
  dateHeure: Date;
  lieu: string | null;
  statut: string;
};

const MEETING_DEFAULT_DURATION_MINUTES = 60;

export function meetingToEntryRow(m: MeetingLite): PersonalPlanningEntryRow {
  const dateFin = new Date(m.dateHeure.getTime() + MEETING_DEFAULT_DURATION_MINUTES * 60_000);
  return {
    id: `meeting-${m.id}`,
    titre: m.titre,
    notes: null,
    dateDebut: m.dateHeure.toISOString(),
    dateFin: dateFin.toISOString(),
    type: "REUNION",
    statut: m.statut === "TERMINEE" ? "TERMINEE" : m.statut === "ANNULEE" ? "ANNULEE" : "PLANIFIEE",
    motifBlocage: null,
    priorite: "NORMALE",
    lieu: m.lieu,
    projetId: null,
    tacheId: null,
    objectifId: null,
    participantIds: [],
    etiquettes: [],
    repetition: "AUCUNE",
    repetitionFin: null,
    rappels: [],
    rappelPersonnaliseDate: null,
    piecesJointes: [],
    missionDestination: null,
    missionBudget: null,
    missionMoyenTransport: null,
    missionHebergement: null,
    missionRapport: null,
    recurrenceGroupId: null,
    meetingHref: `/reunions/${m.id}`,
  };
}
