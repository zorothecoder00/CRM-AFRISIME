"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { adminDisableMfa } from "@/actions/security.actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { ShieldOff } from "lucide-react";

/**
 * Débloque un utilisateur qui a perdu l'accès à son appli d'authentification
 * et épuisé ses codes de secours — aucun flux self-service n'existe pour ce
 * cas (voir adminDisableMfa). Affiché seulement si le MFA est actif pour cet
 * utilisateur.
 */
export function DisableMfaButton({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen] = useState(false);
  const { run, isPending } = useAction(adminDisableMfa, {
    successMessage: `MFA désactivé pour ${userName}.`,
  });

  async function handleConfirm() {
    const result = await run(userId);
    if (result.ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Désactiver le MFA">
          <ShieldOff className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Désactiver le MFA — {userName}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          À utiliser uniquement si {userName} a perdu l&apos;accès à son appli d&apos;authentification et à ses
          codes de secours. L&apos;utilisateur pourra se reconnecter avec son mot de passe seul, sans second
          facteur, jusqu&apos;à ce qu&apos;il réactive le MFA lui-même.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Désactivation..." : "Désactiver le MFA"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
