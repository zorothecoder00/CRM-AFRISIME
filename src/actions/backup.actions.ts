"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { importBackupData, type BackupPayload, type ImportResult } from "@/lib/backup";

export async function importBackup(jsonText: string): Promise<ImportResult> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.DATA_BACKUP_MANAGE);

  let payload: BackupPayload;
  try {
    payload = JSON.parse(jsonText);
  } catch {
    throw new Error("Fichier invalide : JSON illisible.");
  }
  if (typeof payload.version !== "number" || !payload.tables) {
    throw new Error("Fichier invalide : ce n'est pas une sauvegarde AfriSime Work-Space.");
  }

  const results = await importBackupData(payload);

  await logAudit({
    userId: session.user.id,
    action: "backup.imported",
    entityType: "Backup",
    entityId: payload.exportedAt,
    changes: { results },
  });

  return results;
}
