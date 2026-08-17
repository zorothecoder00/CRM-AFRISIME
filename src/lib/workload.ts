const ACTIVE_TASK_STATUSES = new Set(["A_FAIRE", "EN_COURS", "EN_REVISION", "BLOQUEE"]);
const SURCHARGE_THRESHOLD = 100;
// V2.2 §10 — taxonomie à 4 niveaux, en plus du flag binaire enSurcharge déjà
// utilisé ailleurs (ex. alerte hebdomadaire du cron). Pas de seuil explicite
// dans le cahier des charges : bornes usuelles (sous-charge < 70 %, normale
// jusqu'à SURCHARGE_THRESHOLD).
const SOUS_CHARGE_THRESHOLD = 70;

export type WorkloadStatus = "SOUS_CHARGE" | "CHARGE_NORMALE" | "SURCHARGE";

export function classifyWorkload(tauxOccupation: number): WorkloadStatus {
  if (tauxOccupation >= SURCHARGE_THRESHOLD) return "SURCHARGE";
  if (tauxOccupation < SOUS_CHARGE_THRESHOLD) return "SOUS_CHARGE";
  return "CHARGE_NORMALE";
}

export type WorkloadTaskInput = {
  statut: string;
  tempsEstimeHeures: number | null;
  tempsReelHeures: number | null;
  responsablePrincipalId: string;
  assigneeIds: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type WorkloadLeaveInput = {
  userId: string;
  dateDebut: Date;
  dateFin: Date;
  statut: string;
};

export type WorkloadUserInput = {
  id: string;
  name: string;
  roleLabel: string;
  capaciteHebdomadaireHeures: number;
};

export type UserWorkload = {
  userId: string;
  name: string;
  roleLabel: string;
  capaciteHeures: number;
  tacheCount: number;
  chargeHeures: number;
  // V2.2 §10 — heures réellement consommées (tempsReelHeures) sur les
  // tâches actives + terminées, distinct de tempsMoyenRealisationHeures
  // (une moyenne par tâche terminée) : ici un total, pas une moyenne.
  heuresConsommeesTotal: number;
  tauxOccupation: number;
  statut: WorkloadStatus;
  disponibiliteHeures: number;
  enSurcharge: boolean;
  enCongeAujourdhui: boolean;
  tempsMoyenRealisationHeures: number | null;
};

export function computeWorkload(
  users: WorkloadUserInput[],
  tasks: WorkloadTaskInput[],
  leaves: WorkloadLeaveInput[],
  today: Date = new Date()
): UserWorkload[] {
  const tacheCountByUser = new Map<string, number>();
  const chargeHeuresByUser = new Map<string, number>();
  const heuresConsommeesByUser = new Map<string, number>();
  const completedDurationsByUser = new Map<string, number[]>();

  for (const task of tasks) {
    const owners = new Set([task.responsablePrincipalId, ...task.assigneeIds]);
    const isActive = ACTIVE_TASK_STATUSES.has(task.statut);
    const isCompleted = task.statut === "TERMINEE";

    for (const ownerId of owners) {
      if (isActive) {
        tacheCountByUser.set(ownerId, (tacheCountByUser.get(ownerId) ?? 0) + 1);
        chargeHeuresByUser.set(
          ownerId,
          (chargeHeuresByUser.get(ownerId) ?? 0) + (task.tempsEstimeHeures ?? 0)
        );
      }
      if ((isActive || isCompleted) && task.tempsReelHeures !== null) {
        heuresConsommeesByUser.set(ownerId, (heuresConsommeesByUser.get(ownerId) ?? 0) + task.tempsReelHeures);
      }
      if (isCompleted && task.tempsReelHeures !== null) {
        const list = completedDurationsByUser.get(ownerId) ?? [];
        list.push(task.tempsReelHeures);
        completedDurationsByUser.set(ownerId, list);
      }
    }
  }

  const onLeaveUserIds = new Set(
    leaves
      .filter((l) => l.statut === "APPROUVE" && l.dateDebut <= today && l.dateFin >= today)
      .map((l) => l.userId)
  );

  return users
    .map((user) => {
      const chargeHeures = chargeHeuresByUser.get(user.id) ?? 0;
      const capaciteHeures = user.capaciteHebdomadaireHeures;
      const tauxOccupation =
        capaciteHeures > 0 ? Math.round((chargeHeures / capaciteHeures) * 100) : 0;
      const durations = completedDurationsByUser.get(user.id) ?? [];
      const tempsMoyenRealisationHeures =
        durations.length > 0
          ? Math.round((durations.reduce((sum, d) => sum + d, 0) / durations.length) * 10) / 10
          : null;

      return {
        userId: user.id,
        name: user.name,
        roleLabel: user.roleLabel,
        capaciteHeures,
        tacheCount: tacheCountByUser.get(user.id) ?? 0,
        chargeHeures,
        heuresConsommeesTotal: Math.round((heuresConsommeesByUser.get(user.id) ?? 0) * 10) / 10,
        tauxOccupation,
        statut: classifyWorkload(tauxOccupation),
        disponibiliteHeures: Math.max(0, Math.round((capaciteHeures - chargeHeures) * 10) / 10),
        enSurcharge: tauxOccupation >= SURCHARGE_THRESHOLD,
        enCongeAujourdhui: onLeaveUserIds.has(user.id),
        tempsMoyenRealisationHeures,
      };
    })
    .sort((a, b) => b.tauxOccupation - a.tauxOccupation);
}
