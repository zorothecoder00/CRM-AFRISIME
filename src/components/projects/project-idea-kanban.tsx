"use client";

import Link from "next/link";
import { useAction } from "@/hooks/use-action";
import { updateProjectIdeaStatus } from "@/actions/project-idea.actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toneForProjectIdeaStatus, toneForPriority } from "@/lib/status-tone";
import { ConvertIdeaDialog } from "@/components/projects/convert-idea-dialog";

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

const COLUMNS: { key: string; label: string }[] = [
  { key: "IDEE", label: "Idée" },
  { key: "A_ETUDIER", label: "À étudier" },
  { key: "ETUDE_FAISABILITE", label: "Étude de faisabilité" },
  { key: "APPROUVEE", label: "Approuvée" },
  { key: "EN_CONCEPTION", label: "En conception" },
  { key: "PROJET_CREE", label: "Projet créé" },
  { key: "REJETEE", label: "Rejetée" },
  { key: "ARCHIVEE", label: "Archivée" },
];

const TRANSITIONABLE_STATUSES = ["IDEE", "A_ETUDIER", "ETUDE_FAISABILITE", "APPROUVEE", "EN_CONCEPTION", "REJETEE", "ARCHIVEE"];

export function ProjectIdeaKanban({
  ideas,
  users,
  departments,
  canManage,
}: {
  ideas: ProjectIdeaRow[];
  users: Option[];
  departments: Option[];
  canManage: boolean;
}) {
  const { run: setStatus } = useAction(updateProjectIdeaStatus, { successMessage: "Statut mis à jour." });

  return (
    // Empiler les 8 colonnes de statut verticalement (pleine largeur) sur
    // mobile evite tout scroll horizontal ; a partir de md, le board Kanban
    // classique reprend avec defilement horizontal contenu (retour
    // utilisateur — les en-tetes tournes n'auraient pas reduit la largeur
    // reelle des cartes, seulement celle du texte).
    <div className="flex flex-col gap-4 md:flex-row md:overflow-x-auto md:pb-2">
      {COLUMNS.map((col) => {
        const columnIdeas = ideas.filter((i) => i.statut === col.key);
        return (
          <div key={col.key} className="space-y-2 border-b pb-4 last:border-0 last:pb-0 md:w-56 md:flex-none md:border-0 md:pb-0">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-medium">{col.label}</h3>
              <span className="text-xs text-muted-foreground">{columnIdeas.length}</span>
            </div>
            <div className="space-y-2">
              {columnIdeas.map((idea) => (
                <Card key={idea.id} size="sm">
                  <CardContent className="space-y-2 px-(--card-spacing)">
                    <Link href={`/projets/idees/${idea.id}`} className="font-medium hover:underline">
                      {idea.titreProvisoire}
                    </Link>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={toneForPriority(idea.priorite)}>{idea.priorite}</Badge>
                      {idea.departmentName && <Badge variant="outline">{idea.departmentName}</Badge>}
                    </div>
                    {idea.porteurName && (
                      <p className="text-xs text-muted-foreground">Porteur : {idea.porteurName}</p>
                    )}
                    {idea.estimationBudgetaire !== null && (
                      <p className="text-xs text-muted-foreground">Budget estimé : {idea.estimationBudgetaire}</p>
                    )}
                    {canManage && idea.statut === "EN_CONCEPTION" && !idea.convertedProjectId && (
                      <ConvertIdeaDialog ideaId={idea.id} users={users} departments={departments} />
                    )}
                    {idea.convertedProjectId && (
                      <Link href={`/projets/${idea.convertedProjectId}`} className="block text-xs text-primary hover:underline">
                        Voir le projet →
                      </Link>
                    )}
                    {canManage && TRANSITIONABLE_STATUSES.includes(idea.statut) && (
                      <Select value={idea.statut} onValueChange={(v) => setStatus({ ideaId: idea.id, statut: v as never })}>
                        <SelectTrigger className="h-7 w-full text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COLUMNS.filter((c) => c.key !== "PROJET_CREE").map((c) => (
                            <SelectItem key={c.key} value={c.key}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {!canManage && <Badge variant={toneForProjectIdeaStatus(idea.statut)}>{col.label}</Badge>}
                  </CardContent>
                </Card>
              ))}
              {columnIdeas.length === 0 && <p className="px-1 text-xs text-muted-foreground">Aucune idée.</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
