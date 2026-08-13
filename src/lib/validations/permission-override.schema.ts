import { z } from "zod";

// Une derogation doit toujours porter sur une portee precise (departement ou
// projet) : hasScopedPermission (src/lib/permissions-scoped.ts) ne consulte
// PermissionOverride que lorsqu'un scope est fourni a l'appel, donc une
// derogation sans departmentId ni projectId ne serait jamais prise en compte.
export const createPermissionOverrideSchema = z.object({
  userId: z.string().min(1, "Un utilisateur est requis."),
  permissionKey: z.string().min(1, "Une permission est requise."),
  scopeType: z.enum(["DEPARTEMENT", "PROJET"]),
  scopeId: z.string().min(1, "Une portée est requise."),
  effect: z.enum(["GRANT", "DENY"]),
});

export type CreatePermissionOverrideInput = z.infer<typeof createPermissionOverrideSchema>;
