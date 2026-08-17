import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { AdminTabs } from "@/components/administration/admin-tabs";
import { DepartmentTree, type DepartmentNode } from "@/components/administration/department-tree";
import { DepartmentFormDialog } from "@/components/administration/department-form-dialog";

function buildDepartmentTree(
  departments: {
    id: string;
    name: string;
    code: string;
    parentId: string | null;
    entityId: string | null;
    entity: { nom: string } | null;
    _count: { users: number };
  }[]
): DepartmentNode[] {
  const nodeById = new Map<string, DepartmentNode>();
  for (const d of departments) {
    nodeById.set(d.id, {
      id: d.id,
      name: d.name,
      code: d.code,
      parentId: d.parentId,
      entityId: d.entityId,
      entityNom: d.entity?.nom ?? null,
      userCount: d._count.users,
      children: [],
    });
  }
  const roots: DepartmentNode[] = [];
  for (const d of departments) {
    const node = nodeById.get(d.id)!;
    if (d.parentId && nodeById.has(d.parentId)) {
      nodeById.get(d.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

/** Aplati l'arbre en options de select indentees par profondeur, pour les champs "parent". */
function flattenForOptions(nodes: DepartmentNode[], depth = 0): { id: string; label: string }[] {
  return nodes.flatMap((node) => [
    { id: node.id, label: `${"—".repeat(depth)} ${node.name}`.trim() },
    ...flattenForOptions(node.children, depth + 1),
  ]);
}

export default async function DepartementsPage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.DEPARTMENT_MANAGE)) {
    redirect("/dashboard");
  }

  const [departments, entities] = await Promise.all([
    prisma.department.findMany({
      include: { entity: true, _count: { select: { users: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.entity.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
  ]);

  const tree = buildDepartmentTree(departments);
  const parentOptions = flattenForOptions(tree);
  const entityOptions = entities.map((e) => ({ id: e.id, label: e.nom }));

  return (
    <div className="space-y-6">
      <AdminTabs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Départements</h1>
          <p className="text-sm text-muted-foreground">
            Organigramme de l&apos;organisation — chaque département peut être rattaché à un
            département parent (Direction → Département → Service → Équipe).
          </p>
        </div>
        {departments.length > 0 && <DepartmentFormDialog parentOptions={parentOptions} entities={entityOptions} />}
      </div>

      <DepartmentTree nodes={tree} parentOptions={parentOptions} entities={entityOptions} />
    </div>
  );
}
