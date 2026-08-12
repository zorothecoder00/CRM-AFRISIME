import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { PlanTree, type PlanNode } from "@/components/planning/plan-tree";
import { PlanFormDialog } from "@/components/planning/plan-form-dialog";

type PlanRow = {
  id: string;
  nom: string;
  niveau: string;
  statut: string;
  dateDebut: Date;
  dateFin: Date;
  parentId: string | null;
  department: { name: string } | null;
  owner: { name: string };
};

function buildPlanTree(plans: PlanRow[]): PlanNode[] {
  const nodeById = new Map<string, PlanNode>();
  for (const p of plans) {
    nodeById.set(p.id, {
      id: p.id,
      nom: p.nom,
      niveau: p.niveau,
      statut: p.statut,
      departmentName: p.department?.name ?? null,
      ownerName: p.owner.name,
      dateDebut: p.dateDebut.toISOString(),
      dateFin: p.dateFin.toISOString(),
      children: [],
    });
  }
  const roots: PlanNode[] = [];
  for (const p of plans) {
    const node = nodeById.get(p.id)!;
    if (p.parentId && nodeById.has(p.parentId)) {
      nodeById.get(p.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

/** Aplati l'arbre en options de select indentees par profondeur, pour le champ "plan parent". */
function flattenForOptions(nodes: PlanNode[], depth = 0): { id: string; label: string }[] {
  return nodes.flatMap((node) => [
    { id: node.id, label: `${"—".repeat(depth)} ${node.nom}`.trim() },
    ...flattenForOptions(node.children, depth + 1),
  ]);
}

export default async function PlanificationPage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.PLAN_READ)) {
    redirect("/dashboard");
  }
  const canManage = session!.user.permissions.includes(PERMISSIONS.PLAN_MANAGE);

  const [plans, departments, users] = await Promise.all([
    prisma.plan.findMany({
      include: { department: true, owner: true },
      orderBy: { dateDebut: "desc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const tree = buildPlanTree(plans);
  const parentOptions = flattenForOptions(tree);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Planification</h1>
          <p className="text-sm text-muted-foreground">
            Cascade stratégique → annuelle → trimestrielle → mensuelle, sous laquelle se rattachent
            objectifs et programmes.
          </p>
        </div>
        {canManage && (
          <PlanFormDialog
            departments={departments.map((d) => ({ id: d.id, label: d.name }))}
            users={users.map((u) => ({ id: u.id, label: u.name }))}
            parentOptions={parentOptions}
            currentUserId={session!.user.id}
          />
        )}
      </div>

      <PlanTree nodes={tree} />
    </div>
  );
}
