import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ENTRY_TYPE_META, ENTRY_PRIORITE_META } from "@/lib/personal-planning-types";
import type { PersonalPlanningEntryRow } from "@/components/personal-planning/personal-planning-week";
import { ListChecks, Sparkles } from "lucide-react";

type NonWorkingReason = { label: string; kind: "ferie" | "conge" | "absence" | "non_ouvrable" };

const NON_WORKING_STYLES: Record<string, { emoji: string; badge: string }> = {
  conge: { emoji: "🏖️", badge: "bg-primary/10 text-primary" },
  ferie: { emoji: "🎉", badge: "bg-destructive/10 text-destructive" },
  absence: { emoji: "🚫", badge: "bg-warning/15 text-warning" },
  non_ouvrable: { emoji: "📅", badge: "bg-muted text-muted-foreground" },
};

/** Vue Agenda (§8) : liste chronologique plate, groupée par jour. */
export function PersonalPlanningAgenda({
  entries,
  nonWorkingByDate,
}: {
  entries: PersonalPlanningEntryRow[];
  /** §39 — jour férié, absence exceptionnelle ou jour non ouvrable de chaque date (yyyy-MM-dd). */
  nonWorkingByDate?: Map<string, NonWorkingReason>;
}) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <Sparkles className="h-5 w-5 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Rien de prévu sur cette période.</p>
      </div>
    );
  }

  const groups = new Map<string, PersonalPlanningEntryRow[]>();
  for (const e of [...entries].sort((a, b) => a.dateDebut.localeCompare(b.dateDebut))) {
    const key = e.dateDebut.slice(0, 10);
    const list = groups.get(key) ?? [];
    list.push(e);
    groups.set(key, list);
  }

  return (
    <div className="space-y-4">
      {Array.from(groups.entries()).map(([dateKey, group]) => {
        const nonWorking = nonWorkingByDate?.get(dateKey);
        const style = nonWorking ? NON_WORKING_STYLES[nonWorking.kind] : null;
        return (
        <div key={dateKey}>
          <h3 className="mb-1.5 flex items-center gap-2 text-sm font-semibold capitalize">
            {new Date(dateKey).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            {nonWorking && style && (
              <Badge variant="outline" className={cn("gap-1 text-[10px] font-normal normal-case", style.badge)}>
                {style.emoji} {nonWorking.label}
              </Badge>
            )}
          </h3>
          <ul className="space-y-1.5">
            {group.map((entry) => {
              const meta = ENTRY_TYPE_META[entry.type];
              const Icon = meta.icon;
              return (
                <li key={entry.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium">
                    {new Date(entry.dateDebut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="flex-1 truncate">
                    {entry.meetingHref ? (
                      <Link href={entry.meetingHref} className="text-primary hover:underline">
                        {entry.titre}
                      </Link>
                    ) : (
                      entry.titre
                    )}
                  </span>
                  <span className="text-xs">{ENTRY_PRIORITE_META[entry.priorite].emoji}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {meta.label}
                  </Badge>
                  {new Date(entry.dateFin) < new Date() && !["TERMINEE", "ANNULEE"].includes(entry.statut) && (
                    <Badge variant="destructive" className="text-[10px]">
                      En retard
                    </Badge>
                  )}
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
      })}
    </div>
  );
}
