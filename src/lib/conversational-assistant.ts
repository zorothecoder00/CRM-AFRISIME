import { prisma } from "@/lib/prisma";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

// Voice & Conversational Interface (cahier des charges V3.0 §41) —
// "prévoir l'architecture pour une interaction vocale". La reconnaissance
// vocale elle-même est déléguée à l'API navigateur SpeechRecognition (Web
// Speech API, native Chrome/Edge, aucune clé requise — voir
// conversational-assistant-bar.tsx) : ce module ne fait que l'analyse du
// texte obtenu (dicté ou tapé), par des heuristiques déterministes (mêmes
// principes que globalSearch/skills-intelligence — pas de vrai NLU/LLM,
// aucune clé API disponible dans cette instance). "Les actions sensibles
// devront demander confirmation" : toute intention d'écriture (ex. créer
// une tâche) est retournée comme *proposition* non exécutée — l'exécution
// passe par une action serveur distincte, appelée uniquement après
// confirmation explicite côté client (voir executeConfirmedAction).

export type AssistantIntent =
  | { type: "RENDEZ_VOUS"; when: "aujourd'hui" | "demain" }
  | { type: "PROJETS_CRITIQUES" }
  | { type: "CREER_TACHE_PROPOSAL"; responsableNom: string; titre: string }
  | { type: "INCONNU"; texte: string };

const RDV_REGEX = /rendez.?vous|réunions?|planning|agenda/i;
const PROJETS_CRITIQUES_REGEX = /projets?\s+critiques?/i;
const CREER_TACHE_REGEX = /cr[ée]e?\s+une\s+t[âa]che\s+pour\s+(.+?)\s+concernant\s+(.+)/i;

export function parseIntent(texte: string): AssistantIntent {
  const t = texte.trim();

  const creerTache = t.match(CREER_TACHE_REGEX);
  if (creerTache) {
    return { type: "CREER_TACHE_PROPOSAL", responsableNom: creerTache[1].trim(), titre: creerTache[2].trim().replace(/[.?!]+$/, "") };
  }

  if (PROJETS_CRITIQUES_REGEX.test(t)) {
    return { type: "PROJETS_CRITIQUES" };
  }

  if (RDV_REGEX.test(t)) {
    return { type: "RENDEZ_VOUS", when: /demain/i.test(t) ? "demain" : "aujourd'hui" };
  }

  return { type: "INCONNU", texte: t };
}

// Role-Based AI (cahier des charges V3.0 §52) — "L'IA doit également
// s'adapter au rôle." Le moteur d'intention ci-dessus reste le même pour
// tous (même logique déterministe) ; ce qui s'adapte est le CADRAGE
// présenté à l'utilisateur (raccourcis suggérés vers les autres modules
// "IA" déjà construits — Conseiller stratégique §9, Orchestrateur §16,
// Décisions §37-38, prédictions §11-14 — plutôt que 6 moteurs séparés à
// maintenir).
export type AiRoleFlavor = { label: string; description: string; suggestions: { label: string; href: string }[] };

export const AI_ROLE_FLAVORS: Record<string, AiRoleFlavor> = {
  DIRECTEUR_GENERAL: {
    label: "IA stratégique",
    description: "Analyse de la performance globale, scénarios, recommandations de décision.",
    suggestions: [
      { label: "Conseiller stratégique", href: "/conseiller-strategique" },
      { label: "Executive Simulation Room", href: "/salle-de-simulation" },
      { label: "Feuille de route de transformation", href: "/feuille-de-route-transformation" },
    ],
  },
  DIRECTEUR: {
    label: "IA de pilotage",
    description: "Suivi de la performance, alertes précoces, benchmarking.",
    suggestions: [
      { label: "Centre de commande", href: "/centre-de-commande" },
      { label: "Prédictions", href: "/predictions" },
      { label: "Benchmarking", href: "/benchmarking" },
    ],
  },
  CHEF_DEPARTEMENT: {
    label: "IA de pilotage",
    description: "Suivi de la charge et des risques du département.",
    suggestions: [
      { label: "Niveaux de pilotage", href: "/pilotage" },
      { label: "Charge de travail", href: "/charge-de-travail" },
    ],
  },
  MANAGER: {
    label: "IA de coordination",
    description: "Coordination d'équipe, charge de travail, échéances.",
    suggestions: [
      { label: "Charge de travail", href: "/charge-de-travail" },
      { label: "Orchestrateur d'agents", href: "/orchestrateur-ia" },
    ],
  },
  CHEF_PROJET: {
    label: "IA d'exécution",
    description: "Création de tâches, suivi des projets et risques.",
    suggestions: [
      { label: "Dépendances", href: "/dependances" },
      { label: "Décisions du projet", href: "/decisions" },
    ],
  },
  RESPONSABLE: {
    label: "IA d'exécution",
    description: "Suivi des projets, tâches et réunions dont vous êtes responsable.",
    suggestions: [{ label: "Mes tâches", href: "/taches" }],
  },
  COLLABORATEUR: {
    label: "IA personnelle",
    description: "Votre journée : priorités, réunions, messages.",
    suggestions: [{ label: "Mon tableau de bord", href: "/dashboard" }],
  },
  CONSULTANT_EXTERNE: {
    label: "IA personnelle",
    description: "Suivi de vos missions et échéances.",
    suggestions: [{ label: "Mes tâches", href: "/taches" }],
  },
  PRESTATAIRE: {
    label: "IA personnelle",
    description: "Suivi de vos missions et échéances.",
    suggestions: [{ label: "Mes tâches", href: "/taches" }],
  },
};

export function getAiRoleFlavor(roleKey: string | undefined): AiRoleFlavor {
  return (
    (roleKey && AI_ROLE_FLAVORS[roleKey]) || {
      label: "IA générale",
      description: "Posez une question ou dictez une commande.",
      suggestions: [],
    }
  );
}

export type AssistantResponseItem = { label: string; sublabel?: string; href?: string };
export type AssistantResponse = { message: string; items: AssistantResponseItem[] };

/** Exécute les intentions de LECTURE directement (aucune confirmation nécessaire). */
export async function answerReadIntent(
  intent: AssistantIntent,
  userId: string,
  permissions: string[]
): Promise<AssistantResponse> {
  if (intent.type === "RENDEZ_VOUS") {
    if (!hasPermission(permissions, PERMISSIONS.MEETING_READ)) {
      return { message: "Vous n'avez pas accès aux réunions.", items: [] };
    }
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    if (intent.when === "demain") start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const meetings = await prisma.meeting.findMany({
      where: {
        dateHeure: { gte: start, lt: end },
        participants: { some: { userId } },
      },
      orderBy: { dateHeure: "asc" },
      select: { id: true, titre: true, dateHeure: true },
    });

    return {
      message:
        meetings.length === 0
          ? `Aucun rendez-vous ${intent.when}.`
          : `${meetings.length} rendez-vous ${intent.when} :`,
      items: meetings.map((m) => ({
        label: m.titre,
        sublabel: m.dateHeure.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        href: `/reunions/${m.id}`,
      })),
    };
  }

  if (intent.type === "PROJETS_CRITIQUES") {
    if (!hasPermission(permissions, PERMISSIONS.PROJECT_READ)) {
      return { message: "Vous n'avez pas accès aux projets.", items: [] };
    }
    const projects = await prisma.project.findMany({
      where: { priorite: "CRITIQUE", statut: { in: ["PLANIFIE", "EN_COURS"] } },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { id: true, nom: true, avancement: true },
    });

    return {
      message: projects.length === 0 ? "Aucun projet critique actif." : `${projects.length} projet(s) critique(s) :`,
      items: projects.map((p) => ({ label: p.nom, sublabel: `${p.avancement}% d'avancement`, href: `/projets/${p.id}` })),
    };
  }

  return {
    message: "Je n'ai pas compris cette demande. Essayez « mes rendez-vous demain », « projets critiques », ou « crée une tâche pour X concernant Y ».",
    items: [],
  };
}

/** Résout le nom de responsable dicté/tapé en un User réel (correspondance approchée sur le prénom/nom). */
export async function resolveUserByName(nom: string): Promise<{ id: string; name: string } | null> {
  const users = await prisma.user.findMany({
    where: { isActive: true, name: { contains: nom, mode: "insensitive" } },
    select: { id: true, name: true },
    take: 5,
  });
  return users[0] ?? null;
}
