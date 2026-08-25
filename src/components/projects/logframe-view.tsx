"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import {
  generateLogframeFromTheoryOfChange,
  createLogframeRow,
  updateLogframeRow,
  deleteLogframeRow,
} from "@/actions/logframe.actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Wand2 } from "lucide-react";

export type LogframeRowData = {
  id: string;
  niveau: "IMPACT" | "OUTCOME" | "OUTPUT" | "ACTIVITES";
  resultats: string | null;
  indicateurs: string | null;
  sources: string | null;
  hypotheses: string | null;
};

const LEVEL_LABELS: Record<LogframeRowData["niveau"], string> = {
  IMPACT: "Impact",
  OUTCOME: "Outcome",
  OUTPUT: "Output",
  ACTIVITES: "Activités",
};
const LEVEL_ORDER: LogframeRowData["niveau"][] = ["IMPACT", "OUTCOME", "OUTPUT", "ACTIVITES"];

/** Cadre logique (Project Studio §12) — Niveau/Résultats/Indicateurs/Sources/Hypothèses. */
export function LogframeView({
  projectId,
  rows,
  hasTheoryOfChange,
  canManage,
}: {
  projectId: string;
  rows: LogframeRowData[];
  hasTheoryOfChange: boolean;
  canManage: boolean;
}) {
  const { run: generate, isPending: isGenerating } = useAction(generateLogframeFromTheoryOfChange, {
    successMessage: "Cadre logique généré.",
  });
  const { run: remove } = useAction(deleteLogframeRow, { successMessage: "Ligne supprimée." });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Généré depuis la théorie du changement, puis modifiable.</p>
        <div className="flex gap-2">
          {rows.length === 0 && hasTheoryOfChange && (
            <Button size="sm" onClick={() => generate({ projectId })} disabled={isGenerating}>
              <Wand2 className="mr-1 h-4 w-4" />
              {isGenerating ? "Génération..." : "Générer depuis la ToC"}
            </Button>
          )}
          {canManage && <RowFormDialog projectId={projectId} />}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {hasTheoryOfChange
            ? "Aucune ligne de cadre logique."
            : "Définissez d'abord une théorie du changement pour générer le cadre logique, ou ajoutez des lignes manuellement."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="p-2">Niveau</th>
                <th className="p-2">Résultats</th>
                <th className="p-2">Indicateurs</th>
                <th className="p-2">Sources</th>
                <th className="p-2">Hypothèses</th>
                {canManage && <th className="p-2" />}
              </tr>
            </thead>
            <tbody>
              {[...rows]
                .sort((a, b) => LEVEL_ORDER.indexOf(a.niveau) - LEVEL_ORDER.indexOf(b.niveau))
                .map((row) => (
                  <tr key={row.id} className="border-b align-top">
                    <td className="p-2 font-medium">{LEVEL_LABELS[row.niveau]}</td>
                    <td className="p-2">{row.resultats || "—"}</td>
                    <td className="p-2">{row.indicateurs || "—"}</td>
                    <td className="p-2">{row.sources || "—"}</td>
                    <td className="p-2">{row.hypotheses || "—"}</td>
                    {canManage && (
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <EditRowDialog row={row} />
                          <Button variant="ghost" size="icon-sm" onClick={() => remove({ rowId: row.id })} aria-label="Supprimer">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RowFields({
  values,
  setValues,
}: {
  values: Record<string, string>;
  setValues: (updater: (v: Record<string, string>) => Record<string, string>) => void;
}) {
  return (
    <>
      {(["resultats", "indicateurs", "sources", "hypotheses"] as const).map((key) => (
        <div key={key} className="space-y-2">
          <Label className="capitalize">{key}</Label>
          <Textarea value={values[key]} onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))} />
        </div>
      ))}
    </>
  );
}

function EditRowDialog({ row }: { row: LogframeRowData }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({
    resultats: row.resultats ?? "",
    indicateurs: row.indicateurs ?? "",
    sources: row.sources ?? "",
    hypotheses: row.hypotheses ?? "",
  });
  const { run: update, isPending } = useAction(updateLogframeRow, { successMessage: "Ligne mise à jour." });

  async function handleSave() {
    const result = await update({
      rowId: row.id,
      resultats: values.resultats || undefined,
      indicateurs: values.indicateurs || undefined,
      sources: values.sources || undefined,
      hypotheses: values.hypotheses || undefined,
    });
    if (result.ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Modifier">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier — {LEVEL_LABELS[row.niveau]}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <RowFields values={values} setValues={setValues} />
          <Button className="w-full" disabled={isPending} onClick={handleSave}>
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RowFormDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [niveau, setNiveau] = useState<LogframeRowData["niveau"]>("OUTPUT");
  const [values, setValues] = useState<Record<string, string>>({
    resultats: "",
    indicateurs: "",
    sources: "",
    hypotheses: "",
  });
  const { run: create, isPending } = useAction(createLogframeRow, { successMessage: "Ligne ajoutée." });

  async function handleCreate() {
    const result = await create({
      projectId,
      niveau,
      resultats: values.resultats || undefined,
      indicateurs: values.indicateurs || undefined,
      sources: values.sources || undefined,
      hypotheses: values.hypotheses || undefined,
    });
    if (result.ok) {
      setValues({ resultats: "", indicateurs: "", sources: "", hypotheses: "" });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="mr-1 h-4 w-4" />
          Ajouter une ligne
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle ligne du cadre logique</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Niveau</Label>
            <Select value={niveau} onValueChange={(v) => setNiveau(v as LogframeRowData["niveau"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVEL_ORDER.map((l) => (
                  <SelectItem key={l} value={l}>
                    {LEVEL_LABELS[l]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <RowFields values={values} setValues={setValues} />
          <Button className="w-full" disabled={isPending} onClick={handleCreate}>
            {isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
