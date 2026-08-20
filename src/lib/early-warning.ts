import { prisma } from "@/lib/prisma";
import { computeWorkload } from "@/lib/workload";
import { recordInsight } from "@/lib/ai-agents";

const TACHES_RETARD_SEUIL = 5;
const INCIDENTS_RECENTS_SEUIL = 3;
const INCIDENTS_FENETRE_JOURS = 14;
const SURCHARGE_PCT_SEUIL = 50;
const KPI_ECART_SEUIL_PERCENT = -20;
const SIGNAUX_MIN_POUR_ALERTE = 3;
const CONTRATS_EXPIRES_FENETRE_JOURS = 7;

export type WeakSignal = { cle: string; label: string; actif: boolean; detail: string };

// Early Warning System (cahier des charges V3.0 §14) — "identifier les
// signaux faibles" : plusieurs événements isolés (retards, incidents,
// surcharge, KPI en baisse, retards fournisseurs), individuellement pas
// critiques, mais combinés révélant un risque organisationnel émergent.
// "Retards fournisseurs" n'a pas de modèle de livraison dédié dans ce
// MVP : approximé par les contrats récemment basculés EXPIRE (meilleur
// proxy disponible, documenté comme tel côté UI). Avant l'ajout de
// contract-lifecycle.ts (bascule quotidienne ACTIF -> EXPIRE), ce proxy
// comptait les contrats encore ACTIF dont la date d'expiration était
// dépassée — devenu quasi toujours nul depuis que la bascule est
// automatique, d'où ce recentrage sur "vient d'expirer" plutôt que "est
// resté ACTIF trop longtemps sans qu'on s'en aperçoive".
export async function computeWeakSignals(): Promise<WeakSignal[]> {
  const now = new Date();
  const fenetreIncidents = new Date(now.getTime() - INCIDENTS_FENETRE_JOURS * 24 * 60 * 60 * 1000);
  const fenetreContratsExpires = new Date(now.getTime() - CONTRATS_EXPIRES_FENETRE_JOURS * 24 * 60 * 60 * 1000);

  const [tachesEnRetard, incidentsRecents, users, tasks, leaves, indicators, contratsExpires] = await Promise.all([
    prisma.task.count({
      where: { deletedAt: null, statut: { in: ["A_FAIRE", "EN_COURS", "EN_REVISION", "BLOQUEE"] }, echeance: { lt: now } },
    }),
    prisma.incident.count({ where: { createdAt: { gte: fenetreIncidents } } }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, capaciteHebdomadaireHeures: true, role: { select: { label: true } } },
    }),
    prisma.task.findMany({
      where: { deletedAt: null },
      select: {
        statut: true,
        tempsEstimeHeures: true,
        tempsReelHeures: true,
        responsablePrincipalId: true,
        assignees: { select: { userId: true } },
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.leave.findMany({ where: { statut: "APPROUVE" }, select: { userId: true, dateDebut: true, dateFin: true, statut: true } }),
    prisma.indicator.findMany({ where: { valeurCible: { gt: 0 } }, select: { nom: true, valeurCible: true, valeurActuelle: true } }),
    prisma.contract.count({ where: { statut: "EXPIRE", dateExpiration: { gte: fenetreContratsExpires, lt: now } } }),
  ]);

  const workload = computeWorkload(
    users.map((u) => ({ id: u.id, name: u.name, roleLabel: u.role.label, capaciteHebdomadaireHeures: Number(u.capaciteHebdomadaireHeures) })),
    tasks.map((t) => ({
      statut: t.statut,
      tempsEstimeHeures: t.tempsEstimeHeures !== null ? Number(t.tempsEstimeHeures) : null,
      tempsReelHeures: t.tempsReelHeures !== null ? Number(t.tempsReelHeures) : null,
      responsablePrincipalId: t.responsablePrincipalId,
      assigneeIds: t.assignees.map((a) => a.userId),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
    leaves
  );
  const surchargePct = users.length > 0 ? (workload.filter((w) => w.enSurcharge).length / users.length) * 100 : 0;

  const kpiEnBaisse = indicators.filter((i) => {
    const ecart = ((Number(i.valeurActuelle) - Number(i.valeurCible)) / Number(i.valeurCible)) * 100;
    return ecart <= KPI_ECART_SEUIL_PERCENT;
  });

  return [
    {
      cle: "taches_retard",
      label: "Tâches en retard",
      actif: tachesEnRetard >= TACHES_RETARD_SEUIL,
      detail: `${tachesEnRetard} tâche(s) active(s) en retard sur leur échéance.`,
    },
    {
      cle: "incidents",
      label: "Augmentation des incidents",
      actif: incidentsRecents >= INCIDENTS_RECENTS_SEUIL,
      detail: `${incidentsRecents} incident(s) créé(s) sur les ${INCIDENTS_FENETRE_JOURS} derniers jours.`,
    },
    {
      cle: "surcharge",
      label: "Surcharge d'équipe",
      actif: surchargePct >= SURCHARGE_PCT_SEUIL,
      detail: `${Math.round(surchargePct)}% des collaborateurs actifs en surcharge.`,
    },
    {
      cle: "kpi_baisse",
      label: "Baisse d'un KPI",
      actif: kpiEnBaisse.length > 0,
      detail:
        kpiEnBaisse.length > 0
          ? `${kpiEnBaisse.length} indicateur(s) sous la cible de plus de ${Math.abs(KPI_ECART_SEUIL_PERCENT)}% : ${kpiEnBaisse.map((k) => k.nom).join(", ")}.`
          : "Aucun indicateur significativement sous sa cible.",
    },
    {
      cle: "retards_fournisseurs",
      label: "Retards fournisseurs",
      actif: contratsExpires > 0,
      detail: `${contratsExpires} contrat(s) expiré(s) au cours des ${CONTRATS_EXPIRES_FENETRE_JOURS} derniers jours.`,
    },
  ];
}

export type EarlyWarningResult = { signaux: WeakSignal[]; signauxActifs: number; risqueEmergent: boolean };

export async function detectEmergentRisk(): Promise<EarlyWarningResult> {
  const signaux = await computeWeakSignals();
  const signauxActifs = signaux.filter((s) => s.actif).length;
  return { signaux, signauxActifs, risqueEmergent: signauxActifs >= SIGNAUX_MIN_POUR_ALERTE };
}

/** Cron quotidien — journalise l'alerte si plusieurs signaux faibles sont actifs simultanément. */
export async function runEarlyWarningCheck() {
  const { signaux, signauxActifs, risqueEmergent } = await detectEmergentRisk();
  if (!risqueEmergent) return;

  const actifs = signaux.filter((s) => s.actif);
  await recordInsight({
    agent: "RISK_MANAGER",
    type: "ALERTE",
    titre: `Risque organisationnel émergent détecté (${signauxActifs} signaux faibles combinés)`,
    contenu: actifs.map((s) => `${s.label} : ${s.detail}`).join(" — "),
    entityType: "Organization",
    entityId: "org-health",
  });
}
