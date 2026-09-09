"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toneForStatus, toneForPriority } from "@/lib/status-tone";
import { ExportXlsxButton } from "@/components/ui/export-xlsx-button";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { ProjectEditDialog } from "@/components/projects/project-edit-dialog";
import { useAction } from "@/hooks/use-action";
import { deleteProject } from "@/actions/trash.actions";
import type { XlsxColumn } from "@/lib/xlsx-export";

type Option = { id: string; label: string };

export type ProjectRow = {
  id: string;
  nom: string;
  description: string | null;
  objectif: string | null;
  statut: string;
  priorite: string;
  departmentId: string;
  departmentNom: string;
  responsableId: string;
  responsableNom: string;
  avancement: number;
  budget: number | null;
  coutReel: number | null;
  /** Devise de l'entité du projet (via son département) — voir getDeviseForDepartment, pas forcément celle de l'organisation. */
  devise: string;
  dateDebut: string | null;
  dateFin: string | null;
  localisation: string | null;
};

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

function formatMontant(montant: number | null, devise: string) {
  if (montant === null) return "—";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(montant)} ${devise}`;
}

// Demande utilisateur — chaque projet peut etre rattache a une entite
// operant dans une devise differente (voir ProjectRow.devise, resolue via
// getDeviseForDepartment) : les colonnes Budget/Coût réel affichent donc la
// devise PROPRE a chaque ligne (currencyKey), pas une seule devise globale.
const EXPORT_COLUMNS: XlsxColumn<ProjectRow>[] = [
  { label: "Nom", key: "nom" },
  { label: "Statut", key: "statut", format: (v) => STATUS_LABELS[v as string] ?? String(v) },
  { label: "Priorité", key: "priorite", format: (v) => PRIORITY_LABELS[v as string] ?? String(v) },
  { label: "Département", key: "departmentNom" },
  { label: "Responsable", key: "responsableNom" },
  { label: "Avancement (%)", key: "avancement", type: "number" },
  { label: "Budget", key: "budget", type: "currency", currencyKey: "devise" },
  { label: "Coût réel", key: "coutReel", type: "currency", currencyKey: "devise" },
  { label: "Échéance", key: "dateFin", type: "date", format: (v) => (v ? new Date(v as string) : null) },
];

/** Vue Table (cahier des charges §VI) — tri lisible en un coup d'oeil, complementaire a la vue Liste en cartes. */
export function ProjectTableView({
  projects,
  fallbackDevise = "XOF",
  departments = [],
  users = [],
  canManage = false,
  canDelete = false,
}: {
  projects: ProjectRow[];
  /** Repli pour l'export si jamais une ligne n'a pas sa propre devise (ne devrait pas arriver, voir ProjectRow.devise). */
  fallbackDevise?: string;
  departments?: Option[];
  users?: Option[];
  canManage?: boolean;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const { run: remove } = useAction(deleteProject, { successMessage: "Projet supprimé." });

  if (projects.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun projet pour le moment.</p>;
  }

  const editingProject = projects.find((p) => p.id === editingId) ?? null;

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <ExportXlsxButton
          rows={projects}
          columns={EXPORT_COLUMNS}
          filename="projets.xlsx"
          sheetName="Projets"
          title="Projets"
          currency={fallbackDevise}
        />
      </div>
      <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Priorité</TableHead>
            <TableHead>Département</TableHead>
            <TableHead>Responsable</TableHead>
            <TableHead>Avancement</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead>Échéance</TableHead>
            {(canManage || canDelete) && <TableHead className="w-10" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((p) => {
            const depasse = p.budget !== null && p.coutReel !== null && p.coutReel > p.budget;
            return (
              <TableRow key={p.id}>
                <TableCell>
                  <Link href={`/projets/${p.id}`} className="font-medium hover:underline">
                    {p.nom}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={toneForStatus(p.statut)}>{STATUS_LABELS[p.statut]}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={toneForPriority(p.priorite)}>{PRIORITY_LABELS[p.priorite]}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{p.departmentNom}</TableCell>
                <TableCell className="text-muted-foreground">{p.responsableNom}</TableCell>
                <TableCell>{p.avancement}%</TableCell>
                <TableCell>
                  {formatMontant(p.budget, p.devise)}
                  {depasse && (
                    <Badge variant="destructive" className="ml-1.5">
                      Dépassé
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.dateFin ? new Date(p.dateFin).toLocaleDateString("fr-FR") : "—"}
                </TableCell>
                {(canManage || canDelete) && (
                  <TableCell>
                    <RowActionsMenu
                      onEdit={canManage ? () => setEditingId(p.id) : undefined}
                      onDelete={canDelete ? () => remove(p.id) : undefined}
                      deleteConfirmLabel={`Supprimer « ${p.nom} » ? Le projet sera déplacé dans la corbeille.`}
                    />
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>
      {editingProject && (
        <ProjectEditDialog
          project={editingProject}
          departments={departments}
          users={users}
          open={!!editingId}
          onOpenChange={(o) => {
            setEditingId(o ? editingId : null);
            if (!o) router.refresh();
          }}
        />
      )}
    </div>
  );
}
