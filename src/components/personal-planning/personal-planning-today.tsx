"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAction } from "@/hooks/use-action";
import { reorganizeOverloadedDay } from "@/actions/personal-planning.actions";
import { ENTRY_TYPE_META, ENTRY_PRIORITE_META, ENTRY_PRIORITE_ORDER } from "@/lib/personal-planning-types";
import { formatHours, type DailyCharge } from "@/lib/personal-planning-workload";
import type { PersonalPlanningEntryRow } from "@/components/personal-planning/personal-planning-week";
import { RequestReassignmentDialog, type ColleagueOption } from "@/components/personal-planning/request-reassignment-dialog";
import { Sun, ListChecks, TriangleAlert, ArrowRight } from "lucide-react";

const GROUP_TITLE: Record<(typeof ENTRY_PRIORITE_ORDER)[number], string> = {
  CRITIQUE: "Priorités critiques",
  HAUTE: "Priorités hautes",
  NORMALE: "Activités normales",
  FAIBLE: "Priorités faibles",
};

type Strategy = "REPORTER" | "ETALER" | "REDUIRE" | "DEPLACER_REUNION" | "REAFFECTATION" | "CONSERVER";

/**
 * §8/§16 (cahier de corrections UI/UX) — dialogue "Comment souhaitez-vous
 * réorganiser ?" : un choix radio parmi les 5 options prévues au cahier
 * (+ "Étaler sur les jours suivants", déjà proposé avant ce cahier — gardé
 * en 6e option plutôt que retiré, la fonctionnalité marchait déjà).
 */
export function ReorganizeDialog({
  open,
  onOpenChange,
  todayKey,
  todayMeetingHref,
  canReassign,
  onReassign,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todayKey: string;
  todayMeetingHref: string | null;
  canReassign: boolean;
  onReassign: () => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Strategy>("REPORTER");
  const { run: reorganize, isPending } = useAction(reorganizeOverloadedDay, {
    successMessage: (r) => (r.moved > 0 ? `${r.moved} activité(s) réorganisée(s).` : "Rien à réorganiser."),
  });

  const options: { value: Strategy; label: string; disabled?: boolean }[] = [
    { value: "REPORTER", label: "Reporter les tâches non prioritaires" },
    { value: "ETALER", label: "Étaler sur les jours suivants" },
    { value: "REDUIRE", label: "Réduire le temps réservé" },
    { value: "DEPLACER_REUNION", label: "Déplacer une réunion", disabled: !todayMeetingHref },
    { value: "REAFFECTATION", label: "Demander une réaffectation", disabled: !canReassign },
    { value: "CONSERVER", label: "Conserver la surcharge" },
  ];

  async function handleApply() {
    switch (selected) {
      case "REPORTER":
      case "ETALER":
      case "REDUIRE": {
        const result = await reorganize({ date: todayKey, strategy: selected });
        if (result.ok) onOpenChange(false);
        break;
      }
      case "DEPLACER_REUNION":
        onOpenChange(false);
        if (todayMeetingHref) router.push(todayMeetingHref);
        break;
      case "REAFFECTATION":
        onOpenChange(false);
        onReassign();
        break;
      case "CONSERVER":
        onOpenChange(false);
        break;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Comment souhaitez-vous réorganiser ?</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          {options.map((o) => (
            <label
              key={o.value}
              className={`flex items-center gap-2 rounded-md border p-2.5 text-sm ${o.disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-muted/40"} ${selected === o.value ? "border-primary bg-primary/5" : ""}`}
            >
              <input
                type="radio"
                name="reorganize-strategy"
                value={o.value}
                checked={selected === o.value}
                disabled={o.disabled}
                onChange={() => setSelected(o.value)}
                className="accent-primary"
              />
              {o.label}
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={handleApply} disabled={isPending}>
            {isPending ? "Application..." : "Appliquer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Bloc « Ma journée » (§6) : activités du jour groupées par priorité (§11), bandeau de surcharge (§15) compact (cahier de corrections UI/UX §8). */
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
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reorganizeOpen, setReorganizeOpen] = useState(false);

  // §16 options 2/4 — réunion du jour à déplacer (renvoie vers /reunions,
  // édité là-bas) ; activités non critiques liées à une tâche, éligibles à
  // une demande de réaffectation.
  const todayMeeting = sorted.find((e) => e.meetingHref);
  const reassignableEntries = sorted.filter((e) => e.priorite !== "CRITIQUE" && e.tacheId && !e.meetingHref);
  const canReassign = reassignableEntries.length > 0 && colleagues.length > 0;

  return (
    <Card className="min-h-[22rem]">
      <CardHeader className="flex flex-row items-center gap-2">
        <Sun className="size-5 text-primary" />
        <CardTitle className="text-base">Ma journée</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col space-y-4">
        <div className="flex-1 space-y-4">
        {charge.enSurcharge && (
          <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-sm">
            <div className="flex items-center gap-1.5">
              <TriangleAlert className="h-4 w-4 shrink-0 text-destructive" />
              <span className="font-semibold text-destructive">SURCHARGE</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <p className="text-muted-foreground">Charge prévue</p>
                <p className="font-semibold">{formatHours(charge.chargeHeures)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Capacité</p>
                <p className="font-semibold">{formatHours(charge.capaciteHeures)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Surcharge</p>
                <p className="font-semibold text-destructive">+{formatHours(charge.heuresSupplementaires)}</p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Charge</span>
                <span className="font-semibold text-destructive">{charge.tauxOccupation}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-destructive" style={{ width: `${Math.min(100, charge.tauxOccupation)}%` }} />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Button size="sm" onClick={() => setReorganizeOpen(true)}>
                Réorganiser
              </Button>
              <Link href={`/planning-personnel?vue=liste&semaine=${todayKey}`}>
                <Button size="sm" variant="outline">
                  Voir les tâches concernées
                </Button>
              </Link>
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

      <ReorganizeDialog
        open={reorganizeOpen}
        onOpenChange={setReorganizeOpen}
        todayKey={todayKey}
        todayMeetingHref={todayMeeting?.meetingHref ?? null}
        canReassign={canReassign}
        onReassign={() => setReassignOpen(true)}
      />
      <RequestReassignmentDialog
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        entries={reassignableEntries.map((e) => ({ id: e.id, titre: e.titre }))}
        colleagues={colleagues}
      />
    </Card>
  );
}
