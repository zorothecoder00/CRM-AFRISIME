"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { saveDailyReviewNotes } from "@/actions/personal-planning.actions";
import { ENTRY_MOTIF_BLOCAGE_LABELS } from "@/lib/personal-planning-types";
import type { PersonalPlanningEntryRow } from "@/components/personal-planning/personal-planning-week";
import Link from "next/link";
import { Moon } from "lucide-react";

/** §22 — Revue de fin de journée : bilan des activités du jour par statut + notes personnelles libres. */
export function PersonalPlanningEndOfDay({
  entries,
  reporteesCount = 0,
  todayKey,
  initialNotes,
}: {
  entries: PersonalPlanningEntryRow[];
  /** §22/§47 — entrées déplacées hors d'aujourd'hui pendant la journée (voir logAudit "personal_planning_entry.moved"). */
  reporteesCount?: number;
  todayKey: string;
  initialNotes: string | null;
}) {
  const real = entries.filter((e) => e.type !== "RESERVE" && !e.meetingHref);
  const terminees = real.filter((e) => e.statut === "TERMINEE");
  const bloquees = real.filter((e) => e.statut === "BLOQUEE");
  const enRetard = real.filter((e) => new Date(e.dateFin) < new Date() && !["TERMINEE", "ANNULEE"].includes(e.statut));
  const annulees = real.filter((e) => e.statut === "ANNULEE");

  const [notes, setNotes] = useState(initialNotes ?? "");
  const [savedNotes, setSavedNotes] = useState(initialNotes ?? "");
  const { run: save, isPending } = useAction(saveDailyReviewNotes, {
    successMessage: (result) => (result.notes ? "Notes enregistrées." : "Notes supprimées."),
  });

  async function handleBlur() {
    if (notes === savedNotes) return;
    const result = await save({ date: todayKey, notes });
    if (result.ok) setSavedNotes(notes);
  }

  /**
   * Continue automatiquement une liste à tirets : Entrée sur une ligne qui
   * commence par "-" (avec ou sans espace/texte après — "-", "- " et
   * "- texte" comptent tous) ouvre une nouvelle ligne "- ". Un tiret laissé
   * vide s'efface au Retour arrière comme n'importe quel caractère, pas
   * besoin d'un geste spécial pour "sortir" de la liste.
   */
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter") return;
    const el = e.currentTarget;
    const cursor = el.selectionStart;
    const before = notes.slice(0, cursor);
    const after = notes.slice(cursor);
    const lineStart = before.lastIndexOf("\n") + 1;
    const currentLine = before.slice(lineStart);
    const match = currentLine.match(/^(\s*)-(?:\s|$)/);
    if (!match) return;

    e.preventDefault();
    const indent = match[1];
    const insertion = `\n${indent}- `;
    const newValue = before + insertion + after;
    setNotes(newValue);
    requestAnimationFrame(() => {
      const pos = before.length + insertion.length;
      el.setSelectionRange(pos, pos);
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Moon className="size-5 text-primary" />
          <CardTitle className="text-base">Bilan de ma journée</CardTitle>
        </div>
        <Link href="/planning-personnel/bilans" className="text-xs text-muted-foreground hover:text-primary hover:underline">
          Historique des bilans →
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {real.length > 0 && (
          <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3">
            <Stat label="Prévues" value={real.length} />
            <Stat label="Terminées" value={terminees.length} tone="text-success" />
            <Stat label="Reportées" value={reporteesCount} tone={reporteesCount > 0 ? "text-warning" : undefined} />
            <Stat label="En retard" value={enRetard.length} tone="text-destructive" />
            <Stat label="Bloquées" value={bloquees.length} tone="text-warning" />
          </div>
        )}

        {bloquees.length > 0 && (
          <div>
            <h3 className="mb-1.5 text-sm font-semibold">Activités bloquées</h3>
            <ul className="space-y-1">
              {bloquees.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-sm">
                  <span className="truncate">{e.titre}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {e.motifBlocage ? ENTRY_MOTIF_BLOCAGE_LABELS[e.motifBlocage] : "Motif non renseigné"}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        {annulees.length > 0 && (
          <p className="text-xs text-muted-foreground">{annulees.length} activité(s) annulée(s) aujourd&apos;hui.</p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="daily-review-notes">Mes notes / raisons de la journée</Label>
          <Textarea
            id="daily-review-notes"
            placeholder={"Ce qui a bien/mal fonctionné, pourquoi tel blocage, contexte à garder en tête demain...\n\nAstuce : commencez une ligne par \"- \" pour une liste à puces, la puce suivante s'ajoute toute seule à chaque Entrée."}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            rows={6}
          />
          {isPending && <p className="text-xs text-muted-foreground">Enregistrement...</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="overflow-hidden rounded-md border p-2 text-center">
      <div className={`text-lg font-semibold ${tone ?? ""}`}>{value}</div>
      <div className="truncate text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
