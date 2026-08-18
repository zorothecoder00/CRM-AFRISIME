import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PendingActionActions } from "@/components/ai-governance/pending-action-actions";
import { ShieldCheck } from "lucide-react";

const STATUT_TONE: Record<string, "warning" | "success" | "destructive"> = {
  EN_ATTENTE: "warning",
  APPROUVE: "success",
  REJETE: "destructive",
};

/**
 * Gouvernance IA (cahier des charges V2.2 §42-43) — "human in the loop" :
 * actions IA en attente de validation humaine + traçabilité de toutes les
 * décisions (approuvées/rejetées) et des suggestions non exécutées
 * (AutomationExecution, déjà la source de vérité pour toute exécution
 * d'automatisation, réutilisée ici plutôt qu'un nouveau journal).
 */
export default async function GouvernanceIaPage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.AI_GOVERNANCE_APPROVE)) {
    redirect("/dashboard");
  }

  const [pending, decided, recentExecutions] = await Promise.all([
    prisma.pendingAiAction.findMany({
      where: { statut: "EN_ATTENTE" },
      include: { rule: { select: { nom: true, action: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pendingAiAction.findMany({
      where: { statut: { not: "EN_ATTENTE" } },
      include: { rule: { select: { nom: true } }, decidedBy: { select: { name: true } } },
      orderBy: { decidedAt: "desc" },
      take: 20,
    }),
    prisma.automationExecution.findMany({
      include: { rule: { select: { nom: true, niveauIA: true } } },
      orderBy: { executedAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-6" />
        <div>
          <h1 className="text-2xl font-semibold">Gouvernance IA</h1>
          <p className="text-sm text-muted-foreground">
            Trois niveaux — Suggestion, Validation humaine, Automatisation autorisée — et traçabilité complète de
            chaque action IA (cahier des charges §42-43).
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">En attente de validation ({pending.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pending.length === 0 && <p className="text-sm text-muted-foreground">Aucune action en attente.</p>}
          {pending.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">{p.label}</p>
                <p className="text-xs text-muted-foreground">
                  Règle « {p.rule.nom} » · {p.rule.action} · {p.createdAt.toLocaleString("fr-FR")}
                </p>
              </div>
              <PendingActionActions id={p.id} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Décisions récentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {decided.length === 0 && <p className="text-sm text-muted-foreground">Aucune décision pour le moment.</p>}
          {decided.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={STATUT_TONE[d.statut]}>{d.statut}</Badge>
              <span>{d.label}</span>
              <span className="text-xs text-muted-foreground">
                par {d.decidedBy?.name ?? "—"} le {d.decidedAt?.toLocaleDateString("fr-FR")}
                {d.motifRejet ? ` — ${d.motifRejet}` : ""}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Journal d&apos;exécution (traçabilité)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {recentExecutions.map((e) => (
            <p key={e.id} className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{e.rule.nom}</span> ({e.rule.niveauIA}) —{" "}
              {e.resultat} · {e.executedAt.toLocaleString("fr-FR")}
            </p>
          ))}
          {recentExecutions.length === 0 && <p className="text-sm text-muted-foreground">Aucune exécution.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
