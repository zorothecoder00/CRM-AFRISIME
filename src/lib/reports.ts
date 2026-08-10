import { prisma } from "@/lib/prisma";
import { computeWorkload } from "@/lib/workload";

export const REPORT_TYPES = ["PROJETS", "TACHES", "CHARGE_TRAVAIL", "OBJECTIFS"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_LABELS: Record<ReportType, string> = {
  PROJETS: "Rapport des projets",
  TACHES: "Rapport des tâches",
  CHARGE_TRAVAIL: "Rapport de charge de travail",
  OBJECTIFS: "Rapport des objectifs & KPI",
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

  const objectives = await prisma.objective.findMany({
    include: { indicators: true, user: true, project: true, department: true },
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
      const portee = o.user?.name ?? o.project?.nom ?? o.department?.name ?? "—";
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
      return {
        titre: o.titre,
        portee,
        periode: o.periode,
        statut: o.statut,
        progression,
      };
    }),
  };
}
