"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { initiateMfaSetup, confirmMfaSetup, disableMfa } from "@/actions/security.actions";

type Step = "idle" | "setup" | "backup-codes" | "disable";

export function MfaSettings({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [step, setStep] = useState<Step>("idle");
  const [secret, setSecret] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function startSetup() {
    setError(null);
    setIsPending(true);
    try {
      const result = await initiateMfaSetup();
      setSecret(result.secret);
      setQrCodeDataUrl(result.qrCodeDataUrl);
      setStep("setup");
    } finally {
      setIsPending(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const result = await confirmMfaSetup({ secret, code });
      setBackupCodes(result.backupCodes);
      setEnabled(true);
      setStep("backup-codes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      await disableMfa({ password });
      setEnabled(false);
      setStep("idle");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          Authentification à deux facteurs
          <Badge variant={enabled ? "default" : "outline"}>{enabled ? "Activée" : "Désactivée"}</Badge>
        </CardTitle>
        <CardDescription>
          Ajoute un code à usage unique (application d&apos;authentification) à la connexion.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {step === "idle" && !enabled && (
          <Button onClick={startSetup} disabled={isPending}>
            Activer la double authentification
          </Button>
        )}

        {step === "idle" && enabled && (
          <Button variant="destructive" onClick={() => setStep("disable")}>
            Désactiver la double authentification
          </Button>
        )}

        {step === "setup" && (
          <form onSubmit={handleConfirm} className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Scannez ce QR code avec une application d&apos;authentification (Google Authenticator,
              Authy...) puis saisissez le code généré pour confirmer.
            </p>
            {qrCodeDataUrl && (
              <Image src={qrCodeDataUrl} alt="QR code MFA" width={180} height={180} unoptimized />
            )}
            <p className="text-xs text-muted-foreground">
              Ou saisissez ce secret manuellement : <code>{secret}</code>
            </p>
            <div className="space-y-2">
              <Label htmlFor="mfa-code">Code de vérification</Label>
              <Input
                id="mfa-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                autoFocus
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                Confirmer
              </Button>
              <Button type="button" variant="outline" onClick={() => setStep("idle")}>
                Annuler
              </Button>
            </div>
          </form>
        )}

        {step === "backup-codes" && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-destructive">
              Conservez ces codes de secours en lieu sûr — ils ne seront plus affichés.
            </p>
            <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-3 font-mono text-sm">
              {backupCodes.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
            <Button onClick={() => setStep("idle")}>J&apos;ai noté mes codes</Button>
          </div>
        )}

        {step === "disable" && (
          <form onSubmit={handleDisable} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="disable-password">Confirmez votre mot de passe</Label>
              <Input
                id="disable-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="destructive" disabled={isPending}>
                Désactiver
              </Button>
              <Button type="button" variant="outline" onClick={() => setStep("idle")}>
                Annuler
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
