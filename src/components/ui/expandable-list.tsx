"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * Liste tronquee a `max` elements avec un bouton "Voir N de plus" qui
 * deplie le reste sur place — pour les cartes de synthese sans page dediee
 * vers laquelle renvoyer (contrairement a un lien "Voir tout" classique).
 * `items` est deja rendu cote serveur (chaque element avec sa propre key) ;
 * ce composant ne fait que trancher/afficher, pas de logique de rendu.
 */
export function ExpandableList({
  items,
  max = 5,
  moreLabel,
}: {
  items: ReactNode[];
  max?: number;
  moreLabel?: (n: number) => string;
}) {
  const [open, setOpen] = useState(false);
  const visible = items.slice(0, max);
  const rest = items.slice(max);

  return (
    <>
      {visible}
      {open && rest}
      {rest.length > 0 && (
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setOpen((v) => !v)}>
          {open ? "Voir moins" : moreLabel ? moreLabel(rest.length) : `Voir ${rest.length} de plus`}
        </Button>
      )}
    </>
  );
}
