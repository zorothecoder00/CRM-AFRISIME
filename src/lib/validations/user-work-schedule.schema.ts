import { z } from "zod";

const WORK_SCHEDULE_TYPES = ["NORMAL", "FLEXIBLE", "TELETRAVAIL", "MISSION", "ABSENCE"] as const;
const HOUR_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const dayScheduleSchema = z.object({
  jourSemaine: z.number().int().min(0).max(6),
  actif: z.boolean(),
  heureDebut: z.string().regex(HOUR_PATTERN, "Format HH:mm attendu."),
  heureFin: z.string().regex(HOUR_PATTERN, "Format HH:mm attendu."),
  pauseDebut: z.string().regex(HOUR_PATTERN).optional().or(z.literal("")),
  pauseFin: z.string().regex(HOUR_PATTERN).optional().or(z.literal("")),
  type: z.enum(WORK_SCHEDULE_TYPES),
});

/** §40 : sept jours (0=dimanche...6=samedi), un par ligne du formulaire. */
export const saveWorkScheduleSchema = z.object({
  days: z.array(dayScheduleSchema).length(7),
});

export type SaveWorkScheduleInput = z.infer<typeof saveWorkScheduleSchema>;
export type DayScheduleInput = z.infer<typeof dayScheduleSchema>;
