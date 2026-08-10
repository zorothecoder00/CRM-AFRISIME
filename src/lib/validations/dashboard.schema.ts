import { z } from "zod";

export const updatePreferencesSchema = z.object({
  widgets: z.array(z.string()).min(1, "Au moins un widget doit être affiché."),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
