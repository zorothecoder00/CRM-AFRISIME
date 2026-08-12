"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import {
  createPortalAccount,
  resendPortalInvite,
  revokePortalAccess,
  reactivatePortalAccess,
} from "@/actions/portal-account.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound } from "lucide-react";

export type PortalAccountData = {
  id: string;
  email: string;
  isActive: boolean;
  activatedAt: string | null;
  lastLoginAt: string | null;
};

export function PortalAccessCard({
  contactId,
  contactEmail,
  account,
}: {
  contactId: string;
  contactEmail: string | null;
  account: PortalAccountData | null;
}) {
  const [activationUrl, setActivationUrl] = useState<string | null>(null);
  const createAction = useAction(createPortalAccount);
  const resendAction = useAction(resendPortalInvite, { successMessage: "Lien renvoyé." });
  const revokeAction = useAction(revokePortalAccess, { successMessage: "Accès révoqué." });
  const reactivateAction = useAction(reactivatePortalAccess, { successMessage: "Accès réactivé." });
  const isPending =
    createAction.isPending || resendAction.isPending || revokeAction.isPending || reactivateAction.isPending;

  async function handleCreate() {
    const result = await createAction.run({ contactId });
    if (result.ok) setActivationUrl(result.data.activationUrl);
  }

  async function handleResend() {
    if (!account) return;
    const result = await resendAction.run(account.id);
    if (result.ok) setActivationUrl(result.data.activationUrl);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4" />
          Portail client
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!account ? (
          contactEmail ? (
            <>
              <p className="text-sm text-muted-foreground">
                Ce contact n&apos;a pas encore d&apos;accès au portail client.
              </p>
              <Button size="sm" onClick={handleCreate} disabled={isPending}>
                Créer un accès portail
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ajoutez un email au contact pour pouvoir créer un accès portail.
            </p>
          )
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant={!account.isActive ? "destructive" : account.activatedAt ? "success" : "warning"}>
                {!account.isActive ? "Révoqué" : account.activatedAt ? "Actif" : "En attente d'activation"}
              </Badge>
              <span className="text-muted-foreground">{account.email}</span>
            </div>
            {account.lastLoginAt && (
              <p className="text-xs text-muted-foreground">
                Dernière connexion : {new Date(account.lastLoginAt).toLocaleString("fr-FR")}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {!account.activatedAt && account.isActive && (
                <Button size="sm" variant="outline" onClick={handleResend} disabled={isPending}>
                  Renvoyer le lien
                </Button>
              )}
              {account.isActive ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => revokeAction.run(account.id)}
                  disabled={isPending}
                >
                  Révoquer l&apos;accès
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => reactivateAction.run(account.id)}
                  disabled={isPending}
                >
                  Réactiver l&apos;accès
                </Button>
              )}
            </div>
          </>
        )}

        {activationUrl && (
          <div className="space-y-1 rounded-md border border-info/30 bg-info/10 p-2.5">
            <p className="text-xs text-info">
              Lien d&apos;activation (à transmettre au client — visible une seule fois) :
            </p>
            <Input readOnly value={activationUrl} onFocus={(e) => e.target.select()} className="text-xs" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
