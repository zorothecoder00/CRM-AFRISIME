import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { authenticateApiKey, apiKeyHasPermission } from "@/lib/api-keys";

/**
 * API REST sortante (cahier des charges V2.2 §34) — lecture seule,
 * volontairement limitée à Projets/Tâches (les deux ressources les plus
 * susceptibles d'être consommées par un système externe comme AfriGes) plutôt
 * qu'une exposition CRUD complète de tous les modèles, hors périmètre
 * proportionné de ce lot. Authentification par clé API (Bearer), pas de
 * session utilisateur.
 */
export async function GET(request: NextRequest) {
  const apiKey = await authenticateApiKey(request.headers.get("authorization"));
  if (!apiKey) {
    return NextResponse.json({ error: "Clé API invalide ou manquante" }, { status: 401 });
  }
  if (!apiKeyHasPermission(apiKey, PERMISSIONS.PROJECT_READ)) {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  }

  const projects = await prisma.project.findMany({
    include: { department: true, responsable: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    data: projects.map((p) => ({
      id: p.id,
      nom: p.nom,
      statut: p.statut,
      priorite: p.priorite,
      avancement: p.avancement,
      departement: p.department.name,
      responsable: p.responsable,
      dateDebut: p.dateDebut,
      dateFin: p.dateFin,
      updatedAt: p.updatedAt,
    })),
  });
}
