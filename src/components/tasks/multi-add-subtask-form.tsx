"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { addSubtask } from "@/actions/task.actions";
import { scheduleInboxTask } from "@/actions/personal-planning.actions";
import type { AddSubtaskInput } from "@/lib/validations/task.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Option = { id: string; label: string };
type Priorite = NonNullable<AddSubtaskInput["priorite"]>;

type Draft = {
  key: string;
  titre: string;
  responsablePrincipalId: string;
  priorite: Priorite;
  dateDebut: string;
  echeance: string;
  poidsAvancement: string;
  // Demande utilisateur — plage horaire (créneau) optionnelle, en plus de la
  // simple date de début : cree une PersonalPlanningEntry liee (voir
  // scheduleInboxTask), donc uniquement possible si le responsable choisi
  // est bien l'utilisateur courant (createur) — l'agenda planifie reste
  // strictement personnel.
  heureDebut: string;
  heureFin: string;
};

function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function todayInputValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

let draftKeySeq = 0;
function makeDraft(defaultDateDebut: string, defaultEcheance: string, defaultResponsableId: string): Draft {
  draftKeySeq += 1;
  return {
    key: `draft-${draftKeySeq}`,
    titre: "",
    // Demande utilisateur — le responsable d'une sous-tâche est par défaut
    // celui de la tâche mère (donc en cascade sur les sous-sous-tâches), pas
    // vide : celui qui fait la tâche fait aussi ses subdivisions.
    responsablePrincipalId: defaultResponsableId,
    priorite: "MOYENNE",
    dateDebut: defaultDateDebut,
    echeance: defaultEcheance,
    poidsAvancement: "",
    heureDebut: "",
    heureFin: "",
  };
}

/**
 * Demande utilisateur — subdiviser une tâche en autant de sous-tâches que
 * voulu d'un coup ("+" ajoute une ligne, un seul "Enregistrer" les crée
 * toutes). Chaque ligne hérite par défaut des dates de la tâche mère
 * (dateDebut/échéance identiques) ; ajustables mais toujours comprises dans
 * cet intervalle — contrainte posée en min/max ici, revalidée côté serveur
 * dans addSubtask (défense en profondeur).
 */
export function MultiAddSubtaskForm({
  parentTaskId,
  parentDateDebut,
  parentEcheance,
  parentResponsablePrincipalId,
  users,
  currentUserId,
  onDone,
}: {
  parentTaskId: string;
  parentDateDebut: string | null;
  parentEcheance: string | null;
  // Demande utilisateur — celui qui fait la tâche mère fait par défaut ses
  // subdivisions aussi (cascade sur les sous-sous-tâches).
  parentResponsablePrincipalId: string;
  users: Option[];
  // Demande utilisateur — le créneau (plage horaire) d'une sous-tâche crée
  // une entrée dans l'agenda PERSONNEL de son responsable (voir
  // scheduleInboxTask, "vous ne pouvez planifier que vos propres tâches") :
  // seules les lignes où responsablePrincipalId === currentUserId peuvent
  // en recevoir un.
  currentUserId: string;
  onDone: () => void;
}) {
  const defaultDateDebut = toDateInputValue(parentDateDebut);
  const defaultEcheance = toDateInputValue(parentEcheance);
  // Demande utilisateur — la plupart des tâches n'ont en pratique pas de
  // dateDebut renseignée (le formulaire de création n'a qu'une échéance) :
  // sans repli, le champ "Date de début" restait vide au lieu d'être
  // prérempli. À défaut de date de la mère, on préremplit avec aujourd'hui.
  const prefillDateDebut = defaultDateDebut || todayInputValue();
  const [drafts, setDrafts] = useState<Draft[]>([
    makeDraft(prefillDateDebut, defaultEcheance, parentResponsablePrincipalId),
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const { run: create } = useAction(addSubtask);
  const { run: schedule } = useAction(scheduleInboxTask);

  function updateDraft(key: string, patch: Partial<Draft>) {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function addDraft() {
    setDrafts((prev) => [...prev, makeDraft(prefillDateDebut, defaultEcheance, parentResponsablePrincipalId)]);
  }

  function removeDraft(key: string) {
    setDrafts((prev) => (prev.length > 1 ? prev.filter((d) => d.key !== key) : prev));
  }

  async function handleSaveAll() {
    const valid = drafts.filter((d) => d.titre.trim() && d.responsablePrincipalId);
    if (valid.length === 0) return;
    setIsSaving(true);
    // Sequentiel (pas Promise.all) — chaque addSubtask relit et recalcule
    // l'avancement de la mere a partir de TOUTES ses sous-taches existantes ;
    // des creations concurrentes pourraient se baser sur un instantane
    // incomplet les unes des autres.
    let created = 0;
    for (const d of valid) {
      const result = await create({
        parentTaskId,
        titre: d.titre.trim(),
        responsablePrincipalId: d.responsablePrincipalId,
        priorite: d.priorite,
        dateDebut: d.dateDebut || undefined,
        echeance: d.echeance || undefined,
        poidsAvancement: d.poidsAvancement || undefined,
      });
      if (!result.ok) break;
      created += 1;

      // Creneau optionnel — cree une activite de planning personnel liee,
      // uniquement quand le responsable de la sous-tache EST le createur
      // (agenda strictement personnel, voir scheduleInboxTask). Un echec ici
      // (conflit d'horaire, hors horaires de travail...) ne doit pas
      // interrompre la creation des sous-taches suivantes.
      if (d.heureDebut && d.heureFin && d.dateDebut && d.responsablePrincipalId === currentUserId) {
        const [y, m, day] = d.dateDebut.split("-").map(Number);
        const [hDebut, mDebut] = d.heureDebut.split(":").map(Number);
        const [hFin, mFin] = d.heureFin.split(":").map(Number);
        const start = new Date(y, m - 1, day, hDebut, mDebut);
        const dureeMinutes = Math.round((new Date(y, m - 1, day, hFin, mFin).getTime() - start.getTime()) / 60_000);
        if (dureeMinutes > 0) {
          await schedule({ taskId: result.data.id, dateDebut: start.toISOString(), dureeMinutes });
        }
      }
    }
    setIsSaving(false);
    if (created > 0) {
      toast.success(created > 1 ? `${created} sous-tâches ajoutées.` : "Sous-tâche ajoutée.");
      onDone();
    }
  }

  return (
    <div className="space-y-3">
      {drafts.map((d, index) => (
        <div key={d.key} className="space-y-2 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Sous-tâche {index + 1}</span>
            {drafts.length > 1 && (
              <Button type="button" variant="ghost" size="icon-xs" onClick={() => removeDraft(d.key)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            )}
          </div>
          <Input
            placeholder="Titre de la sous-tâche"
            value={d.titre}
            onChange={(e) => updateDraft(d.key, { titre: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Select value={d.responsablePrincipalId} onValueChange={(v) => updateDraft(d.key, { responsablePrincipalId: v })}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Responsable" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={d.priorite} onValueChange={(v) => updateDraft(d.key, { priorite: v as Priorite })}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRES_HAUTE">Très haute</SelectItem>
                <SelectItem value="HAUTE">Haute</SelectItem>
                <SelectItem value="MOYENNE">Moyenne</SelectItem>
                <SelectItem value="BASSE">Basse</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground">Date de début</span>
              <Input
                type="date"
                className="h-9 text-xs"
                value={d.dateDebut}
                min={defaultDateDebut || undefined}
                max={defaultEcheance || undefined}
                onChange={(e) => updateDraft(d.key, { dateDebut: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground">Échéance</span>
              <Input
                type="date"
                className="h-9 text-xs"
                value={d.echeance}
                min={defaultDateDebut || undefined}
                max={defaultEcheance || undefined}
                onChange={(e) => updateDraft(d.key, { echeance: e.target.value })}
              />
            </div>
          </div>
          {(defaultDateDebut || defaultEcheance) && (
            <p className="text-[11px] text-muted-foreground">
              Comprises entre le début et l&apos;échéance de la tâche mère par défaut — ajustables dans cette limite.
            </p>
          )}
          <div className="space-y-1">
            <span className="text-[11px] text-muted-foreground">Créneau (heure) — optionnel</span>
            <div className="flex items-center gap-2">
              <Input
                type="time"
                className="h-9 flex-1 text-xs"
                value={d.heureDebut}
                onChange={(e) => updateDraft(d.key, { heureDebut: e.target.value })}
              />
              <span className="text-muted-foreground">→</span>
              <Input
                type="time"
                className="h-9 flex-1 text-xs"
                value={d.heureFin}
                onChange={(e) => updateDraft(d.key, { heureFin: e.target.value })}
              />
            </div>
            {d.responsablePrincipalId && d.responsablePrincipalId !== currentUserId ? (
              <p className="text-[11px] text-muted-foreground">
                Un créneau ne peut être posé que sur votre propre agenda — sans effet ici, le responsable choisi
                est un(e) collègue.
              </p>
            ) : (
              (d.heureDebut || d.heureFin) && (
                <p className="text-[11px] text-muted-foreground">
                  Crée une activité planifiée sur votre agenda personnel, dans le respect de vos horaires de
                  travail.
                </p>
              )
            )}
          </div>
          <div className="space-y-1">
            <span className="text-[11px] text-muted-foreground">
              Poids dans l&apos;avancement de la tâche mère (%) — optionnel
            </span>
            <Input
              type="number"
              min={0}
              max={100}
              className="h-9 text-xs"
              placeholder="Laisser vide pour un calcul automatique"
              value={d.poidsAvancement}
              onChange={(e) => updateDraft(d.key, { poidsAvancement: e.target.value })}
            />
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addDraft}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Ajouter une autre sous-tâche
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={isSaving || !drafts.some((d) => d.titre.trim() && d.responsablePrincipalId)}
          onClick={handleSaveAll}
        >
          {isSaving ? "Enregistrement..." : drafts.length > 1 ? "Enregistrer pour toutes" : "Ajouter"}
        </Button>
      </div>
    </div>
  );
}
