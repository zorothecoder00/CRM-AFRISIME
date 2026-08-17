import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { AdminTabs } from "@/components/administration/admin-tabs";
import { EntityTree, type EntityTreeNode } from "@/components/administration/entity-tree";
import { EntityFormDialog } from "@/components/administration/entity-form-dialog";
import { HolidaySection } from "@/components/administration/holiday-section";

function buildEntityTree(
  entities: {
    id: string;
    nom: string;
    code: string;
    parentId: string | null;
    pays: string | null;
    devise: string | null;
    fuseauHoraire: string | null;
    langue: string | null;
    reglementations: string | null;
    parametresLocaux: string | null;
    _count: { departments: number; holidays: number };
  }[]
): EntityTreeNode[] {
  const nodeById = new Map<string, EntityTreeNode>();
  for (const e of entities) {
    nodeById.set(e.id, {
      id: e.id,
      nom: e.nom,
      code: e.code,
      parentId: e.parentId,
      pays: e.pays,
      devise: e.devise,
      fuseauHoraire: e.fuseauHoraire,
      langue: e.langue,
      reglementations: e.reglementations,
      parametresLocaux: e.parametresLocaux,
      departmentCount: e._count.departments,
      holidayCount: e._count.holidays,
      children: [],
    });
  }
  const roots: EntityTreeNode[] = [];
  for (const e of entities) {
    const node = nodeById.get(e.id)!;
    if (e.parentId && nodeById.has(e.parentId)) {
      nodeById.get(e.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function flattenForOptions(nodes: EntityTreeNode[], depth = 0): { id: string; label: string }[] {
  return nodes.flatMap((node) => [
    { id: node.id, label: `${"—".repeat(depth)} ${node.nom}`.trim() },
    ...flattenForOptions(node.children, depth + 1),
  ]);
}

export default async function EntitesPage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.ENTITY_MANAGE)) {
    redirect("/dashboard");
  }

  const [entities, holidays] = await Promise.all([
    prisma.entity.findMany({
      include: { _count: { select: { departments: true, holidays: true } } },
      orderBy: { nom: "asc" },
    }),
    prisma.holiday.findMany({ include: { entity: true }, orderBy: { date: "asc" } }),
  ]);

  const tree = buildEntityTree(entities);
  const parentOptions = flattenForOptions(tree);

  return (
    <div className="space-y-6">
      <AdminTabs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Entités du groupe</h1>
          <p className="text-sm text-muted-foreground">
            Architecture multi-entités (cahier des charges §22-23) — Groupe → Société → Filiale → Agence,
            chacune rattachable à un pays/une devise/un fuseau horaire propre. Les départements racines
            peuvent être rattachés à une entité pour définir le périmètre de consolidation et d&apos;isolation
            des données.
          </p>
        </div>
        {entities.length > 0 && <EntityFormDialog parentOptions={parentOptions} />}
      </div>

      <EntityTree nodes={tree} parentOptions={parentOptions} />

      <HolidaySection
        holidays={holidays.map((h) => ({
          id: h.id,
          entityId: h.entityId,
          entityNom: h.entity.nom,
          nom: h.nom,
          date: h.date.toISOString(),
          recurrenceAnnuelle: h.recurrenceAnnuelle,
        }))}
        entities={entities.map((e) => ({ id: e.id, label: e.nom }))}
      />
    </div>
  );
}
