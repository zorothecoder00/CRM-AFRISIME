"use client";

import { createContext, useContext, useState } from "react";
import { Button } from "@/components/ui/button";
import { PanelRightClose, PanelRightOpen } from "lucide-react";

const SidePanelContext = createContext<{ collapsed: boolean; toggle: () => void } | null>(null);

/**
 * Panneau "À planifier" repliable (demande utilisateur) — laisse plus de
 * place à la grille du calendrier. Le bouton bascule vit dans la même
 * rangée que le sélecteur de vue/navigation de période (pour que les deux
 * colonnes démarrent "au même niveau", demande utilisateur), pas dans la
 * colonne elle-même : état partagé via ce contexte plutôt que des props qui
 * traverseraient toute la page.
 */
export function SidePanelProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return <SidePanelContext.Provider value={{ collapsed, toggle: () => setCollapsed((c) => !c) }}>{children}</SidePanelContext.Provider>;
}

export function SidePanelToggleButton() {
  const ctx = useContext(SidePanelContext);
  if (!ctx) return null;
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={ctx.toggle}
      title={ctx.collapsed ? "Afficher « À planifier »" : "Réduire « À planifier »"}
      aria-label={ctx.collapsed ? "Afficher « À planifier »" : "Réduire « À planifier »"}
    >
      {ctx.collapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
    </Button>
  );
}

/**
 * Colonne parente en `auto` (voir planning-personnel/page.tsx) : sa largeur
 * suit simplement ce composant, vide (et donc de largeur nulle) une fois
 * replié.
 *
 * Sous `xl`, ce panneau n'est plus à côté du calendrier mais empilé en bas
 * de page (grille racine repassée en une colonne) — y garder ses propres
 * enfants strictement empilés (comme à xl, en 280px fixes) les faisait
 * continuer vers le bas et créait un pavé étroit mal aligné dans la pleine
 * largeur disponible (demande utilisateur). En dessous de `xl` seulement,
 * on passe donc en grille 2 colonnes pleine largeur — "À planifier" occupe
 * la première colonne, le reste (Health + Charge, groupés par l'appelant)
 * la seconde — avant de revenir à l'empilement 280px habituel à `xl`.
 */
export function CollapsiblePlanningSidePanel({ children }: { children: React.ReactNode }) {
  const ctx = useContext(SidePanelContext);
  if (ctx?.collapsed) return null;
  return <div className="grid grid-cols-2 items-start gap-4 xl:flex xl:w-[280px] xl:flex-col xl:gap-6">{children}</div>;
}
