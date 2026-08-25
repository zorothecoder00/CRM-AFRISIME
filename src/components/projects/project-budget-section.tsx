"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createBudgetLine, updateBudgetLineRealisation, deleteBudgetLine } from "@/actions/budget-line.actions";
import { createBudgetLineSchema, type CreateBudgetLineInput } from "@/lib/validations/budget-line.schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

export type BudgetLineRow = {
  id: string;
  sectionId: string | null;
  sectionNom: string | null;
  categorie: string;
  libelle: string;
  montantPrevu: number;
  montantEngage: number;
  montantPaye: number;
};

export type BudgetRollupRow = { id: string; label: string; sub?: string; prevu: number; engage: number; paye: number };

const CATEGORIE_LABELS: Record<string, string> = {
  PERSONNEL: "Personnel",
  EQUIPEMENT: "Équipement",
  TRANSPORT: "Transport",
  FORMATION: "Formation",
  COMMUNICATION: "Communication",
  PRESTATIONS: "Prestations",
  ACHATS: "Achats",
  LOGISTIQUE: "Logistique",
  FONCTIONNEMENT: "Fonctionnement",
  IMPREVUS: "Imprévus",
};

function fmt(n: number, devise: string) {
  return `${n.toLocaleString("fr-FR")} ${devise}`;
}

/** Budget Builder / Budget par activité / Budget vs Réalisation (Project Studio §22-23, §27). */
export function ProjectBudgetSection({
  projectId,
  sections,
  lines,
  byActivity,
  byToCNode,
  devise,
  canManage,
}: {
  projectId: string;
  sections: { id: string; nom: string }[];
  lines: BudgetLineRow[];
  byActivity: BudgetRollupRow[];
  byToCNode: BudgetRollupRow[];
  devise: string;
  canManage: boolean;
}) {
  const { run: remove } = useAction(deleteBudgetLine, { successMessage: "Ligne supprimée." });

  const totalPrevu = lines.reduce((s, l) => s + l.montantPrevu, 0);
  const totalEngage = lines.reduce((s, l) => s + l.montantEngage, 0);
  const totalPaye = lines.reduce((s, l) => s + l.montantPaye, 0);
  const solde = totalPrevu - totalEngage;
  const tauxExecution = totalPrevu > 0 ? Math.round((totalPaye / totalPrevu) * 100) : 0;

  const byCategorie = new Map<string, BudgetLineRow[]>();
  for (const line of lines) {
    const list = byCategorie.get(line.categorie) ?? [];
    list.push(line);
    byCategorie.set(line.categorie, list);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <KpiCard label="Budget total" value={totalPrevu} />
        <KpiCard label="Engagé" value={totalEngage} />
        <KpiCard label="Payé" value={totalPaye} />
        <KpiCard label="Solde" value={solde} accent={solde < 0 ? "destructive" : undefined} />
        <KpiCard label="Taux d'exécution" value={`${tauxExecution}%`} />
      </div>

      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Lignes budgétaires</h4>
        {canManage && <BudgetLineFormDialog projectId={projectId} sections={sections} />}
      </div>

      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune ligne budgétaire.</p>
      ) : (
        <div className="space-y-4">
          {Array.from(byCategorie.entries()).map(([categorie, catLines]) => (
            <div key={categorie} className="space-y-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">{CATEGORIE_LABELS[categorie] ?? categorie}</p>
              <div className="space-y-2">
                {catLines.map((line) => (
                  <BudgetLineCard key={line.id} line={line} devise={devise} canManage={canManage} onDelete={() => remove({ budgetLineId: line.id })} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {byActivity.length > 0 && (
        <RollupTable title="Budget par activité (WBS)" rows={byActivity} devise={devise} />
      )}

      {byToCNode.length > 0 && (
        <RollupTable title="Coût par Output / Outcome (Theory of Change)" rows={byToCNode} devise={devise} />
      )}
    </div>
  );
}

function BudgetLineCard({
  line,
  devise,
  canManage,
  onDelete,
}: {
  line: BudgetLineRow;
  devise: string;
  canManage: boolean;
  onDelete: () => void;
}) {
  const { run: updateRealisation } = useAction(updateBudgetLineRealisation, { successMessage: "Réalisation mise à jour." });
  const [engage, setEngage] = useState(String(line.montantEngage));
  const [paye, setPaye] = useState(String(line.montantPaye));

  return (
    <Card size="sm">
      <CardContent className="space-y-2 px-(--card-spacing)">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="font-medium">{line.libelle}</div>
            {line.sectionNom && <p className="text-xs text-muted-foreground">Activité : {line.sectionNom}</p>}
            <p className="text-sm text-muted-foreground">Prévu : {fmt(line.montantPrevu, devise)}</p>
          </div>
          {canManage && (
            <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label="Supprimer">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        {canManage ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Engagé</Label>
              <Input
                type="number"
                step="0.01"
                className="h-7 text-xs"
                value={engage}
                onChange={(e) => setEngage(e.target.value)}
                onBlur={() => updateRealisation({ budgetLineId: line.id, montantEngage: Number(engage) })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Payé</Label>
              <Input
                type="number"
                step="0.01"
                className="h-7 text-xs"
                value={paye}
                onChange={(e) => setPaye(e.target.value)}
                onBlur={() => updateRealisation({ budgetLineId: line.id, montantPaye: Number(paye) })}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>Engagé : {fmt(line.montantEngage, devise)}</span>
            <span>Payé : {fmt(line.montantPaye, devise)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RollupTable({ title, rows, devise }: { title: string; rows: BudgetRollupRow[]; devise: string }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="p-2">Libellé</th>
              <th className="p-2">Prévu</th>
              <th className="p-2">Engagé</th>
              <th className="p-2">Payé</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="p-2">
                  {row.label}
                  {row.sub && <span className="ml-1 text-xs text-muted-foreground">({row.sub})</span>}
                </td>
                <td className="p-2">{fmt(row.prevu, devise)}</td>
                <td className="p-2">{fmt(row.engage, devise)}</td>
                <td className="p-2">{fmt(row.paye, devise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BudgetLineFormDialog({ projectId, sections }: { projectId: string; sections: { id: string; nom: string }[] }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateBudgetLineInput>({
    resolver: zodResolver(createBudgetLineSchema),
    defaultValues: { projectId, categorie: "FONCTIONNEMENT" },
  });
  const { run: submit, isPending } = useAction(createBudgetLine, { successMessage: "Ligne ajoutée." });

  async function onSubmit(data: CreateBudgetLineInput) {
    const result = await submit({ ...data, projectId });
    if (result.ok) {
      reset({ projectId, categorie: "FONCTIONNEMENT" });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nouvelle ligne
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter une ligne budgétaire</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="libelle">Libellé</Label>
            <Input id="libelle" placeholder="Ex. Salaires équipe terrain" {...register("libelle")} />
            {errors.libelle && <p className="text-sm text-destructive">{errors.libelle.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select defaultValue="FONCTIONNEMENT" onValueChange={(v) => setValue("categorie", v as CreateBudgetLineInput["categorie"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="montantPrevu">Montant prévu</Label>
              <Input id="montantPrevu" type="number" step="0.01" {...register("montantPrevu")} />
              {errors.montantPrevu && <p className="text-sm text-destructive">{errors.montantPrevu.message}</p>}
            </div>
          </div>
          {sections.length > 0 && (
            <div className="space-y-2">
              <Label>Activité (WBS)</Label>
              <Select onValueChange={(v) => setValue("sectionId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucune (optionnel)" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ajout..." : "Ajouter la ligne"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
