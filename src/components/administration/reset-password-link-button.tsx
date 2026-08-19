"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { generatePasswordResetLink } from "@/actions/user.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { KeyRound } from "lucide-react";

/**
 * Aucun fournisseur email/SMS n'est câblé dans cette instance : c'est le
 * seul chemin réellement utilisable pour débloquer un utilisateur qui a
 * perdu son mot de passe (voir src/lib/password-reset.ts). L'admin
 * transmet le lien affiché par un canal sûr de son choix (WhatsApp,
 * appel...) — même principe que le lien d'activation portail
 * (portal-access-card.tsx).
 */
export function ResetPasswordLinkButton({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const { run, isPending } = useAction(generatePasswordResetLink);

  async function handleGenerate() {
    const result = await run(userId);
    if (result.ok) setResetUrl(result.data.resetUrl);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setResetUrl(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Réinitialiser le mot de passe">
          <KeyRound className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Réinitialiser le mot de passe — {userName}</DialogTitle>
        </DialogHeader>
        {resetUrl ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Valable 1 heure, à usage unique — transmettez ce lien à {userName} par un canal sûr (WhatsApp, appel,
              en personne...).
            </p>
            <Input readOnly value={resetUrl} onFocus={(e) => e.target.select()} className="text-xs" />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Génère un lien de réinitialisation à usage unique pour {userName}. Aucun email n&apos;est envoyé
              automatiquement — vous devrez transmettre ce lien vous-même.
            </p>
            <Button onClick={handleGenerate} disabled={isPending}>
              {isPending ? "Génération..." : "Générer un lien"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
