import { prisma } from "@/lib/prisma";
import { computeWorkload } from "@/lib/workload";
import { computeScopePilotage } from "@/lib/pilotage-levels";
import { collectDescendantIds } from "@/lib/department-tree";

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
  // V2.2 §32 — génération automatique de rapports supplémentaires.
  "DEPARTEMENT",
  "DIRECTION",
  "MENSUEL",
  "TRIMESTRIEL",
  "ANNUEL",
  "AUDIT",
  "RISQUES",
  "GOUVERNANCE",
  // V2.2 §31 — Weekly Business Review IA (agrégation, pas de génération LLM).
  "REVUE_HEBDOMADAIRE",
  // Project Studio §16 — Project Charter genere depuis les donnees deja
  // presentes sur le Project (sponsor, budget, risques, parties prenantes...).
  "CHARTE_PROJET",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

// Types necessitant un parametre targetId (identifiant de Department, ou de
// Project pour CHARTE_PROJET) en plus du type — les autres l'ignorent
// silencieusement.
export const REPORT_TYPES_REQUIRING_TARGET: ReportType[] = ["DEPARTEMENT", "DIRECTION", "CHARTE_PROJET"];

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
  DEPARTEMENT: "Rapport de département",
  DIRECTION: "Rapport de direction",
  MENSUEL: "Rapport mensuel",
  TRIMESTRIEL: "Rapport trimestriel",
  ANNUEL: "Rapport annuel",
  AUDIT: "Rapport d'audit",
  RISQUES: "Rapport de risques",
  GOUVERNANCE: "Rapport de gouvernance",
  REVUE_HEBDOMADAIRE: "Weekly Business Review",
  CHARTE_PROJET: "Charte de projet",
};

export type ReportColumn = { key: string; label: string };
export type ReportSection = {
  heading: string;
  columns: ReportColumn[];
  rows: Record<string, string>[];
  // Texte libre affiché au-dessus du tableau (ou seul, si columns est vide) —
  // utilisé pour les "recommandations" de la Weekly Business Review (§31),
  // qui ne sont pas tabulaires.
  note?: string;
};

// Un rapport = un ou plusieurs tableaux nommés (V2.2 §31 : la Weekly
// Business Review a 10 sections — activités/résultats/objectifs/projets/
// risques/incidents/décisions/CRM/performances/recommandations — qu'un
// unique tableau plat ne peut pas représenter proprement). Les rapports
// "historiques" (§20, PROJETS...HEURES_PASSEES) restent une seule section.
export type ReportDocument = {
  title: string;
  generatedAt: Date;
  sections: ReportSection[];
};

function singleSection(title: string, generatedAt: Date, columns: ReportColumn[], rows: Record<string, string>[]): ReportDocument {
  return { title, generatedAt, sections: [{ heading: title, columns, rows }] };
}

/**
 * Charte de projet (Project Studio §16) — agrege des donnees deja presentes
 * ailleurs sur le Project (sponsor, budget, calendrier, perimetre, risques,
 * parties prenantes) plutot que de dupliquer un formulaire de saisie : les
 * seuls champs propres a la charte (perimetre/criteres/gouvernance) vivent
 * sur Project, edites via Scope Management (§17).
 */
async function getProjectCharterReport(generatedAt: Date, projectId: string): Promise<ReportDocument> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      responsable: true,
      sponsor: true,
      department: true,
      risks: { where: { impact: { in: ["MOYEN", "ELEVE"] } } },
      stakeholders: { include: { stakeholder: true } },
      deliverables: true,
    },
  });

  if (!project) {
    return { title: REPORT_LABELS.CHARTE_PROJET, generatedAt, sections: [{ heading: "Projet introuvable", columns: [], rows: [] }] };
  }

  return {
    title: `${REPORT_LABELS.CHARTE_PROJET} — ${project.nom}`,
    generatedAt,
    sections: [
      {
        heading: "Informations générales",
        columns: [],
        rows: [],
        note: [
          `Sponsor : ${project.sponsor?.name ?? "—"}`,
          `Chef de projet : ${project.responsable.name}`,
          `Département : ${project.department.name}`,
          `Objectif : ${project.objectif ?? "—"}`,
          `Budget : ${project.budget ? Number(project.budget).toLocaleString("fr-FR") : "—"}`,
          `Calendrier : ${project.dateDebut?.toLocaleDateString("fr-FR") ?? "—"} → ${project.dateFin?.toLocaleDateString("fr-FR") ?? "—"}`,
        ].join("\n"),
      },
      {
        heading: "Périmètre",
        columns: [],
        rows: [],
        note: [
          `Inclus : ${project.perimetreInclus ?? "—"}`,
          `Exclu : ${project.perimetreExclus ?? "—"}`,
          `Contraintes : ${project.contraintes ?? "—"}`,
          `Limites : ${project.limites ?? "—"}`,
        ].join("\n"),
      },
      {
        heading: "Livrables",
        columns: [
          { key: "nom", label: "Livrable" },
          { key: "statut", label: "Statut" },
          { key: "echeance", label: "Échéance" },
        ],
        rows: project.deliverables.map((d) => ({
          nom: d.nom,
          statut: d.statut,
          echeance: d.echeance ? d.echeance.toLocaleDateString("fr-FR") : "—",
        })),
      },
      {
        heading: "Gouvernance",
        columns: [],
        rows: [],
        note: project.gouvernance ?? "—",
      },
      {
        heading: "Risques majeurs",
        columns: [
          { key: "titre", label: "Risque" },
          { key: "probabilite", label: "Probabilité" },
          { key: "impact", label: "Impact" },
        ],
        rows: project.risks.map((r) => ({ titre: r.titre, probabilite: r.probabilite, impact: r.impact })),
      },
      {
        heading: "Parties prenantes",
        columns: [
          { key: "nom", label: "Nom" },
          { key: "role", label: "Rôle" },
        ],
        rows: project.stakeholders.map((s) => ({ nom: s.stakeholder.nom, role: s.role ?? "—" })),
      },
      {
        heading: "Critères de réussite",
        columns: [],
        rows: [],
        note: project.criteresReussite ?? "—",
      },
    ],
  };
}

async function getDepartmentScopedReport(title: string, generatedAt: Date, departmentId: string): Promise<ReportDocument> {
  const allDepartments = await prisma.department.findMany({ select: { id: true, name: true, parentId: true } });
  const scopeIds = collectDescendantIds(departmentId, allDepartments);
  const projects = await prisma.project.findMany({
    where: { departmentId: { in: scopeIds } },
    include: { department: true, responsable: true },
    orderBy: { nom: "asc" },
  });
  return singleSection(
    title,
    generatedAt,
    [
      { key: "nom", label: "Projet" },
      { key: "departement", label: "Département" },
      { key: "responsable", label: "Responsable" },
      { key: "statut", label: "Statut" },
      { key: "avancement", label: "Avancement" },
      { key: "budget", label: "Budget" },
    ],
    projects.map((p) => ({
      nom: p.nom,
      departement: p.department.name,
      responsable: p.responsable.name,
      statut: p.statut,
      avancement: `${p.avancement}%`,
      budget: p.budget ? Number(p.budget).toLocaleString("fr-FR") : "—",
    }))
  );
}

async function getPeriodReport(title: string, generatedAt: Date, periodStart: Date): Promise<ReportDocument> {
  const [completedTasks, projects] = await Promise.all([
    prisma.task.findMany({
      where: { statut: "TERMINEE", completedAt: { gte: periodStart } },
      include: { responsablePrincipal: true, project: true },
      orderBy: { completedAt: "desc" },
    }),
    prisma.project.findMany({
      include: { department: true, responsable: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  return {
    title,
    generatedAt,
    sections: [
      {
        heading: "Tâches terminées sur la période",
        columns: [
          { key: "titre", label: "Tâche" },
          { key: "projet", label: "Projet" },
          { key: "responsable", label: "Responsable" },
          { key: "termineLe", label: "Terminée le" },
        ],
        rows: completedTasks.map((t) => ({
          titre: t.titre,
          projet: t.project.nom,
          responsable: t.responsablePrincipal.name,
          termineLe: t.completedAt!.toLocaleDateString("fr-FR"),
        })),
      },
      {
        heading: "État des projets",
        columns: [
          { key: "nom", label: "Projet" },
          { key: "departement", label: "Département" },
          { key: "statut", label: "Statut" },
          { key: "avancement", label: "Avancement" },
        ],
        rows: projects.map((p) => ({
          nom: p.nom,
          departement: p.department.name,
          statut: p.statut,
          avancement: `${p.avancement}%`,
        })),
      },
    ],
  };
}

/**
 * Représentation générique (titre + sections tableau) partagée par les 4
 * formats d'export (cahier des charges §20/§32 : PDF/Excel/Word/
 * présentation) — évite d'écrire 4 mises en forme par type de rapport en ne
 * gardant que 4 rendus génériques (src/lib/report-renderers.ts) + les
 * requêtes de données ci-dessous.
 */
export async function getReportData(type: ReportType, params: { targetId?: string } = {}): Promise<ReportDocument> {
  const generatedAt = new Date();

  if (type === "PROJETS") {
    const projects = await prisma.project.findMany({
      include: { department: true, responsable: true },
      orderBy: { nom: "asc" },
    });
    return singleSection(
      REPORT_LABELS.PROJETS,
      generatedAt,
      [
        { key: "nom", label: "Projet" },
        { key: "departement", label: "Département" },
        { key: "responsable", label: "Responsable" },
        { key: "statut", label: "Statut" },
        { key: "avancement", label: "Avancement" },
        { key: "budget", label: "Budget" },
      ],
      projects.map((p) => ({
        nom: p.nom,
        departement: p.department.name,
        responsable: p.responsable.name,
        statut: p.statut,
        avancement: `${p.avancement}%`,
        budget: p.budget ? Number(p.budget).toLocaleString("fr-FR") : "—",
      }))
    );
  }

  if (type === "TACHES") {
    const tasks = await prisma.task.findMany({
      include: { project: true, responsablePrincipal: true },
      orderBy: { createdAt: "desc" },
    });
    return singleSection(
      REPORT_LABELS.TACHES,
      generatedAt,
      [
        { key: "titre", label: "Tâche" },
        { key: "projet", label: "Projet" },
        { key: "responsable", label: "Responsable" },
        { key: "statut", label: "Statut" },
        { key: "priorite", label: "Priorité" },
        { key: "echeance", label: "Échéance" },
        { key: "avancement", label: "Avancement" },
      ],
      tasks.map((t) => ({
        titre: t.titre,
        projet: t.project.nom,
        responsable: t.responsablePrincipal.name,
        statut: t.statut,
        priorite: t.priorite,
        echeance: t.echeance ? t.echeance.toLocaleDateString("fr-FR") : "—",
        avancement: `${t.avancement}%`,
      }))
    );
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
    return singleSection(
      REPORT_LABELS.CHARGE_TRAVAIL,
      generatedAt,
      [
        { key: "name", label: "Collaborateur" },
        { key: "roleLabel", label: "Rôle" },
        { key: "tacheCount", label: "Tâches actives" },
        { key: "chargeHeures", label: "Charge (h)" },
        { key: "tauxOccupation", label: "Occupation" },
        { key: "disponibiliteHeures", label: "Disponibilité (h)" },
      ],
      workload.map((w) => ({
        name: w.name,
        roleLabel: w.roleLabel,
        tacheCount: String(w.tacheCount),
        chargeHeures: String(w.chargeHeures),
        tauxOccupation: `${w.tauxOccupation}%`,
        disponibiliteHeures: String(w.disponibiliteHeures),
      }))
    );
  }

  if (type === "PROGRAMMES") {
    const programmes = await prisma.programme.findMany({
      include: { responsable: true, projects: true },
      orderBy: { nom: "asc" },
    });
    return singleSection(
      REPORT_LABELS.PROGRAMMES,
      generatedAt,
      [
        { key: "nom", label: "Programme" },
        { key: "responsable", label: "Responsable" },
        { key: "statut", label: "Statut" },
        { key: "projets", label: "Projets" },
        { key: "avancementMoyen", label: "Avancement moyen" },
        { key: "budget", label: "Budget" },
        { key: "coutReel", label: "Coût réel" },
      ],
      programmes.map((p) => {
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
      })
    );
  }

  if (type === "OBJECTIFS") {
    const objectives = await prisma.objective.findMany({
      include: { indicators: true, user: true, project: true, department: true, programme: true },
      orderBy: { dateDebut: "desc" },
    });
    return singleSection(
      REPORT_LABELS.OBJECTIFS,
      generatedAt,
      [
        { key: "titre", label: "Objectif" },
        { key: "portee", label: "Portée" },
        { key: "periode", label: "Période" },
        { key: "statut", label: "Statut" },
        { key: "progression", label: "Progression indicateurs" },
      ],
      objectives.map((o) => {
        const portee =
          o.user?.name ??
          o.project?.nom ??
          o.department?.name ??
          o.programme?.nom ??
          (o.scope === "ORGANISATION" ? "Organisation entière" : "—");
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
      })
    );
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
    return singleSection(
      REPORT_LABELS.HEURES_PASSEES,
      generatedAt,
      [
        { key: "name", label: "Collaborateur" },
        { key: "roleLabel", label: "Rôle" },
        { key: "taches", label: "Tâches avec temps saisi" },
        { key: "heures", label: "Heures passées" },
      ],
      rows.map((r) => ({
        name: r.name,
        roleLabel: r.roleLabel,
        taches: String(r.taches),
        heures: r.heures.toFixed(1),
      }))
    );
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
    return singleSection(
      REPORT_LABELS.PRODUCTIVITE,
      generatedAt,
      [
        { key: "name", label: "Collaborateur" },
        { key: "roleLabel", label: "Rôle" },
        { key: "termines", label: "Tâches terminées (30j)" },
        { key: "respectDelais", label: "Respect des délais" },
      ],
      rows.map((r) => ({
        name: r.name,
        roleLabel: r.roleLabel,
        termines: String(r.termines),
        respectDelais: r.avecEcheance > 0 ? `${Math.round((r.aTemps / r.avecEcheance) * 100)}%` : "—",
      }))
    );
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
    return singleSection(
      REPORT_LABELS.PERFORMANCE,
      generatedAt,
      [
        { key: "departement", label: "Département" },
        { key: "projets", label: "Projets" },
        { key: "avancementMoyen", label: "Avancement moyen projets" },
        { key: "objectifsMoyen", label: "Progression moyenne objectifs" },
      ],
      departments.map((d) => {
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
      })
    );
  }

  if (type === "ACTIVITE") {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const entries = await prisma.auditLog.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return singleSection(
      REPORT_LABELS.ACTIVITE,
      generatedAt,
      [
        { key: "date", label: "Date" },
        { key: "utilisateur", label: "Utilisateur" },
        { key: "action", label: "Action" },
        { key: "entite", label: "Entité" },
      ],
      entries.map((e) => ({
        date: e.createdAt.toLocaleString("fr-FR"),
        utilisateur: e.user?.name ?? "Système",
        action: e.action,
        entite: e.entityType,
      }))
    );
  }

  if (type === "CHARTE_PROJET") {
    if (!params.targetId) {
      return { title: REPORT_LABELS[type], generatedAt, sections: [{ heading: "Aucun projet sélectionné", columns: [], rows: [] }] };
    }
    return getProjectCharterReport(generatedAt, params.targetId);
  }

  if (type === "DEPARTEMENT" || type === "DIRECTION") {
    if (!params.targetId) {
      return { title: REPORT_LABELS[type], generatedAt, sections: [{ heading: "Aucun département sélectionné", columns: [], rows: [] }] };
    }
    return getDepartmentScopedReport(REPORT_LABELS[type], generatedAt, params.targetId);
  }

  if (type === "MENSUEL" || type === "TRIMESTRIEL" || type === "ANNUEL") {
    const monthsBack = type === "MENSUEL" ? 1 : type === "TRIMESTRIEL" ? 3 : 12;
    const periodStart = new Date();
    periodStart.setMonth(periodStart.getMonth() - monthsBack);
    return getPeriodReport(REPORT_LABELS[type], generatedAt, periodStart);
  }

  if (type === "AUDIT") {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const entries = await prisma.auditLog.findMany({
      where: { createdAt: { gte: ninetyDaysAgo } },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return singleSection(
      REPORT_LABELS.AUDIT,
      generatedAt,
      [
        { key: "date", label: "Date" },
        { key: "utilisateur", label: "Utilisateur" },
        { key: "action", label: "Action" },
        { key: "entite", label: "Entité" },
        { key: "entiteId", label: "Identifiant" },
      ],
      entries.map((e) => ({
        date: e.createdAt.toLocaleString("fr-FR"),
        utilisateur: e.user?.name ?? "Système",
        action: e.action,
        entite: e.entityType,
        entiteId: e.entityId ?? "—",
      }))
    );
  }

  if (type === "RISQUES") {
    const [projectRisks, orgRisks] = await Promise.all([
      prisma.projectRisk.findMany({ include: { project: true, responsable: true }, orderBy: { createdAt: "desc" } }),
      prisma.organizationalRisk.findMany({ include: { responsable: true }, orderBy: { createdAt: "desc" } }),
    ]);
    return singleSection(
      REPORT_LABELS.RISQUES,
      generatedAt,
      [
        { key: "titre", label: "Risque" },
        { key: "perimetre", label: "Périmètre" },
        { key: "niveau", label: "Niveau" },
        { key: "statut", label: "Statut" },
        { key: "responsable", label: "Responsable" },
      ],
      [
        ...projectRisks.map((r) => ({
          titre: r.titre,
          perimetre: `Projet — ${r.project.nom}`,
          niveau: `${r.probabilite} / ${r.impact}`,
          statut: r.statut,
          responsable: r.responsable?.name ?? "—",
        })),
        ...orgRisks.map((r) => ({
          titre: r.titre,
          perimetre: "Organisationnel",
          niveau: r.criticite,
          statut: r.statut,
          responsable: r.responsable?.name ?? "—",
        })),
      ]
    );
  }

  if (type === "GOUVERNANCE") {
    const decisions = await prisma.governanceDecision.findMany({
      include: { meeting: { include: { instance: true } }, responsable: true },
      orderBy: { createdAt: "desc" },
    });
    return singleSection(
      REPORT_LABELS.GOUVERNANCE,
      generatedAt,
      [
        { key: "objet", label: "Décision" },
        { key: "instance", label: "Instance" },
        { key: "statut", label: "Statut" },
        { key: "priorite", label: "Priorité" },
        { key: "responsable", label: "Responsable" },
        { key: "echeance", label: "Échéance" },
      ],
      decisions.map((d) => ({
        objet: d.objet,
        instance: d.meeting.instance.nom,
        statut: d.statut,
        priorite: d.priorite,
        responsable: d.responsable?.name ?? "—",
        echeance: d.echeance ? d.echeance.toLocaleDateString("fr-FR") : "—",
      }))
    );
  }

  // REVUE_HEBDOMADAIRE (V2.2 §31) — agrégation multi-sections sur 7 jours.
  // "IA" = agrégation automatique templée (pas de génération LLM, aucune clé
  // API disponible — même choix que la recherche sémantique du §28 et le
  // briefing quotidien du §30).
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const now = new Date();

  const [
    activityEntries,
    completedTasks,
    objectivesClosed,
    objectivesLate,
    criticalProjects,
    lateProjects,
    criticalRisks,
    recentIncidents,
    pendingDecisions,
    newOpportunities,
    allUsers,
    allProjects,
  ] = await Promise.all([
    prisma.auditLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.task.findMany({
      where: { statut: "TERMINEE", completedAt: { gte: sevenDaysAgo } },
      select: { id: true, titre: true, project: { select: { nom: true } } },
    }),
    prisma.objective.findMany({
      where: { statut: { in: ["ATTEINT", "NON_ATTEINT"] }, updatedAt: { gte: sevenDaysAgo } },
      select: { titre: true, statut: true },
    }),
    prisma.objective.count({ where: { statut: "EN_COURS", dateFin: { lt: now } } }),
    prisma.project.findMany({
      where: { priorite: "CRITIQUE", statut: { in: ["PLANIFIE", "EN_COURS"] } },
      select: { nom: true, avancement: true },
    }),
    prisma.project.count({ where: { statut: "EN_COURS", dateFin: { lt: now } } }),
    prisma.organizationalRisk.count({ where: { criticite: { in: ["ELEVE", "CRITIQUE"] }, statut: { notIn: ["MAITRISE", "CLOS"] } } }),
    prisma.incident.findMany({
      where: { dateDeclaration: { gte: sevenDaysAgo } },
      select: { titre: true, criticite: true, statut: true },
    }),
    prisma.governanceDecision.count({ where: { statut: "EN_COURS" } }),
    prisma.crmOpportunity.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { nom: true, montantEstime: true, statut: true },
    }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true } }),
    prisma.project.findMany({ select: { id: true } }),
  ]);

  const performance = await computeScopePilotage({
    userIds: allUsers.map((u) => u.id),
    projectIds: allProjects.map((p) => p.id),
  });

  const recommandations: string[] = [];
  if (criticalRisks > 0) recommandations.push(`${criticalRisks} risque(s) organisationnel(s) critique(s) nécessitent une action.`);
  if (lateProjects > 0) recommandations.push(`${lateProjects} projet(s) en retard à traiter en priorité.`);
  if (objectivesLate > 0) recommandations.push(`${objectivesLate} objectif(s) en retard sur leur échéance.`);
  if (pendingDecisions > 0) recommandations.push(`${pendingDecisions} décision(s) de gouvernance en attente.`);
  if (recommandations.length === 0) recommandations.push("Aucun point d'attention majeur détecté cette semaine.");

  return {
    title: `${REPORT_LABELS.REVUE_HEBDOMADAIRE} — semaine du ${sevenDaysAgo.toLocaleDateString("fr-FR")} au ${now.toLocaleDateString("fr-FR")}`,
    generatedAt,
    sections: [
      { heading: "Activités", columns: [], rows: [], note: `${activityEntries} action(s) journalisées cette semaine.` },
      {
        heading: "Résultats (tâches terminées)",
        columns: [
          { key: "titre", label: "Tâche" },
          { key: "projet", label: "Projet" },
        ],
        rows: completedTasks.map((t) => ({ titre: t.titre, projet: t.project.nom })),
      },
      {
        heading: "Objectifs",
        columns: [
          { key: "titre", label: "Objectif" },
          { key: "statut", label: "Statut" },
        ],
        rows: objectivesClosed.map((o) => ({ titre: o.titre, statut: o.statut })),
        note: `${objectivesLate} objectif(s) en retard sur leur échéance.`,
      },
      {
        heading: "Projets critiques",
        columns: [
          { key: "nom", label: "Projet" },
          { key: "avancement", label: "Avancement" },
        ],
        rows: criticalProjects.map((p) => ({ nom: p.nom, avancement: `${p.avancement}%` })),
        note: `${lateProjects} projet(s) en retard sur leur date de fin.`,
      },
      {
        heading: "Risques",
        columns: [],
        rows: [],
        note: `${criticalRisks} risque(s) organisationnel(s) critique(s) actif(s).`,
      },
      {
        heading: "Incidents",
        columns: [
          { key: "titre", label: "Incident" },
          { key: "criticite", label: "Criticité" },
          { key: "statut", label: "Statut" },
        ],
        rows: recentIncidents.map((i) => ({ titre: i.titre, criticite: i.criticite, statut: i.statut })),
      },
      {
        heading: "Décisions",
        columns: [],
        rows: [],
        note: `${pendingDecisions} décision(s) de gouvernance en attente de traitement.`,
      },
      {
        heading: "CRM",
        columns: [
          { key: "nom", label: "Opportunité" },
          { key: "montant", label: "Montant estimé" },
          { key: "statut", label: "Statut" },
        ],
        rows: newOpportunities.map((o) => ({
          nom: o.nom,
          montant: o.montantEstime ? Number(o.montantEstime).toLocaleString("fr-FR") : "—",
          statut: o.statut,
        })),
      },
      {
        heading: "Performances",
        columns: [],
        rows: [],
        note: `Avancement moyen des projets : ${performance.avancementMoyen ?? "—"}%. Taux de respect des délais : ${performance.tauxRespectDelais ?? "—"}%.`,
      },
      {
        heading: "Recommandations",
        columns: [],
        rows: [],
        note: recommandations.join(" "),
      },
    ],
  };
}
