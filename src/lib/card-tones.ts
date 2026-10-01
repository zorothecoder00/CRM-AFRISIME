/**
 * Teintes de fond de cartes, en classes Tailwind à appliquer explicitement
 * sur chaque <Card> concernée (opt-in) — jamais via une règle globale dans
 * globals.css, qui déborde sur des pages non ciblées (ex. la carte de /login).
 *
 * Les teintes redéfinissent --card plutôt que background : bg-card ET les
 * dégradés d'accent de statut du composant Card (color-mix(var(--card), ...))
 * suivent donc automatiquement.
 */

// Données DANS une carte teintée : le tableau entier (en-tête compris), les
// items de liste bordés rounded-md/lg et les cartes imbriquées passent sur le
// gris du fond de page, la carte gardant sa teinte autour — sinon ils prennent
// exactement la teinte de la carte et s'y fondent. Sélecteurs entièrement dans :where() =
// spécificité nulle : un élément qui pose sa propre couleur (bg-warning/10,
// hover:bg-muted/50...) garde la main.
const NEUTRAL_ROWS = [
  "[:where(&_[data-slot=table-container],&_:is(li,div):is(.rounded-md,.rounded-lg).border)]:bg-background",
  "[:where(&_[data-slot=table-container])]:rounded-md",
  // Cartes imbriquées (ex. une carte par session active) : --card ramené au
  // gris du fond de page, sinon elles héritent la teinte de la carte parente.
  "[:where(&_[data-slot=card])]:[--card:var(--background)]",
].join(" ");

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
export const MATERIAL_RED = `[--card:#FFCDD2] dark:[--card:color-mix(in_oklch,oklch(0.205_0_0),#B71C1C_40%)] ${NEUTRAL_ROWS}`;

/** Teinte Material en rotation selon la position de la carte dans sa liste. */
export function materialTone(index: number): string {
  return `${MATERIAL_TONES[index % MATERIAL_TONES.length]} ${NEUTRAL_ROWS}`;
}

// Couleurs du logo AfriSime (bleu roi / vert / or) — teinte unie légère sur fond de
// carte, sans barre de tête (retirée à la demande). S'applique à l'enveloppe d'un widget qui
// rend lui-même sa <Card> (ciblée via [&>[data-slot=card]]).
export const BRAND_TINTS = {
  blue: "[&>[data-slot=card]]:border-t-0 [&>[data-slot=card]]:bg-[color-mix(in_oklch,var(--card),#1d4fc4_6%)]",
  green:
    "[&>[data-slot=card]]:border-t-0 [&>[data-slot=card]]:bg-[color-mix(in_oklch,var(--card),#2f9e2f_6%)]",
  gold: "[&>[data-slot=card]]:border-t-0 [&>[data-slot=card]]:bg-[color-mix(in_oklch,var(--card),#f2b705_6%)]",
} as const;

export type BrandTint = keyof typeof BRAND_TINTS;
