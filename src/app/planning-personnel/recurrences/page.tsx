import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteSeriesButton } from "@/components/personal-planning/delete-series-button";
import { PersonalPlanningEntryFormDialog } from "@/components/personal-planning/entry-form-dialog";
import type { PersonalPlanningReferenceData } from "@/components/personal-planning/entry-fields";
import { ENTRY_RAPPEL_LABELS, ENTRY_TYPE_META, type PersonalPlanningRappel, type PersonalPlanningEntryType } from "@/lib/personal-planning-types";
import { Repeat } from "lucide-react";

/** Formule lisible de la règle de répétition, à partir de la première occurrence de la série. */
function describeRule(repetition: string, firstDate: Date): string {
  const time = format(firstDate, "HH'h'mm");
  switch (repetition) {
    case "QUOTIDIENNE":
      return `Tous les jours à ${time}`;
    case "HEBDOMADAIRE":
      return `Chaque ${format(firstDate, "EEEE", { locale: fr })} à ${time}`;
    case "MENSUELLE":
      return `Le ${format(firstDate, "d")} de chaque mois à ${time}`;
    default:
      return repetition;
  }
}

/**
 * §9/§44 — Récurrences : les activités créées avec une répétition (§9)
 * partagent un `recurrenceGroupId` (une ligne PersonalPlanningEntry par
 * occurrence, voir computeOccurrences) ; cette page les regroupe en séries
 * consultables et gérables, au lieu de n'exister qu'implicitement, éclatées
 * dans les vues Semaine/Jour/Liste (cahier de corrections UI/UX §5/P2).
 * La création reste sur "Nouvelle activité" (option Répétition) — pas de
 * second formulaire simplifié qui dupliquerait le même objet.
 */
export default async function PersonalPlanningRecurrencesPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const now = new Date();

  const [entries, colleagues, projects, tasks, objectives] = await Promise.all([
    prisma.personalPlanningEntry.findMany({
      where: { userId, recurrenceGroupId: { not: null } },
      orderBy: { dateDebut: "asc" },
      select: {
        id: true,
        titre: true,
        type: true,
        repetition: true,
        repetitionFin: true,
        recurrenceGroupId: true,
        rappels: true,
        dateDebut: true,
      },
    }),
    prisma.user.findMany({ where: { isActive: true, id: { not: userId } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({ where: { members: { some: { userId } } }, orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    prisma.task.findMany({
      where: { OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }] },
      orderBy: { titre: "asc" },
      select: { id: true, titre: true, projectId: true },
    }),
    prisma.objective.findMany({ where: { userId }, orderBy: { titre: "asc" }, select: { id: true, titre: true } }),
  ]);

  // §9 — mêmes données de référence que le formulaire "Nouvelle activité"
  // du hub, pour pouvoir ouvrir ce même dialogue directement depuis cette
  // page (au lieu de renvoyer l'utilisateur vers /planning-personnel sans
  // rien lui faire faire une fois arrivé là-bas).
  const refData: PersonalPlanningReferenceData = {
    colleagues: colleagues.map((c) => ({ id: c.id, label: c.name })),
    projects,
    tasks,
    objectives,
  };

  type Group = {
    recurrenceGroupId: string;
    titre: string;
    type: PersonalPlanningEntryType;
    repetition: string;
    rappels: PersonalPlanningRappel[];
    occurrences: Date[];
  };
  const groups = new Map<string, Group>();
  for (const e of entries) {
    const key = e.recurrenceGroupId!;
    const existing = groups.get(key);
    if (existing) {
      existing.occurrences.push(e.dateDebut);
    } else {
      groups.set(key, {
        recurrenceGroupId: key,
        titre: e.titre,
        type: e.type,
        repetition: e.repetition,
        rappels: e.rappels,
        occurrences: [e.dateDebut],
      });
    }
  }

  const series = [...groups.values()]
    .map((g) => {
      const sorted = [...g.occurrences].sort((a, b) => a.getTime() - b.getTime());
      const nextOccurrence = sorted.find((d) => d >= now) ?? null;
      return { ...g, firstOccurrence: sorted[0], nextOccurrence, isActive: !!nextOccurrence };
    })
    .sort((a, b) => (a.nextOccurrence?.getTime() ?? Infinity) - (b.nextOccurrence?.getTime() ?? Infinity));

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Repeat className="size-5 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Récurrences</h1>
            <p className="text-sm text-muted-foreground">
              {series.length} activité(s) répétitive(s).
            </p>
          </div>
        </div>
        <PersonalPlanningEntryFormDialog
          refData={refData}
          defaultValues={{ repetition: "HEBDOMADAIRE" }}
          defaultShowMore
          triggerLabel="Nouvelle activité récurrente"
          dialogTitle="Nouvelle activité récurrente"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Activité</th>
                  <th className="px-3 py-2 text-left font-medium">Règle</th>
                  <th className="px-3 py-2 text-left font-medium">Prochaine occurrence</th>
                  <th className="px-3 py-2 text-left font-medium">Rappel</th>
                  <th className="px-3 py-2 text-left font-medium">Statut</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {series.map((s) => {
                  const Icon = ENTRY_TYPE_META[s.type].icon;
                  return (
                    <tr key={s.recurrenceGroupId} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          {s.titre}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{describeRule(s.repetition, s.firstOccurrence)}</td>
                      <td className="px-3 py-2">
                        {s.nextOccurrence ? format(s.nextOccurrence, "d MMM yyyy 'à' HH'h'mm", { locale: fr }) : "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {s.rappels.length > 0 ? s.rappels.map((r) => ENTRY_RAPPEL_LABELS[r]).join(", ") : "Aucun"}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={s.isActive ? "outline" : "secondary"}>{s.isActive ? "Active" : "Terminée"}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          {s.nextOccurrence && (
                            <Link href={`/planning-personnel?vue=jour&semaine=${format(s.nextOccurrence, "yyyy-MM-dd")}`}>
                              <Button size="sm" variant="outline">
                                Voir
                              </Button>
                            </Link>
                          )}
                          {s.isActive && <DeleteSeriesButton recurrenceGroupId={s.recurrenceGroupId} titre={s.titre} />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {series.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                      Aucune activité récurrente pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
