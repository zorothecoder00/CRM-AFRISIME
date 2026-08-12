/**
 * Un courrier confidentiel n'est visible que du créateur, du responsable
 * assigné, ou des gestionnaires (COURRIER_MANAGE) — la simple permission de
 * lecture (COURRIER_READ) ne suffit pas pour lire le contenu confidentiel.
 */
export function canViewCourrier(
  courrier: { confidentiel: boolean; createdById: string; responsableId: string | null },
  userId: string,
  canManage: boolean
): boolean {
  if (!courrier.confidentiel) return true;
  return canManage || courrier.createdById === userId || courrier.responsableId === userId;
}
