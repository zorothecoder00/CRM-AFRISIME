import { prisma } from "@/lib/prisma";
import { computeWorkload } from "@/lib/workload";

export const REPORT_TYPES = [
  "PROJETS",
  "PROGRAMMES",
  "TACHES",
  "CHARGE_TRAVAIL",
  "OBJECTIFS",
  "PRODUCTIVITE",
  "ACTIVITE",
  "PERFORMANCE",
  "HEURES_PASSEES",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_LABELS: Record<ReportType, string> = {
  PROJETS: "Rapport des projets",
  PROGRAMMES: "Rapport des programmes",
  TACHES: "Rapport des tâches",
  CHARGE_TRAVAIL: "Rapport de charge de travail",
  OBJECTIFS: "Rapport des objectifs & KPI",
  PRODUCTIVITE: "Rapport de productivité",
  ACTIVITE: "Rapport d'activité",
  PERFORMANCE: "Rapport de performance",
  HEURES_PASSEES: "Rapport d'heures passées",
};

export type ReportTable = {
  title: string;
  generatedAt: Date;
  columns: { key: string; label: string }[];
  rows: Record<string, string>[];
};

/**
 * Représentation générique (titre + colonnes + lignes de texte) partagée par
 * les 3 formats d'export (cahier des charges §20) — évite d'écrire 3 mises en
 * forme par type de rapport (12 combinaisons) en ne gardant que 3 rendus
 * génériques + 4 requêtes de données.
 */
export async function getReportData(type: ReportType): Promise<ReportTable> {
  const generatedAt = new Date();

  if (type === "PROJETS") {
    const projects = await prisma.project.findMany({
      include: { department: true, responsable: true },
      orderBy: { nom: "asc" },
    });
    return {
      title: REPORT_LABELS.PROJETS,
      generatedAt,
      columns: [
        { key: "nom", label: "Projet" },
        { key: "departement", label: "Département" },
        { key: "responsable", label: "Responsable" },
        { key: "statut", label: "Statut" },
        { key: "avancement", label: "Avancement" },
        { key: "budget", label: "Budget" },
      ],
      rows: projects.map((p) => ({
        nom: p.nom,
        departement: p.department.name,
        responsable: p.responsable.name,
        statut: p.statut,
        avancement: `${p.avancement}%`,
        budget: p.budget ? Number(p.budget).toLocaleString("fr-FR") : "—",
      })),
    };
  }

  if (type === "TACHES") {
    const tasks = await prisma.task.findMany({
      include: { project: true, responsablePrincipal: true },
      orderBy: { createdAt: "desc" },
    });
    return {
      title: REPORT_LABELS.TACHES,
      generatedAt,
      columns: [
        { key: "titre", label: "Tâche" },
        { key: "projet", label: "Projet" },
        { key: "responsable", label: "Responsable" },
        { key: "statut", label: "Statut" },
        { key: "priorite", label: "Priorité" },
        { key: "echeance", label: "Échéance" },
        { key: "avancement", label: "Avancement" },
      ],
      rows: tasks.map((t) => ({
        titre: t.titre,
        projet: t.project.nom,
        responsable: t.responsablePrincipal.name,
        statut: t.statut,
        priorite: t.priorite,
        echeance: t.echeance ? t.echeance.toLocaleDateString("fr-FR") : "—",
        avancement: `${t.avancement}%`,
      })),
    };
  }

  if (type === "CHARGE_TRAVAIL") {
    const [users, tasks, leaves] = await Promise.all([
      prisma.user.findMany({ where: { isActive: true }, include: { role: true }, orderBy: { name: "asc" } }),
      prisma.task.findMany({ include: { assignees: { select: { userId: true } } } }),
      prisma.leave.findMany({ where: { statut: "APPROUVE" } }),
    ]);
    const workload = computeWorkload(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        roleLabel: u.role.label,
        capaciteHebdomadaireHeures: Number(u.capaciteHebdomadaireHeures),
      })),
      tasks.map((t) => ({
        statut: t.statut,
        tempsEstimeHeures: t.tempsEstimeHeures !== null ? Number(t.tempsEstimeHeures) : null,
        tempsReelHeures: t.tempsReelHeures !== null ? Number(t.tempsReelHeures) : null,
        responsablePrincipalId: t.responsablePrincipalId,
        assigneeIds: t.assignees.map((a) => a.userId),
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      leaves.map((l) => ({ userId: l.userId, dateDebut: l.dateDebut, dateFin: l.dateFin, statut: l.statut }))
    );
    return {
      title: REPORT_LABELS.CHARGE_TRAVAIL,
      generatedAt,
      columns: [
        { key: "name", label: "Collaborateur" },
        { key: "roleLabel", label: "Rôle" },
        { key: "tacheCount", label: "Tâches actives" },
        { key: "chargeHeures", label: "Charge (h)" },
        { key: "tauxOccupation", label: "Occupation" },
        { key: "disponibiliteHeures", label: "Disponibilité (h)" },
      ],
      rows: workload.map((w) => ({
        name: w.name,
        roleLabel: w.roleLabel,
        tacheCount: String(w.tacheCount),
        chargeHeures: String(w.chargeHeures),
        tauxOccupation: `${w.tauxOccupation}%`,
        disponibiliteHeures: String(w.disponibiliteHeures),
      })),
    };
  }

  if (type === "PROGRAMMES") {
    const programmes = await prisma.programme.findMany({
      include: { responsable: true, projects: true },
      orderBy: { nom: "asc" },
    });
    return {
      title: REPORT_LABELS.PROGRAMMES,
      generatedAt,
      columns: [
        { key: "nom", label: "Programme" },
        { key: "responsable", label: "Responsable" },
        { key: "statut", label: "Statut" },
        { key: "projets", label: "Projets" },
        { key: "avancementMoyen", label: "Avancement moyen" },
        { key: "budget", label: "Budget" },
        { key: "coutReel", label: "Coût réel" },
      ],
      rows: programmes.map((p) => {
        const avancementMoyen =
          p.projects.length > 0
            ? Math.round(p.projects.reduce((sum, proj) => sum + proj.avancement, 0) / p.projects.length)
            : 0;
        return {
          nom: p.nom,
          responsable: p.responsable.name,
          statut: p.statut,
          projets: String(p.projects.length),
          avancementMoyen: `${avancementMoyen}%`,
          budget: p.budget ? Number(p.budget).toLocaleString("fr-FR") : "—",
          coutReel: p.coutReel ? Number(p.coutReel).toLocaleString("fr-FR") : "—",
        };
      }),
    };
  }

  if (type === "OBJECTIFS") {
    const objectives = await prisma.objective.findMany({
      include: { indicators: true, user: true, project: true, department: true, programme: true },
      orderBy: { dateDebut: "desc" },
    });
    return {
      title: REPORT_LABELS.OBJECTIFS,
      generatedAt,
      columns: [
        { key: "titre", label: "Objectif" },
        { key: "portee", label: "Portée" },
        { key: "periode", label: "Période" },
        { key: "statut", label: "Statut" },
        { key: "progression", label: "Progression indicateurs" },
      ],
      rows: objectives.map((o) => {
        const portee = o.user?.name ?? o.project?.nom ?? o.department?.name ?? o.programme?.nom ?? "—";
        const progression =
          o.indicators.length > 0
            ? `${Math.round(
                (o.indicators.reduce(
                  (sum, i) => sum + Math.min(1, Number(i.valeurActuelle) / Number(i.valeurCible)),
                  0
                ) /
                  o.indicators.length) *
                  100
              )}%`
            : "—";
        return { titre: o.titre, portee, periode: o.periode, statut: o.statut, progression };
      }),
    };
  }

  if (type === "HEURES_PASSEES") {
    const tasks = await prisma.task.findMany({
      where: { tempsReelHeures: { not: null } },
      include: { responsablePrincipal: { include: { role: true } }, project: true },
      orderBy: { responsablePrincipalId: "asc" },
    });
    const byUser = new Map<string, { name: string; roleLabel: string; heures: number; taches: number }>();
    for (const t of tasks) {
      const entry = byUser.get(t.responsablePrincipalId) ?? {
        name: t.responsablePrincipal.name,
        roleLabel: t.responsablePrincipal.role.label,
        heures: 0,
        taches: 0,
      };
      entry.heures += Number(t.tempsReelHeures);
      entry.taches += 1;
      byUser.set(t.responsablePrincipalId, entry);
    }
    const rows = Array.from(byUser.values()).sort((a, b) => b.heures - a.heures);
    return {
      title: REPORT_LABELS.HEURES_PASSEES,
      generatedAt,
      columns: [
        { key: "name", label: "Collaborateur" },
        { key: "roleLabel", label: "Rôle" },
        { key: "taches", label: "Tâches avec temps saisi" },
        { key: "heures", label: "Heures passées" },
      ],
      rows: rows.map((r) => ({
        name: r.name,
        roleLabel: r.roleLabel,
        taches: String(r.taches),
        heures: r.heures.toFixed(1),
      })),
    };
  }

  if (type === "PRODUCTIVITE") {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const tasks = await prisma.task.findMany({
      where: { statut: "TERMINEE", completedAt: { gte: thirtyDaysAgo } },
      include: { responsablePrincipal: { include: { role: true } } },
    });
    const byUser = new Map<
      string,
      { name: string; roleLabel: string; termines: number; aTemps: number; avecEcheance: number }
    >();
    for (const t of tasks) {
      const entry = byUser.get(t.responsablePrincipalId) ?? {
        name: t.responsablePrincipal.name,
        roleLabel: t.responsablePrincipal.role.label,
        termines: 0,
        aTemps: 0,
        avecEcheance: 0,
      };
      entry.termines += 1;
      if (t.echeance) {
        entry.avecEcheance += 1;
        if (t.completedAt! <= t.echeance) entry.aTemps += 1;
      }
      byUser.set(t.responsablePrincipalId, entry);
    }
    const rows = Array.from(byUser.values()).sort((a, b) => b.termines - a.termines);
    return {
      title: REPORT_LABELS.PRODUCTIVITE,
      generatedAt,
      columns: [
        { key: "name", label: "Collaborateur" },
        { key: "roleLabel", label: "Rôle" },
        { key: "termines", label: "Tâches terminées (30j)" },
        { key: "respectDelais", label: "Respect des délais" },
      ],
      rows: rows.map((r) => ({
        name: r.name,
        roleLabel: r.roleLabel,
        termines: String(r.termines),
        respectDelais: r.avecEcheance > 0 ? `${Math.round((r.aTemps / r.avecEcheance) * 100)}%` : "—",
      })),
    };
  }

  if (type === "PERFORMANCE") {
    const [departments, objectives] = await Promise.all([
      prisma.department.findMany({ include: { projects: true }, orderBy: { name: "asc" } }),
      prisma.objective.findMany({ include: { indicators: true, department: true } }),
    ]);
    const objectiveProgressByDept = new Map<string, number[]>();
    for (const o of objectives) {
      if (!o.departmentId || o.indicators.length === 0) continue;
      const progress =
        o.indicators.reduce((sum, i) => sum + Math.min(1, Number(i.valeurActuelle) / Number(i.valeurCible)), 0) /
        o.indicators.length;
      const list = objectiveProgressByDept.get(o.departmentId) ?? [];
      list.push(progress);
      objectiveProgressByDept.set(o.departmentId, list);
    }
    return {
      title: REPORT_LABELS.PERFORMANCE,
      generatedAt,
      columns: [
        { key: "departement", label: "Département" },
        { key: "projets", label: "Projets" },
        { key: "avancementMoyen", label: "Avancement moyen projets" },
        { key: "objectifsMoyen", label: "Progression moyenne objectifs" },
      ],
      rows: departments.map((d) => {
        const avgAvancement =
          d.projects.length > 0
            ? Math.round(d.projects.reduce((sum, p) => sum + p.avancement, 0) / d.projects.length)
            : 0;
        const objProgress = objectiveProgressByDept.get(d.id) ?? [];
        const avgObjectif =
          objProgress.length > 0
            ? Math.round((objProgress.reduce((sum, p) => sum + p, 0) / objProgress.length) * 100)
            : null;
        return {
          departement: d.name,
          projets: String(d.projects.length),
          avancementMoyen: `${avgAvancement}%`,
          objectifsMoyen: avgObjectif !== null ? `${avgObjectif}%` : "—",
        };
      }),
    };
  }

  // ACTIVITE
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const entries = await prisma.auditLog.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return {
    title: REPORT_LABELS.ACTIVITE,
    generatedAt,
    columns: [
      { key: "date", label: "Date" },
      { key: "utilisateur", label: "Utilisateur" },
      { key: "action", label: "Action" },
      { key: "entite", label: "Entité" },
    ],
    rows: entries.map((e) => ({
      date: e.createdAt.toLocaleString("fr-FR"),
      utilisateur: e.user?.name ?? "Système",
      action: e.action,
      entite: e.entityType,
    })),
  };
}
