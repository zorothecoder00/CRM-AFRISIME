"use client";

import { useState } from "react";
import Link from "next/link";
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { useAction } from "@/hooks/use-action";
import { updateOpportunityStatus } from "@/actions/crm.actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toneForOpportunityStatus, accentForOpportunityStatus, type BadgeTone } from "@/lib/status-tone";

export type OpportunityRow = {
  id: string;
  nom: string;
  statut: string;
  contactNom: string | null;
  organizationNom: string | null;
  montantEstime: number | null;
  ownerNom: string;
};

const COLUMNS: { key: string; label: string }[] = [
  { key: "NOUVEAU", label: "Nouveau" },
  { key: "QUALIFICATION", label: "Qualification" },
  { key: "PROPOSITION", label: "Proposition" },
  { key: "NEGOCIATION", label: "Négociation" },
  { key: "GAGNEE", label: "Gagnée" },
  { key: "PERDUE", label: "Perdue" },
];

// Meme logique que le kanban des taches : la barre d'accent en tete de
// colonne reprend la teinte de l'etape (cf. status-tone.ts).
const COLUMN_ACCENT: Record<BadgeTone, string> = {
  default: "border-t-border",
  secondary: "border-t-border",
  destructive: "border-t-destructive",
  success: "border-t-success",
  warning: "border-t-warning",
  info: "border-t-info",
  outline: "border-t-border",
  ghost: "border-t-border",
  link: "border-t-border",
};

function formatMontant(montant: number | null) {
  if (montant === null) return null;
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(montant);
}

function OpportunityCard({ opportunity }: { opportunity: OpportunityRow }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: opportunity.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card
        accent={accentForOpportunityStatus(opportunity.statut)}
        className={`mb-2 cursor-grab p-3 ${isDragging ? "opacity-50" : ""}`}
      >
        <Link href={`/crm/opportunites/${opportunity.id}`} className="text-sm font-medium hover:underline">
          {opportunity.nom}
        </Link>
        <div className="mt-1 text-xs text-muted-foreground">
          {opportunity.organizationNom ?? opportunity.contactNom ?? "—"}
        </div>
        <div className="mt-2 flex items-center justify-between">
          {opportunity.montantEstime !== null ? (
            <Badge variant="outline" className="text-xs">
              {formatMontant(opportunity.montantEstime)} FCFA
            </Badge>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted-foreground">{opportunity.ownerNom}</span>
        </div>
      </Card>
    </div>
  );
}

function KanbanColumn({
  columnKey,
  label,
  opportunities,
}: {
  columnKey: string;
  label: string;
  opportunities: OpportunityRow[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnKey });
  const accent = COLUMN_ACCENT[toneForOpportunityStatus(columnKey)];
  const total = opportunities.reduce((sum, o) => sum + (o.montantEstime ?? 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[300px] w-64 flex-shrink-0 flex-col rounded-md border border-t-2 bg-muted/20 p-2 ${accent} ${
        isOver ? "bg-muted/50" : ""
      }`}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-sm font-semibold">{label}</span>
        <Badge variant="secondary">{opportunities.length}</Badge>
      </div>
      {total > 0 && (
        <div className="mb-2 px-1 text-xs text-muted-foreground">{formatMontant(total)} FCFA</div>
      )}
      {opportunities.map((o) => (
        <OpportunityCard key={o.id} opportunity={o} />
      ))}
    </div>
  );
}

export function OpportunityKanban({ opportunities: initial }: { opportunities: OpportunityRow[] }) {
  const [opportunities, setOpportunities] = useState(initial);
  const { run } = useAction(updateOpportunityStatus);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const id = active.id as string;
    const newStatus = over.id as string;
    const opportunity = opportunities.find((o) => o.id === id);
    if (!opportunity || opportunity.statut === newStatus) return;

    setOpportunities((prev) => prev.map((o) => (o.id === id ? { ...o, statut: newStatus } : o)));

    const result = await run({
      id,
      statut: newStatus as "NOUVEAU" | "QUALIFICATION" | "PROPOSITION" | "NEGOCIATION" | "GAGNEE" | "PERDUE",
    });
    if (!result.ok) {
      setOpportunities((prev) => prev.map((o) => (o.id === id ? { ...o, statut: opportunity.statut } : o)));
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.key}
            columnKey={col.key}
            label={col.label}
            opportunities={opportunities.filter((o) => o.statut === col.key)}
          />
        ))}
      </div>
    </DndContext>
  );
}
