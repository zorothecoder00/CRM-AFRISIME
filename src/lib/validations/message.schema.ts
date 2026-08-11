import { z } from "zod";

export const createConversationSchema = z.object({
  nom: z.string().optional(),
  participantIds: z.array(z.string()).min(1, "Au moins un participant est requis."),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export const sendMessageSchema = z
  .object({
    conversationId: z.string().min(1),
    content: z.string().optional(),
    attachmentUrl: z.string().optional(),
    attachmentNom: z.string().optional(),
    attachmentMimeType: z.string().optional(),
    attachmentSizeBytes: z.number().int().positive().optional(),
  })
  .refine((data) => !!data.content?.trim() || !!data.attachmentUrl, {
    message: "Un message ou une pièce jointe est requise.",
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
