import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { FundingOpportunityPipeline, type FundingOpportunityPipelineRow } from "@/components/projects/funding-opportunity-pipeline";

export default async function FundingOpportunitiesPage() {
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.PROJECT_UPDATE);

  const [opportunities, projects] = await Promise.all([
    prisma.fundingOpportunity.findMany({
      include: { project: { select: { id: true, nom: true } } },
      orderBy: { deadline: "asc" },
    }),
    prisma.project.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
  ]);

  const rows: FundingOpportunityPipelineRow[] = opportunities.map((o) => ({
    id: o.id,
    bailleur: o.bailleur,
    deadline: o.deadline ? o.deadline.toISOString() : null,
    budgetDisponible: o.budgetDisponible ? Number(o.budgetDisponible) : null,
    paysEligibles: o.paysEligibles,
    secteurs: o.secteurs,
    criteres: o.criteres,
    projectId: o.projectId,
    projectNom: o.project?.nom ?? null,
  }));

  const projectOptions = projects.map((p) => ({ id: p.id, label: p.nom }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Appels à projets</h1>
        <p className="text-sm text-muted-foreground">
          {opportunities.length} opportunité(s) de financement suivie(s) — à lier à un projet une fois confirmée.
        </p>
      </div>

      <FundingOpportunityPipeline opportunities={rows} projects={projectOptions} canManage={canManage} />
    </div>
  );
}
