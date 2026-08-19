"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { updateOrganizationProfile } from "@/actions/organization-profile.actions";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UploadButton } from "@/lib/uploadthing";
import { toast } from "sonner";

export type OrganizationProfileValues = {
  nom: string;
  logoUrl: string | null;
  description: string | null;
  vision: string | null;
  mission: string | null;
  valeurs: string | null;
  siteWeb: string | null;
  devise: string;
};

/** Profil de l'organisation (cahier des charges §I / §III — Vision/Mission/Valeurs). */
export function OrganizationProfileForm({ initial }: { initial: OrganizationProfileValues }) {
  const [nom, setNom] = useState(initial.nom);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [vision, setVision] = useState(initial.vision ?? "");
  const [mission, setMission] = useState(initial.mission ?? "");
  const [valeurs, setValeurs] = useState(initial.valeurs ?? "");
  const [siteWeb, setSiteWeb] = useState(initial.siteWeb ?? "");
  const [devise, setDevise] = useState(initial.devise);

  const { run, isPending } = useAction(updateOrganizationProfile, { successMessage: "Profil de l'organisation enregistré." });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await run({
      nom,
      logoUrl: logoUrl || undefined,
      description: description || undefined,
      vision: vision || undefined,
      mission: mission || undefined,
      valeurs: valeurs || undefined,
      siteWeb: siteWeb || undefined,
      devise,
    });
  }

  const initials = nom
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Avatar className="h-24 w-24">
            {logoUrl && <AvatarImage src={logoUrl} alt={nom} />}
            <AvatarFallback className="text-xl">{initials}</AvatarFallback>
          </Avatar>
          <UploadButton
            endpoint="avatarUploader"
            onClientUploadComplete={(res) => {
              const file = res[0];
              if (!file) return;
              setLogoUrl(file.url);
              toast.success("Logo téléversé — n'oubliez pas d'enregistrer.");
            }}
            onUploadError={(uploadError) => {
              toast.error(`Échec du téléversement : ${uploadError.message}`);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identité de l&apos;organisation</CardTitle>
          <CardDescription>
            Vision, mission et valeurs (cahier des charges §III) — le socle que les objectifs stratégiques
            déclinent ensuite.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nom">Nom de l&apos;organisation</Label>
                <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteWeb">Site web</Label>
                <Input id="siteWeb" value={siteWeb} onChange={(e) => setSiteWeb(e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="devise">Devise</Label>
                <Input id="devise" value={devise} onChange={(e) => setDevise(e.target.value)} placeholder="FCFA" maxLength={10} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vision">Vision</Label>
              <Textarea id="vision" value={vision} onChange={(e) => setVision(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mission">Mission</Label>
              <Textarea id="mission" value={mission} onChange={(e) => setMission(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valeurs">Valeurs</Label>
              <Textarea id="valeurs" value={valeurs} onChange={(e) => setValeurs(e.target.value)} />
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
