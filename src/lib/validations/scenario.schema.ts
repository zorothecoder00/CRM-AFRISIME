import { z } from "zod";

export const createScenarioSchema = z
  .object({
    nom: z.string().min(2, "Le nom est requis."),
    description: z.string().optional(),
    type: z.enum(["EFFECTIF", "RESSOURCES", "PROJETS", "NOUVELLE_FILIALE", "PERSONNALISE"]),
    deltaEffectifPercent: z.string().optional(),
    deltaRessourcesPercent: z.string().optional(),
    deltaProjetsPercent: z.string().optional(),
    nouvelleFilialeEffectif: z.string().optional(),
    nouvelleFilialeProjets: z.string().optional(),
    departmentId: z.string().optional(),
  })
  .refine((d) => d.type !== "NOUVELLE_FILIALE" || !!d.nouvelleFilialeEffectif, {
    message: "L'effectif de la nouvelle filiale est requis.",
    path: ["nouvelleFilialeEffectif"],
  });

export type CreateScenarioInput = z.infer<typeof createScenarioSchema>;
