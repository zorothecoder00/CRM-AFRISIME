import {
  NotebookPen,
  Ban,
  Lock,
  ListChecks,
  Users,
  CalendarClock,
  Phone,
  Briefcase,
  GraduationCap,
  Car,
  User,
  Coffee,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";

export type PersonalPlanningEntryType =
  | "NOTE"
  | "INDISPONIBLE"
  | "RESERVE"
  | "TACHE"
  | "REUNION"
  | "RENDEZ_VOUS"
  | "APPEL"
  | "MISSION"
  | "FORMATION"
  | "DEPLACEMENT"
  | "TRAVAIL_PERSONNEL"
  | "PAUSE"
  | "EVENEMENT";

export type PersonalPlanningEntryStatut =
  | "A_PLANIFIER"
  | "PLANIFIEE"
  | "EN_COURS"
  | "EN_ATTENTE"
  | "BLOQUEE"
  | "TERMINEE"
  | "ANNULEE";
export type PersonalPlanningPriorite = "CRITIQUE" | "HAUTE" | "NORMALE" | "FAIBLE";
export type PersonalPlanningRepetition = "AUCUNE" | "QUOTIDIENNE" | "HEBDOMADAIRE" | "MENSUELLE";
/** §24 (segment 3) — multi-sélection possible, voir Entry.rappels[]. */
export type PersonalPlanningRappel = "LE_JOUR_MEME" | "VEILLE" | "PERSONNALISE";
/** §22 — motif renseigné quand une activité passe au statut BLOQUEE. */
export type PersonalPlanningMotifBlocage =
  | "DEPENDANCE"
  | "INFORMATION_MANQUANTE"
  | "VALIDATION"
  | "FOURNISSEUR"
  | "MANQUE_RESSOURCES"
  | "AUTRE";

/** §9 — les 10 types d'activité proposés à la création, plus NOTE/INDISPONIBLE (conservés) et RESERVE (système, non sélectionnable). */
export const ENTRY_TYPE_META: Record<PersonalPlanningEntryType, { label: string; icon: LucideIcon; selectable: boolean }> = {
  TACHE: { label: "Tâche", icon: ListChecks, selectable: true },
  REUNION: { label: "Réunion", icon: Users, selectable: true },
  RENDEZ_VOUS: { label: "Rendez-vous", icon: CalendarClock, selectable: true },
  APPEL: { label: "Appel", icon: Phone, selectable: true },
  MISSION: { label: "Mission", icon: Briefcase, selectable: true },
  FORMATION: { label: "Formation", icon: GraduationCap, selectable: true },
  DEPLACEMENT: { label: "Déplacement", icon: Car, selectable: true },
  TRAVAIL_PERSONNEL: { label: "Travail personnel", icon: User, selectable: true },
  PAUSE: { label: "Pause", icon: Coffee, selectable: true },
  EVENEMENT: { label: "Événement", icon: PartyPopper, selectable: true },
  NOTE: { label: "Note personnelle", icon: NotebookPen, selectable: true },
  INDISPONIBLE: { label: "Indisponible", icon: Ban, selectable: true },
  RESERVE: { label: "Réservé (demande acceptée)", icon: Lock, selectable: false },
};

export const ENTRY_TYPE_OPTIONS = (Object.keys(ENTRY_TYPE_META) as PersonalPlanningEntryType[]).filter(
  (t) => ENTRY_TYPE_META[t].selectable
);

export const ENTRY_STATUT_LABELS: Record<PersonalPlanningEntryStatut, string> = {
  A_PLANIFIER: "À planifier",
  PLANIFIEE: "Planifiée",
  EN_COURS: "En cours",
  EN_ATTENTE: "En attente",
  BLOQUEE: "Bloquée",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
};

/** §6/§11 — bloc "Ma journée" et filtre priorité : 🔴 critique / 🟠 haute / 🟢 normale / ⚪ faible. */
export const ENTRY_PRIORITE_META: Record<PersonalPlanningPriorite, { label: string; emoji: string }> = {
  CRITIQUE: { label: "Critique", emoji: "🔴" },
  HAUTE: { label: "Haute", emoji: "🟠" },
  NORMALE: { label: "Normale", emoji: "🟢" },
  FAIBLE: { label: "Faible", emoji: "⚪" },
};

/** Ordre d'affichage du bloc "Ma journée" (§6) et des filtres (§11). */
export const ENTRY_PRIORITE_ORDER: PersonalPlanningPriorite[] = ["CRITIQUE", "HAUTE", "NORMALE", "FAIBLE"];

export const ENTRY_REPETITION_LABELS: Record<PersonalPlanningRepetition, string> = {
  AUCUNE: "Aucune",
  QUOTIDIENNE: "Quotidienne",
  HEBDOMADAIRE: "Hebdomadaire",
  MENSUELLE: "Mensuelle",
};

export const ENTRY_RAPPEL_LABELS: Record<PersonalPlanningRappel, string> = {
  LE_JOUR_MEME: "Le jour même",
  VEILLE: "La veille",
  PERSONNALISE: "Personnalisé",
};

export const ENTRY_RAPPEL_ORDER: PersonalPlanningRappel[] = ["LE_JOUR_MEME", "VEILLE", "PERSONNALISE"];

export const ENTRY_MOTIF_BLOCAGE_LABELS: Record<PersonalPlanningMotifBlocage, string> = {
  DEPENDANCE: "Dépendance",
  INFORMATION_MANQUANTE: "Information manquante",
  VALIDATION: "En attente de validation",
  FOURNISSEUR: "Fournisseur",
  MANQUE_RESSOURCES: "Manque de ressources",
  AUTRE: "Autre",
};
