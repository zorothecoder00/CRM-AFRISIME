/**
 * Charge de travail JOURNALIÈRE du Planning personnel (cahier des charges
 * "Module Planning personnel" §15) — distinct de src/lib/workload.ts
 * (hebdomadaire, échelle organisation, basé sur Task.tempsEstimeHeures).
 * Ici : somme des durées des activités du jour, comparée à la capacité
 * journalière (capaciteHebdomadaireHeures / 5 jours ouvrés).
 */
export type DailyChargeEntry = { dateDebut: string; dateFin: string };

export type DailyCharge = {
  chargeHeures: number;
  capaciteHeures: number;
  tauxOccupation: number;
  heuresSupplementaires: number;
  enSurcharge: boolean;
};

const WORK_DAYS_PER_WEEK = 5;

/** Formatage court d'une durée décimale en heures — "7h" ou "7h30". */
export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export function computeDailyCapacity(capaciteHebdomadaireHeures: number): number {
  return capaciteHebdomadaireHeures / WORK_DAYS_PER_WEEK;
}

function parseHourMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

type DaySchedule = { heureDebut: string | null; heureFin: string | null; pauseDebut: string | null; pauseFin: string | null; type: string };

/**
 * §40 — si l'utilisateur a configuré un horaire pour ce jour précis
 * (UserWorkSchedule), l'utilise à la place du /5 uniforme de
 * computeDailyCapacity. ABSENCE vaut 0h disponible ce jour-là (pas de repli
 * silencieux sur la capacité hebdo) ; un jour non configuré ou sans ligne
 * active retombe sur computeDailyCapacity — aucune régression pour les
 * utilisateurs qui n'ont pas encore renseigné leurs horaires.
 *
 * §39 — `exception` (UserWorkScheduleException, dérogation à une date
 * précise) prime sur le gabarit hebdomadaire récurrent quand fournie.
 */
export function resolveDailyCapacity(
  schedule: DaySchedule | null,
  capaciteHebdomadaireHeures: number,
  exception: DaySchedule | null = null
): number {
  const effective = exception ?? schedule;
  if (!effective) return computeDailyCapacity(capaciteHebdomadaireHeures);
  if (effective.type === "ABSENCE") return 0;
  if (!effective.heureDebut || !effective.heureFin) return computeDailyCapacity(capaciteHebdomadaireHeures);

  let minutes = parseHourMinutes(effective.heureFin) - parseHourMinutes(effective.heureDebut);
  if (effective.pauseDebut && effective.pauseFin) {
    minutes -= Math.max(0, parseHourMinutes(effective.pauseFin) - parseHourMinutes(effective.pauseDebut));
  }
  return Math.max(0, minutes) / 60;
}

/**
 * §26bis — une Mission (ou toute activité) peut s'étaler sur plusieurs
 * jours ; sans ce plafonnement, une entrée entière (ex. 7 jours) comptait
 * pour sa durée totale dès qu'elle chevauchait le jour évalué, gonflant
 * massivement chargeHeures/tauxOccupation ("surcharge" à plusieurs milliers
 * de %) pour chaque jour qu'elle traverse. On ne compte que la portion de
 * l'entrée réellement comprise dans ce jour-là.
 */
export function computeDailyCharge(entries: DailyChargeEntry[], capaciteHeures: number, day: Date = new Date()): DailyCharge {
  const dayStartMs = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0).getTime();
  const dayEndMs = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999).getTime();

  const chargeHeures = entries.reduce((sum, e) => {
    const start = Math.max(new Date(e.dateDebut).getTime(), dayStartMs);
    const end = Math.min(new Date(e.dateFin).getTime(), dayEndMs);
    return sum + Math.max(0, end - start) / 3_600_000;
  }, 0);

  const tauxOccupation = capaciteHeures > 0 ? Math.round((chargeHeures / capaciteHeures) * 100) : 0;
  const heuresSupplementaires = Math.max(0, chargeHeures - capaciteHeures);

  return {
    chargeHeures: Math.round(chargeHeures * 10) / 10,
    capaciteHeures: Math.round(capaciteHeures * 10) / 10,
    tauxOccupation,
    heuresSupplementaires: Math.round(heuresSupplementaires * 10) / 10,
    enSurcharge: tauxOccupation > 100,
  };
}

export type PlanningHealthInputs = {
  totalActiveTaches: number;
  tachesNonPlanifiees: number;
  respectDesEcheances: number | null;
  tauxOccupation: number;
  tachesEnRetard: number;
  conflits: number;
  tachesReportees: number;
};

export type PlanningHealthCriterion = { key: string; label: string; score: number };
export type PlanningHealthBreakdown = { score: number; criteria: PlanningHealthCriterion[] };

/**
 * §43 « Planning Health » — moyenne non pondérée de 7 sous-scores (0-100
 * chacun), les 7 critères cités au cahier : tâches planifiées vs total,
 * respect des échéances (§35), écart à la surcharge, pénalité activités
 * non planifiées/inbox, pénalité tâches en retard, pénalité conflits de
 * planning (§42), pénalité tâches reportées aujourd'hui (§22, via
 * countReporteesToday — le déplacement est tracké depuis §47/logAudit).
 *
 * Détail des 7 sous-scores exposé pour que l'utilisateur comprenne d'où
 * vient le total (cahier de corrections UI/UX §9) — chaque critère reste
 * noté sur 100 (pondération égale), pas de barème /25 /20 /15... arbitraire
 * qui changerait silencieusement le calcul existant.
 */
export function computePlanningHealthBreakdown(inputs: PlanningHealthInputs): PlanningHealthBreakdown {
  const tachesPlanifieesScore =
    inputs.totalActiveTaches > 0
      ? ((inputs.totalActiveTaches - inputs.tachesNonPlanifiees) / inputs.totalActiveTaches) * 100
      : 100;
  const respectEcheancesScore = inputs.respectDesEcheances ?? 100;
  const surchargeScore = Math.max(0, 100 - Math.max(0, inputs.tauxOccupation - 100));
  const nonPlanifieesScore = Math.max(0, 100 - inputs.tachesNonPlanifiees * 10);
  const retardScore = Math.max(0, 100 - inputs.tachesEnRetard * 15);
  const conflitsScore = Math.max(0, 100 - inputs.conflits * 15);
  const reporteesScore = Math.max(0, 100 - inputs.tachesReportees * 10);

  const criteria: PlanningHealthCriterion[] = [
    { key: "planification", label: "Tâches planifiées", score: Math.round(tachesPlanifieesScore) },
    { key: "echeances", label: "Respect des échéances", score: Math.round(respectEcheancesScore) },
    { key: "surcharge", label: "Charge de travail", score: Math.round(surchargeScore) },
    { key: "nonPlanifiees", label: "Tâches non planifiées", score: Math.round(nonPlanifieesScore) },
    { key: "retards", label: "Retards", score: Math.round(retardScore) },
    { key: "conflits", label: "Conflits", score: Math.round(conflitsScore) },
    { key: "reportees", label: "Reports", score: Math.round(reporteesScore) },
  ];

  const moyenne = criteria.reduce((sum, c) => sum + c.score, 0) / criteria.length;
  return { score: Math.round(Math.max(0, Math.min(100, moyenne))), criteria };
}

export function computePlanningHealth(inputs: PlanningHealthInputs): number {
  return computePlanningHealthBreakdown(inputs).score;
}

const TIGHT_TRANSITION_MINUTES = 15;

/**
 * §27 — heuristique simple (pas d'API cartographique) : deux entrées
 * consécutives avec des lieux différents et un écart de moins de 15 min
 * laissent peu de temps pour se déplacer.
 */
export function detectTightTransition(
  prev: { lieu: string | null; dateFin: string },
  next: { lieu: string | null; dateDebut: string }
): boolean {
  if (!prev.lieu || !next.lieu || prev.lieu === next.lieu) return false;
  const gapMinutes = (new Date(next.dateDebut).getTime() - new Date(prev.dateFin).getTime()) / 60000;
  return gapMinutes >= 0 && gapMinutes < TIGHT_TRANSITION_MINUTES;
}
