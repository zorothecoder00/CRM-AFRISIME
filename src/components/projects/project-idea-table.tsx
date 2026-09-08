"use client";

import Link from "next/link";
import { useAction } from "@/hooks/use-action";
import { updateProjectIdeaStatus } from "@/actions/project-idea.actions";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toneForProjectIdeaStatus, toneForPriority } from "@/lib/status-tone";
import { ConvertIdeaDialog } from "@/components/projects/convert-idea-dialog";
import { ProjectIdeaFormDialog } from "@/components/projects/project-idea-form-dialog";

export type ProjectIdeaRow = {
  id: string;
  titreProvisoire: string;
  priorite: string;
  statut: string;
  porteurName: string | null;
  departmentName: string | null;
  estimationBudgetaire: number | null;
  convertedProjectId: string | null;
};

type Option = { id: string; label: string };

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

const TRANSITIONABLE_STATUSES = ["IDEE", "A_ETUDIER", "ETUDE_FAISABILITE", "APPROUVEE", "EN_CONCEPTION", "REJETEE", "ARCHIVEE"];

/** Demande utilisateur — remplace le Kanban a 8 colonnes (scroll horizontal
 * genant, meme reduit/empile) par un tableau normal, sans overflow-x. */
export function ProjectIdeaTable({
  ideas,
  users,
  departments,
  canManage,
  canCreate,
}: {
  ideas: ProjectIdeaRow[];
  users: Option[];
  departments: Option[];
  canManage: boolean;
  canCreate: boolean;
}) {
  const { run: setStatus } = useAction(updateProjectIdeaStatus, { successMessage: "Statut mis à jour." });

  if (ideas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-dashed py-10 text-center">
        <p className="text-sm text-muted-foreground">Aucune idée pour le moment.</p>
        {canCreate && <ProjectIdeaFormDialog users={users} departments={departments} />}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Titre</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Priorité</TableHead>
          <TableHead className="hidden sm:table-cell">Porteur</TableHead>
          <TableHead className="hidden md:table-cell">Département</TableHead>
          <TableHead className="hidden lg:table-cell">Budget estimé</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {ideas.map((idea) => (
          <TableRow key={idea.id}>
            <TableCell className="max-w-64 whitespace-normal">
              <Link href={`/projets/idees/${idea.id}`} className="font-medium hover:underline">
                {idea.titreProvisoire}
              </Link>
            </TableCell>
            <TableCell>
              {canManage && TRANSITIONABLE_STATUSES.includes(idea.statut) ? (
                <Select value={idea.statut} onValueChange={(v) => setStatus({ ideaId: idea.id, statut: v as never })}>
                  <SelectTrigger className="h-7 w-40 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS)
                      .filter(([key]) => key !== "PROJET_CREE")
                      .map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant={toneForProjectIdeaStatus(idea.statut)}>{STATUS_LABELS[idea.statut]}</Badge>
              )}
            </TableCell>
            <TableCell>
              <Badge variant={toneForPriority(idea.priorite)}>{idea.priorite}</Badge>
            </TableCell>
            <TableCell className="hidden sm:table-cell text-muted-foreground">{idea.porteurName ?? "—"}</TableCell>
            <TableCell className="hidden md:table-cell text-muted-foreground">{idea.departmentName ?? "—"}</TableCell>
            <TableCell className="hidden lg:table-cell text-muted-foreground">
              {idea.estimationBudgetaire !== null ? idea.estimationBudgetaire.toLocaleString("fr-FR") : "—"}
            </TableCell>
            <TableCell>
              {canManage && idea.statut === "EN_CONCEPTION" && !idea.convertedProjectId && (
                <ConvertIdeaDialog ideaId={idea.id} users={users} departments={departments} />
              )}
              {idea.convertedProjectId && (
                <Link href={`/projets/${idea.convertedProjectId}`} className="text-xs text-primary hover:underline">
                  Voir le projet →
                </Link>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
