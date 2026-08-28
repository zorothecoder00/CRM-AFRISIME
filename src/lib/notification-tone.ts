/**
 * §23 — classification des notifications en 4 tons (le document donne
 * l'exemple explicite : 🔴 Urgentes / 🟠 Importantes / 🔵 Information /
 * 🟢 Confirmation). Appliqué à l'ensemble des `NotificationType` de l'app
 * (pas seulement ceux du Planning personnel) puisque les notifications
 * sont une infrastructure partagée — un type non classé retombe sur INFO
 * plutôt que de faire échouer l'affichage.
 */
export type NotificationTone = "URGENT" | "IMPORTANT" | "INFO" | "CONFIRMATION";

export const NOTIFICATION_TONE_META: Record<NotificationTone, { label: string; emoji: string; className: string }> = {
  URGENT: { label: "Urgent", emoji: "🔴", className: "border-destructive/40 bg-destructive/10 text-destructive" },
  IMPORTANT: { label: "Important", emoji: "🟠", className: "border-warning/40 bg-warning/10 text-warning" },
  INFO: { label: "Info", emoji: "🔵", className: "border-info/40 bg-info/10 text-info" },
  CONFIRMATION: { label: "Confirmation", emoji: "🟢", className: "border-success/40 bg-success/10 text-success" },
};

const TONE_BY_TYPE: Record<string, NotificationTone> = {
  ECHEANCE_PROCHE: "URGENT",
  TACHE_CRITIQUE: "URGENT",
  RETARD: "URGENT",
  SURCHARGE: "URGENT",
  BUDGET_DEPASSE: "URGENT",
  DELEGATION_EN_RETARD: "URGENT",
  RAPPEL_ACTIVITE: "URGENT",

  MENTION: "IMPORTANT",
  CLIENT_SANS_SUIVI: "IMPORTANT",
  RELANCE_PLANIFIEE: "IMPORTANT",
  CONTRAT_EXPIRE: "IMPORTANT",
  DEMANDE_DISPONIBILITE: "IMPORTANT",
  DEMANDE_REAFFECTATION_TACHE: "IMPORTANT",
  DISPONIBILITE_MODIFIEE: "INFO",
  STATUT_MODIFIE: "INFO",
  CONGE_REORGANISATION: "IMPORTANT",

  NOUVELLE_TACHE: "INFO",
  MODIFICATION: "INFO",
  COMMENTAIRE: "INFO",
  REUNION_INVITATION: "INFO",
  ACTIVITE_INVITATION: "INFO",
  RAPPORT_HEBDOMADAIRE: "INFO",

  VALIDATION: "CONFIRMATION",
  DEMANDE_DISPONIBILITE_DECISION: "CONFIRMATION",
};

export function toneForNotificationType(type: string): NotificationTone {
  return TONE_BY_TYPE[type] ?? "INFO";
}
