import { z } from "zod";

// /rapports, bloc "Rapports d'activité (manuels)" — un fichier importé
// manuellement (rédigé hors de l'application), pas rattaché à un projet.
export const createActivityReportSchema = z.object({
  titre: z.string().min(2, "Le titre est requis."),
  description: z.string().optional(),
  url: z.string().min(1, "Un fichier est requis."),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().positive().optional(),
});

export type CreateActivityReportInput = z.infer<typeof createActivityReportSchema>;

// Partage à un utilisateur OU une équipe (jamais les deux) — voir
// ActivityReportShare dans schema.prisma.
export const shareActivityReportSchema = z
  .object({
    reportId: z.string().min(1),
    userId: z.string().optional(),
    teamId: z.string().optional(),
  })
  .refine((d) => (!!d.userId) !== (!!d.teamId), {
    message: "Choisissez soit un utilisateur, soit une équipe (pas les deux).",
  });

export type ShareActivityReportInput = z.infer<typeof shareActivityReportSchema>;

export const unshareActivityReportSchema = z.object({
  shareId: z.string().min(1),
});

export type UnshareActivityReportInput = z.infer<typeof unshareActivityReportSchema>;
