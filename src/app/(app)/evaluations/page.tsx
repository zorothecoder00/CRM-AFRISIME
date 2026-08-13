import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForEvaluationStatus, accentForEvaluationStatus } from "@/lib/status-tone";
import { EvaluationFormDialog } from "@/components/evaluations/evaluation-form-dialog";

const PERIODE_LABELS: Record<string, string> = {
  ANNUELLE: "Annuelle",
  SEMESTRIELLE: "Semestrielle",
  TRIMESTRIELLE: "Trimestrielle",
};

const STATUS_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  SOUMISE: "Soumise",
  ACCUSE_RECEPTION: "Accusée réception",
};

const TYPE_LABELS: Record<string, string> = {
  AUTO: "Auto-évaluation",
  MANAGER: "Manager",
  PAIRS_360: "360°",
  PROJET: "Projet",
};

export default async function EvaluationsPage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.EVALUATION_READ)) {
    redirect("/dashboard");
  }
  const canManage = session!.user.permissions.includes(PERMISSIONS.EVALUATION_MANAGE);
  const userId = session!.user.id;

  const [recues, menees, evaluables, projects] = await Promise.all([
    prisma.evaluation.findMany({
      where: { evalueId: userId },
      include: { evaluateur: true },
      orderBy: { createdAt: "desc" },
    }),
    canManage
      ? prisma.evaluation.findMany({
          where: { evaluateurId: userId, evalueId: { not: userId } },
          include: { evalue: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    canManage
      ? prisma.user.findMany({
          where: { isActive: true, id: { not: userId } },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    canManage ? prisma.project.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Évaluations de performance</h1>
          <p className="text-sm text-muted-foreground">
            Auto-évaluation, évaluation manager, 360° et évaluation projet (cahier des charges §XII).
          </p>
        </div>
        <EvaluationFormDialog
          currentUserId={userId}
          currentUserName={session!.user.name ?? "Vous"}
          evaluables={canManage ? evaluables.map((u) => ({ id: u.id, label: u.name })) : undefined}
          projects={canManage ? projects.map((p) => ({ id: p.id, label: p.nom })) : undefined}
        />
      </div>

      {canManage && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Évaluations que je mène ({menees.length})</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {menees.map((evaluation) => (
              <Link key={evaluation.id} href={`/evaluations/${evaluation.id}`}>
                <Card
                  accent={accentForEvaluationStatus(evaluation.statut)}
                  className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50"
                >
                  <CardHeader>
                    <CardTitle className="text-base">{evaluation.evalue.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{TYPE_LABELS[evaluation.type]}</Badge>
                      <Badge variant="outline">{PERIODE_LABELS[evaluation.periode]}</Badge>
                      <Badge variant={toneForEvaluationStatus(evaluation.statut)}>
                        {STATUS_LABELS[evaluation.statut]}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {evaluation.dateDebut.toLocaleDateString("fr-FR")} →{" "}
                      {evaluation.dateFin.toLocaleDateString("fr-FR")}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {menees.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune évaluation en cours.</p>
            )}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Mes évaluations reçues, dont auto-évaluations ({recues.length})</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recues.map((evaluation) => (
            <Link key={evaluation.id} href={`/evaluations/${evaluation.id}`}>
              <Card
                accent={accentForEvaluationStatus(evaluation.statut)}
                className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50"
              >
                <CardHeader>
                  <CardTitle className="text-base">{PERIODE_LABELS[evaluation.periode]}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{TYPE_LABELS[evaluation.type]}</Badge>
                    <Badge variant={toneForEvaluationStatus(evaluation.statut)}>
                      {STATUS_LABELS[evaluation.statut]}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {evaluation.dateDebut.toLocaleDateString("fr-FR")} →{" "}
                    {evaluation.dateFin.toLocaleDateString("fr-FR")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Évaluateur : {evaluation.evaluateur.id === userId ? "Vous-même" : evaluation.evaluateur.name}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {recues.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune évaluation reçue pour le moment.</p>
          )}
        </div>
      </section>
    </div>
  );
}
