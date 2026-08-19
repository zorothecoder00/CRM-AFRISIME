"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "@/hooks/use-action";
import { createPlatformOrganization } from "@/actions/platform-organization.actions";
import { PLATFORM_ORGANIZATION_PLANS } from "@/lib/validations/platform-organization.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

export function PlatformOrganizationFormDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nom, setNom] = useState("");
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState<(typeof PLATFORM_ORGANIZATION_PLANS)[number]>("STANDARD");
  const { run, isPending } = useAction(createPlatformOrganization, { successMessage: "Organisation enregistrée." });

  async function handleSubmit() {
    if (!nom.trim() || !slug.trim()) return;
    const result = await run({ nom: nom.trim(), slug: slug.trim(), plan });
    if (result.ok) {
      setOpen(false);
      setNom("");
      setSlug("");
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" /> Nouvelle organisation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle organisation de la plateforme</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nom</Label>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Identifiant (slug)</Label>
            <Input placeholder="ex. afriges" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} />
          </div>
          <div className="space-y-1.5">
            <Label>Abonnement</Label>
            <Select value={plan} onValueChange={(v) => setPlan(v as typeof plan)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_ORGANIZATION_PLANS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSubmit} disabled={!nom.trim() || !slug.trim() || isPending} className="w-full">
            {isPending ? "Création..." : "Créer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
