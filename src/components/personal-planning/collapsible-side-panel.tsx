"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PanelRightClose, PanelRightOpen } from "lucide-react";

/**
 * Panneau "À planifier" repliable (demande utilisateur) — laisse plus de
 * place à la grille du calendrier. Colonne parente en `auto` (voir
 * planning-personnel/page.tsx) : la largeur suit simplement ce composant,
 * pleine largeur déplié ou réduit à la seule icône replié.
 */
export function CollapsiblePlanningSidePanel({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="flex justify-start">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCollapsed(false)}
          title="Afficher « À planifier »"
          aria-label="Afficher « À planifier »"
        >
          <PanelRightOpen className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-[280px] space-y-6">
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(true)}
          title="Réduire « À planifier »"
          aria-label="Réduire « À planifier »"
        >
          <PanelRightClose className="h-4 w-4" />
        </Button>
      </div>
      {children}
    </div>
  );
}
