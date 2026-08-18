import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RuleFormDialog } from "@/components/automation/rule-form-dialog";
import { RuleList, type RuleData } from "@/components/automation/rule-list";
import { accentForStatus } from "@/lib/status-tone";
import { Globe2 } from "lucide-react";

const GLOBAL_SCOPE = "global";

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
          <Link href={`/automatisations?projetId=${GLOBAL_SCOPE}`}>
            <Card className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center gap-2">
                <Globe2 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Règles globales</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Déclencheurs non liés à un projet (CRM, gouvernance, indicateurs...)
              </CardContent>
            </Card>
          </Link>
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

  const isGlobal = projetId === GLOBAL_SCOPE;

  const [rules, users] = await Promise.all([
    prisma.automationRule.findMany({
      where: { projectId: isGlobal ? null : projetId, playbookId: null },
      include: { executions: { orderBy: { executedAt: "desc" }, take: 5 }, conditions: { orderBy: { ordre: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const ruleData: RuleData[] = rules.map((r) => ({
    id: r.id,
    nom: r.nom,
    trigger: r.trigger,
    action: r.action,
    niveauIA: r.niveauIA,
    isActive: r.isActive,
    projectId: r.projectId,
    nextTaskTitre: r.nextTaskTitre,
    conditions: r.conditions.map((c) => ({
      champ: c.champ,
      operateur: c.operateur,
      valeur: c.valeur,
      connecteur: c.connecteur,
    })),
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
        <Link
          href={`/automatisations?projetId=${GLOBAL_SCOPE}`}
          className={`rounded-full border px-3 py-1 ${
            isGlobal ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          }`}
        >
          Règles globales
        </Link>
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
          <RuleFormDialog
            projectId={isGlobal ? undefined : projetId}
            users={users.map((u) => ({ id: u.id, label: u.name }))}
            existingRules={rules.map((r) => ({ id: r.id, label: r.nom }))}
          />
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
        Règles « si... alors... » par projet ou globales, sans développement.
      </p>
    </div>
  );
}
