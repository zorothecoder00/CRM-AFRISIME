"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAction } from "@/hooks/use-action";
import { deleteProject } from "@/actions/trash.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForStatus, toneForPriority, accentForStatus } from "@/lib/status-tone";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { ProjectEditDialog } from "@/components/projects/project-edit-dialog";
import type { ProjectRow } from "@/components/projects/project-table-view";

type Option = { id: string; label: string };

const STATUS_LABELS: Record<string, string> = {
  PLANIFIE: "Planifié",
  EN_COURS: "En cours",
  EN_PAUSE: "En pause",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

const PRIORITY_LABELS: Record<string, string> = {
  BASSE: "Basse",
  MOYENNE: "Moyenne",
  HAUTE: "Haute",
  CRITIQUE: "Critique",
};

/** Carte de la vue Liste (grille) — extraite en client component pour porter le menu d'actions Modifier/Supprimer. */
export function ProjectListCard({
  project,
  departments,
  users,
  canManage,
  canDelete,
}: {
  project: ProjectRow;
  departments: Option[];
  users: Option[];
  canManage: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const { run: remove } = useAction(deleteProject, { successMessage: "Projet supprimé." });

  const depasse = project.budget !== null && project.coutReel !== null && project.coutReel > project.budget;

  return (
    <div className="relative h-full">
      {(canManage || canDelete) && (
        <div className="absolute top-2 right-2 z-10">
          <RowActionsMenu
            onEdit={canManage ? () => setEditing(true) : undefined}
            onDelete={canDelete ? () => remove(project.id) : undefined}
            deleteConfirmLabel={`Supprimer « ${project.nom} » ? Le projet sera déplacé dans la corbeille.`}
          />
        </div>
      )}
      <Link href={`/projets/${project.id}`}>
        <Card
          accent={accentForStatus(project.statut)}
          className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50"
        >
          <CardHeader>
            <CardTitle className="pr-8 text-base">{project.nom}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="line-clamp-2 text-sm text-muted-foreground">{project.description || "Pas de description."}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant={toneForStatus(project.statut)}>{STATUS_LABELS[project.statut]}</Badge>
              <Badge variant={toneForPriority(project.priorite)}>{PRIORITY_LABELS[project.priorite]}</Badge>
              <Badge variant="outline">{project.departmentNom}</Badge>
              {depasse && <Badge variant="destructive">Budget dépassé</Badge>}
            </div>
            <div className="text-xs text-muted-foreground">Responsable : {project.responsableNom}</div>
            <div className="text-xs font-medium">Avancement : {project.avancement}%</div>
          </CardContent>
        </Card>
      </Link>
      {editing && (
        <ProjectEditDialog
          project={project}
          departments={departments}
          users={users}
          open={editing}
          onOpenChange={(o) => {
            setEditing(o);
            if (!o) router.refresh();
          }}
        />
      )}
    </div>
  );
}
