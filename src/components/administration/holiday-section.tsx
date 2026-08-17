"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createHoliday, deleteHoliday } from "@/actions/entity.actions";
import { createHolidaySchema, type CreateHolidayInput } from "@/lib/validations/entity.schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, CalendarDays } from "lucide-react";

type Option = { id: string; label: string };

export type HolidayRow = {
  id: string;
  entityId: string;
  entityNom: string;
  nom: string;
  date: string;
  recurrenceAnnuelle: boolean;
};

/** Jours fériés (cahier des charges V2.2 §23), rattachés à une Entity. */
export function HolidaySection({ holidays, entities }: { holidays: HolidayRow[]; entities: Option[] }) {
  const { run: remove } = useAction(deleteHoliday, { successMessage: "Jour férié supprimé." });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4" />
          Jours fériés
        </CardTitle>
        {entities.length > 0 && <HolidayFormDialog entities={entities} />}
      </CardHeader>
      <CardContent>
        {holidays.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun jour férié enregistré.</p>
        ) : (
          <ul className="space-y-2">
            {holidays.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{h.nom}</span>
                  <span className="text-muted-foreground">{h.entityNom}</span>
                  <span className="text-muted-foreground">
                    {new Date(h.date).toLocaleDateString("fr-FR")}
                  </span>
                  {h.recurrenceAnnuelle && <Badge variant="secondary">Annuel</Badge>}
                </span>
                <Button variant="ghost" size="icon-sm" onClick={() => remove(h.id)} aria-label="Supprimer">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function HolidayFormDialog({ entities }: { entities: Option[] }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateHolidayInput>({
    resolver: zodResolver(createHolidaySchema),
    defaultValues: { entityId: entities[0]?.id, recurrenceAnnuelle: true },
  });
  const { run: submit, isPending } = useAction(createHoliday, { successMessage: "Jour férié ajouté." });

  async function onSubmit(data: CreateHolidayInput) {
    const result = await submit(data);
    if (result.ok) {
      reset({ entityId: entities[0]?.id, recurrenceAnnuelle: true, nom: "", date: "" });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nouveau jour férié
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un jour férié</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Entité</Label>
            <Select defaultValue={entities[0]?.id} onValueChange={(v) => setValue("entityId", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {entities.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" placeholder="Ex : Fête de l'indépendance" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" {...register("date")} />
            {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="recurrenceAnnuelle"
              checked={watch("recurrenceAnnuelle")}
              onCheckedChange={(checked) => setValue("recurrenceAnnuelle", checked === true)}
            />
            <Label htmlFor="recurrenceAnnuelle" className="font-normal">
              Se répète chaque année
            </Label>
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
