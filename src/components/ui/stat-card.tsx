import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatCardTone = "default" | "info" | "success" | "warning" | "danger";

// Teintes de statut fixes (jamais recolorees par le theme) : issues de la
// palette validee CVD de la skill dataviz, distinctes des couleurs
// categorielles du projet. Toujours associees a une icone + un libelle
// (jamais la couleur seule) pour rester lisibles.
const TONE_STYLES: Record<StatCardTone, string> = {
  default: "bg-muted text-muted-foreground",
  info: "bg-[#2a78d6]/10 text-[#2a78d6] dark:bg-[#3987e5]/15 dark:text-[#3987e5]",
  success: "bg-[#0ca30c]/10 text-[#0ca30c] dark:bg-[#0ca30c]/20",
  warning: "bg-[#fab219]/15 text-[#fab219]",
  danger: "bg-[#d03b3b]/10 text-[#d03b3b] dark:bg-[#d03b3b]/20",
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
      <CardContent className="flex items-center gap-4">
        {Icon && (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              TONE_STYLES[tone]
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold">{value}</div>
          {description && <div className="text-xs text-muted-foreground">{description}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
