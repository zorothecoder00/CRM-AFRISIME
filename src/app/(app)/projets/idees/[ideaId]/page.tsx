import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toneForProjectIdeaStatus, toneForPriority } from "@/lib/status-tone";
import { ProjectConceptNotePanel } from "@/components/projects/project-concept-note-panel";
import { ConvertIdeaDialog } from "@/components/projects/convert-idea-dialog";

const STATUS_LABELS: Record<string, string> = {
  IDEE: "Idée",
  A_ETUDIER: "À étudier",
  ETUDE_FAISABILITE: "Étude de faisabilité",
  APPROUVEE: "Approuvée",
  EN_CONCEPTION: "En conception",
  PROJET_CREE: "Projet créé",
  REJETEE: "Rejetée",
  ARCHIVEE: "Archivée",
};

export default async function ProjectIdeaDetailPage({
  params,
}: {
  params: Promise<{ ideaId: string }>;
}) {
  const { ideaId } = await params;
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.PROJECT_UPDATE);
  const canCreate = session!.user.permissions.includes(PERMISSIONS.PROJECT_CREATE);

  const [idea, users, departments] = await Promise.all([
    prisma.projectIdea.findUnique({
      where: { id: ideaId },
      include: { porteur: true, department: true, createdBy: true, conceptNote: true },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!idea) {
    notFound();
  }

  const userOptions = users.map((u) => ({ id: u.id, label: u.name }));
  const departmentOptions = departments.map((d) => ({ id: d.id, label: d.name }));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/projets/idees" className="text-sm text-primary hover:underline">
          ← Idées & opportunités
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{idea.titreProvisoire}</h1>
          <Badge variant={toneForProjectIdeaStatus(idea.statut)}>{STATUS_LABELS[idea.statut]}</Badge>
          <Badge variant={toneForPriority(idea.priorite)}>{idea.priorite}</Badge>
        </div>
      </div>

      {idea.convertedProjectId && (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
          Cette idée a été convertie en projet.{" "}
          <Link href={`/projets/${idea.convertedProjectId}`} className="font-medium text-primary hover:underline">
            Voir le projet →
          </Link>
        </div>
      )}

      {canManage && idea.statut === "EN_CONCEPTION" && !idea.convertedProjectId && (
        <ConvertIdeaDialog
          ideaId={idea.id}
          users={userOptions}
          departments={departmentOptions}
          defaultResponsableId={idea.porteurId}
          defaultDepartmentId={idea.departmentId}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <Info label="Origine" value={idea.origine || "—"} />
          <Info label="Zone" value={idea.zone || "—"} />
          <Info label="Problème identifié" value={idea.probleme || "—"} />
          <Info label="Opportunité" value={idea.opportunite || "—"} />
          <Info label="Bénéficiaires" value={idea.beneficiaires || "—"} />
          <Info label="Porteur" value={idea.porteur?.name || "—"} />
          <Info label="Département" value={idea.department?.name || "—"} />
          <Info label="Durée estimée" value={idea.dureeEstimee || "—"} />
          <Info
            label="Estimation budgétaire"
            value={idea.estimationBudgetaire ? String(idea.estimationBudgetaire) : "—"}
          />
          <Info label="Source potentielle de financement" value={idea.sourceFinancementPotentielle || "—"} />
          <Info label="Créée par" value={idea.createdBy.name} />
          {idea.statut === "REJETEE" && <Info label="Motif de rejet" value={idea.motifRejet || "—"} />}
        </CardContent>
      </Card>

      <ProjectConceptNotePanel
        ideaId={idea.id}
        canManage={canCreate}
        note={
          idea.conceptNote
            ? {
                id: idea.conceptNote.id,
                titre: idea.conceptNote.titre,
                contexte: idea.conceptNote.contexte,
                probleme: idea.conceptNote.probleme,
                justification: idea.conceptNote.justification,
                objectifs: idea.conceptNote.objectifs,
                beneficiaires: idea.conceptNote.beneficiaires,
                approche: idea.conceptNote.approche,
                resultatsAttendus: idea.conceptNote.resultatsAttendus,
                duree: idea.conceptNote.duree,
                budgetIndicatif: idea.conceptNote.budgetIndicatif ? Number(idea.conceptNote.budgetIndicatif) : null,
                partenaires: idea.conceptNote.partenaires,
                financementRecherche: idea.conceptNote.financementRecherche
                  ? Number(idea.conceptNote.financementRecherche)
                  : null,
              }
            : null
        }
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
