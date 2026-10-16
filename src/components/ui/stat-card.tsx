import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatCardTone = "default" | "info" | "success" | "warning" | "danger";

// Teintes de statut fixes (jamais recolorees par le theme) : issues de la
// palette validee CVD de la skill dataviz, distinctes des couleurs
// categorielles du projet. Toujours associees a une icone + un libelle
// (jamais la couleur seule) pour rester lisibles.
const TONE_STYLES: Record<StatCardTone, string> = {
  default: "bg-secondary text-muted-foreground",
  info: "bg-[#e9f2ff] text-[#0c66e4] dark:bg-[#1c2b41] dark:text-[#579dff]",
  success: "bg-[#dcfff1] text-[#216e4e] dark:bg-[#1c3329] dark:text-[#4bce97]",
  warning: "bg-[#fff7d6] text-[#a54800] dark:bg-[#332e1b] dark:text-[#f5cd47]",
  danger: "bg-[#ffeceb] text-[#ae2e24] dark:bg-[#42221f] dark:text-[#f87168]",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  description,
  className,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: StatCardTone;
  description?: string;
  className?: string;
}) {
  return (
    <Card className={cn(className)}>
      <CardContent className="flex items-center gap-3">
        {Icon && (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
              TONE_STYLES[tone]
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate text-xs font-medium text-muted-foreground">{label}</div>
          <div className="text-xl font-semibold tabular-nums">{value}</div>
          {description && <div className="text-xs text-muted-foreground">{description}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
