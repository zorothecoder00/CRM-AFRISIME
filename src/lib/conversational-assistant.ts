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
