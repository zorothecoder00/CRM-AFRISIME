import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PROJECT_STUDIO_CATALOG, catalogTotals, type CatalogSection } from "@/lib/project-studio-catalog";
import { Sparkles, ArrowRight, MapPin } from "lucide-react";

/**
 * Panorama de tout ce qu'a livré le cahier des charges "Project Studio"
 * (§1-68) — page globale, indépendante d'un projet précis, pensée pour la
 * direction : "qu'est-ce qui a changé et où le trouver", pas un outil de
 * gestion projet de plus.
 */
export default function ProjectStudioPage() {
  const { total, livrees, enAttente } = catalogTotals();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-primary/10 p-2">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Project Studio</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Panorama de toutes les fonctionnalités apportées par le cahier des charges Project Studio — de
              l&apos;idée de projet à la capitalisation, en passant par la planification, le budget, les risques,
              le suivi-évaluation et la clôture.
            </p>
          </div>
        </div>
        <Link href="/projets">
          <span className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted">
            Ouvrir un projet
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardContent className="px-(--card-spacing)">
            <div className="text-2xl font-semibold tabular-nums">{total}</div>
            <div className="text-xs text-muted-foreground">Sections du cahier des charges</div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="px-(--card-spacing)">
            <div className="text-2xl font-semibold tabular-nums text-success">{livrees}</div>
            <div className="text-xs text-muted-foreground">Livrées et disponibles dans l&apos;application</div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="px-(--card-spacing)">
            <div className="text-2xl font-semibold tabular-nums text-warning">{enAttente}</div>
            <div className="text-xs text-muted-foreground">En attente (assistants IA — clé API non configurée)</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {PROJECT_STUDIO_CATALOG.map((categorie) => (
          <Card key={categorie.nom}>
            <CardHeader>
              <CardTitle className="text-base">{categorie.nom}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {categorie.sections.map((section) => (
                <SectionRow key={section.numero} section={section} />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SectionRow({ section }: { section: CatalogSection }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 rounded-md border bg-muted/30 p-2.5">
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="mt-0.5 shrink-0 rounded-full bg-background px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
          §{section.numero}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium">{section.titre}</span>
            <Badge variant={section.statut === "livre" ? "success" : "warning"}>
              {section.statut === "livre" ? "Livré" : "En attente"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{section.resume}</p>
        </div>
      </div>
      <div className="shrink-0">
        <LocationBadge location={section.location} />
      </div>
    </div>
  );
}

function LocationBadge({ location }: { location: CatalogSection["location"] }) {
  if (location.type === "concept") {
    return <Badge variant="outline">Note de cadrage</Badge>;
  }
  if (location.type === "page") {
    return (
      <Link href={location.href}>
        <span className="inline-flex items-center gap-1 rounded-4xl border px-2 py-0.5 text-xs font-medium text-primary hover:bg-muted">
          <MapPin className="h-3 w-3" />
          {location.label}
        </span>
      </Link>
    );
  }
  return (
    <Badge variant="outline">
      <MapPin className="h-3 w-3" />
      Onglet « {location.label} »
    </Badge>
  );
}
