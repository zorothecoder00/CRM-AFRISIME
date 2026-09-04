"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { saveWorkSchedule } from "@/actions/user-work-schedule.actions";
import type { DayScheduleInput, ShiftScheduleInput } from "@/lib/validations/user-work-schedule.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, X, CopyPlus } from "lucide-react";

const DAY_LABELS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const TYPE_LABELS: Record<DayScheduleInput["type"], string> = {
  NORMAL: "Normal",
  FLEXIBLE: "Flexible",
  TELETRAVAIL: "Télétravail",
  MISSION: "Mission",
  ABSENCE: "Absence",
};

const EMPTY_SHIFT: ShiftScheduleInput = { heureDebut: "08:00", heureFin: "17:00", breaks: [] };
const MAX_SHIFTS_PER_DAY = 4;
const MAX_BREAKS_PER_SHIFT = 5;

// jourSemaine : 0 = Dimanche ... 6 = Samedi (voir DAY_LABELS ci-dessus).
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

/** Copie profonde : shifts/breaks ne doivent jamais être partagés entre deux jours (édition de l'un n'affecterait pas l'autre). */
function cloneShifts(shifts: ShiftScheduleInput[]): ShiftScheduleInput[] {
  return shifts.map((s) => ({ ...s, breaks: s.breaks.map((b) => ({ ...b })) }));
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Bug de production — raccourcir un horaire sans toucher aux pauses déjà
 * posées dedans pouvait laisser une pause déborder des nouvelles bornes, ce
 * qui faisait échouer l'enregistrement de TOUT le planning (voir
 * user-work-schedule.schema.ts, désormais tolérant en dernier recours).
 * Recadre ici les pauses existantes dès que l'horaire change, pour un retour
 * visuel immédiat plutôt qu'une correction silencieuse seulement au save.
 */
function clampBreaksToShift(shift: ShiftScheduleInput): ShiftScheduleInput["breaks"] {
  const start = toMinutes(shift.heureDebut);
  const end = toMinutes(shift.heureFin);
  if (end <= start) return shift.breaks;
  return shift.breaks
    .map((b) => ({
      heureDebut: minutesToHHMM(Math.max(start, toMinutes(b.heureDebut))),
      heureFin: minutesToHHMM(Math.min(end, toMinutes(b.heureFin))),
    }))
    .filter((b) => toMinutes(b.heureFin) > toMinutes(b.heureDebut));
}

/**
 * §40 : une carte par jour de semaine. Demande utilisateur — un jour peut
 * porter plusieurs horaires (ex. matin + soir), chacun avec ses propres
 * pauses, plutôt qu'un seul horaire/une seule pause par jour. Le moteur de
 * planification connaît ainsi la capacité réelle disponible (voir
 * resolveDailyCapacity côté serveur).
 */
export function WorkScheduleForm({ initialDays }: { initialDays: DayScheduleInput[] }) {
  const [days, setDays] = useState<DayScheduleInput[]>(initialDays);
  const { run: submit, isPending } = useAction(saveWorkSchedule, { successMessage: "Horaires enregistrés." });

  function updateDay(dayIndex: number, patch: Partial<DayScheduleInput>) {
    setDays((prev) => prev.map((d, i) => (i === dayIndex ? { ...d, ...patch } : d)));
  }

  function addShift(dayIndex: number) {
    setDays((prev) =>
      prev.map((d, i) => (i === dayIndex ? { ...d, shifts: [...d.shifts, { ...EMPTY_SHIFT, breaks: [] }] } : d))
    );
  }

  function removeShift(dayIndex: number, shiftIndex: number) {
    setDays((prev) =>
      prev.map((d, i) => (i === dayIndex ? { ...d, shifts: d.shifts.filter((_, si) => si !== shiftIndex) } : d))
    );
  }

  function updateShift(dayIndex: number, shiftIndex: number, patch: Partial<ShiftScheduleInput>) {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? {
              ...d,
              shifts: d.shifts.map((s, si) => {
                if (si !== shiftIndex) return s;
                const merged = { ...s, ...patch };
                // Ne recadre que si l'horaire lui-même vient de changer —
                // sans effet sur un simple changement d'un autre champ.
                if (patch.heureDebut === undefined && patch.heureFin === undefined) return merged;
                return { ...merged, breaks: clampBreaksToShift(merged) };
              }),
            }
          : d
      )
    );
  }

  function addBreak(dayIndex: number, shiftIndex: number) {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? {
              ...d,
              shifts: d.shifts.map((s, si) =>
                si === shiftIndex ? { ...s, breaks: [...s.breaks, { heureDebut: "12:00", heureFin: "13:00" }] } : s
              ),
            }
          : d
      )
    );
  }

  function removeBreak(dayIndex: number, shiftIndex: number, breakIndex: number) {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? {
              ...d,
              shifts: d.shifts.map((s, si) =>
                si === shiftIndex ? { ...s, breaks: s.breaks.filter((_, bi) => bi !== breakIndex) } : s
              ),
            }
          : d
      )
    );
  }

  /**
   * Demande utilisateur — appliquer l'horaire d'un jour à plusieurs autres
   * d'un coup (semaine, jours ouvrés, weekend) plutôt que de tout ressaisir
   * jour par jour. Copie type + shifts (avec pauses) ; jourSemaine et actif
   * de la cible ne changent pas côté identité (actif passe à true).
   */
  function applySchedule(sourceDayIndex: number, targetJoursSemaine: number[]) {
    const source = days[sourceDayIndex];
    setDays((prev) =>
      prev.map((d) =>
        targetJoursSemaine.includes(d.jourSemaine) && d.jourSemaine !== source.jourSemaine
          ? { ...d, actif: true, type: source.type, shifts: cloneShifts(source.shifts) }
          : d
      )
    );
  }

  function updateBreak(dayIndex: number, shiftIndex: number, breakIndex: number, patch: Partial<ShiftScheduleInput["breaks"][number]>) {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? {
              ...d,
              shifts: d.shifts.map((s, si) =>
                si === shiftIndex
                  ? { ...s, breaks: s.breaks.map((b, bi) => (bi === breakIndex ? { ...b, ...patch } : b)) }
                  : s
              ),
            }
          : d
      )
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        {days.map((day, dayIndex) => (
          <div key={day.jourSemaine} className="space-y-2 rounded-md border p-2.5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex w-32 shrink-0 items-center gap-2">
                <Checkbox checked={day.actif} onCheckedChange={(c) => updateDay(dayIndex, { actif: c === true })} />
                {DAY_LABELS[day.jourSemaine]}
              </label>
              {day.actif && (
                <Select value={day.type} onValueChange={(v) => updateDay(dayIndex, { type: v as DayScheduleInput["type"] })}>
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
              )}
              {day.actif && day.type !== "ABSENCE" && day.shifts.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground">
                      <CopyPlus className="h-3.5 w-3.5" />
                      Dupliquer vers...
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onSelect={() => applySchedule(dayIndex, ALL_DAYS)}>Toute la semaine</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => applySchedule(dayIndex, WEEKDAYS)}>Jours ouvrés (Lun-Ven)</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => applySchedule(dayIndex, WEEKEND)}>Weekend (Sam-Dim)</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {day.actif && day.type !== "ABSENCE" && (
              <div className="space-y-2 pl-2">
                {day.shifts.map((shift, shiftIndex) => (
                  <div key={shiftIndex} className="space-y-1.5 rounded-md bg-muted/30 p-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">Horaire {shiftIndex + 1}</span>
                      <Input
                        type="time"
                        value={shift.heureDebut}
                        onChange={(e) => updateShift(dayIndex, shiftIndex, { heureDebut: e.target.value })}
                        className="w-28"
                      />
                      <span className="text-muted-foreground">à</span>
                      <Input
                        type="time"
                        value={shift.heureFin}
                        onChange={(e) => updateShift(dayIndex, shiftIndex, { heureFin: e.target.value })}
                        className="w-28"
                      />
                      {day.shifts.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeShift(dayIndex, shiftIndex)}
                          title="Retirer cet horaire"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pl-4">
                      {shift.breaks.map((brk, breakIndex) => (
                        <div key={breakIndex} className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Pause</span>
                          <Input
                            type="time"
                            value={brk.heureDebut}
                            onChange={(e) => updateBreak(dayIndex, shiftIndex, breakIndex, { heureDebut: e.target.value })}
                            className="w-24"
                          />
                          <span className="text-muted-foreground">–</span>
                          <Input
                            type="time"
                            value={brk.heureFin}
                            onChange={(e) => updateBreak(dayIndex, shiftIndex, breakIndex, { heureFin: e.target.value })}
                            className="w-24"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeBreak(dayIndex, shiftIndex, breakIndex)}
                            title="Retirer cette pause"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      {shift.breaks.length < MAX_BREAKS_PER_SHIFT && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs text-muted-foreground"
                          onClick={() => addBreak(dayIndex, shiftIndex)}
                        >
                          <Plus className="h-3 w-3" />
                          Pause
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {day.shifts.length < MAX_SHIFTS_PER_DAY && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => addShift(dayIndex)}
                  >
                    <Plus className="h-3 w-3" />
                    Ajouter un horaire
                  </Button>
                )}
              </div>
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
