/**
 * Teintes de fond de cartes, en classes Tailwind à appliquer explicitement
 * sur chaque <Card> concernée (opt-in) — jamais via une règle globale dans
 * globals.css, qui déborde sur des pages non ciblées (ex. la carte de /login).
 *
 * Les teintes redéfinissent --card plutôt que background : bg-card ET les
 * dégradés d'accent de statut du composant Card (color-mix(var(--card), ...))
 * suivent donc automatiquement.
 */

// Palette Material Design — teintes 100 en clair, 900 atténuées en sombre.
export const MATERIAL_TONES = [
  "[--card:#BBDEFB] dark:[--card:color-mix(in_oklch,oklch(0.205_0_0),#0D47A1_40%)]", // Blue
  "[--card:#C8E6C9] dark:[--card:color-mix(in_oklch,oklch(0.205_0_0),#1B5E20_40%)]", // Green
  "[--card:#FFECB3] dark:[--card:color-mix(in_oklch,oklch(0.205_0_0),#FF6F00_40%)]", // Amber
  "[--card:#E1BEE7] dark:[--card:color-mix(in_oklch,oklch(0.205_0_0),#4A148C_40%)]", // Purple
  "[--card:#B2DFDB] dark:[--card:color-mix(in_oklch,oklch(0.205_0_0),#004D40_40%)]", // Teal
  "[--card:#FFCCBC] dark:[--card:color-mix(in_oklch,oklch(0.205_0_0),#BF360C_40%)]", // Deep Orange
  "[--card:#C5CAE9] dark:[--card:color-mix(in_oklch,oklch(0.205_0_0),#1A237E_40%)]", // Indigo
  "[--card:#F8BBD0] dark:[--card:color-mix(in_oklch,oklch(0.205_0_0),#880E4F_40%)]", // Pink
] as const;

// Teinte hors rotation, pour un bloc qui doit ressortir (Red 100 / Red 900).
export const MATERIAL_RED = "[--card:#FFCDD2] dark:[--card:color-mix(in_oklch,oklch(0.205_0_0),#B71C1C_40%)]";

/** Teinte Material en rotation selon la position de la carte dans sa liste. */
export function materialTone(index: number): string {
  return MATERIAL_TONES[index % MATERIAL_TONES.length];
}

// Couleurs du logo AfriSime (bleu roi / vert / or) — dégradé sur fond de
// carte + barre de tête colorée. S'applique à l'enveloppe d'un widget qui
// rend lui-même sa <Card> (ciblée via [&>[data-slot=card]]).
export const BRAND_TINTS = {
  blue: "[&>[data-slot=card]]:border-t-[#1d4fc4] [&>[data-slot=card]]:bg-[linear-gradient(160deg,color-mix(in_oklch,var(--card),#1d4fc4_24%),color-mix(in_oklch,var(--card),#1d4fc4_9%)_70%)]",
  green:
    "[&>[data-slot=card]]:border-t-[#2f9e2f] [&>[data-slot=card]]:bg-[linear-gradient(160deg,color-mix(in_oklch,var(--card),#2f9e2f_24%),color-mix(in_oklch,var(--card),#2f9e2f_9%)_70%)]",
  gold: "[&>[data-slot=card]]:border-t-[#f2b705] [&>[data-slot=card]]:bg-[linear-gradient(160deg,color-mix(in_oklch,var(--card),#f2b705_24%),color-mix(in_oklch,var(--card),#f2b705_9%)_70%)]",
} as const;

export type BrandTint = keyof typeof BRAND_TINTS;
