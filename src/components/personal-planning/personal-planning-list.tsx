"use client";

import { useState } from "react";
import Link from "next/link";
import { useAction } from "@/hooks/use-action";
import { deletePersonalPlanningEntry } from "@/actions/personal-planning.actions";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { toneForStatus, toneForPriority } from "@/lib/status-tone";
import { ENTRY_STATUT_LABELS, ENTRY_PRIORITE_META } from "@/lib/personal-planning-types";
import { PersonalPlanningEntryEditDialog, type PersonalPlanningEntryEditData } from "@/components/personal-planning/entry-edit-dialog";
import type { PersonalPlanningReferenceData } from "@/components/personal-planning/entry-fields";
import type { PersonalPlanningEntryRow } from "@/components/personal-planning/personal-planning-week";

export type PersonalPlanningListRow = PersonalPlanningEntryRow & {
  responsableNom: string;
  projetNom: string | null;
};

type NonWorkingReason = { label: string; kind: "ferie" | "conge" | "absence" | "non_ouvrable" };

const NON_WORKING_EMOJI: Record<string, string> = { ferie: "🎉", conge: "🏖️", absence: "🚫", non_ouvrable: "📅" };

// Demande utilisateur — la vue Liste n'avait pas de colonne Créneau (plage
// horaire dateDebut→dateFin), alors que la vue Semaine/Jour la montre.
function formatCreneau(dateDebut: string, dateFin: string): string {
  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);
  const dateLabel = debut.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  const heureDebut = debut.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const heureFin = fin.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${dateLabel} ${heureDebut}–${heureFin}`;
}

/** Vue Liste (§8) : échéance / priorité / statut / projet / responsable — les activités personnelles, pas les tâches (voir §10). */
export function PersonalPlanningList({
  entries,
  refData,
  nonWorkingByDate,
}: {
  entries: PersonalPlanningListRow[];
  refData: PersonalPlanningReferenceData;
  /** §39 — jour férié, absence exceptionnelle ou jour non ouvrable de chaque date (yyyy-MM-dd), pour signaler une échéance qui y tombe. */
  nonWorkingByDate?: Map<string, NonWorkingReason>;
}) {
  const [editing, setEditing] = useState<PersonalPlanningListRow | null>(null);
  const editData: PersonalPlanningEntryEditData | null =
    editing && editing.type !== "RESERVE" && !editing.meetingHref ? { ...editing, type: editing.type } : null;
  const { run: remove } = useAction(deletePersonalPlanningEntry, { successMessage: "Entrée supprimée." });

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune activité sur cette période.</p>;
  }

  return (
    <div className="rounded-md border">
      {/* Demande utilisateur — même disposition/design que le tableau
          mes-tâches (showCreneau) : Créneau en premier, puis Titre (au lieu
          de "Tâche" — ces lignes ne sont pas toutes des tâches), Échéance,
          Priorité, Statut, Projet, Responsable (conservée ici, contrairement
          à mes-taches où le responsable est toujours l'utilisateur courant). */}
      <Table className="text-[11px]">
        <TableHeader className="bg-muted/60">
          <TableRow>
            <TableHead className="border border-border">Créneau</TableHead>
            <TableHead className="border border-border">Titre</TableHead>
            <TableHead className="border border-border">Échéance</TableHead>
            <TableHead className="border border-border">Priorité</TableHead>
            <TableHead className="border border-border">Statut</TableHead>
            <TableHead className="border border-border">Projet</TableHead>
            <TableHead className="border border-border">Responsable</TableHead>
            <TableHead className="w-10 border border-border" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => {
            const dueKey = entry.dateFin.slice(0, 10);
            const nonWorking = nonWorkingByDate?.get(dueKey);
            return (
            <TableRow key={entry.id}>
              <TableCell className="whitespace-nowrap align-top text-muted-foreground">
                {formatCreneau(entry.dateDebut, entry.dateFin)}
              </TableCell>
              <TableCell className="whitespace-normal break-words align-top font-medium">
                {entry.meetingHref ? (
                  <Link href={entry.meetingHref} className="text-primary hover:underline">
                    {entry.titre}
                  </Link>
                ) : (
                  entry.titre
                )}
              </TableCell>
              <TableCell className="whitespace-normal break-words align-top">
                <span className="flex items-center gap-1">
                  {new Date(entry.dateFin).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  {nonWorking && (
                    <span title={nonWorking.label} className="text-xs">
                      {NON_WORKING_EMOJI[nonWorking.kind]}
                    </span>
                  )}
                </span>
              </TableCell>
              <TableCell className="whitespace-normal break-words align-top">
                <Badge variant={toneForPriority(entry.priorite)}>
                  {ENTRY_PRIORITE_META[entry.priorite].emoji} {ENTRY_PRIORITE_META[entry.priorite].label}
                </Badge>
              </TableCell>
              <TableCell className="whitespace-normal break-words align-top">
                <Badge variant={toneForStatus(entry.statut)}>{ENTRY_STATUT_LABELS[entry.statut]}</Badge>
              </TableCell>
              <TableCell className="whitespace-normal break-words align-top">{entry.projetNom ?? "—"}</TableCell>
              <TableCell className="whitespace-normal break-words align-top">{entry.responsableNom}</TableCell>
              <TableCell className="align-top">
                {entry.type !== "RESERVE" && !entry.meetingHref && (
                  <RowActionsMenu
                    onEdit={() => setEditing(entry)}
                    onDelete={() => remove({ id: entry.id })}
                    deleteConfirmLabel={`Supprimer « ${entry.titre} » ?`}
                  />
                )}
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {editData && (
        <PersonalPlanningEntryEditDialog entry={editData} open={!!editing} onOpenChange={(o) => setEditing(o ? editing : null)} refData={refData} />
      )}
    </div>
  );
}
