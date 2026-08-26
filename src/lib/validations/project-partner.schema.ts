import { z } from "zod";

// ---- Partenaires de projet (Project Studio §62, Project Governance) ----

export const linkProjectPartnerSchema = z.object({
  projectId: z.string().min(1),
  crmOrganizationId: z.string().min(1),
  role: z.string().optional(),
  notes: z.string().optional(),
});

export type LinkProjectPartnerInput = z.infer<typeof linkProjectPartnerSchema>;

export const updateProjectPartnerSchema = z.object({
  partnerId: z.string().min(1),
  role: z.string().optional(),
  notes: z.string().optional(),
});

export type UpdateProjectPartnerInput = z.infer<typeof updateProjectPartnerSchema>;

export const unlinkProjectPartnerSchema = z.object({ partnerId: z.string().min(1) });

export type UnlinkProjectPartnerInput = z.infer<typeof unlinkProjectPartnerSchema>;
