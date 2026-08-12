import { z } from "zod";

export const createPortalAccountSchema = z.object({
  contactId: z.string().min(1),
});

export type CreatePortalAccountInput = z.infer<typeof createPortalAccountSchema>;
