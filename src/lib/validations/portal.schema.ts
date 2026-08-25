import { z } from "zod";

// Portail externe (cahier des charges §16-20) : messagerie, participation
// aux reunions, partage de documents, benefiaires.

export const sendPortalMessageSchema = z.object({
  content: z.string().min(1, "Le message ne peut pas être vide."),
});
export type SendPortalMessageInput = z.infer<typeof sendPortalMessageSchema>;

export const replyPortalMessageSchema = z.object({
  contactId: z.string().min(1),
  content: z.string().min(1, "Le message ne peut pas être vide."),
});
export type ReplyPortalMessageInput = z.infer<typeof replyPortalMessageSchema>;

export const updateMeetingRsvpSchema = z.object({
  participantId: z.string().min(1),
  rsvp: z.enum(["CONFIRME", "DECLINE"]),
});
export type UpdateMeetingRsvpInput = z.infer<typeof updateMeetingRsvpSchema>;

export const inviteContactToMeetingSchema = z.object({
  meetingId: z.string().min(1),
  contactId: z.string().min(1),
});
export type InviteContactToMeetingInput = z.infer<typeof inviteContactToMeetingSchema>;

export const togglePartageExterneSchema = z.object({
  documentId: z.string().min(1),
  partageExterne: z.boolean(),
});
export type TogglePartageExterneInput = z.infer<typeof togglePartageExterneSchema>;

// Project Studio §10 (Beneficiary Analysis)
const beneficiaireTypeEnum = z.enum(["DIRECT", "INDIRECT"]);

export const createBeneficiaireSchema = z
  .object({
    nom: z.string().min(2, "Le nom est requis."),
    description: z.string().optional(),
    type: beneficiaireTypeEnum.default("DIRECT"),
    nombre: z.string().optional(),
    caracteristiques: z.string().optional(),
    localisation: z.string().optional(),
    besoins: z.string().optional(),
    vulnerabilites: z.string().optional(),
    criteresSelection: z.string().optional(),
    programmeId: z.string().optional(),
    projectId: z.string().optional(),
  })
  .refine((data) => Boolean(data.programmeId) || Boolean(data.projectId), {
    message: "Un programme ou un projet est requis.",
    path: ["programmeId"],
  });
export type CreateBeneficiaireInput = z.infer<typeof createBeneficiaireSchema>;

export const updateBeneficiaireSchema = z.object({
  id: z.string().min(1),
  nom: z.string().min(2, "Le nom est requis."),
  description: z.string().optional(),
  type: beneficiaireTypeEnum,
  nombre: z.string().optional(),
  caracteristiques: z.string().optional(),
  localisation: z.string().optional(),
  besoins: z.string().optional(),
  vulnerabilites: z.string().optional(),
  criteresSelection: z.string().optional(),
});
export type UpdateBeneficiaireInput = z.infer<typeof updateBeneficiaireSchema>;
