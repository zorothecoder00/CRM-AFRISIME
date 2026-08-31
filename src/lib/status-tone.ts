import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "@/components/ui/badge";
import type { CardAccent } from "@/components/ui/card";

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

/** Les seules teintes que toneForStatus/toneForPriority produisent reellement. */
type StatusTone = "secondary" | "destructive" | "success" | "warning" | "info";

function toCardAccent(tone: StatusTone): CardAccent {
  return tone === "secondary" ? "none" : tone;
}

/**
 * Deduit une teinte de Badge a partir d'une cle de statut FR (ex: TERMINEE,
 * EN_COURS, BLOQUEE...). Les libelles varient legerement d'un module a
 * l'autre (taches, projets, objectifs, reunions) mais suivent un vocabulaire
 * commun, d'ou une correspondance par mots-cles plutot qu'une table exhaustive.
 */
export function toneForStatus(status: string): BadgeTone {
  const s = status.toUpperCase();
  if (s.includes("BLOQUE") || s.includes("RETARD") || s === "NON_ATTEINT") return "destructive";
  if (s.includes("PAUSE") || s.includes("EN_ATTENTE")) return "warning";
  if (s.includes("TERMIN") || s === "ATTEINT") return "success";
  if (s.includes("COURS") || s.includes("REVISION")) return "info";
  return "secondary";
}

/** Idem pour les niveaux de priorite (TRES_HAUTE, HAUTE, MOYENNE, NORMALE, BASSE, FAIBLE). */
export function toneForPriority(priority: string): BadgeTone {
  const p = priority.toUpperCase();
  if (p.includes("TRES_HAUTE") || p.includes("CRITIQUE")) return "destructive";
  if (p.includes("HAUTE") || p.includes("IMPORTANTE")) return "warning";
  if (p.includes("MOYENNE") || p.includes("NORMALE")) return "info";
  return "secondary";
}

/** Meme mapping que toneForStatus, pour l'accent (barre + fond teinte) de Card. */
export function accentForStatus(status: string): CardAccent {
  return toCardAccent(toneForStatus(status) as StatusTone);
}

/** Meme mapping que toneForPriority, pour l'accent de Card. */
export function accentForPriority(priority: string): CardAccent {
  return toCardAccent(toneForPriority(priority) as StatusTone);
}

/**
 * Etapes du pipeline CRM (NOUVEAU/QUALIFICATION/PROPOSITION/NEGOCIATION/
 * GAGNEE/PERDUE) : vocabulaire propre au CRM, ne recoupe pas les mots-cles
 * de toneForStatus (une simple correspondance table plutot que des mots-cles).
 */
const OPPORTUNITY_TONES: Record<string, StatusTone> = {
  NOUVEAU: "secondary",
  QUALIFICATION: "info",
  PROPOSITION: "info",
  NEGOCIATION: "warning",
  GAGNEE: "success",
  PERDUE: "destructive",
};

export function toneForOpportunityStatus(status: string): BadgeTone {
  return OPPORTUNITY_TONES[status.toUpperCase()] ?? "secondary";
}

export function accentForOpportunityStatus(status: string): CardAccent {
  return toCardAccent(toneForOpportunityStatus(status) as StatusTone);
}

/** Type de contact CRM : distingue au moins client (succes) de prospect (info) dans la grille. */
const CONTACT_TYPE_TONES: Record<string, StatusTone> = {
  CLIENT: "success",
  PROSPECT: "info",
  PARTENAIRE: "info",
  FOURNISSEUR: "warning",
};

export function accentForContactType(type: string): CardAccent {
  return toCardAccent(CONTACT_TYPE_TONES[type.toUpperCase()] ?? "secondary");
}

/** Idem pour le type d'organisation. */
const ORGANIZATION_TYPE_TONES: Record<string, StatusTone> = {
  PARTENAIRE: "info",
  FOURNISSEUR: "warning",
  INVESTISSEUR: "success",
};

export function accentForOrganizationType(type: string): CardAccent {
  return toCardAccent(ORGANIZATION_TYPE_TONES[type.toUpperCase()] ?? "secondary");
}

/** Statut d'une demande administrative (EN_ATTENTE/APPROUVEE/REJETEE). */
const ADMIN_REQUEST_TONES: Record<string, StatusTone> = {
  EN_ATTENTE: "warning",
  APPROUVEE: "success",
  REJETEE: "destructive",
};

export function toneForAdminRequestStatus(status: string): BadgeTone {
  return ADMIN_REQUEST_TONES[status.toUpperCase()] ?? "secondary";
}

export function accentForAdminRequestStatus(status: string): CardAccent {
  return toCardAccent(toneForAdminRequestStatus(status) as StatusTone);
}

/** Statut d'une évaluation de performance (BROUILLON/SOUMISE/ACCUSE_RECEPTION). */
const EVALUATION_TONES: Record<string, StatusTone> = {
  BROUILLON: "secondary",
  SOUMISE: "warning",
  ACCUSE_RECEPTION: "success",
};

export function toneForEvaluationStatus(status: string): BadgeTone {
  return EVALUATION_TONES[status.toUpperCase()] ?? "secondary";
}

export function accentForEvaluationStatus(status: string): CardAccent {
  return toCardAccent(toneForEvaluationStatus(status) as StatusTone);
}

/** Statut d'un article de la base de connaissances (BROUILLON/PUBLIE). */
const ARTICLE_TONES: Record<string, StatusTone> = {
  BROUILLON: "secondary",
  PUBLIE: "success",
};

export function toneForArticleStatus(status: string): BadgeTone {
  return ARTICLE_TONES[status.toUpperCase()] ?? "secondary";
}

export function accentForArticleStatus(status: string): CardAccent {
  return toCardAccent(toneForArticleStatus(status) as StatusTone);
}

/** Statut d'un courrier (A_TRAITER/EN_COURS/TRAITE/ARCHIVE). */
const COURRIER_TONES: Record<string, StatusTone> = {
  A_TRAITER: "warning",
  EN_COURS: "info",
  TRAITE: "success",
  ARCHIVE: "secondary",
};

export function toneForCourrierStatus(status: string): BadgeTone {
  return COURRIER_TONES[status.toUpperCase()] ?? "secondary";
}

export function accentForCourrierStatus(status: string): CardAccent {
  return toCardAccent(toneForCourrierStatus(status) as StatusTone);
}

/** Statut d'un risque projet (IDENTIFIE/EN_TRAITEMENT/MAITRISE/SURVENU/CLOS). */
const RISK_TONES: Record<string, StatusTone> = {
  IDENTIFIE: "secondary",
  EN_TRAITEMENT: "info",
  MAITRISE: "success",
  SURVENU: "destructive",
  CLOS: "secondary",
};

export function toneForRiskStatus(status: string): BadgeTone {
  return RISK_TONES[status.toUpperCase()] ?? "secondary";
}

/** Statut d'un jalon projet (A_VENIR/ATTEINT/MANQUE). */
const MILESTONE_TONES: Record<string, StatusTone> = {
  A_VENIR: "secondary",
  ATTEINT: "success",
  MANQUE: "destructive",
};

export function toneForMilestoneStatus(status: string): BadgeTone {
  return MILESTONE_TONES[status.toUpperCase()] ?? "secondary";
}

/** Statut d'un livrable projet (A_FAIRE/EN_COURS/SOUMIS/VALIDE/REJETE). */
const DELIVERABLE_TONES: Record<string, StatusTone> = {
  A_FAIRE: "secondary",
  EN_COURS: "info",
  SOUMIS: "warning",
  VALIDE: "success",
  REJETE: "destructive",
};

export function toneForDeliverableStatus(status: string): BadgeTone {
  return DELIVERABLE_TONES[status.toUpperCase()] ?? "secondary";
}

/** Criticite d'un risque organisationnel (FAIBLE/MODERE/IMPORTANT/ELEVE/CRITIQUE, echelle a 5 crans issue de la matrice probabilite x impact). */
const CRITICITE_TONES: Record<string, StatusTone> = {
  FAIBLE: "secondary",
  MODERE: "info",
  IMPORTANT: "warning",
  ELEVE: "destructive",
  CRITIQUE: "destructive",
};

export function toneForCriticite(criticite: string): BadgeTone {
  return CRITICITE_TONES[criticite.toUpperCase()] ?? "secondary";
}

export function accentForCriticite(criticite: string): CardAccent {
  return toCardAccent(CRITICITE_TONES[criticite.toUpperCase()] ?? "secondary");
}

/**
 * Quadrant de la matrice Influence x Intérêt (Project Studio §9, Stakeholder
 * Analysis) — calculé à la volée depuis influence/intérêt existants plutôt
 * que stocké, pour ne jamais désynchroniser matrice et niveaux affichés.
 * FAIBLE/MOYEN/ELEVE se lit "MOYEN" comme fort côté intérêt (seul FAIBLE
 * compte comme faible), même logique que toneForNiveau.
 */
export function stakeholderQuadrant(influence: string, interet: string): string {
  const forteInfluence = influence.toUpperCase() !== "FAIBLE";
  const fortInteret = interet.toUpperCase() !== "FAIBLE";
  if (forteInfluence && fortInteret) return "Gérer de près";
  if (forteInfluence && !fortInteret) return "Satisfaire";
  if (!forteInfluence && fortInteret) return "Informer";
  return "Surveiller";
}

/** Statut d'une idée de projet (Project Studio §4). */
const PROJECT_IDEA_TONES: Record<string, StatusTone> = {
  IDEE: "secondary",
  A_ETUDIER: "info",
  ETUDE_FAISABILITE: "info",
  APPROUVEE: "warning",
  EN_CONCEPTION: "warning",
  PROJET_CREE: "success",
  REJETEE: "destructive",
  ARCHIVEE: "secondary",
};

export function toneForProjectIdeaStatus(status: string): BadgeTone {
  return PROJECT_IDEA_TONES[status.toUpperCase()] ?? "secondary";
}

/** Statut d'un financement (Project Studio §10). */
const FINANCEMENT_TONES: Record<string, StatusTone> = {
  IDENTIFIE: "secondary",
  SOLLICITE: "info",
  RECHERCHE: "secondary",
  NEGOCIATION: "warning",
  APPROUVE: "warning",
  OBTENU: "success",
  REFUSE: "destructive",
  ANNULE: "secondary",
};

export function toneForFinancementStatut(status: string): BadgeTone {
  return FINANCEMENT_TONES[status.toUpperCase()] ?? "secondary";
}

/** Statut d'une mission d'audit interne (PREPARATION/COLLECTE/VERIFICATION/RAPPORT/CLOTUREE). */
const AUDIT_MISSION_TONES: Record<string, StatusTone> = {
  PREPARATION: "secondary",
  COLLECTE: "info",
  VERIFICATION: "warning",
  RAPPORT: "warning",
  CLOTUREE: "success",
};

export function toneForAuditMissionStatus(status: string): BadgeTone {
  return AUDIT_MISSION_TONES[status.toUpperCase()] ?? "secondary";
}

/** Statut d'un constat d'audit (OUVERT/EN_COURS/TRAITE/CLOS). */
const AUDIT_FINDING_TONES: Record<string, StatusTone> = {
  OUVERT: "destructive",
  EN_COURS: "warning",
  TRAITE: "info",
  CLOS: "success",
};

export function toneForAuditFindingStatus(status: string): BadgeTone {
  return AUDIT_FINDING_TONES[status.toUpperCase()] ?? "secondary";
}

/** Statut d'un congé (EN_ATTENTE/APPROUVE/REFUSE). */
const LEAVE_TONES: Record<string, StatusTone> = {
  EN_ATTENTE: "warning",
  APPROUVE: "success",
  REFUSE: "destructive",
};

export function toneForLeaveStatus(status: string): BadgeTone {
  return LEAVE_TONES[status.toUpperCase()] ?? "secondary";
}

/**
 * Niveau generique FAIBLE/MOYEN(NE)/ELEVE(E) — reutilise pour la probabilite
 * et l'impact d'un risque, ainsi que l'influence et l'interet d'une partie
 * prenante : meme echelle a 3 crans, plus le niveau est haut plus la teinte
 * doit attirer l'attention.
 */
export function toneForNiveau(niveau: string): BadgeTone {
  const n = niveau.toUpperCase();
  if (n.includes("FAIBLE")) return "secondary";
  if (n.includes("ELEV")) return "destructive";
  return "warning";
}
