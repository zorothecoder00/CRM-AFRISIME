import { z } from "zod";

const WORK_SCHEDULE_TYPES = ["NORMAL", "FLEXIBLE", "TELETRAVAIL", "MISSION", "ABSENCE"] as const;
const HOUR_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

const breakScheduleSchema = z
  .object({
    heureDebut: z.string().regex(HOUR_PATTERN, "Format HH:mm attendu."),
    heureFin: z.string().regex(HOUR_PATTERN, "Format HH:mm attendu."),
  })
  .refine((b) => toMinutes(b.heureFin) > toMinutes(b.heureDebut), {
    message: "L'heure de fin de pause doit être après l'heure de début.",
    path: ["heureFin"],
  });

/** Demande utilisateur : un jour peut porter plusieurs horaires (ex. matin + soir), chacun avec ses propres pauses. */
const shiftScheduleSchema = z
  .object({
    heureDebut: z.string().regex(HOUR_PATTERN, "Format HH:mm attendu."),
    heureFin: z.string().regex(HOUR_PATTERN, "Format HH:mm attendu."),
    breaks: z.array(breakScheduleSchema).max(5, "5 pauses maximum par horaire."),
  })
  .superRefine((shift, ctx) => {
    const start = toMinutes(shift.heureDebut);
    const end = toMinutes(shift.heureFin);
    if (end <= start) {
      ctx.addIssue({ code: "custom", message: "L'heure de fin doit être après l'heure de début.", path: ["heureFin"] });
      return;
    }
    for (const b of shift.breaks) {
      if (toMinutes(b.heureDebut) < start || toMinutes(b.heureFin) > end) {
        ctx.addIssue({ code: "custom", message: "Une pause doit rester à l'intérieur de l'horaire.", path: ["breaks"] });
        return;
      }
    }
  });

const dayScheduleSchema = z.object({
  jourSemaine: z.number().int().min(0).max(6),
  actif: z.boolean(),
  type: z.enum(WORK_SCHEDULE_TYPES),
  shifts: z.array(shiftScheduleSchema).max(4, "4 horaires maximum par jour."),
});

/** §40 : sept jours (0=dimanche...6=samedi), un par ligne du formulaire. Un jour actif doit porter au moins un horaire. */
export const saveWorkScheduleSchema = z.object({
  days: z
    .array(dayScheduleSchema)
    .length(7)
    .superRefine((days, ctx) => {
      days.forEach((day, i) => {
        if (day.actif && day.type !== "ABSENCE" && day.shifts.length === 0) {
          ctx.addIssue({ code: "custom", message: "Ajoutez au moins un horaire pour ce jour actif.", path: [i, "shifts"] });
        }
      });
    }),
});

export type SaveWorkScheduleInput = z.infer<typeof saveWorkScheduleSchema>;
export type DayScheduleInput = z.infer<typeof dayScheduleSchema>;
export type ShiftScheduleInput = z.infer<typeof shiftScheduleSchema>;
export type BreakScheduleInput = z.infer<typeof breakScheduleSchema>;

/** §39 — dérogation ponctuelle à une date précise (distincte du gabarit hebdomadaire récurrent ci-dessus). */
export const createWorkScheduleExceptionSchema = z
  .object({
    date: z.string().min(1, "Date requise."),
    type: z.enum(WORK_SCHEDULE_TYPES).default("ABSENCE"),
    heureDebut: z.string().regex(HOUR_PATTERN, "Format HH:mm attendu.").optional().or(z.literal("")),
    heureFin: z.string().regex(HOUR_PATTERN, "Format HH:mm attendu.").optional().or(z.literal("")),
    pauseDebut: z.string().regex(HOUR_PATTERN).optional().or(z.literal("")),
    pauseFin: z.string().regex(HOUR_PATTERN).optional().or(z.literal("")),
    motif: z.string().max(200).optional(),
  })
  .refine((d) => d.type === "ABSENCE" || (!!d.heureDebut && !!d.heureFin), {
    message: "Heures de début et de fin requises sauf pour une absence.",
    path: ["heureDebut"],
  });

export type CreateWorkScheduleExceptionInput = z.infer<typeof createWorkScheduleExceptionSchema>;
