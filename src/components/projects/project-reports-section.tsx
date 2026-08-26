import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FORMATS: { format: string; label: string }[] = [
  { format: "pdf", label: "PDF" },
  { format: "excel", label: "Excel" },
  { format: "word", label: "Word" },
  { format: "presentation", label: "Présentation" },
];

/** Rapports du projet (cahier des charges Project Studio §63) — la charte de projet, déjà disponible dans le générateur central (/rapports), ciblée sur ce projet. */
export function ProjectReportsSection({ projectId }: { projectId: string }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Rapports générés à partir des données de ce projet.</p>
      <div className="rounded-md border p-3">
        <div className="mb-2">
          <div className="text-sm font-medium">Charte de projet</div>
          <p className="text-xs text-muted-foreground">
            Synthèse complète : objectifs, périmètre, budget, équipe, jalons, risques.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FORMATS.map(({ format, label }) => (
            <a
              key={format}
              href={`/api/rapports/CHARTE_PROJET?format=${format}&targetId=${projectId}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {label}
            </a>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        D&apos;autres rapports (risques, RACI, avancement...) sont disponibles dans le{" "}
        <Link href="/rapports" className="text-primary hover:underline">
          générateur central de rapports
        </Link>
        .
      </p>
    </div>
  );
}
