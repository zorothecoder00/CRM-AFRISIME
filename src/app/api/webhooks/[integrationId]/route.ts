import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runIntegrationEventRules } from "@/lib/automation";

/** Comparaison à temps constant — évite qu'un attaquant reconstitue la clé octet par octet via le timing de la réponse. */
function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Webhook entrant générique (cahier des charges §21). Validé par clé
 * partagée (`x-api-key`, égale à Integration.apiKey) — aucun appel sortant
 * vers un service tiers n'est effectué, ce MVP se limite à recevoir et
 * journaliser les événements.
 *
 * Revue de robustesse (2026-09-11) — la clé API est désormais obligatoire :
 * une intégration créée sans clé (ou dont la clé a été vidée) acceptait
 * auparavant n'importe quelle requête de quiconque connaissait/énumérait son
 * `integrationId`, qui déclenche pourtant de vraies automatisations
 * (runIntegrationEventRules).
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

  if (!integration.apiKey) {
    return NextResponse.json(
      { error: "Aucune clé API configurée pour cette intégration — webhook désactivé." },
      { status: 401 }
    );
  }
  const providedKey = request.headers.get("x-api-key");
  if (!providedKey || !timingSafeStringEqual(providedKey, integration.apiKey)) {
    return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
  }

  const payload = await request.json().catch(() => ({}));
  const eventType = request.headers.get("x-event-type") ?? "unknown";
  // Déduplication d'une redélivrance (retry réseau côté émetteur) — évite de
  // redéclencher deux fois les règles d'automatisation pour le même
  // événement. Sans id fourni par l'émetteur, aucune déduplication possible.
  const externalEventId =
    request.headers.get("x-event-id") ||
    (typeof payload?.id === "string" ? payload.id : undefined) ||
    (typeof payload?.eventId === "string" ? payload.eventId : undefined) ||
    undefined;

  if (externalEventId) {
    const existing = await prisma.integrationEvent.findUnique({
      where: { integrationId_externalEventId: { integrationId, externalEventId } },
    });
    if (existing) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
  }

  const event = await prisma.integrationEvent.create({
    data: { integrationId, eventType, payload, externalEventId },
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
