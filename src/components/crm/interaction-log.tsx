"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { addInteraction } from "@/actions/crm.actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, MessageCircle, CalendarClock, MapPin, StickyNote, MessageSquare, PartyPopper, type LucideIcon } from "lucide-react";

export type InteractionData = {
  id: string;
  type: string;
  contenu: string;
  dateInteraction: string;
  authorName: string;
};

const TYPE_LABELS: Record<string, string> = {
  EMAIL: "Email",
  APPEL: "Appel",
  WHATSAPP: "WhatsApp",
  REUNION: "Réunion",
  VISITE: "Visite",
  NOTE: "Note",
  MESSAGE: "Message",
  EVENEMENT: "Événement",
};

const TYPE_ICONS: Record<string, LucideIcon> = {
  EMAIL: Mail,
  APPEL: Phone,
  WHATSAPP: MessageCircle,
  REUNION: CalendarClock,
  VISITE: MapPin,
  NOTE: StickyNote,
  MESSAGE: MessageSquare,
  EVENEMENT: PartyPopper,
};

/** Journal d'interactions (appels, emails, notes...) — réutilisé sur les fiches contact/organisation/opportunité. */
export function InteractionLog({
  interactions,
  contactId,
  organizationId,
  opportunityId,
}: {
  interactions: InteractionData[];
  contactId?: string;
  organizationId?: string;
  opportunityId?: string;
}) {
  const [type, setType] = useState("NOTE");
  const [contenu, setContenu] = useState("");
  const { run, isPending } = useAction(addInteraction, { successMessage: "Interaction ajoutée." });

  async function handleSubmit() {
    if (!contenu.trim()) return;
    const result = await run({
      type: type as "EMAIL" | "APPEL" | "WHATSAPP" | "REUNION" | "VISITE" | "NOTE",
      contenu: contenu.trim(),
      contactId,
      organizationId,
      opportunityId,
    });
    if (result.ok) setContenu("");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-36 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            placeholder="Résumé de l'échange..."
            rows={1}
            className="min-h-9 flex-1 resize-none"
          />
          <Button onClick={handleSubmit} disabled={isPending || !contenu.trim()} className="shrink-0">
            Ajouter
          </Button>
        </div>
      </div>

      {interactions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune interaction enregistrée.</p>
      ) : (
        <ol className="space-y-3">
          {interactions.map((i) => {
            const Icon = TYPE_ICONS[i.type] ?? StickyNote;
            return (
              <li key={i.id} className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 rounded-lg border bg-card px-3 py-2 text-sm">
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{TYPE_LABELS[i.type] ?? i.type}</span>
                    <span>
                      {i.authorName} · {new Date(i.dateInteraction).toLocaleString("fr-FR")}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{i.contenu}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
