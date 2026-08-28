import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export type PersonalPlanningDashboardStats = {
  aujourdHui: number;
  enRetard: number;
  aVenir: number;
  reunions: number;
  chargePercent: number;
};

/**
 * §5 « Tableau de bord "Mon Planning" » : en-tête personnalisé + 5
 * indicateurs (Aujourd'hui/En retard/À venir/Réunions/Charge), en haut de
 * la page principale — distinct du bloc "Ma journée" (§6, groupé par
 * priorité, plus bas sur la page). Chaque indicateur est un lien vers la
 * vue correspondante, avec une infobulle expliquant ce qu'il compte — les
 * chiffres portent sur l'ensemble du planning, pas juste la période
 * affichée par la grille (voir enRetardCount/aVenirCount côté page).
 */
export function PersonalPlanningDashboardHeader({
  userName,
  today,
  stats,
}: {
  userName: string;
  today: Date;
  stats: PersonalPlanningDashboardStats;
}) {
  const dateLabel = today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <div>
          <p className="text-lg font-semibold">Bonjour {userName} 👋</p>
          <p className="text-sm capitalize text-muted-foreground">{dateLabel}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat
            label="Aujourd'hui"
            value={stats.aujourdHui}
            href="/planning-personnel?vue=jour"
            explanation="Vos activités personnelles prévues aujourd'hui (hors réunions, comptées à part). Cliquez pour ouvrir la vue Jour."
          />
          <Stat
            label="En retard"
            value={stats.enRetard}
            tone={stats.enRetard > 0 ? "text-destructive" : undefined}
            href="/planning-personnel?vue=liste&enRetard=1"
            explanation="Toutes vos activités (pas seulement aujourd'hui) dont l'heure de fin est déjà passée et qui ne sont ni terminées ni annulées. Cliquez pour voir la liste complète."
          />
          <Stat
            label="À venir"
            value={stats.aVenir}
            href="/planning-personnel?vue=liste&aVenir=1"
            explanation="Toutes vos activités actives dont le début est dans le futur — un cumul global, pas limité à la semaine affichée. Cliquez pour voir la liste complète."
          />
          <Stat
            label="Réunions"
            value={stats.reunions}
            href="/planning-personnel?vue=jour&type=REUNION"
            explanation="Vos réunions d'aujourd'hui où vous êtes participant. Cliquez pour les voir isolées sur la vue Jour."
          />
          <Stat
            label="Charge"
            value={`${stats.chargePercent} %`}
            tone={stats.chargePercent > 100 ? "text-destructive" : undefined}
            href="/ma-journee"
            explanation="Taux d'occupation de votre journée : somme des durées de vos activités d'aujourd'hui ÷ votre capacité du jour. Au-delà de 100 %, c'est une surcharge. Cliquez pour voir le détail et les options de réorganisation."
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
  href,
  explanation,
}: {
  label: string;
  value: string | number;
  tone?: string;
  href: string;
  explanation: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={href} className="block rounded-md border p-2 text-center transition-colors hover:bg-muted/50">
          <div className={`text-xl font-semibold ${tone ?? ""}`}>{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </Link>
      </TooltipTrigger>
      <TooltipContent>{explanation}</TooltipContent>
    </Tooltip>
  );
}
