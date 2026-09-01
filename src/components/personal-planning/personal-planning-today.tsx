"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { reorganizeOverloadedDay } from "@/actions/personal-planning.actions";
import { ENTRY_TYPE_META, ENTRY_PRIORITE_META, ENTRY_PRIORITE_ORDER } from "@/lib/personal-planning-types";
import type { DailyCharge } from "@/lib/personal-planning-workload";
import type { PersonalPlanningEntryRow } from "@/components/personal-planning/personal-planning-week";
import { RequestReassignmentDialog, type ColleagueOption } from "@/components/personal-planning/request-reassignment-dialog";
import { Sun, ListChecks, TriangleAlert, ArrowRight } from "lucide-react";

const GROUP_TITLE: Record<(typeof ENTRY_PRIORITE_ORDER)[number], string> = {
  CRITIQUE: "Priorités critiques",
  HAUTE: "Priorités hautes",
  NORMALE: "Activités normales",
  FAIBLE: "Priorités faibles",
};

/** Bloc « Ma journée » (§6) : activités du jour groupées par priorité (§11), bandeau de surcharge (§15) avec suggestions légères (§16). */
export function PersonalPlanningToday({
  entries,
  charge,
  todayKey,
  colleagues = [],
}: {
  entries: PersonalPlanningEntryRow[];
  charge: DailyCharge;
  todayKey: string;
  colleagues?: ColleagueOption[];
}) {
  const sorted = [...entries].sort((a, b) => a.dateDebut.localeCompare(b.dateDebut));
  const { run: reorganize, isPending } = useAction(reorganizeOverloadedDay, {
    successMessage: (r) => (r.moved > 0 ? `${r.moved} activité(s) réorganisée(s).` : "Rien à réorganiser."),
  });
  const [reassignOpen, setReassignOpen] = useState(false);

  // §16 options 2/4 — réunion du jour à déplacer (renvoie vers /reunions,
  // édité là-bas) ; activités non critiques liées à une tâche, éligibles à
  // une demande de réaffectation.
  const todayMeeting = sorted.find((e) => e.meetingHref);
  const reassignableEntries = sorted.filter((e) => e.priorite !== "CRITIQUE" && e.tacheId && !e.meetingHref);

  return (
    <Card className="min-h-[22rem]">
      <CardHeader className="flex flex-row items-center gap-2">
        <Sun className="size-5 text-primary" />
        <CardTitle className="text-base">Ma journée</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col space-y-4">
        <div className="flex-1 space-y-4">
        {charge.enSurcharge && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-sm">
            <TriangleAlert className="h-4 w-4 shrink-0 text-destructive" />
            <span>
              <span className="font-semibold text-destructive">🔴 Surcharge : {charge.tauxOccupation} %</span> — Votre journée contient{" "}
              {charge.heuresSupplementaires} h de travail supplémentaire.
            </span>
            <div className="ml-auto flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => reorganize({ date: todayKey, strategy: "REPORTER" })}>
                Reporter à demain
              </Button>
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => reorganize({ date: todayKey, strategy: "ETALER" })}>
                Étaler sur les jours suivants
              </Button>
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => reorganize({ date: todayKey, strategy: "REDUIRE" })}>
                Réduire le temps réservé
              </Button>
              {todayMeeting && (
                <Link href={todayMeeting.meetingHref!}>
                  <Button size="sm" variant="outline">
                    Déplacer une réunion
                  </Button>
                </Link>
              )}
              {reassignableEntries.length > 0 && colleagues.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => setReassignOpen(true)}>
                  Demander une réaffectation
                </Button>
              )}
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
        </div>

        <Link
          href="/ma-journee"
          className="mt-auto flex items-center justify-center gap-1 rounded-md border pt-2 pb-2 text-sm text-primary hover:bg-muted/40 hover:underline"
        >
          Voir toute ma journée
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardContent>
      <RequestReassignmentDialog
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        entries={reassignableEntries.map((e) => ({ id: e.id, titre: e.titre }))}
        colleagues={colleagues}
      />
    </Card>
  );
}
