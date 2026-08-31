import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ENTRY_TYPE_META } from "@/lib/personal-planning-types";
import type { PersonalPlanningEntryRow } from "@/components/personal-planning/personal-planning-week";

type NonWorkingReason = { label: string; kind: "ferie" | "conge" | "absence" | "non_ouvrable" };

const NON_WORKING_STYLES: Record<string, { emoji: string; badge: string }> = {
  ferie: { emoji: "🎉", badge: "bg-destructive/10 text-destructive" },
  conge: { emoji: "🏖️", badge: "bg-primary/10 text-primary" },
  absence: { emoji: "🚫", badge: "bg-warning/15 text-warning" },
  non_ouvrable: { emoji: "📅", badge: "bg-muted text-muted-foreground" },
};

function groupByDate(entries: PersonalPlanningEntryRow[]) {
  const groups = new Map<string, PersonalPlanningEntryRow[]>();
  const sorted = [...entries].sort((a, b) => a.dateDebut.localeCompare(b.dateDebut));
  for (const e of sorted) {
    const key = e.dateDebut.slice(0, 10);
    const list = groups.get(key) ?? [];
    list.push(e);
    groups.set(key, list);
  }
  return groups;
}

/** Vue Timeline (§8) : vision temporelle des activités, groupées par date avec ligne connectrice — même style que TaskTimelineView. */
export function PersonalPlanningTimeline({
  entries,
  nonWorkingByDate,
}: {
  entries: PersonalPlanningEntryRow[];
  /** §39 — jour férié, absence exceptionnelle ou jour non ouvrable de chaque date (yyyy-MM-dd). */
  nonWorkingByDate?: Map<string, NonWorkingReason>;
}) {
  const groups = groupByDate(entries);

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune activité sur cette période.</p>;
  }

  return (
    <ol className="space-y-6">
      {Array.from(groups.entries()).map(([dateKey, group]) => {
        const nonWorking = nonWorkingByDate?.get(dateKey);
        const style = nonWorking ? NON_WORKING_STYLES[nonWorking.kind] : null;
        return (
        <li key={dateKey} className="relative border-l-2 pl-4">
          <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary" />
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold capitalize">
            {new Date(dateKey).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {nonWorking && style && (
              <Badge variant="outline" className={cn("gap-1 text-[10px] font-normal normal-case", style.badge)}>
                {style.emoji} {nonWorking.label}
              </Badge>
            )}
          </div>
          <ul className="space-y-1.5">
            {group.map((entry) => {
              const meta = ENTRY_TYPE_META[entry.type];
              return (
                <li key={entry.id}>
                  <div className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm">
                    <span className="font-medium">{new Date(entry.dateDebut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                    <span>{entry.titre}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {meta.label}
                    </Badge>
                    {entry.tacheId && (
                      <Link href={`/taches/${entry.tacheId}`} className="text-xs text-muted-foreground hover:text-primary">
                        Tâche liée
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </li>
        );
      })}
    </ol>
  );
}
