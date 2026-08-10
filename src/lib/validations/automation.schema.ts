import { z } from "zod";

export const createRuleSchema = z
  .object({
    projectId: z.string().min(1),
    nom: z.string().min(2, "Le nom est requis."),
    trigger: z.enum([
      "TASK_COMPLETED",
      "TASK_VALIDATION_REJECTED",
      "DEADLINE_APPROACHING",
      "PROJECT_COMPLETED",
    ]),
    action: z.enum(["CREATE_NEXT_TASK", "SEND_REMINDER", "NOTIFY_STAKEHOLDERS"]),
    nextTaskTitre: z.string().optional(),
    nextTaskResponsableId: z.string().optional(),
    nextTaskDelaiJours: z.string().optional(),
    reminderDelaiJours: z.string().optional(),
  })
  .refine((data) => data.action !== "CREATE_NEXT_TASK" || !!data.nextTaskTitre, {
    message: "Le titre de la tâche suivante est requis pour cette action.",
    path: ["nextTaskTitre"],
  })
  .refine((data) => data.action !== "CREATE_NEXT_TASK" || !!data.nextTaskResponsableId, {
    message: "Un responsable est requis pour cette action.",
    path: ["nextTaskResponsableId"],
  });

export type CreateRuleInput = z.infer<typeof createRuleSchema>;
