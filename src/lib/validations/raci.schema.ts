import { z } from "zod";

// ---- RACI Matrix (Project Studio §21) ----

const raciRoleEnum = z.enum(["RESPONSIBLE", "ACCOUNTABLE", "CONSULTED", "INFORMED"]);

export const createRaciAssignmentSchema = z.object({
  sectionId: z.string().min(1),
  userId: z.string().min(1),
  role: raciRoleEnum,
});

export type CreateRaciAssignmentInput = z.infer<typeof createRaciAssignmentSchema>;

export const deleteRaciAssignmentSchema = z.object({ assignmentId: z.string().min(1) });

export type DeleteRaciAssignmentInput = z.infer<typeof deleteRaciAssignmentSchema>;
