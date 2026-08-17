import { z } from "zod";

const niveauEnum = z.enum(["FAIBLE", "MOYEN", "ELEVE"]);
const positionEnum = z.enum(["FAVORABLE", "NEUTRE", "OPPOSANT"]);

export const createStakeholderSchema = z.object({
  nom: z.string().min(2, "Le nom est requis."),
  userId: z.string().optional(),
  contactId: z.string().optional(),
  influence: niveauEnum.default("MOYEN"),
  interet: niveauEnum.default("MOYEN"),
  niveauEngagement: niveauEnum.default("MOYEN"),
  position: positionEnum.optional(),
  relation: z.string().optional(),
  responsableId: z.string().optional(),
  risquesRelationnels: z.string().optional(),
  notes: z.string().optional(),
  // Optionnel : lie immediatement le nouveau profil a un projet (creation
  // depuis la fiche projet plutot que depuis /parties-prenantes).
  projectId: z.string().optional(),
  role: z.string().optional(),
});

export type CreateStakeholderInput = z.infer<typeof createStakeholderSchema>;

export const updateStakeholderSchema = createStakeholderSchema
  .omit({ projectId: true, role: true })
  .extend({ id: z.string().min(1) });

export type UpdateStakeholderInput = z.infer<typeof updateStakeholderSchema>;

export const deleteStakeholderSchema = z.object({ id: z.string().min(1) });
export type DeleteStakeholderInput = z.infer<typeof deleteStakeholderSchema>;

export const linkStakeholderToProjectSchema = z.object({
  stakeholderId: z.string().min(1),
  projectId: z.string().min(1),
  role: z.string().optional(),
});

export type LinkStakeholderToProjectInput = z.infer<typeof linkStakeholderToProjectSchema>;

export const unlinkStakeholderFromProjectSchema = z.object({
  stakeholderProjectId: z.string().min(1),
});

export type UnlinkStakeholderFromProjectInput = z.infer<typeof unlinkStakeholderFromProjectSchema>;

export const createStakeholderCommunicationSchema = z.object({
  stakeholderId: z.string().min(1),
  date: z.string().min(1),
  canal: z.string().optional(),
  resume: z.string().min(2, "Le résumé est requis."),
});

export type CreateStakeholderCommunicationInput = z.infer<typeof createStakeholderCommunicationSchema>;
