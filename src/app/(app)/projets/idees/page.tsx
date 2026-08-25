import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { ProjectIdeaFormDialog } from "@/components/projects/project-idea-form-dialog";
import { ProjectIdeaKanban, type ProjectIdeaRow } from "@/components/projects/project-idea-kanban";

export default async function ProjectIdeasPage() {
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.PROJECT_UPDATE);
  const canCreate = session!.user.permissions.includes(PERMISSIONS.PROJECT_CREATE);

  const [ideas, users, departments] = await Promise.all([
    prisma.projectIdea.findMany({
      include: { porteur: true, department: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  const ideaRows: ProjectIdeaRow[] = ideas.map((i) => ({
    id: i.id,
    titreProvisoire: i.titreProvisoire,
    priorite: i.priorite,
    statut: i.statut,
    porteurName: i.porteur?.name ?? null,
    departmentName: i.department?.name ?? null,
    estimationBudgetaire: i.estimationBudgetaire ? Number(i.estimationBudgetaire) : null,
    convertedProjectId: i.convertedProjectId,
  }));

  const userOptions = users.map((u) => ({ id: u.id, label: u.name }));
  const departmentOptions = departments.map((d) => ({ id: d.id, label: d.name }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Idées & opportunités</h1>
          <p className="text-sm text-muted-foreground">
            {ideas.length} idée(s) — de l&apos;intuition à la conception d&apos;un projet.
          </p>
        </div>
        {canCreate && <ProjectIdeaFormDialog users={userOptions} departments={departmentOptions} />}
      </div>

      <ProjectIdeaKanban ideas={ideaRows} users={userOptions} departments={departmentOptions} canManage={canManage} />
    </div>
  );
}
