"use client";

import { useState } from "react";
import { toast } from "sonner";
import { grantDocumentAccess, revokeDocumentAccess } from "@/actions/document.actions";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = { id: string; label: string };

/** Contrôle d'accès par document (cahier des charges §10) — liste blanche d'utilisateurs. */
export function DocumentAccessManager({
  documentId,
  users,
  grantedUsers,
}: {
  documentId: string;
  users: Option[];
  grantedUsers: Option[];
}) {
  const [pending, setPending] = useState(false);

  async function handleAdd(userId: string) {
    setPending(true);
    try {
      await grantDocumentAccess(documentId, userId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setPending(false);
    }
  }

  async function handleRemove(userId: string) {
    setPending(true);
    try {
      await revokeDocumentAccess(documentId, userId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setPending(false);
    }
  }

  const remainingUsers = users.filter((u) => !grantedUsers.some((g) => g.id === u.id));

  return (
    <div className="space-y-2">
      {grantedUsers.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Public (tous les membres avec accès au projet). Ajoutez une personne pour restreindre.
        </p>
      ) : (
        <ul className="space-y-1">
          {grantedUsers.map((u) => (
            <li key={u.id} className="flex items-center justify-between rounded-md border px-2 py-1 text-sm">
              {u.label}
              <button type="button" onClick={() => handleRemove(u.id)} disabled={pending} aria-label="Retirer l'accès">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {remainingUsers.length > 0 && (
        <Select onValueChange={handleAdd} disabled={pending}>
          <SelectTrigger>
            <SelectValue placeholder="Restreindre à..." />
          </SelectTrigger>
          <SelectContent>
            {remainingUsers.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
