import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { authenticateApiKey, apiKeyHasPermission } from "@/lib/api-keys";

/**
 * Data & Analytics Platform (cahier des charges V3.0 §48) — "préparer une
 * architecture de données [...] éviter de créer une architecture qui
 * empêche la montée en charge future." État réel par facette du cahier,
 * pour que la préparation reste honnête plutôt qu'une simple liste de
 * mots-clés :
 *
 *  - API          : ✅ /api/v1/* (projets, tâches, et maintenant métriques
 *    ci-dessous) + webhooks entrants (Integration/IntegrationEvent, §21).
 *    Authentification par clé API, permissions scoped — déjà la surface
 *    d'intégration externe, pas à reconstruire pour un futur DW/BI.
 *  - BI +
 *    Tableaux de
 *    bord       : ✅ largement couvert en interne (/tableaux-de-bord,
 *    /rapports, /benchmarking, tous les modules §11-14/§32-34/§44 de cette
 *    extension). Ce point d'API est ce qu'un outil BI EXTERNE (Power BI,
 *    Metabase...) consommerait au lieu de se connecter directement à la
 *    base OLTP — évite de coupler le schéma interne à des dashboards tiers.
 *  - Modèles
 *    prédictifs : ✅ predictive-scoring.ts, health-score.ts,
 *    maturity-assessment.ts, transformation-roadmap.ts — tous calculés à la
 *    volée sur les données réelles (heuristiques déterministes, pas de
 *    modèle entraîné : aucune infra ML/clé LLM disponible dans cette
 *    instance, cohérent avec le reste de l'app).
 *  - ETL/ELT      : 🟡 partiel — le cron quotidien (daily-checks) et
 *    hebdomadaire (weekly-review) jouent ce rôle en pratique (transforment
 *    des données OLTP en insights/notifications/MetricSnapshot), mais ce
 *    n'est pas un pipeline ETL nommé/réutilisable en dehors de ces deux
 *    jobs. Formaliser un vrai orchestrateur ETL reste un chantier séparé.
 *  - Data
 *    Warehouse /
 *    Data Lake   : ❌ non implémenté. MetricSnapshot (append-only,
 *    entityType/entityId/metric/valeur/capturedAt) est délibérément le
 *    SEUL point d'écriture time-series de l'app — c'est la fondation sur
 *    laquelle un futur DW se brancherait (via ce point d'API plutôt qu'un
 *    accès direct à Postgres), sans qu'aucune table OLTP n'ait à changer.
 *    Choisir DW vs Data Lake dépend du volume/de la variété de données à
 *    ce moment-là — prématuré de trancher maintenant.
 *
 * Ce point d'API expose MetricSnapshot à des outils BI externes, sur le
 * même modèle que /api/v1/projects et /api/v1/tasks (§34) : lecture seule,
 * clé API, pas de session.
 */
export async function GET(request: NextRequest) {
  const apiKey = await authenticateApiKey(request.headers.get("authorization"));
  if (!apiKey) {
    return NextResponse.json({ error: "Clé API invalide ou manquante" }, { status: 401 });
  }
  if (!apiKeyHasPermission(apiKey, PERMISSIONS.REPORT_EXPORT)) {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  }

  const entityType = request.nextUrl.searchParams.get("entityType") ?? undefined;
  const metric = request.nextUrl.searchParams.get("metric") ?? undefined;
  const since = request.nextUrl.searchParams.get("since");

  const snapshots = await prisma.metricSnapshot.findMany({
    where: {
      entityType,
      metric,
      capturedAt: since ? { gte: new Date(since) } : undefined,
    },
    orderBy: { capturedAt: "desc" },
    take: 1000,
  });

  return NextResponse.json({
    data: snapshots.map((s) => ({
      entityType: s.entityType,
      entityId: s.entityId,
      metric: s.metric,
      valeur: Number(s.valeur),
      capturedAt: s.capturedAt,
    })),
  });
}
