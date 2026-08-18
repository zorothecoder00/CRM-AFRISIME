import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runIntegrationEventRules } from "@/lib/automation";

/**
 * Webhook entrant générique (cahier des charges §21). Validé par clé
 * partagée (`x-api-key`, égale à Integration.apiKey si renseignée) — aucun
 * appel sortant vers un service tiers n'est effectué, ce MVP se limite à
 * recevoir et journaliser les événements.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  const { integrationId } = await params;

  const integration = await prisma.integration.findUnique({ where: { id: integrationId } });
  if (!integration) {
    return NextResponse.json({ error: "Intégration inconnue" }, { status: 404 });
  }

  if (integration.apiKey) {
    const providedKey = request.headers.get("x-api-key");
    if (providedKey !== integration.apiKey) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }
  }

  const payload = await request.json().catch(() => ({}));
  const eventType = request.headers.get("x-event-type") ?? "unknown";

  const event = await prisma.integrationEvent.create({
    data: { integrationId, eventType, payload },
  });

  await prisma.integration.update({
    where: { id: integrationId },
    data: { statut: "CONNECTE", lastSyncAt: new Date() },
  });

  // Automatisation inter-systèmes (V2.2 §35) — l'événement reçu peut
  // déclencher une vraie action (tâche, notification, KPI), pas seulement
  // être journalisé. Voir src/lib/automation.ts.
  await runIntegrationEventRules({
    id: event.id,
    integrationId,
    integrationType: integration.type,
    eventType,
  });

  return NextResponse.json({ ok: true });
}
