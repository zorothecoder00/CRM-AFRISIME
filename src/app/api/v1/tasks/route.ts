import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { authenticateApiKey, apiKeyHasPermission } from "@/lib/api-keys";

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

  const tasks = await prisma.task.findMany({
    where: projectId ? { projectId } : undefined,
    include: { project: { select: { id: true, nom: true } }, responsablePrincipal: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

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
