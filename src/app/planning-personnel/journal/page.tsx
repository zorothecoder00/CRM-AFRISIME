import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { UrlPagination } from "@/components/ui/url-pagination";
import { getAppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toPersonalPlanningEntryRow, TACHE_DEPENDENCIES_SELECT } from "@/lib/personal-planning-rows";
import { meetingToEntryRow } from "@/lib/personal-planning-meetings";
import { ENTRY_TYPE_META, ENTRY_STATUT_LABELS, type PersonalPlanningEntryStatut } from "@/lib/personal-planning-types";
import { ScrollText } from "lucide-react";

const PAGE_SIZE = 30;
// Borne de sécurité — une seule requête sans limite de date pourrait
// grossir indéfiniment sur un compte très ancien ; largement suffisant pour
// un usage réel (des années de time blocking quotidien).
const FETCH_CAP = 3000;

const STATUT_TONE: Record<PersonalPlanningEntryStatut, string> = {
  A_PLANIFIER: "bg-muted text-muted-foreground",
  PLANIFIEE: "bg-primary/10 text-primary",
  EN_COURS: "bg-warning/15 text-warning",
  EN_ATTENTE: "bg-muted text-muted-foreground",
  BLOQUEE: "bg-destructive/10 text-destructive",
  TERMINEE: "bg-success/15 text-success",
  ANNULEE: "bg-muted text-muted-foreground",
};

/**
 * "Journal d'activité" (demande utilisateur) — historique complet et paginé
 * de TOUTES les activités personnelles et réunions, passées ou à venir,
 * quel que soit leur statut (y compris terminées/annulées, masquées de
 * /planning-personnel/agenda). Distinct de /planning-personnel/historique
 * (qui ne montre que les activités passées, avec un bouton "Replanifier" —
 * un outil d'action, pas un journal de consultation) : ici, lecture seule,
 * simplement paginée, pour retrouver n'importe quelle activité passée.
 */
export default async function PersonalPlanningJournalPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const session = await getAppSession();
  const userId = session!.user.id;

  const [entriesRaw, meetingsRaw] = await Promise.all([
    prisma.personalPlanningEntry.findMany({
      where: { userId },
      include: {
        tache: { select: { titre: true, projectId: true, ...TACHE_DEPENDENCIES_SELECT } },
        projet: { select: { nom: true } },
        participants: { select: { userId: true } },
      },
      orderBy: { dateDebut: "desc" },
      take: FETCH_CAP,
    }),
    prisma.meeting.findMany({
      where: { participants: { some: { userId } } },
      select: { id: true, titre: true, dateHeure: true, lieu: true, statut: true },
      orderBy: { dateHeure: "desc" },
      take: FETCH_CAP,
    }),
  ]);

  const allEntries = [...entriesRaw.map((e) => toPersonalPlanningEntryRow(e, new Map())), ...meetingsRaw.map(meetingToEntryRow)].sort(
    (a, b) => b.dateDebut.localeCompare(a.dateDebut)
  );

  const total = allEntries.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageEntries = allEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-md border bg-card p-4">
        <div className="flex items-center gap-2">
          <ScrollText className="size-5 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Journal d&apos;activité</h1>
            <p className="text-sm text-muted-foreground">
              {total} activité(s)/réunion(s) au total, toutes dates et tous statuts confondus —{" "}
              <Link href="/planning-personnel/agenda" className="text-primary hover:underline">
                retour à l&apos;agenda
              </Link>
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          {pageEntries.map((e) => {
            const meta = ENTRY_TYPE_META[e.type];
            return (
              <div key={e.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm">
                <span className="w-36 shrink-0 font-medium">{format(new Date(e.dateDebut), "d MMM yyyy HH:mm", { locale: fr })}</span>
                <span className="min-w-0 flex-1 truncate">{e.titre}</span>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {meta.label}
                </Badge>
                <Badge className={`shrink-0 border-transparent text-[10px] ${STATUT_TONE[e.statut]}`}>{ENTRY_STATUT_LABELS[e.statut]}</Badge>
                {e.meetingHref ? (
                  <Link href={e.meetingHref} className="shrink-0 text-xs text-muted-foreground hover:text-primary">
                    Réunion
                  </Link>
                ) : (
                  e.tacheId && (
                    <Link href={`/taches/${e.tacheId}`} className="shrink-0 text-xs text-muted-foreground hover:text-primary">
                      Tâche liée
                    </Link>
                  )
                )}
              </div>
            );
          })}
          {pageEntries.length === 0 && (
            <p className="rounded-md border p-8 text-center text-sm text-muted-foreground">Aucune activité enregistrée.</p>
          )}
        </div>

        {totalPages > 1 && <UrlPagination page={page} totalPages={totalPages} />}
      </div>
    </div>
  );
}
