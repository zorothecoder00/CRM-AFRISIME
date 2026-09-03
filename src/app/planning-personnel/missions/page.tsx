import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { format, differenceInCalendarDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toneForStatus } from "@/lib/status-tone";
import { ENTRY_STATUT_LABELS, ENTRY_TYPE_META } from "@/lib/personal-planning-types";
import { getOrganizationDevise, formatMontant } from "@/lib/currency";
import { PersonalPlanningEntryFormDialog } from "@/components/personal-planning/entry-form-dialog";
import type { PersonalPlanningReferenceData } from "@/components/personal-planning/entry-fields";
import { Briefcase, ChevronRight, MapPin, Wallet, Car, BedDouble } from "lucide-react";

const MISSION_TYPES = ["MISSION", "DEPLACEMENT"] as const;

/**
 * §26/§26bis — historique des missions ET déplacements professionnels, qui
 * n'existait pas : ces entrées du planning personnel n'étaient consultables
 * que jour par jour. Les deux types sont déjà distincts dans le modèle
 * (DEPLACEMENT plus court, sans les champs budget/hébergement/rapport — voir
 * entry-fields.tsx) mais cette page ne montrait que MISSION ; un filtre par
 * type les affiche désormais tous les deux (demande utilisateur).
 */
export default async function PersonalPlanningMissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ du?: string; au?: string; statut?: string; type?: string }>;
}) {
  const { du, au, statut, type } = await searchParams;
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const devise = await getOrganizationDevise();

  const typeFilter = type && (MISSION_TYPES as readonly string[]).includes(type) ? [type] : MISSION_TYPES;
  const where: Prisma.PersonalPlanningEntryWhereInput = { userId, type: { in: typeFilter as never[] } };
  if (du || au) {
    where.dateFin = du ? { gte: new Date(du) } : undefined;
    where.dateDebut = au ? { lte: new Date(au) } : undefined;
  }
  if (statut) where.statut = statut as never;

  const [missions, allMissions, colleagues, projects, tasks, objectives] = await Promise.all([
    prisma.personalPlanningEntry.findMany({
      where,
      include: {
        tache: { select: { id: true, titre: true } },
        participants: { include: { user: { select: { name: true } } } },
      },
      orderBy: { dateDebut: "desc" },
    }),
    // KPIs (prototype V2) calculés sur TOUTES les missions (MISSION
    // uniquement — durée/budget n'ont de sens que pour ce type-là),
    // indépendamment des filtres du formulaire — même convention que
    // "En retard"/"A venir" sur le hub, qui restent stables quelle que soit
    // la vue affichée.
    prisma.personalPlanningEntry.findMany({
      where: { userId, type: "MISSION" },
      select: { dateDebut: true, dateFin: true, statut: true, missionBudget: true },
    }),
    // §9 — même données de référence que "Nouvelle activité" du hub, pour
    // pouvoir créer une mission/un déplacement directement depuis cette
    // page (bouton absent auparavant — demande utilisateur).
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

  const now = new Date();
  const missionsAVenir = allMissions.filter((m) => m.dateDebut > now && !["TERMINEE", "ANNULEE"].includes(m.statut)).length;
  const joursEnMission = allMissions.reduce((sum, m) => sum + differenceInCalendarDays(m.dateFin, m.dateDebut) + 1, 0);
  const budgetEngage = allMissions
    .filter((m) => m.statut !== "ANNULEE" && m.missionBudget !== null)
    .reduce((sum, m) => sum + Number(m.missionBudget), 0);

  const hasFilters = !!du || !!au || !!statut || !!type;
  const statutOptions = Object.keys(ENTRY_STATUT_LABELS) as Array<keyof typeof ENTRY_STATUT_LABELS>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">

      <div className="space-y-4 rounded-md border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Briefcase className="size-5 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold">Missions et déplacements</h1>
              <p className="text-sm text-muted-foreground">{missions.length} entrée(s).</p>
            </div>
          </div>
          <PersonalPlanningEntryFormDialog
            refData={refData}
            defaultValues={{ type: "MISSION" }}
            defaultShowMore
            triggerLabel="Nouvelle mission"
            dialogTitle="Nouvelle mission"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-md border p-3 text-center">
            <div className="text-2xl font-semibold">{missionsAVenir}</div>
            <div className="text-xs text-muted-foreground">Missions à venir</div>
          </div>
          <div className="rounded-md border p-3 text-center">
            <div className="text-2xl font-semibold">{joursEnMission}</div>
            <div className="text-xs text-muted-foreground">Jours en mission (total)</div>
          </div>
          <div className="rounded-md border p-3 text-center">
            <div className="text-2xl font-semibold">{formatMontant(budgetEngage, devise)}</div>
            <div className="text-xs text-muted-foreground">Budget engagé</div>
          </div>
        </div>

        <form className="flex flex-wrap items-end gap-2" action="/planning-personnel/missions">
          <select
            name="type"
            defaultValue={type ?? ""}
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
          >
            <option value="">Missions et déplacements</option>
            <option value="MISSION">Missions seulement</option>
            <option value="DEPLACEMENT">Déplacements seulement</option>
          </select>
          <Input name="du" type="date" defaultValue={du} className="w-auto" />
          <Input name="au" type="date" defaultValue={au} className="w-auto" />
          <select
            name="statut"
            defaultValue={statut ?? ""}
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
          >
            <option value="">Tous les statuts</option>
            {statutOptions.map((s) => (
              <option key={s} value={s}>
                {ENTRY_STATUT_LABELS[s]}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline">
            Filtrer
          </Button>
          {hasFilters && (
            <Link href="/planning-personnel/missions">
              <Button type="button" variant="ghost">
                Réinitialiser
              </Button>
            </Link>
          )}
        </form>

        <div className="space-y-3">
          {missions.map((m) => (
          <Card key={m.id}>
            <CardContent className="space-y-2 py-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{m.titre}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(m.dateDebut, "d MMM yyyy", { locale: fr })} → {format(m.dateFin, "d MMM yyyy", { locale: fr })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{ENTRY_TYPE_META[m.type].label}</Badge>
                  <Badge variant={toneForStatus(m.statut)}>{ENTRY_STATUT_LABELS[m.statut]}</Badge>
                  <Link
                    href={`/planning-personnel?vue=jour&semaine=${format(m.dateDebut, "yyyy-MM-dd")}`}
                    className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                  >
                    Voir
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {m.missionDestination && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {m.missionDestination}
                  </span>
                )}
                {m.missionBudget !== null && (
                  <span className="inline-flex items-center gap-1">
                    <Wallet className="h-3 w-3" /> {formatMontant(Number(m.missionBudget), devise)}
                  </span>
                )}
                {m.missionMoyenTransport && (
                  <span className="inline-flex items-center gap-1">
                    <Car className="h-3 w-3" /> {m.missionMoyenTransport}
                  </span>
                )}
                {m.missionHebergement && (
                  <span className="inline-flex items-center gap-1">
                    <BedDouble className="h-3 w-3" /> {m.missionHebergement}
                  </span>
                )}
              </div>

              {m.participants.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Participants : {m.participants.map((p) => p.user.name).join(", ")}
                </p>
              )}
              {m.tache && (
                <Link href={`/taches/${m.tache.id}`} className="block text-xs text-primary hover:underline">
                  Tâche liée : {m.tache.titre}
                </Link>
              )}
              {m.missionRapport && (
                <div className="rounded-md border bg-muted/30 p-2">
                  <p className="text-xs font-medium">Rapport de mission</p>
                  <p className="whitespace-pre-wrap text-xs text-muted-foreground">{m.missionRapport}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {missions.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune mission {hasFilters ? "pour ces filtres" : "enregistrée pour le moment"}.</p>
        )}
        </div>
      </div>
    </div>
  );
}
