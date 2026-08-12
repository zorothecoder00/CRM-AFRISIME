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
  if (s.includes("PAUSE")) return "warning";
  if (s.includes("TERMIN") || s === "ATTEINT") return "success";
  if (s.includes("COURS") || s.includes("REVISION")) return "info";
  return "secondary";
}

/** Idem pour les niveaux de priorite (TRES_HAUTE, HAUTE, MOYENNE, BASSE). */
export function toneForPriority(priority: string): BadgeTone {
  const p = priority.toUpperCase();
  if (p.includes("TRES_HAUTE") || p.includes("CRITIQUE")) return "destructive";
  if (p.includes("HAUTE")) return "warning";
  if (p.includes("MOYENNE")) return "info";
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
