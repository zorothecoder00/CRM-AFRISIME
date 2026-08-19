import { z } from "zod";

export const orgTeamDraftSchema = z.object({
  nom: z.string().min(1, "Le nom de l'équipe est requis."),
  responsableId: z.string().optional(),
  competences: z.array(z.string().min(1)),
  projets: z.array(z.string().min(1)),
  processus: z.array(z.string().min(1)),
});

export type OrgTeamDraftInput = z.infer<typeof orgTeamDraftSchema>;

export type OrgDesignNodeInput = {
  nom: string;
  enfants: OrgDesignNodeInput[];
  equipes: OrgTeamDraftInput[];
};

export const orgDesignNodeSchema: z.ZodType<OrgDesignNodeInput> = z.lazy(() =>
  z.object({
    nom: z.string().min(1, "Le nom du niveau est requis."),
    enfants: z.array(orgDesignNodeSchema),
    equipes: z.array(orgTeamDraftSchema),
  })
);

export const createOrgDesignDraftSchema = z.object({
  nom: z.string().min(2, "Le nom du brouillon est requis."),
  description: z.string().optional(),
  structure: orgDesignNodeSchema,
});

export type CreateOrgDesignDraftInput = z.infer<typeof createOrgDesignDraftSchema>;

export const updateOrgDesignDraftSchema = createOrgDesignDraftSchema.extend({ id: z.string().min(1) });
export type UpdateOrgDesignDraftInput = z.infer<typeof updateOrgDesignDraftSchema>;

export const idSchema = z.object({ id: z.string().min(1) });
export type IdInput = z.infer<typeof idSchema>;
