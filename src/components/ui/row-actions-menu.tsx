"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";

/**
 * Menu d'actions (kebab) réutilisable pour une ligne/carte de liste.
 * `stopPropagation` sur le déclencheur car ce menu est souvent posé sur une
 * carte/ligne elle-même cliquable (navigation vers le détail) — sans ça, le
 * clic sur le bouton déclencherait aussi la navigation parente.
 */
export function RowActionsMenu({
  onEdit,
  onDelete,
  deleteConfirmLabel = "Supprimer cet élément ?",
  deleteDisabled,
}: {
  onEdit?: () => void;
  onDelete?: () => unknown;
  deleteConfirmLabel?: string;
  deleteDisabled?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          aria-label="Actions"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {onEdit && (
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              onEdit();
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
            Modifier
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem
            variant="destructive"
            disabled={deleteDisabled}
            onSelect={(e) => {
              e.preventDefault();
              if (!confirm(deleteConfirmLabel)) return;
              onDelete();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Supprimer
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
