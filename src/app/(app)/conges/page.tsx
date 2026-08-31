import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { PERMISSIONS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toneForLeaveStatus } from "@/lib/status-tone";
import { ChevronLeft } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  CONGE_PAYE: "Congé payé",
  MALADIE: "Maladie",
  AUTRE: "Autre",
};

const STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente",
  APPROUVE: "Approuvé",
  REFUSE: "Refusé",
};

/** Historique complet des congés — complète les vues déjà en place (formulaire de demande et carte "en attente" sur /calendrier) qui ne couvrent ni le passé ni les décisions déjà prises. */
export default async function CongesPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; statut?: string; type?: string; du?: string; au?: string }>;
}) {
  const { userId, statut, type, du, au } = await searchParams;
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.LEAVE_MANAGE);
  const canCreate = session!.user.permissions.includes(PERMISSIONS.LEAVE_CREATE);
  if (!canManage && !canCreate) redirect("/dashboard");

  const andConditions: Prisma.LeaveWhereInput[] = [];
  if (!canManage) {
    andConditions.push({ userId: session!.user.id });
  } else if (userId) {
    andConditions.push({ userId });
  }
  if (statut) andConditions.push({ statut: statut as never });
  if (type) andConditions.push({ type: type as never });
  if (du) andConditions.push({ dateFin: { gte: new Date(du) } });
  if (au) andConditions.push({ dateDebut: { lte: new Date(au) } });

  const [leaves, users] = await Promise.all([
    prisma.leave.findMany({
      where: andConditions.length > 0 ? { AND: andConditions } : {},
      include: { user: true, decidedBy: true },
      orderBy: { dateDebut: "desc" },
    }),
    canManage ? prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  const hasFilters = !!userId || !!statut || !!type || !!du || !!au;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/calendrier" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ChevronLeft className="h-4 w-4" />
          Retour au calendrier
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Historique des congés</h1>
        <p className="text-sm text-muted-foreground">
          {leaves.length} demande(s) {canManage ? "— tous les collaborateurs" : "— vos demandes"}.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-2" action="/conges">
        {canManage && (
          <select
            name="userId"
            defaultValue={userId ?? ""}
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
          >
            <option value="">Tous les collaborateurs</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        )}
        <select
          name="statut"
          defaultValue={statut ?? ""}
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          name="type"
          defaultValue={type ?? ""}
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          <option value="">Tous les types</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Input name="du" type="date" defaultValue={du} className="w-auto" />
        <Input name="au" type="date" defaultValue={au} className="w-auto" />
        <Button type="submit" variant="outline">
          Filtrer
        </Button>
        {hasFilters && (
          <Link href="/conges">
            <Button type="button" variant="ghost">
              Réinitialiser
            </Button>
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {canManage && <TableHead>Collaborateur</TableHead>}
              <TableHead>Type</TableHead>
              <TableHead>Période</TableHead>
              <TableHead>Motif</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Décidé par</TableHead>
              <TableHead>Demandé le</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaves.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 7 : 6} className="text-center text-sm text-muted-foreground">
                  Aucune demande de congé{hasFilters ? " pour ces filtres" : ""}.
                </TableCell>
              </TableRow>
            ) : (
              leaves.map((l) => (
                <TableRow key={l.id}>
                  {canManage && <TableCell className="font-medium">{l.user.name}</TableCell>}
                  <TableCell>
                    <Badge variant="outline">{TYPE_LABELS[l.type]}</Badge>
                  </TableCell>
                  <TableCell>
                    {l.dateDebut.toLocaleDateString("fr-FR")} → {l.dateFin.toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.motif ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={toneForLeaveStatus(l.statut)}>{STATUS_LABELS[l.statut]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.decidedBy?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.createdAt.toLocaleDateString("fr-FR")}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
