import { z } from "zod";

export const createTeamSchema = z.object({
  nom: z.string().min(2, "Le nom est requis."),
  departmentId: z.string().min(1, "Un département est requis."),
  leaderId: z.string().optional(),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const updateTeamSchema = createTeamSchema.extend({
  id: z.string().min(1),
});

export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;

export const teamMemberSchema = z.object({
  teamId: z.string().min(1),
  userId: z.string().min(1),
});

export type TeamMemberInput = z.infer<typeof teamMemberSchema>;
