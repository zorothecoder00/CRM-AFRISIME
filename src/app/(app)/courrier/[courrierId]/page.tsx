import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { canViewCourrier } from "@/lib/courrier-access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForCourrierStatus, accentForCourrierStatus } from "@/lib/status-tone";
import { CourrierFormDialog } from "@/components/courrier/courrier-form-dialog";
import { CourrierStatusSelect } from "@/components/courrier/courrier-status-select";
import { LinkTaskForm } from "@/components/courrier/link-task-form";
import { UnlinkTaskButton } from "@/components/courrier/unlink-task-button";
import { FileCheck2, Lock } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  ENTRANT: "Entrant",
  SORTANT: "Sortant",
  INTERNE: "Interne",
};

const STATUS_LABELS: Record<string, string> = {
  A_TRAITER: "À traiter",
  EN_COURS: "En cours",
  TRAITE: "Traité",
  ARCHIVE: "Archivé",
};

export default async function CourrierDetailPage({
  params,
}: {
  params: Promise<{ courrierId: string }>;
}) {
  const { courrierId } = await params;
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.COURRIER_READ)) {
    redirect("/dashboard");
  }
  const canManage = session!.user.permissions.includes(PERMISSIONS.COURRIER_MANAGE);
  const userId = session!.user.id;

  const courrier = await prisma.courrier.findUnique({
    where: { id: courrierId },
    include: { department: true, responsable: true, createdBy: true, task: { include: { project: true } } },
  });

  if (!courrier) {
    notFound();
  }

  if (!canViewCourrier(courrier, userId, canManage)) {
    redirect("/courrier");
  }

  const [departments, users, availableTasks] = canManage
    ? await Promise.all([
        prisma.department.findMany({ orderBy: { name: "asc" } }),
        prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
        prisma.task.findMany({
          where: { courrier: null },
          include: { project: true },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
      ])
    : [[], [], []];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{courrier.objet}</h1>
            {courrier.confidentiel && <Lock className="h-4 w-4 text-muted-foreground" />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{courrier.reference}</p>
        </div>

        <Card accent={accentForCourrierStatus(courrier.statut)}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Informations</CardTitle>
            {canManage && (
              <CourrierFormDialog
                departments={departments.map((d) => ({ id: d.id, label: d.name }))}
                users={users.map((u) => ({ id: u.id, label: u.name }))}
                courrier={{
                  id: courrier.id,
                  objet: courrier.objet,
                  type: courrier.type,
                  confidentiel: courrier.confidentiel,
                  dateCourrier: courrier.dateCourrier.toISOString().slice(0, 10),
                  expediteur: courrier.expediteur,
                  destinataire: courrier.destinataire,
                  departmentId: courrier.departmentId,
                  responsableId: courrier.responsableId,
                  documentUrl: courrier.documentUrl,
                  documentNom: courrier.documentNom,
                  notes: courrier.notes,
                }}
              />
            )}
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <Info label="Type" value={TYPE_LABELS[courrier.type]} />
            <Info label="Date" value={courrier.dateCourrier.toLocaleDateString("fr-FR")} />
            <Info label="Expéditeur" value={courrier.expediteur || "—"} />
            <Info label="Destinataire" value={courrier.destinataire || "—"} />
            <Info label="Département" value={courrier.department?.name ?? "—"} />
            <Info label="Responsable" value={courrier.responsable?.name ?? "—"} />
            <Info label="Enregistré par" value={courrier.createdBy.name} />
          </CardContent>
          {courrier.documentUrl && (
            <CardContent className="pt-0">
              <a
                href={courrier.documentUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <FileCheck2 className="h-4 w-4" />
                {courrier.documentNom ?? "Fichier joint"}
              </a>
            </CardContent>
          )}
          {courrier.notes && (
            <CardContent className="pt-0">
              <div className="text-xs text-muted-foreground">Notes</div>
              <p className="whitespace-pre-wrap text-sm">{courrier.notes}</p>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statut du traitement</CardTitle>
          </CardHeader>
          <CardContent>
            {canManage ? (
              <CourrierStatusSelect courrierId={courrier.id} initialStatut={courrier.statut} />
            ) : (
              <Badge variant={toneForCourrierStatus(courrier.statut)}>{STATUS_LABELS[courrier.statut]}</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tâche rattachée</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {courrier.task ? (
              <div className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                <Link href={`/taches/${courrier.task.id}`} className="min-w-0 flex-1 font-medium hover:underline">
                  {courrier.task.titre}
                </Link>
                <span className="text-xs text-muted-foreground">{courrier.task.project.nom}</span>
                {canManage && <UnlinkTaskButton courrierId={courrier.id} />}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune tâche rattachée pour le moment.</p>
            )}
            {canManage && !courrier.task && (
              <LinkTaskForm
                courrierId={courrier.id}
                tasks={availableTasks.map((t) => ({ id: t.id, label: `${t.titre} — ${t.project.nom}` }))}
              />
            )}
          </CardContent>
        </Card>
      </div>
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
