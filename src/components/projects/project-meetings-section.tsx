import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { toneForStatus } from "@/lib/status-tone";
import { MeetingFormDialog } from "@/components/meetings/meeting-form-dialog";

type Option = { id: string; label: string };

const STATUS_LABELS: Record<string, string> = {
  PLANIFIEE: "Planifiée",
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
};

export type ProjectMeetingRow = { id: string; titre: string; dateHeure: string; statut: string };

/** Réunions du projet (cahier des charges Project Studio §63) — même modèle que /reunions, filtré à ce projet. */
export function ProjectMeetingsSection({
  project,
  users,
  meetings,
  canManage,
}: {
  project: Option;
  users: Option[];
  meetings: ProjectMeetingRow[];
  canManage: boolean;
}) {
  const sorted = [...meetings].sort((a, b) => new Date(b.dateHeure).getTime() - new Date(a.dateHeure).getTime());

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{meetings.length} réunion(s) pour ce projet.</p>
        {canManage && <MeetingFormDialog projects={[project]} users={users} />}
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune réunion pour ce projet.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((m) => (
            <Link
              key={m.id}
              href={`/reunions/${m.id}`}
              className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted"
            >
              <span className="font-medium">{m.titre}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(m.dateHeure).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                </span>
                <Badge variant={toneForStatus(m.statut)}>{STATUS_LABELS[m.statut]}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
