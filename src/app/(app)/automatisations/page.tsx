import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RuleFormDialog } from "@/components/automation/rule-form-dialog";
import { RuleList, type RuleData } from "@/components/automation/rule-list";
import { accentForStatus } from "@/lib/status-tone";

export default async function AutomatisationsPage({
  searchParams,
}: {
  searchParams: Promise<{ projetId?: string }>;
}) {
  const { projetId } = await searchParams;
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.AUTOMATION_MANAGE);

  const projects = await prisma.project.findMany({ orderBy: { nom: "asc" } });

  if (!projetId) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/automatisations?projetId=${p.id}`}>
              <Card
                accent={accentForStatus(p.statut)}
                className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50"
              >
                <CardHeader>
                  <CardTitle className="text-base">{p.nom}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Voir les règles d&apos;automatisation
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const [rules, users] = await Promise.all([
    prisma.automationRule.findMany({
      where: { projectId: projetId },
      include: { executions: { orderBy: { executedAt: "desc" }, take: 5 } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const ruleData: RuleData[] = rules.map((r) => ({
    id: r.id,
    nom: r.nom,
    trigger: r.trigger,
    action: r.action,
    isActive: r.isActive,
    nextTaskTitre: r.nextTaskTitre,
    executions: r.executions.map((e) => ({
      id: e.id,
      resultat: e.resultat,
      executedAt: e.executedAt.toISOString(),
    })),
  }));

  return (
    <div className="space-y-6">
      <Header />
      <div className="flex flex-wrap gap-2 text-sm">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/automatisations?projetId=${p.id}`}
            className={`rounded-full border px-3 py-1 ${
              projetId === p.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >
            {p.nom}
          </Link>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{rules.length} règle(s)</p>
        {canManage && (
          <RuleFormDialog projectId={projetId} users={users.map((u) => ({ id: u.id, label: u.name }))} />
        )}
      </div>
      <RuleList rules={ruleData} canManage={canManage} />
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Automatisations</h1>
      <p className="text-sm text-muted-foreground">
        Règles « si... alors... » par projet, sans développement.
      </p>
    </div>
  );
}
