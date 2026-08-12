import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { PERMISSIONS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CourrierFormDialog } from "@/components/courrier/courrier-form-dialog";
import { CourrierList, type CourrierRow } from "@/components/courrier/courrier-list";

const TYPE_LABELS: Record<string, string> = {
  ENTRANT: "Entrant",
  SORTANT: "Sortant",
  INTERNE: "Interne",
};

const STATUS_LABELS: Record<string, string> = {
  A_TRAITER: "À traiter",
  EN_COURS: "En cours",
  TRAITE: "Traité",
  ARCHIVE: "Archivé",
};

export default async function CourrierPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; statut?: string }>;
}) {
  const { q, type, statut } = await searchParams;
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.COURRIER_READ)) {
    redirect("/dashboard");
  }
  const canManage = session!.user.permissions.includes(PERMISSIONS.COURRIER_MANAGE);
  const userId = session!.user.id;

  const andConditions: Prisma.CourrierWhereInput[] = [];
  if (!canManage) {
    andConditions.push({
      OR: [{ confidentiel: false }, { createdById: userId }, { responsableId: userId }],
    });
  }
  if (type) andConditions.push({ type: type as never });
  if (statut) andConditions.push({ statut: statut as never });
  if (q) andConditions.push({ OR: [{ objet: { contains: q, mode: "insensitive" } }, { reference: { contains: q, mode: "insensitive" } }] });

  const [courriers, departments, users] = await Promise.all([
    prisma.courrier.findMany({
      where: andConditions.length > 0 ? { AND: andConditions } : {},
      include: { responsable: true },
      orderBy: { dateCourrier: "desc" },
    }),
    canManage ? prisma.department.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
    canManage
      ? prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  const rows: CourrierRow[] = courriers.map((c) => ({
    id: c.id,
    reference: c.reference,
    objet: c.objet,
    type: c.type,
    statut: c.statut,
    confidentiel: c.confidentiel,
    dateCourrier: c.dateCourrier.toISOString(),
    responsableName: c.responsable?.name ?? null,
  }));

  const hasFilters = !!q || !!type || !!statut;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Courrier</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} courrier(s) — registre entrant, sortant et interne.
          </p>
        </div>
        {canManage && (
          <CourrierFormDialog
            departments={departments.map((d) => ({ id: d.id, label: d.name }))}
            users={users.map((u) => ({ id: u.id, label: u.name }))}
          />
        )}
      </div>

      <form className="flex flex-wrap items-center gap-2" action="/courrier">
        <Input name="q" placeholder="Rechercher un courrier..." defaultValue={q} className="max-w-sm" />
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
        <Button type="submit" variant="outline">
          Filtrer
        </Button>
        {hasFilters && (
          <Link href="/courrier">
            <Button type="button" variant="ghost">
              Réinitialiser
            </Button>
          </Link>
        )}
      </form>

      <CourrierList items={rows} />
    </div>
  );
}
