import { addDays, nextDay, type Day } from "date-fns";
import type { PersonalPlanningEntryType } from "@/lib/personal-planning-types";

/**
 * §30 « Capture rapide » — reconnaissance de date/heure/type par règles
 * simples sur du texte libre en français, volontairement pas un LLM (pas de
 * clé API, cf. mémoire projet). Couvre les cas de l'exemple du cahier des
 * charges (« Appeler fournisseur demain matin ») ; tout le reste (titre,
 * date, période) reste éditable par l'utilisateur avant confirmation.
 */
export type QuickCaptureProposal = {
  titre: string;
  type: PersonalPlanningEntryType;
  dateDebut: Date;
};

const WEEKDAYS: Record<string, Day> = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
};

const PERIOD_HOURS: { pattern: RegExp; hour: number }[] = [
  { pattern: /\bmatin\b/i, hour: 9 },
  { pattern: /\bmidi\b/i, hour: 12 },
  { pattern: /\bapr[eè]s[-\s]midi\b/i, hour: 14 },
  { pattern: /\bsoir\b/i, hour: 18 },
];

const TYPE_KEYWORDS: { pattern: RegExp; type: PersonalPlanningEntryType }[] = [
  { pattern: /\bappel(er)?\b/i, type: "APPEL" },
  { pattern: /\br[ée]union\b/i, type: "REUNION" },
  { pattern: /\brendez-vous\b|\brdv\b/i, type: "RENDEZ_VOUS" },
  { pattern: /\bmission\b/i, type: "MISSION" },
  { pattern: /\bformation\b/i, type: "FORMATION" },
  { pattern: /\bd[ée]placement\b/i, type: "DEPLACEMENT" },
  { pattern: /\bpause\b/i, type: "PAUSE" },
];

function stripMatch(text: string, match: RegExpMatchArray): string {
  return (text.slice(0, match.index) + text.slice((match.index ?? 0) + match[0].length)).replace(/\s{2,}/g, " ").trim();
}

export function parseQuickCapture(text: string, now: Date = new Date()): QuickCaptureProposal {
  let remaining = text.trim();
  let date = new Date(now);
  date.setHours(9, 0, 0, 0);

  const apresDemainMatch = remaining.match(/\bapr[eè]s-demain\b/i);
  const demainMatch = !apresDemainMatch && remaining.match(/\bdemain\b/i);
  const aujourdhuiMatch = !apresDemainMatch && !demainMatch && remaining.match(/\baujourd['’]?hui\b/i);
  const weekdayMatch = !apresDemainMatch && !demainMatch && !aujourdhuiMatch && remaining.match(/\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/i);

  if (apresDemainMatch) {
    date = addDays(now, 2);
    remaining = stripMatch(remaining, apresDemainMatch);
  } else if (demainMatch) {
    date = addDays(now, 1);
    remaining = stripMatch(remaining, demainMatch);
  } else if (aujourdhuiMatch) {
    date = new Date(now);
    remaining = stripMatch(remaining, aujourdhuiMatch);
  } else if (weekdayMatch) {
    date = nextDay(now, WEEKDAYS[weekdayMatch[1].toLowerCase()]);
    remaining = stripMatch(remaining, weekdayMatch);
  }
  date.setHours(9, 0, 0, 0);

  for (const { pattern, hour } of PERIOD_HOURS) {
    const m = remaining.match(pattern);
    if (m) {
      date.setHours(hour, 0, 0, 0);
      remaining = stripMatch(remaining, m);
      break;
    }
  }

  let type: PersonalPlanningEntryType = "TACHE";
  for (const { pattern, type: t } of TYPE_KEYWORDS) {
    if (pattern.test(remaining) || pattern.test(text)) {
      type = t;
      break;
    }
  }

  const titre = remaining.length > 0 ? remaining.charAt(0).toUpperCase() + remaining.slice(1) : text.trim();

  return { titre, type, dateDebut: date };
}
