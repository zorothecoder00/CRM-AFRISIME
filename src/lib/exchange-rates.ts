import { cache } from "react";
import { prisma } from "@/lib/prisma";

// Conversion de change (revue applicative du 2026-08-19) — voir le
// commentaire sur ExchangeRate dans schema.prisma : taux maintenus
// manuellement par un administrateur (/administration/devises), aucune
// clé API de taux en direct disponible dans cette instance.

const getAllRates = cache(async () => {
  return prisma.exchangeRate.findMany({ select: { fromDevise: true, toDevise: true, taux: true } });
});

/** Taux de `from` vers `to` (1 si identiques, l'inverse d'un taux existant si seul le sens opposé est enregistré, null si aucun taux connu). */
export async function getExchangeRate(from: string, to: string): Promise<number | null> {
  if (from === to) return 1;
  const rates = await getAllRates();
  const direct = rates.find((r) => r.fromDevise === from && r.toDevise === to);
  if (direct) return Number(direct.taux);
  const inverse = rates.find((r) => r.fromDevise === to && r.toDevise === from);
  if (inverse) return 1 / Number(inverse.taux);
  return null;
}

export type ConversionResult = { value: number; converted: boolean };

/**
 * Convertit un montant vers `to`. Si aucun taux n'est configuré pour la
 * paire, retourne le montant BRUT tel quel avec `converted: false` plutôt
 * que d'inventer un taux — c'est à l'appelant de signaler visuellement
 * qu'un total est potentiellement incomplet (voir conversionIncomplete
 * dans src/lib/consolidation.ts).
 */
export async function convertMontant(amount: number, from: string, to: string): Promise<ConversionResult> {
  const rate = await getExchangeRate(from, to);
  if (rate === null) return { value: amount, converted: false };
  return { value: amount * rate, converted: true };
}
