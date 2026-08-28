"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { reorganizeOverloadedDay } from "@/actions/personal-planning.actions";
import { ENTRY_TYPE_META, ENTRY_PRIORITE_META, ENTRY_PRIORITE_ORDER } from "@/lib/personal-planning-types";
import type { DailyCharge } from "@/lib/personal-planning-workload";
import type { PersonalPlanningEntryRow } from "@/components/personal-planning/personal-planning-week";
import { CalendarCheck2, ListChecks, TriangleAlert } from "lucide-react";

const GROUP_TITLE: Record<(typeof ENTRY_PRIORITE_ORDER)[number], string> = {
  CRITIQUE: "Priorités critiques",
  HAUTE: "Priorités hautes",
  NORMALE: "Activités normales",
  FAIBLE: "Priorités faibles",
};

/** Bloc « Ma journée » (§6) : activités du jour groupées par priorité (§11), bandeau de surcharge (§15) avec suggestions légères (§16). */
export function PersonalPlanningToday({ entries, charge, todayKey }: { entries: PersonalPlanningEntryRow[]; charge: DailyCharge; todayKey: string }) {
  const sorted = [...entries].sort((a, b) => a.dateDebut.localeCompare(b.dateDebut));
  const { run: reorganize, isPending } = useAction(reorganizeOverloadedDay, {
    successMessage: (r) => (r.moved > 0 ? `${r.moved} activité(s) réorganisée(s).` : "Rien à réorganiser."),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <CalendarCheck2 className="size-5 text-primary" />
        <CardTitle className="text-base">Ma journée</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {charge.enSurcharge && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-sm">
            <TriangleAlert className="h-4 w-4 shrink-0 text-destructive" />
            <span>
              <span className="font-semibold text-destructive">🔴 Surcharge : {charge.tauxOccupation} %</span> — Votre journée contient{" "}
              {charge.heuresSupplementaires} h de travail supplémentaire.
            </span>
            <div className="ml-auto flex gap-1.5">
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => reorganize({ date: todayKey, strategy: "REPORTER" })}>
                Reporter à demain
              </Button>
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => reorganize({ date: todayKey, strategy: "ETALER" })}>
                Étaler sur les jours suivants
              </Button>
            </div>
          </div>
        )}

        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">Rien de prévu aujourd&apos;hui.</p>
        ) : (
          ENTRY_PRIORITE_ORDER.map((priorite) => {
            const group = sorted.filter((e) => e.priorite === priorite);
            if (group.length === 0) return null;
            return (
              <div key={priorite}>
                <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
                  <span>{ENTRY_PRIORITE_META[priorite].emoji}</span>
                  {GROUP_TITLE[priorite]}
                  <Badge variant="outline" className="text-[10px]">
                    {group.length}
                  </Badge>
                </h3>
                <ul className="space-y-1">
                  {group.map((entry) => {
                    const meta = ENTRY_TYPE_META[entry.type];
                    const Icon = meta.icon;
                    return (
                      <li key={entry.id} className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="font-medium">
                          {new Date(entry.dateDebut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="flex-1 truncate">{entry.titre}</span>
                        {entry.tacheId && (
                          <Link href={`/taches/${entry.tacheId}`} title="Voir la tâche liée">
                            <ListChecks className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
