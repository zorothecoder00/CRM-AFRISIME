"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createApiKey } from "@/actions/api-key.actions";
import { createApiKeySchema, API_KEY_PERMISSIONS, type CreateApiKeyInput } from "@/lib/validations/api-key.schema";
import { PERMISSION_CATALOG } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

// Seules les permissions réellement vérifiées par une route /api/v1/* sont
// proposées ici (voir API_KEY_PERMISSIONS) — pas le catalogue complet des
// permissions de rôle, dont la quasi-totalité serait inerte pour une clé API.
type ApiKeyPermission = (typeof API_KEY_PERMISSIONS)[number];
const SELECTABLE_PERMISSIONS = PERMISSION_CATALOG.filter(
  (p): p is typeof p & { key: ApiKeyPermission } => (API_KEY_PERMISSIONS as readonly string[]).includes(p.key)
);

export function ApiKeyFormDialog() {
  const [open, setOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<ApiKeyPermission>>(new Set());
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateApiKeyInput>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: { nom: "", permissions: [] },
  });
  const { run, isPending } = useAction(createApiKey);

  // `selected` pilote l'affichage des cases (Radix Checkbox, pas un input
  // natif que `register` pourrait suivre) — sans ce setValue, le zodResolver
  // valide contre la valeur RHF jamais mise à jour (toujours [] par
  // defaultValues), donc bloque silencieusement handleSubmit à chaque
  // tentative même avec des cases cochées : le formulaire ne faisait plus
  // rien au clic sur "Générer la clé", sans message d'erreur visible.
  function toggle(key: ApiKeyPermission) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      setValue("permissions", Array.from(next), { shouldValidate: true });
      return next;
    });
  }

  async function onSubmit(values: CreateApiKeyInput) {
    const result = await run(values);
    if (result.ok) {
      setCreatedKey(result.data.plaintext);
    }
  }

  function closeAndReset() {
    setOpen(false);
    setCreatedKey(null);
    setSelected(new Set());
    reset({ nom: "", permissions: [] });
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
              <p className="text-xs text-muted-foreground">
                Seules les permissions ci-dessous sont vérifiées par un endpoint /api/v1/* — le catalogue complet
                des permissions de rôle n&apos;a aucun effet pour une clé API.
              </p>
              <div className="space-y-1 rounded-md border p-3">
                {SELECTABLE_PERMISSIONS.map((p) => (
                  <label key={p.key} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={selected.has(p.key)} onCheckedChange={() => toggle(p.key)} />
                    {p.label}
                  </label>
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
