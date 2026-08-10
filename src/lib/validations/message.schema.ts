import { z } from "zod";

export const createConversationSchema = z.object({
  nom: z.string().optional(),
  participantIds: z.array(z.string()).min(1, "Au moins un participant est requis."),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().min(1, "Le message ne peut pas être vide."),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const addReactionSchema = z
  .object({
    emoji: z.string().min(1),
    taskCommentId: z.string().optional(),
    messageId: z.string().optional(),
  })
  .refine((data) => !!data.taskCommentId !== !!data.messageId, {
    message: "Une réaction cible soit un commentaire, soit un message.",
  });

export type AddReactionInput = z.infer<typeof addReactionSchema>;
