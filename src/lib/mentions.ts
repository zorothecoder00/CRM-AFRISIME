export type MentionCandidate = { id: string; name: string };

/**
 * Détecte les mentions `@Prénom` dans un texte et les associe aux
 * utilisateurs candidats par correspondance sur le premier mot de leur nom
 * (insensible à la casse). Ce n'est pas un autocomplétage en direct : c'est
 * une correspondance simple au moment de l'envoi, volontairement limitée
 * pour ce MVP.
 */
export function parseMentions(content: string, candidates: MentionCandidate[]): string[] {
  const tokens = Array.from(content.matchAll(/@(\w+)/g)).map((m) => m[1].toLowerCase());
  if (tokens.length === 0) return [];

  const matched = new Set<string>();
  for (const token of tokens) {
    const candidate = candidates.find(
      (c) => c.name.trim().split(/\s+/)[0]?.toLowerCase() === token
    );
    if (candidate) matched.add(candidate.id);
  }
  return Array.from(matched);
}

/** Découpe un texte en segments pour mettre en évidence les `@mentions` à l'affichage. */
export function splitMentionSegments(content: string): { text: string; isMention: boolean }[] {
  const parts = content.split(/(@\w+)/g);
  return parts.filter(Boolean).map((part) => ({
    text: part,
    isMention: /^@\w+$/.test(part),
  }));
}
