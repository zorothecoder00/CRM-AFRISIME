import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { PersonalPlanningEntryFormDialog } from "@/components/personal-planning/entry-form-dialog";
import type { PersonalPlanningReferenceData } from "@/components/personal-planning/entry-fields";
import { ENTRY_TYPE_META } from "@/lib/personal-planning-types";
import type { CreatePersonalPlanningEntryInput } from "@/lib/validations/personal-planning.schema";
import { History } from "lucide-react";

/**
 * Historique de planification (demande utilisateur) — anciennes activités
 * déjà passées (dateFin < maintenant), avec un bouton "Replanifier" qui
 * rouvre le même formulaire de création pré-rempli (titre/type/priorité/
 * tâche/projet/objectif liés), dates laissées vides pour un nouveau
 * créneau — pas une modification de l'ancienne entrée, une nouvelle.
 * RESERVE (blocs système) exclu, et les occurrences d'une série récurrente
 * restent gérées depuis /planning-personnel/recurrences, pas ici.
 */
export default async function PersonalPlanningHistoriquePage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const now = new Date();

  const [entriesRaw, colleagues, projects, tasks, objectives] = await Promise.all([
    prisma.personalPlanningEntry.findMany({
      where: { userId, dateFin: { lt: now }, type: { not: "RESERVE" }, recurrenceGroupId: null },
      orderBy: { dateFin: "desc" },
      take: 100,
      select: {
        id: true,
        titre: true,
        type: true,
        priorite: true,
        dateDebut: true,
        dateFin: true,
        projetId: true,
        tacheId: true,
        objectifId: true,
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

  const refData: PersonalPlanningReferenceData = {
    colleagues: colleagues.map((c) => ({ id: c.id, label: c.name })),
    projects,
    tasks,
    objectives,
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-md border bg-card p-4">
        <div className="flex items-center gap-2">
          <History className="size-5 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Historique de planification</h1>
            <p className="text-sm text-muted-foreground">
              {entriesRaw.length} activité(s)/tâche(s) déjà passées — replanifiez-les au besoin.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          {entriesRaw.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">
                    {ENTRY_TYPE_META[e.type].label}
                  </Badge>
                  <span className="font-medium">{e.titre}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {format(e.dateDebut, "d MMM yyyy HH:mm", { locale: fr })} → {format(e.dateFin, "HH:mm", { locale: fr })}
                </p>
              </div>
              <PersonalPlanningEntryFormDialog
                refData={refData}
                defaultValues={{
                  titre: e.titre,
                  // Le RESERVE (systeme) est deja exclu par le where ci-dessus
                  // — Prisma ne le sait pas statiquement, cast borne a ce point.
                  type: e.type as CreatePersonalPlanningEntryInput["type"],
                  priorite: e.priorite,
                  projetId: e.projetId ?? undefined,
                  tacheId: e.tacheId ?? undefined,
                  objectifId: e.objectifId ?? undefined,
                  repetition: "AUCUNE",
                  rappels: [],
                  participantIds: [],
                  etiquettes: [],
                  piecesJointes: [],
                }}
                triggerLabel="Replanifier"
                dialogTitle={`Replanifier « ${e.titre} »`}
              />
            </div>
          ))}
          {entriesRaw.length === 0 && (
            <p className="rounded-md border p-8 text-center text-sm text-muted-foreground">
              Aucune activité passée pour le moment.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
