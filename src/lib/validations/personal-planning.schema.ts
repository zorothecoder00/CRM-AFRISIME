import { z } from "zod";

// ---- Planning personnel (notes/creneaux prives, distincts de Leave/Event) ----

const ENTRY_TYPES = [
  "NOTE",
  "INDISPONIBLE",
  "TACHE",
  "REUNION",
  "RENDEZ_VOUS",
  "APPEL",
  "MISSION",
  "FORMATION",
  "DEPLACEMENT",
  "TRAVAIL_PERSONNEL",
  "PAUSE",
  "EVENEMENT",
  "AUTRES",
] as const;

const ENTRY_STATUTS = ["A_PLANIFIER", "PLANIFIEE", "EN_COURS", "EN_ATTENTE", "BLOQUEE", "TERMINEE", "ANNULEE"] as const;
const ENTRY_PRIORITES = ["CRITIQUE", "HAUTE", "NORMALE", "FAIBLE"] as const;
const ENTRY_REPETITIONS = ["AUCUNE", "QUOTIDIENNE", "HEBDOMADAIRE", "MENSUELLE"] as const;
const ENTRY_RAPPELS = ["LE_JOUR_MEME", "VEILLE", "PERSONNALISE"] as const;
const ENTRY_MOTIFS_BLOCAGE = ["DEPENDANCE", "INFORMATION_MANQUANTE", "VALIDATION", "FOURNISSEUR", "MANQUE_RESSOURCES", "AUTRE"] as const;

// Garde-fou anti-emballement pour la generation d'occurrences (§9
// repetition) — au-dela, l'utilisateur doit re-planifier manuellement.
export const MAX_RECURRENCE_OCCURRENCES = 104;

const baseEntryFields = {
  titre: z.string().min(2, "Le titre est requis."),
  notes: z.string().optional(),
  dateDebut: z.string().min(1, "La date de début est requise."),
  dateFin: z.string().min(1, "La date de fin est requise."),
  type: z.enum(ENTRY_TYPES).optional().default("NOTE"),
  priorite: z.enum(ENTRY_PRIORITES).optional().default("NORMALE"),
  lieu: z.string().optional(),
  // §15 (cahier de corrections UI/UX) — quand renseigné avec un lieu, réserve
  // automatiquement un bloc "Déplacement" juste avant cette activité.
  dureeTrajetMinutes: z.coerce.number().int().min(0).max(480).optional(),
  projetId: z.string().optional(),
  tacheId: z.string().optional(),
  objectifId: z.string().optional(),
  participantIds: z.array(z.string()).optional().default([]),
  etiquettes: z.array(z.string()).optional().default([]),
  repetition: z.enum(ENTRY_REPETITIONS).optional().default("AUCUNE"),
  repetitionFin: z.string().optional(),
  rappels: z.array(z.enum(ENTRY_RAPPELS)).optional().default([]),
  rappelPersonnaliseDate: z.string().optional(),
  piecesJointes: z.array(z.string()).optional().default([]),
  // §26bis — utilisés seulement quand type = MISSION.
  missionDestination: z.string().optional(),
  missionBudget: z.string().optional(),
  missionMoyenTransport: z.string().optional(),
  missionHebergement: z.string().optional(),
  missionRapport: z.string().optional(),
};

function refineRappelPersonnalise<T extends { rappels: readonly string[]; rappelPersonnaliseDate?: string }>(data: T) {
  return !data.rappels.includes("PERSONNALISE") || !!data.rappelPersonnaliseDate;
}

export const createPersonalPlanningEntrySchema = z
  .object(baseEntryFields)
  .refine((data) => data.repetition === "AUCUNE" || !!data.repetitionFin, {
    message: "Une date de fin de répétition est requise.",
    path: ["repetitionFin"],
  })
  .refine(refineRappelPersonnalise, {
    message: "Une date de rappel personnalisé est requise.",
    path: ["rappelPersonnaliseDate"],
  });

export type CreatePersonalPlanningEntryInput = z.infer<typeof createPersonalPlanningEntrySchema>;

export const updatePersonalPlanningEntrySchema = z
  .object({
    id: z.string().min(1),
    ...baseEntryFields,
    type: z.enum(ENTRY_TYPES),
    priorite: z.enum(ENTRY_PRIORITES),
    statut: z.enum(ENTRY_STATUTS),
    motifBlocage: z.enum(ENTRY_MOTIFS_BLOCAGE).optional(),
  })
  .refine((data) => data.repetition === "AUCUNE" || !!data.repetitionFin, {
    message: "Une date de fin de répétition est requise.",
    path: ["repetitionFin"],
  })
  .refine(refineRappelPersonnalise, {
    message: "Une date de rappel personnalisé est requise.",
    path: ["rappelPersonnaliseDate"],
  })
  .refine((data) => data.statut !== "BLOQUEE" || !!data.motifBlocage, {
    message: "Un motif de blocage est requis.",
    path: ["motifBlocage"],
  });

export type UpdatePersonalPlanningEntryInput = z.infer<typeof updatePersonalPlanningEntrySchema>;

export const deletePersonalPlanningEntrySchema = z.object({ id: z.string().min(1) });

export type DeletePersonalPlanningEntryInput = z.infer<typeof deletePersonalPlanningEntrySchema>;

export const deletePersonalPlanningEntrySeriesSchema = z.object({ recurrenceGroupId: z.string().min(1) });

export type DeletePersonalPlanningEntrySeriesInput = z.infer<typeof deletePersonalPlanningEntrySeriesSchema>;

// ---- Drag & drop (§13/§14) ----

export const scheduleInboxTaskSchema = z.object({
  taskId: z.string().min(1),
  dateDebut: z.string().min(1),
  /** Minutes — 60 par défaut (§13 : la tâche glissée n'a pas de durée propre). */
  dureeMinutes: z.number().int().positive().optional().default(60),
});

export type ScheduleInboxTaskInput = z.infer<typeof scheduleInboxTaskSchema>;

export const suggestScheduleSlotSchema = z.object({
  taskId: z.string().min(1),
  /** ISO — recherche à partir de cette date (permet "proposer un autre créneau" en repartant après la précédente proposition). */
  after: z.string().min(1).optional(),
});

export type SuggestScheduleSlotInput = z.infer<typeof suggestScheduleSlotSchema>;

export const movePersonalPlanningEntrySchema = z.object({
  id: z.string().min(1),
  newDateDebut: z.string().min(1),
});

export type MovePersonalPlanningEntryInput = z.infer<typeof movePersonalPlanningEntrySchema>;

// ---- Suggestions de réorganisation (§16, version légère) ----

export const reorganizeOverloadedDaySchema = z.object({
  date: z.string().min(1),
  strategy: z.enum(["REPORTER", "ETALER", "REDUIRE"]),
});

export type ReorganizeOverloadedDayInput = z.infer<typeof reorganizeOverloadedDaySchema>;

/** §16 option 4 — "demander une réaffectation" depuis l'assistant de surcharge. */
export const requestTaskReassignmentSchema = z.object({
  entryId: z.string().min(1),
  targetUserId: z.string().min(1, "Un destinataire est requis."),
});

export type RequestTaskReassignmentInput = z.infer<typeof requestTaskReassignmentSchema>;

// ---- Vue "À planifier" étendue (§29) ----

export const reassignInboxTaskSchema = z.object({
  taskId: z.string().min(1),
  newResponsableId: z.string().min(1),
});

export type ReassignInboxTaskInput = z.infer<typeof reassignInboxTaskSchema>;

/** Transforme une activité de capture rapide (sans tacheId) en vraie Tâche dans un projet (§29/§30). */
export const promoteEntryToTaskSchema = z.object({
  entryId: z.string().min(1),
  projectId: z.string().min(1),
});

export type PromoteEntryToTaskInput = z.infer<typeof promoteEntryToTaskSchema>;

export const getAvailabilitySchema = z.object({
  userId: z.string().min(1),
  dateDebut: z.string().min(1),
  dateFin: z.string().min(1),
});

export type GetAvailabilityInput = z.infer<typeof getAvailabilitySchema>;

// ---- Demande de creneau (AvailabilityRequest) ----

export const createAvailabilityRequestSchema = z.object({
  targetUserId: z.string().min(1, "Un destinataire est requis."),
  titre: z.string().min(2, "Le titre est requis."),
  message: z.string().optional(),
  dateDebut: z.string().min(1, "La date de début est requise."),
  dateFin: z.string().min(1, "La date de fin est requise."),
});

export type CreateAvailabilityRequestInput = z.infer<typeof createAvailabilityRequestSchema>;

export const decideAvailabilityRequestSchema = z.object({
  requestId: z.string().min(1),
  statut: z.enum(["ACCEPTEE", "REFUSEE"]),
  motifRefus: z.string().optional(),
});

export type DecideAvailabilityRequestInput = z.infer<typeof decideAvailabilityRequestSchema>;

export const cancelAvailabilityRequestSchema = z.object({ requestId: z.string().min(1) });

export type CancelAvailabilityRequestInput = z.infer<typeof cancelAvailabilityRequestSchema>;

// ---- Bilan de fin de journée — notes personnelles (§22) ----

export const saveDailyReviewNotesSchema = z.object({
  date: z.string().min(1),
  notes: z.string().max(4000, "4000 caractères maximum.").optional(),
});

export type SaveDailyReviewNotesInput = z.infer<typeof saveDailyReviewNotesSchema>;
