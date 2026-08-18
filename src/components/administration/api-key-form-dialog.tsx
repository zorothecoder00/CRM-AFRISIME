"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createApiKey } from "@/actions/api-key.actions";
import { createApiKeySchema, type CreateApiKeyInput } from "@/lib/validations/api-key.schema";
import { PERMISSION_CATALOG } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

// Regroupe le meme catalogue que la matrice /administration/roles, mais en
// cases a cocher compactes (une cle API porte un sous-ensemble libre, pas un
// role entier) — voir src/lib/api-keys.ts pour la verification cote route.
const CATEGORIES = Array.from(new Set(PERMISSION_CATALOG.map((p) => p.category)));

export function ApiKeyFormDialog() {
  const [open, setOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateApiKeyInput>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: { nom: "", permissions: [] },
  });
  const { run, isPending } = useAction(createApiKey);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function onSubmit(values: CreateApiKeyInput) {
    const result = await run({ ...values, permissions: Array.from(selected) });
    if (result.ok) {
      setCreatedKey(result.data.plaintext);
    }
  }

  function closeAndReset() {
    setOpen(false);
    setCreatedKey(null);
    setSelected(new Set());
    reset({ nom: "" });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeAndReset())}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Nouvelle clé API
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle clé API</DialogTitle>
        </DialogHeader>

        {createdKey ? (
          <div className="space-y-3">
            <p className="text-sm text-warning">
              Copiez cette clé maintenant — elle ne sera plus jamais affichée en clair.
            </p>
            <code className="block break-all rounded-md border bg-muted p-3 text-xs">{createdKey}</code>
            <Button className="w-full" onClick={closeAndReset}>
              Fermer
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="nom">Nom</Label>
              <Input id="nom" {...register("nom")} placeholder="ex: Intégration AfriGes" />
              {errors.nom && <p className="text-xs text-destructive">{errors.nom.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border p-3">
                {CATEGORIES.map((category) => (
                  <div key={category} className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">{category}</p>
                    {PERMISSION_CATALOG.filter((p) => p.category === category).map((p) => (
                      <label key={p.key} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={selected.has(p.key)} onCheckedChange={() => toggle(p.key)} />
                        {p.label}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
              {selected.size === 0 && <p className="text-xs text-muted-foreground">Sélectionnez au moins une permission.</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isPending || selected.size === 0}>
              Générer la clé
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
