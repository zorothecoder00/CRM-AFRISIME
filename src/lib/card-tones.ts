/**
 * Teintes de fond de cartes, en classes Tailwind à appliquer explicitement
 * sur chaque <Card> concernée (opt-in) — jamais via une règle globale dans
 * globals.css, qui déborde sur des pages non ciblées (ex. la carte de /login).
 *
 * Les teintes redéfinissent --card plutôt que background : bg-card ET les
 * dégradés d'accent de statut du composant Card (color-mix(var(--card), ...))
 * suivent donc automatiquement.
 */

// Refonte « épurée façon Jira » : la rotation de teintes Material (bleu,
// vert, ambre, violet...) sur chaque carte est neutralisee — toutes les
// cartes restent blanches et c'est la donnee (lozenges, liseres d'accent)
// qui porte la couleur. Le tableau est conserve pour ne casser aucun import.
export const MATERIAL_TONES = [""] as const;

// Teinte hors rotation, pour un bloc qui doit ressortir (Red 100 / Red 900).
export const MATERIAL_RED = "border-l-destructive bg-[#fff8f7] dark:bg-[#2a1d1c]";

/** Teinte Material en rotation selon la position de la carte dans sa liste. */
export function materialTone(index: number): string {
  void index;
  return "";
}

// Couleurs du logo AfriSime (bleu roi / vert / or) — teinte unie légère sur fond de
// carte, sans barre de tête (retirée à la demande). S'applique à l'enveloppe d'un widget qui
// rend lui-même sa <Card> (ciblée via [&>[data-slot=card]]).
export const BRAND_TINTS = {
  blue: "",
  green: "",
  gold: "",
} as const;

export type BrandTint = keyof typeof BRAND_TINTS;

// Memes couleurs que BRAND_TINTS en un peu plus fonce (12% au lieu de 6%, pour
// /dashboard), a poser directement en className sur une
// <Card> sans accent (bg-card remplace via tailwind-merge).
export const BRAND_CARD_BG: Record<BrandTint, string> = {
  blue: "",
  green: "",
  gold: "",
};

// Demande utilisateur — plus de barres d'accent en tete de carte : quand la
// couleur portait un sens (alerte, score, categorie SWOT...), elle passe sur
// le fond du bloc via ces teintes, indexees comme la prop `accent` de <Card>.
export const TONE_BG = {
  none: "",
  primary: "border-l-primary",
  info: "border-l-info",
  success: "border-l-success",
  warning: "border-l-warning bg-[#fffbeb] dark:bg-[#29261a]",
  destructive: "border-l-destructive bg-[#fff8f7] dark:bg-[#2a1d1c]",
} as const;

/** Fond d'alerte uniquement (rouge / orange) ; rien pour les tons neutres ou positifs. */
export function alertBg(tone: keyof typeof TONE_BG): string {
  return tone === "destructive" || tone === "warning" ? TONE_BG[tone] : "";
}
