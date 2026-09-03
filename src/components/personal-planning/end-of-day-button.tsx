"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PersonalPlanningEndOfDay } from "@/components/personal-planning/end-of-day";
import type { PersonalPlanningEntryRow } from "@/components/personal-planning/personal-planning-week";
import { Moon } from "lucide-react";

/**
 * "Bilan de ma journée" (§22) — demande utilisateur : un simple bouton-lien
 * en haut de page (à côté de "Nouvelle tâche"), plutôt qu'un gros bloc
 * détaillé fixe dans la colonne latérale. Le contenu reste inchangé
 * (PersonalPlanningEndOfDay, déjà une Card autonome), juste déplacé dans un
 * dialogue ouvert à la demande.
 */
export function EndOfDayButton({
  entries,
  reporteesCount,
  todayKey,
  initialNotes,
}: {
  entries: PersonalPlanningEntryRow[];
  reporteesCount?: number;
  todayKey: string;
  initialNotes: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Moon className="mr-1 h-4 w-4" />
        Bilan de ma journée
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <PersonalPlanningEndOfDay
            entries={entries}
            reporteesCount={reporteesCount}
            todayKey={todayKey}
            initialNotes={initialNotes}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
