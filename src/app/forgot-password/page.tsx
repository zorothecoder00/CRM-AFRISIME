"use client";

import { useState } from "react";
import Link from "next/link";
import { useAction } from "@/hooks/use-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AuthShell } from "@/components/auth/auth-shell";

const ACCENT = "#2a78d6";

async function requestPasswordReset(email: string) {
  const res = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Une erreur est survenue.");
  }
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { run, isPending } = useAction(requestPasswordReset);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await run(email);
    if (result.ok) setSubmitted(true);
  }

  return (
    <AuthShell>
      <Card className="rounded-2xl border-none py-7 shadow-xl shadow-black/5 dark:shadow-black/20">
        <CardHeader>
          <CardTitle className="text-2xl">Mot de passe oublié</CardTitle>
          <CardDescription>
            Indique ton email, on t&apos;enverra un lien de réinitialisation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.
              </p>
              <Button asChild variant="outline" className="h-11 w-full rounded-xl">
                <Link href="/login">Retour à la connexion</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-xl focus-visible:border-[#2a78d6] focus-visible:ring-[#2a78d6]/25"
                  required
                />
              </div>
              <Button
                type="submit"
                className="h-11 w-full rounded-xl text-white shadow-md shadow-[#2a78d6]/25 transition-transform hover:opacity-90 active:scale-[0.99]"
                style={{ backgroundColor: ACCENT }}
                disabled={isPending}
              >
                {isPending ? "Envoi..." : "Envoyer le lien"}
              </Button>
              <Button asChild variant="ghost" className="h-11 w-full rounded-xl">
                <Link href="/login">Retour à la connexion</Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthShell>
  );
}
