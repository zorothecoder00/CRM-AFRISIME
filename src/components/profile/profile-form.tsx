"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UploadButton } from "@/lib/uploadthing";
import { ShieldCheck, ShieldAlert } from "lucide-react";

export function ProfileForm({
  initialName,
  initialEmail,
  initialImage,
  roleLabel,
  departmentName,
  mfaEnabled,
}: {
  initialName: string;
  initialEmail: string;
  initialImage: string | null;
  roleLabel: string;
  departmentName: string | null;
  mfaEnabled: boolean;
}) {
  const router = useRouter();
  const { update } = useSession();

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [image, setImage] = useState(initialImage);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Une erreur est survenue.");
      }
      await update({ name, email });
      router.refresh();
      toast.success("Profil mis à jour.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[240px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Photo de profil</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Avatar className="h-24 w-24">
            {image && <AvatarImage src={image} alt={name} />}
            <AvatarFallback className="text-xl">{initials}</AvatarFallback>
          </Avatar>
          <UploadButton
            endpoint="avatarUploader"
            onClientUploadComplete={async (res) => {
              const file = res[0];
              if (!file) return;
              setImage(file.url);
              await update({ image: file.url });
              router.refresh();
              toast.success("Photo de profil mise à jour.");
            }}
            onUploadError={(uploadError) => {
              toast.error(`Échec du téléversement : ${uploadError.message}`);
            }}
          />
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations personnelles</CardTitle>
            <CardDescription>Nom et email utilisés pour la connexion.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations du compte</CardTitle>
            <CardDescription>Gérées par l&apos;administration.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Rôle</span>
              <Badge variant="secondary">{roleLabel}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Département</span>
              <span>{departmentName ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Double authentification</span>
              <Link href="/parametres/securite" className="inline-flex items-center gap-1 hover:underline">
                {mfaEnabled ? (
                  <>
                    <ShieldCheck className="h-4 w-4 text-emerald-600" /> Activée
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-4 w-4 text-muted-foreground" /> Désactivée
                  </>
                )}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
