"use client";

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type MentionCandidate = { id: string; name: string };

/**
 * Trouve la mention en cours de frappe juste avant le curseur (ex. "@aw" dans
 * "salut @aw|"). Le `@` doit etre precede d'un debut de texte ou d'un espace
 * pour ne pas se declencher au milieu d'un mot ou d'un email.
 */
function findActiveMention(text: string, caret: number): { start: number; query: string } | null {
  const upToCaret = text.slice(0, caret);
  const match = upToCaret.match(/(?:^|\s)@(\w*)$/);
  if (!match) return null;
  const query = match[1];
  return { start: caret - query.length - 1, query };
}

/**
 * Textarea avec autocomplétion `@mention` (cahier des charges §11) : ouvre
 * une liste des candidats dès qu'on tape `@`, filtrée en direct, navigable
 * au clavier. Reste un remplacement direct de `Textarea` (même API
 * value/onChange) — `parseMentions`/`splitMentionSegments` (src/lib/mentions.ts)
 * continuent d'interpréter le texte final de la même façon, seule la saisie
 * change : on insère toujours `@Prénom` (premier mot du nom), jamais un ID,
 * pour rester compatible avec cette détection texte existante.
 */
export function MentionTextarea({
  value,
  onChange,
  candidates,
  onKeyDown,
  onBlur,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Textarea>, "value" | "onChange"> & {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  candidates: MentionCandidate[];
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Repositionne le curseur apres l'insertion d'une mention, une fois que le
  // nouveau `value` (controle par le parent) est redescendu et re-rendu.
  useEffect(() => {
    if (pendingCaret.current !== null) {
      ref.current?.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    }
  }, [value]);

  const query = mention?.query.toLowerCase() ?? "";
  const filtered = mention
    ? candidates
        .filter((c) => c.name.toLowerCase().includes(query))
        .sort((a, b) => {
          const aStarts = a.name.toLowerCase().startsWith(query);
          const bStarts = b.name.toLowerCase().startsWith(query);
          return aStarts === bStarts ? 0 : aStarts ? -1 : 1;
        })
        .slice(0, 6)
    : [];

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const caret = e.target.selectionStart ?? e.target.value.length;
    setMention(findActiveMention(e.target.value, caret));
    setActiveIndex(0);
    onChange(e);
  }

  function selectCandidate(candidate: MentionCandidate) {
    if (!mention || !ref.current) return;
    const firstName = candidate.name.trim().split(/\s+/)[0];
    const before = value.slice(0, mention.start);
    const after = value.slice(mention.start + 1 + mention.query.length);
    const insertion = `@${firstName} `;
    pendingCaret.current = before.length + insertion.length;
    setMention(null);
    onChange({ target: { value: `${before}${insertion}${after}` } } as ChangeEvent<HTMLTextAreaElement>);
    ref.current.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (mention && filtered.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectCandidate(filtered[activeIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.stopPropagation();
        setMention(null);
        return;
      }
    }
    onKeyDown?.(e);
  }

  return (
    <div className="relative flex-1">
      <Textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        // Delai avant de fermer : laisse le temps au onMouseDown d'une
        // suggestion de s'executer avant que le blur ne demonte la liste.
        onBlur={(e) => {
          setTimeout(() => setMention(null), 150);
          onBlur?.(e);
        }}
        className={className}
        {...props}
      />
      {mention && filtered.length > 0 && (
        <div className="absolute bottom-full left-0 z-20 mb-1 max-h-48 w-56 overflow-y-auto rounded-lg border bg-popover py-1 text-sm shadow-md ring-1 ring-foreground/10">
          {filtered.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                selectCandidate(c);
              }}
              className={cn(
                "flex w-full items-center px-2.5 py-1.5 text-left",
                i === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted"
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
