import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Sunrise,
  ListChecks,
  CalendarClock,
  TriangleAlert,
  CheckCircle2,
  HandCoins,
  Scale,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import type { DailyBriefing } from "@/lib/daily-briefing";

const ITEMS: {
  key: keyof DailyBriefing;
  label: (n: number) => string;
  href: string;
  icon: LucideIcon;
  tone: string;
}[] = [
  { key: "tachesPrioritaires", label: (n) => `${n} tâche(s) prioritaire(s)`, href: "/taches", icon: ListChecks, tone: "text-primary bg-primary/10" },
  { key: "reunions", label: (n) => `${n} réunion(s) aujourd'hui`, href: "/calendrier", icon: CalendarClock, tone: "text-info bg-info/10" },
  { key: "projetsARisque", label: (n) => `${n} projet(s) à risque`, href: "/projets", icon: TriangleAlert, tone: "text-destructive bg-destructive/10" },
  { key: "validationsEnAttente", label: (n) => `${n} validation(s) en attente`, href: "/demandes", icon: CheckCircle2, tone: "text-warning bg-warning/10" },
  { key: "opportunitesARelancer", label: (n) => `${n} opportunité(s) CRM à relancer`, href: "/crm/pipeline", icon: HandCoins, tone: "text-success bg-success/10" },
  { key: "decisionsATraiter", label: (n) => `${n} décision(s) à traiter`, href: "/gouvernance", icon: Scale, tone: "text-teal-600 bg-teal-500/10 dark:text-teal-400" },
  { key: "messagesNonLus", label: (n) => `${n} message(s) non lu(s)`, href: "/messages", icon: MessageSquare, tone: "text-violet-600 bg-violet-500/10 dark:text-violet-400" },
];

// Briefing quotidien IA (cahier des charges V2.2 §30, "Votre journée"
// V3.0 §50). "IA" = agregation automatique templee, pas un texte genere par
// LLM (aucune cle API disponible — choix explicite de differer la
// generation reelle, voir memoire projet). Formulation calquee sur
// l'exemple du cahier des charges (priorités/réunions/validation/risque/
// messages/décision).
//
// Demande utilisateur — le bloc etait un simple bandeau avec une liste a
// puces plate, peu engageant ("design un peu"). Refonte en tuiles
// cliquables avec icone/couleur par categorie + priorite recommandee mise
// en avant en tete.
export function DailyBriefingCard({ userName, briefing }: { userName: string | null | undefined; briefing: DailyBriefing }) {
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const visibleItems = ITEMS.filter((item) => (briefing[item.key] as number) > 0);

  return (
    <Card accent="info" className="overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-info/10 text-info">
          <Sunrise className="size-4" />
        </span>
        <CardTitle className="text-base">
          Bonjour {userName}, voici votre briefing du {today}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {briefing.prioriteRecommandee && (
          <Link
            href={briefing.prioriteRecommandee.href}
            className="group flex items-center gap-2 rounded-lg border border-info/30 bg-gradient-to-r from-info/10 to-transparent p-3 text-sm transition-colors hover:border-info/50 hover:from-info/15"
          >
            <Badge variant="info" className="shrink-0">
              Priorité recommandée
            </Badge>
            <span className="min-w-0 truncate font-medium group-hover:underline">{briefing.prioriteRecommandee.label}</span>
          </Link>
        )}

        {visibleItems.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {visibleItems.map((item) => {
              const value = briefing[item.key] as number;
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="group flex items-center gap-2.5 rounded-lg border bg-card p-2.5 text-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-muted/50 hover:shadow-md"
                >
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md transition-transform group-hover:scale-110", item.tone)}>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className="block text-base font-semibold">{value}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.label(value).replace(`${value} `, "")}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Rien à signaler aujourd&apos;hui.</p>
        )}
      </CardContent>
    </Card>
  );
}
