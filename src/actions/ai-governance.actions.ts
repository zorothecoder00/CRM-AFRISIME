"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { approvePendingAiAction, rejectPendingAiAction } from "@/lib/automation";
import { logAudit } from "@/lib/audit";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/** Human in the loop (cahier des charges V2.2 §43) : IA → Proposition → Validation humaine → Exécution. */
export async function approveAiAction(pendingId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.AI_GOVERNANCE_APPROVE);

  await approvePendingAiAction(pendingId, session.user.id);
  await logAudit({ userId: session.user.id, action: "ai_action.approved", entityType: "PendingAiAction", entityId: pendingId });

  revalidatePath("/gouvernance-ia");
}

export async function rejectAiAction(pendingId: string, motif?: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.AI_GOVERNANCE_APPROVE);

  await rejectPendingAiAction(pendingId, session.user.id, motif);
  await logAudit({ userId: session.user.id, action: "ai_action.rejected", entityType: "PendingAiAction", entityId: pendingId, changes: { motif } });

  revalidatePath("/gouvernance-ia");
}
