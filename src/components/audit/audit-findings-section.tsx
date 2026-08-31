import { Badge } from "@/components/ui/badge";
import { toneForAuditFindingStatus } from "@/lib/status-tone";
import { AuditFindingFormDialog, type AuditFindingFormValues } from "@/components/audit/audit-finding-form-dialog";

type Option = { id: string; label: string };

export type AuditFindingRow = {
  id: string;
  constat: string;
  recommandation: string | null;
  statut: string;
  responsableId: string | null;
  responsableName: string | null;
  echeance: string | null;
};

const STATUT_LABELS: Record<string, string> = {
  OUVERT: "Ouvert",
  EN_COURS: "En cours",
  TRAITE: "Traité",
  CLOS: "Clos",
};

export function AuditFindingsSection({
  missionId,
  findings,
  users,
  canManage,
}: {
  missionId: string;
  findings: AuditFindingRow[];
  users: Option[];
  canManage: boolean;
}) {
  return (
    <div className="space-y-3">
      {canManage && <AuditFindingFormDialog missionId={missionId} users={users} />}
      <div className="space-y-2">
        {findings.map((f) => {
          const formValues: AuditFindingFormValues = {
            id: f.id,
            constat: f.constat,
            recommandation: f.recommandation,
            responsableId: f.responsableId,
            echeance: f.echeance,
            statut: f.statut,
          };
          return (
            <div key={f.id} className="space-y-2 rounded-md border p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{f.constat}</p>
                <div className="flex items-center gap-1">
                  <Badge variant={toneForAuditFindingStatus(f.statut)}>{STATUT_LABELS[f.statut]}</Badge>
                  {canManage && <AuditFindingFormDialog missionId={missionId} finding={formValues} users={users} />}
                </div>
              </div>
              {f.recommandation && <p className="text-muted-foreground">{f.recommandation}</p>}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {f.responsableName && <span>Responsable : {f.responsableName}</span>}
                {f.echeance && <span>Échéance : {new Date(f.echeance).toLocaleDateString("fr-FR")}</span>}
              </div>
            </div>
          );
        })}
        {findings.length === 0 && <p className="text-sm text-muted-foreground">Aucun constat pour cette mission.</p>}
      </div>
    </div>
  );
}
