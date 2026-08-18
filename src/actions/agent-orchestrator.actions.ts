"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { recordOrchestrationRecommendation } from "@/lib/agent-orchestrator";

/** AI Agent Orchestrator (cahier des charges V3.0 §16) — journalise la recommandation consolidée en AiAgentInsight. */
export async function triggerAgentOrchestration() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.DASHBOARD_READ);

  return recordOrchestrationRecommendation();
}
