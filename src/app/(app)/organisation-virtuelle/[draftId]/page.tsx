import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { OrgDesignNode, OrgDesignSimulation } from "@/lib/org-designer";
import { OrgDesignTreeView } from "@/components/org-designer/org-design-tree-view";
import { OrgDesignActions } from "@/components/org-designer/org-design-actions";
import { BackLink } from "@/components/ui/back-link";

const STATUT_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  SIMULE: "Simulé",
  DEPLOYE: "Déployé",
};

const STATUT_TONE: Record<string, "secondary" | "info" | "success"> = {
  BROUILLON: "secondary",
  SIMULE: "info",
  DEPLOYE: "success",
};

export default async function OrgDesignDraftPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const draft = await prisma.orgDesignDraft.findUnique({
    where: { id: draftId },
    include: { createdBy: { select: { name: true } }, deployedDepartment: { select: { id: true, name: true } } },
  });
  if (!draft) notFound();

  const structure = draft.structure as unknown as OrgDesignNode;
  const simulation = draft.simulationResume as unknown as OrgDesignSimulation | null;

  return (
    <div className="space-y-6">
      <BackLink href="/organisation-virtuelle" label="Retour à l'organisation virtuelle" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{draft.nom}</h1>
          <p className="text-sm text-muted-foreground">{draft.description}</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={STATUT_TONE[draft.statut]}>{STATUT_LABELS[draft.statut]}</Badge>
            <span className="text-xs text-muted-foreground">Par {draft.createdBy.name}</span>
          </div>
        </div>
        <OrgDesignActions draftId={draft.id} statut={draft.statut} />
      </div>

      {draft.statut === "DEPLOYE" && draft.deployedDepartment && (
        <Card className="border-success/40 bg-success/5">
          <CardContent className="pt-6 text-sm">
            Déployé réellement le {draft.deployedAt?.toLocaleDateString("fr-FR")} —{" "}
            <Link href="/administration/departements" className="underline">
              {draft.deployedDepartment.name} et sa descendance
            </Link>{" "}
            sont maintenant de vrais départements.
          </CardContent>
        </Card>
      )}

      {simulation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Résultat de la dernière simulation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Départements" value={simulation.nouveauxDepartements} />
              <Stat label="Équipes" value={simulation.nouvellesEquipes} />
              <Stat label="Projets" value={simulation.nouveauxProjets} />
              <Stat label="Processus" value={simulation.nouveauxProcessus} />
            </div>
            <div className="mt-4 space-y-1 text-sm">
              <p className="text-muted-foreground">
                Compétences distinctes : {simulation.competencesDistinctes.join(", ") || "aucune"}
              </p>
              {simulation.competencesNouvelles.length > 0 && (
                <p className="text-warning">
                  Nouvelles compétences à créer : {simulation.competencesNouvelles.join(", ")}
                </p>
              )}
              {simulation.responsablesManquants > 0 && (
                <p className="text-warning">
                  {simulation.responsablesManquants} équipe(s) sans responsable défini.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <OrgDesignTreeView node={structure} />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
