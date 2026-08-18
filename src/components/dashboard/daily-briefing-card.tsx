import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sunrise } from "lucide-react";
import type { DailyBriefing } from "@/lib/daily-briefing";

const ITEMS: { key: keyof DailyBriefing; label: (n: number) => string; href: string }[] = [
  { key: "tachesPrioritaires", label: (n) => `${n} tâche(s) prioritaire(s)`, href: "/taches" },
  { key: "reunions", label: (n) => `${n} réunion(s) aujourd'hui`, href: "/calendrier" },
  { key: "projetsARisque", label: (n) => `${n} projet(s) à risque`, href: "/projets" },
  { key: "validationsEnAttente", label: (n) => `${n} validation(s) en attente`, href: "/demandes" },
  { key: "opportunitesARelancer", label: (n) => `${n} opportunité(s) CRM à relancer`, href: "/crm/pipeline" },
  { key: "decisionsATraiter", label: (n) => `${n} décision(s) à traiter`, href: "/gouvernance" },
];

// Briefing quotidien IA (cahier des charges V2.2 §30). "IA" = agregation
// automatique templee, pas un texte genere par LLM (aucune cle API
// disponible — choix explicite de differer la generation reelle, voir
// memoire projet). Formulation calquee sur l'exemple du cahier des charges.
export function DailyBriefingCard({ userName, briefing }: { userName: string | null | undefined; briefing: DailyBriefing }) {
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

  return (
    <Card accent="info">
      <CardHeader className="flex flex-row items-center gap-2">
        <Sunrise className="size-4 text-muted-foreground" />
        <CardTitle className="text-base">
          Bonjour {userName}, voici votre briefing du {today}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {ITEMS.map((item) => {
            const value = briefing[item.key];
            if (typeof value !== "number" || value === 0) return null;
            return (
              <li key={item.key}>
                <Link href={item.href} className="text-sm hover:underline">
                  {item.label(value)}
                </Link>
              </li>
            );
          })}
        </ul>
        {ITEMS.every((item) => (briefing[item.key] as number) === 0) && (
          <p className="text-sm text-muted-foreground">Rien à signaler aujourd&apos;hui.</p>
        )}
        {briefing.prioriteRecommandee && (
          <div className="pt-1">
            <Badge variant="info">Priorité recommandée</Badge>{" "}
            <Link href={briefing.prioriteRecommandee.href} className="text-sm font-medium hover:underline">
              {briefing.prioriteRecommandee.label}
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
