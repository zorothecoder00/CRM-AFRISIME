import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/permissions";
import { authenticateApiKey, apiKeyHasPermission } from "@/lib/api-keys";
import { withTenantScopedSession } from "@/lib/tenant-scoped-prisma";

/** Voir /api/v1/projects/route.ts pour le contexte général (§34). */
export async function GET(request: NextRequest) {
  const apiKey = await authenticateApiKey(request.headers.get("authorization"));
  if (!apiKey) {
    return NextResponse.json({ error: "Clé API invalide ou manquante" }, { status: 401 });
  }
  if (!apiKeyHasPermission(apiKey, PERMISSIONS.TASK_READ)) {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  }

  const projectId = request.nextUrl.searchParams.get("projectId") ?? undefined;

  // Isolation multi-tenant (RLS, voir tenant-scoped-prisma.ts) — une clé API
  // ne doit jamais pouvoir lire les tâches d'une autre organisation que la
  // sienne, quel que soit le filtre projectId fourni.
  const tasks = await withTenantScopedSession(apiKey.organizationId, (tx) =>
    tx.task.findMany({
      where: projectId ? { projectId } : undefined,
      include: { project: { select: { id: true, nom: true } }, responsablePrincipal: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 200,
    })
  );

  return NextResponse.json({
    data: tasks.map((t) => ({
      id: t.id,
      titre: t.titre,
      statut: t.statut,
      priorite: t.priorite,
      avancement: t.avancement,
      echeance: t.echeance,
      projet: t.project,
      responsable: t.responsablePrincipal,
      updatedAt: t.updatedAt,
    })),
  });
}
