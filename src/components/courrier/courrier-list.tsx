import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toneForCourrierStatus } from "@/lib/status-tone";
import { Inbox, Send, Building2, Lock } from "lucide-react";

export type CourrierRow = {
  id: string;
  reference: string;
  objet: string;
  type: string;
  statut: string;
  confidentiel: boolean;
  dateCourrier: string;
  responsableName: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  ENTRANT: "Entrant",
  SORTANT: "Sortant",
  INTERNE: "Interne",
};

const TYPE_ICONS: Record<string, typeof Inbox> = {
  ENTRANT: Inbox,
  SORTANT: Send,
  INTERNE: Building2,
};

const STATUS_LABELS: Record<string, string> = {
  A_TRAITER: "À traiter",
  EN_COURS: "En cours",
  TRAITE: "Traité",
  ARCHIVE: "Archivé",
};

export function CourrierList({ items }: { items: CourrierRow[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun courrier.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((c) => {
        const Icon = TYPE_ICONS[c.type] ?? Inbox;
        return (
          <li key={c.id}>
            <Link href={`/courrier/${c.id}`}>
              <Card
                size="sm"
                className="flex-row flex-wrap items-center justify-between gap-2 transition-all hover:-translate-y-0.5 hover:bg-muted/50 sm:flex-nowrap"
              >
                <div className="flex items-center gap-2 px-(--card-spacing)">
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      {c.confidentiel && <Lock className="h-3 w-3 text-muted-foreground" />}
                      {c.objet}
                    </div>
                    <div className="text-xs text-muted-foreground">{c.reference}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 px-(--card-spacing) text-xs text-muted-foreground">
                  <Badge variant="outline">{TYPE_LABELS[c.type]}</Badge>
                  <Badge variant={toneForCourrierStatus(c.statut)}>{STATUS_LABELS[c.statut]}</Badge>
                  {c.responsableName && <span>{c.responsableName}</span>}
                  <span>{new Date(c.dateCourrier).toLocaleDateString("fr-FR")}</span>
                </div>
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
