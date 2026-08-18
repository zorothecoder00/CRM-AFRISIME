import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { exportBackupData } from "@/lib/backup";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.permissions.includes(PERMISSIONS.DATA_BACKUP_MANAGE)) {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  }

  const payload = await exportBackupData();

  await logAudit({ userId: session.user.id, action: "backup.exported", entityType: "Backup", entityId: payload.exportedAt });

  return new NextResponse(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="afriflow-backup-${payload.exportedAt.slice(0, 10)}.json"`,
    },
  });
}
