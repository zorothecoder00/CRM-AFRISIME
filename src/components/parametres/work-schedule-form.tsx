"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { saveWorkSchedule } from "@/actions/user-work-schedule.actions";
import type { DayScheduleInput } from "@/lib/validations/user-work-schedule.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

const DAY_LABELS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const TYPE_LABELS: Record<DayScheduleInput["type"], string> = {
  NORMAL: "Normal",
  FLEXIBLE: "Flexible",
  TELETRAVAIL: "Télétravail",
  MISSION: "Mission",
  ABSENCE: "Absence",
};

/** §40 : une ligne par jour de semaine — le moteur de planification connaît ainsi la capacité réelle disponible (voir computeDailyCapacity). */
export function WorkScheduleForm({ initialDays }: { initialDays: DayScheduleInput[] }) {
  const [days, setDays] = useState<DayScheduleInput[]>(initialDays);
  const { run: submit, isPending } = useAction(saveWorkSchedule, { successMessage: "Horaires enregistrés." });

  function updateDay(index: number, patch: Partial<DayScheduleInput>) {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        {days.map((day, i) => (
          <div key={day.jourSemaine} className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm">
            <label className="flex w-32 shrink-0 items-center gap-2">
              <Checkbox checked={day.actif} onCheckedChange={(c) => updateDay(i, { actif: c === true })} />
              {DAY_LABELS[day.jourSemaine]}
            </label>
            {day.actif && (
              <>
                <Input
                  type="time"
                  value={day.heureDebut}
                  onChange={(e) => updateDay(i, { heureDebut: e.target.value })}
                  className="w-28"
                />
                <span className="text-muted-foreground">à</span>
                <Input type="time" value={day.heureFin} onChange={(e) => updateDay(i, { heureFin: e.target.value })} className="w-28" />
                <span className="text-xs text-muted-foreground">Pause</span>
                <Input
                  type="time"
                  value={day.pauseDebut ?? ""}
                  onChange={(e) => updateDay(i, { pauseDebut: e.target.value })}
                  className="w-28"
                />
                <span className="text-muted-foreground">–</span>
                <Input type="time" value={day.pauseFin ?? ""} onChange={(e) => updateDay(i, { pauseFin: e.target.value })} className="w-28" />
                <Select value={day.type} onValueChange={(v) => updateDay(i, { type: v as DayScheduleInput["type"] })}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TYPE_LABELS) as DayScheduleInput["type"][]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        ))}

        <Button disabled={isPending} onClick={() => submit({ days })}>
          {isPending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </CardContent>
    </Card>
  );
}
