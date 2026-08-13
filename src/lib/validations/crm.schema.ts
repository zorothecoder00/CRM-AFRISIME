import { z } from "zod";

export const createOrganizationSchema = z.object({
  nom: z.string().min(2, "Le nom est requis."),
  type: z.enum(["ENTREPRISE", "INSTITUTION", "PARTENAIRE", "FOURNISSEUR", "INVESTISSEUR", "AUTRE"]),
  secteur: z.string().optional(),
  siteWeb: z.string().optional(),
  telephone: z.string().optional(),
  email: z.string().email("Email invalide.").optional().or(z.literal("")),
  adresse: z.string().optional(),
  notes: z.string().optional(),
  ownerId: z.string().optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const updateOrganizationSchema = createOrganizationSchema.extend({
  id: z.string().min(1),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

export const createContactSchema = z.object({
  prenom: z.string().min(1, "Le prénom est requis."),
  nom: z.string().min(1, "Le nom est requis."),
  email: z.string().email("Email invalide.").optional().or(z.literal("")),
  telephone: z.string().optional(),
  fonction: z.string().optional(),
  type: z.enum([
    "CLIENT",
    "PROSPECT",
    "PARTENAIRE",
    "FOURNISSEUR",
    "CONSULTANT",
    "PRESTATAIRE",
    "CANDIDAT",
    "MEMBRE",
    "INVESTISSEUR",
    "AUTRE",
  ]),
  source: z.string().optional(),
  organizationId: z.string().optional(),
  notes: z.string().optional(),
  ownerId: z.string().optional(),
  score: z.number().int().min(0).max(100).optional(),
  segment: z.string().optional(),
  prochaineRelance: z.string().optional(),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;

export const updateContactSchema = createContactSchema.extend({
  id: z.string().min(1),
});

export type UpdateContactInput = z.infer<typeof updateContactSchema>;

export const createOpportunitySchema = z.object({
  nom: z.string().min(2, "Le nom est requis."),
  contactId: z.string().optional(),
  organizationId: z.string().optional(),
  montantEstime: z.string().optional(),
  probabilite: z.number().int().min(0).max(100).optional(),
  source: z.string().optional(),
  dateClotureEstimee: z.string().optional(),
  notes: z.string().optional(),
  ownerId: z.string().min(1, "Un responsable est requis."),
});

export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;

export const updateOpportunitySchema = createOpportunitySchema.extend({
  id: z.string().min(1),
});

export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>;

export const updateOpportunityStatusSchema = z.object({
  id: z.string().min(1),
  statut: z.enum(["NOUVEAU", "QUALIFICATION", "PROPOSITION", "NEGOCIATION", "GAGNEE", "PERDUE"]),
  raisonPerte: z.string().optional(),
});

export type UpdateOpportunityStatusInput = z.infer<typeof updateOpportunityStatusSchema>;

export const createInteractionSchema = z
  .object({
    type: z.enum(["EMAIL", "APPEL", "WHATSAPP", "REUNION", "VISITE", "NOTE", "MESSAGE", "EVENEMENT"]),
    contenu: z.string().min(1, "Le contenu est requis."),
    dateInteraction: z.string().optional(),
    contactId: z.string().optional(),
    organizationId: z.string().optional(),
    opportunityId: z.string().optional(),
  })
  .refine((data) => !!data.contactId || !!data.organizationId || !!data.opportunityId, {
    message: "Une interaction doit être rattachée à un contact, une organisation ou une opportunité.",
  });

export type CreateInteractionInput = z.infer<typeof createInteractionSchema>;
