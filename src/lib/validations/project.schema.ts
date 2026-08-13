import { z } from "zod";

export const createProjectSchema = z.object({
  nom: z.string().min(2, "Le nom est requis."),
  description: z.string().optional(),
  objectif: z.string().optional(),
  responsableId: z.string().min(1, "Un responsable est requis."),
  departmentId: z.string().min(1, "Un département est requis."),
  priorite: z.enum(["BASSE", "MOYENNE", "HAUTE", "CRITIQUE"]),
  dateDebut: z.string().optional(),
  dateFin: z.string().optional(),
  budget: z.string().optional(),
  localisation: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectLocationSchema = z.object({
  projectId: z.string().min(1),
  localisation: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

export type UpdateProjectLocationInput = z.infer<typeof updateProjectLocationSchema>;

export const createSectionSchema = z.object({
  projectId: z.string().min(1),
  parentId: z.string().optional(),
  type: z.enum(["PHASE", "SOUS_PHASE", "LOT"]),
  nom: z.string().min(2, "Le nom est requis."),
  responsableId: z.string().optional(),
  dateDebut: z.string().optional(),
  dateFin: z.string().optional(),
});

export type CreateSectionInput = z.infer<typeof createSectionSchema>;

export const addSectionCommentSchema = z.object({
  sectionId: z.string().min(1),
  content: z.string().min(1, "Le commentaire ne peut pas être vide."),
});

export type AddSectionCommentInput = z.infer<typeof addSectionCommentSchema>;

export const updateProjectCoutReelSchema = z.object({
  projectId: z.string().min(1),
  coutReel: z.string().min(1, "Un montant est requis."),
});

export type UpdateProjectCoutReelInput = z.infer<typeof updateProjectCoutReelSchema>;

export const updateProjectStatusSchema = z.object({
  projectId: z.string().min(1),
  statut: z.enum(["PLANIFIE", "EN_COURS", "EN_PAUSE", "TERMINE", "ANNULE"]),
});

export type UpdateProjectStatusInput = z.infer<typeof updateProjectStatusSchema>;

export const updateProjectSponsorSchema = z.object({
  projectId: z.string().min(1),
  sponsorId: z.string().optional(),
});

export type UpdateProjectSponsorInput = z.infer<typeof updateProjectSponsorSchema>;

// ---- Risques (cahier des charges §VI) ----

export const createProjectRiskSchema = z.object({
  projectId: z.string().min(1),
  titre: z.string().min(2, "Le titre est requis."),
  description: z.string().optional(),
  probabilite: z.enum(["FAIBLE", "MOYENNE", "ELEVEE"]),
  impact: z.enum(["FAIBLE", "MOYEN", "ELEVE"]),
  planMitigation: z.string().optional(),
  responsableId: z.string().optional(),
});

export type CreateProjectRiskInput = z.infer<typeof createProjectRiskSchema>;

export const updateProjectRiskStatusSchema = z.object({
  riskId: z.string().min(1),
  statut: z.enum(["IDENTIFIE", "EN_TRAITEMENT", "MAITRISE", "SURVENU", "CLOS"]),
});

export type UpdateProjectRiskStatusInput = z.infer<typeof updateProjectRiskStatusSchema>;

export const deleteProjectRiskSchema = z.object({ riskId: z.string().min(1) });

export type DeleteProjectRiskInput = z.infer<typeof deleteProjectRiskSchema>;

// ---- Parties prenantes (cahier des charges §VI) ----

export const createProjectStakeholderSchema = z.object({
  projectId: z.string().min(1),
  nom: z.string().min(2, "Le nom est requis."),
  role: z.string().optional(),
  userId: z.string().optional(),
  contactId: z.string().optional(),
  influence: z.enum(["FAIBLE", "MOYEN", "ELEVE"]),
  interet: z.enum(["FAIBLE", "MOYEN", "ELEVE"]),
  notes: z.string().optional(),
});

export type CreateProjectStakeholderInput = z.infer<typeof createProjectStakeholderSchema>;

export const deleteProjectStakeholderSchema = z.object({ stakeholderId: z.string().min(1) });

export type DeleteProjectStakeholderInput = z.infer<typeof deleteProjectStakeholderSchema>;

// ---- Jalons (cahier des charges §VI) ----

export const createProjectMilestoneSchema = z.object({
  projectId: z.string().min(1),
  nom: z.string().min(2, "Le nom est requis."),
  description: z.string().optional(),
  dateCible: z.string().min(1, "Une date cible est requise."),
});

export type CreateProjectMilestoneInput = z.infer<typeof createProjectMilestoneSchema>;

export const updateProjectMilestoneStatusSchema = z.object({
  milestoneId: z.string().min(1),
  statut: z.enum(["A_VENIR", "ATTEINT", "MANQUE"]),
});

export type UpdateProjectMilestoneStatusInput = z.infer<typeof updateProjectMilestoneStatusSchema>;

export const deleteProjectMilestoneSchema = z.object({ milestoneId: z.string().min(1) });

export type DeleteProjectMilestoneInput = z.infer<typeof deleteProjectMilestoneSchema>;

// ---- Livrables (cahier des charges §VI) ----

export const createProjectDeliverableSchema = z.object({
  projectId: z.string().min(1),
  nom: z.string().min(2, "Le nom est requis."),
  description: z.string().optional(),
  echeance: z.string().optional(),
  responsableId: z.string().optional(),
});

export type CreateProjectDeliverableInput = z.infer<typeof createProjectDeliverableSchema>;

export const updateProjectDeliverableStatusSchema = z.object({
  deliverableId: z.string().min(1),
  statut: z.enum(["A_FAIRE", "EN_COURS", "SOUMIS", "VALIDE", "REJETE"]),
});

export type UpdateProjectDeliverableStatusInput = z.infer<typeof updateProjectDeliverableStatusSchema>;

export const deleteProjectDeliverableSchema = z.object({ deliverableId: z.string().min(1) });

export type DeleteProjectDeliverableInput = z.infer<typeof deleteProjectDeliverableSchema>;

// ---- Décisions (cahier des charges §VI/§X) ----

export const createProjectDecisionSchema = z.object({
  projectId: z.string().min(1),
  description: z.string().min(2, "La description est requise."),
  responsableId: z.string().min(1, "Un responsable est requis."),
  echeance: z.string().optional(),
});

export type CreateProjectDecisionInput = z.infer<typeof createProjectDecisionSchema>;

// ---- KPI / Indicateurs (cahier des charges §VI/§IX) ----

export const createProjectIndicatorSchema = z.object({
  projectId: z.string().min(1),
  nom: z.string().min(2, "Le nom est requis."),
  unite: z.string().optional(),
  valeurCible: z.string().min(1, "La cible est requise."),
});

export type CreateProjectIndicatorInput = z.infer<typeof createProjectIndicatorSchema>;

export const createTaskIndicatorSchema = z.object({
  taskId: z.string().min(1),
  nom: z.string().min(2, "Le nom est requis."),
  unite: z.string().optional(),
  valeurCible: z.string().min(1, "La cible est requise."),
});

export type CreateTaskIndicatorInput = z.infer<typeof createTaskIndicatorSchema>;

// ---- Ressources (cahier des charges §VI) ----

export const createProjectResourceSchema = z.object({
  projectId: z.string().min(1),
  nom: z.string().min(2, "Le nom est requis."),
  type: z.string().optional(),
  quantite: z.string().optional(),
  unite: z.string().optional(),
  coutUnitaire: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateProjectResourceInput = z.infer<typeof createProjectResourceSchema>;

export const deleteProjectResourceSchema = z.object({ resourceId: z.string().min(1) });

export type DeleteProjectResourceInput = z.infer<typeof deleteProjectResourceSchema>;
