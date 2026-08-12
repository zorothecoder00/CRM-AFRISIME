"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AuthShell } from "@/components/auth/auth-shell";

const ACCENT = "#2a78d6";

function ActivatePortalForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/portal-auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Une erreur est survenue.");
      }
      router.push("/portail/connexion");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <Card className="rounded-2xl border-none py-7 shadow-xl shadow-black/5 dark:shadow-black/20">
        <CardHeader>
          <CardTitle className="text-2xl">Lien invalide</CardTitle>
          <CardDescription>Ce lien d&apos;activation est incomplet ou a expiré.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-none py-7 shadow-xl shadow-black/5 dark:shadow-black/20">
      <CardHeader>
        <CardTitle className="text-2xl">Activer votre accès</CardTitle>
        <CardDescription>Choisissez un mot de passe (8 caractères minimum).</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-xl focus-visible:border-[#2a78d6] focus-visible:ring-[#2a78d6]/25"
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-11 rounded-xl focus-visible:border-[#2a78d6] focus-visible:ring-[#2a78d6]/25"
              minLength={8}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            className="h-11 w-full rounded-xl text-white shadow-md shadow-[#2a78d6]/25 transition-transform hover:opacity-90 active:scale-[0.99]"
            style={{ backgroundColor: ACCENT }}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Activation..." : "Activer mon accès"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/portail/connexion" className="hover:underline">
              Retour à la connexion
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ActivatePortalPage() {
  return (
    <AuthShell>
      <Suspense>
        <ActivatePortalForm />
      </Suspense>
    </AuthShell>
  );
}
