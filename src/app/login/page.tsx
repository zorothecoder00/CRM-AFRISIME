"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthShell } from "@/components/auth/auth-shell";

const ACCENT = "#2a78d6";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      totp: mfaRequired ? totp : undefined,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error === "MFA_REQUIRED") {
      setMfaRequired(true);
      return;
    }
    if (result?.error === "MFA_INVALID") {
      setError("Code de vérification invalide.");
      return;
    }
    if (result?.error) {
      setError("Email ou mot de passe incorrect.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <>
      <Card className="rounded-2xl border-none py-7 shadow-xl shadow-black/5 dark:shadow-black/20">
        <CardHeader>
          <CardTitle className="text-2xl">Bon retour</CardTitle>
          <CardDescription>Connectez-vous à votre espace de travail.</CardDescription>
        </CardHeader>
        <CardContent>
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium hover:underline"
                  style={{ color: ACCENT }}
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={mfaRequired}
                className="h-11 rounded-xl focus-visible:border-[#2a78d6] focus-visible:ring-[#2a78d6]/25"
                required
              />
            </div>
            {mfaRequired && (
              <div className="space-y-2">
                <Label htmlFor="totp">Code de vérification (application d&apos;authentification)</Label>
                <Input
                  id="totp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={totp}
                  onChange={(e) => setTotp(e.target.value)}
                  className="h-11 rounded-xl text-center text-lg tracking-widest focus-visible:border-[#2a78d6] focus-visible:ring-[#2a78d6]/25"
                  autoFocus
                  required
                />
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              className="h-11 w-full rounded-xl text-white shadow-md shadow-[#2a78d6]/25 transition-transform hover:opacity-90 active:scale-[0.99]"
              style={{ backgroundColor: ACCENT }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Connexion..." : mfaRequired ? "Vérifier le code" : "Se connecter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
