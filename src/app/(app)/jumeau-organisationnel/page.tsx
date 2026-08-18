import Link from "next/link";
import { buildDigitalTwinSnapshot } from "@/lib/digital-twin";
import { resolveDependencyLabels } from "@/lib/dependencies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Users,
  FolderKanban,
  Boxes,
  Handshake,
  Landmark,
  TrendingUp,
} from "lucide-react";

const DEP_TYPE_LABELS: Record<string, string> = { BLOQUE: "bloque", LIE_A: "est lié à" };

function CategoryCard({
  icon: Icon,
  title,
  href,
  items,
}: {
  icon: React.ElementType;
  title: string;
  href: string;
  items: { label: string; value: number; warn?: boolean }[];
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50">
        <CardHeader className="flex flex-row items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
          {items.map((item) => (
            <div key={item.label} className="flex items-baseline gap-1.5">
              <span className={item.warn && item.value > 0 ? "font-semibold text-destructive" : "font-semibold"}>
                {item.value}
              </span>
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </Link>
  );
}

// Jumeau numerique organisationnel (cahier des charges V2.2 §26, elargi en
// V3.0 §4 — "fonctionnalite emblematique de la V3"). 7 categories reprenant
// exactement la structure du cahier V3 §4.1 (pas un graphe visuel — voir
// /graphe-organisationnel pour la representation navigable du §5).
export default async function DigitalTwinPage() {
  const snapshot = await buildDigitalTwinSnapshot();
  const labels = await resolveDependencyLabels(
    snapshot.liensInterDomaines.flatMap((l) => [
      { type: l.sourceType, id: l.sourceId },
      { type: l.targetType, id: l.targetId },
    ])
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Jumeau organisationnel</h1>
        <p className="text-sm text-muted-foreground">
          Représentation numérique dynamique de l&apos;organisation — organisation, capital humain, activités,
          ressources, relations, gouvernance, performance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CategoryCard icon={Building2} title="Organisation" href="/administration/organigramme" items={[
          { label: "groupe", value: snapshot.organisation.groupe },
          { label: "sociétés", value: snapshot.organisation.societes },
          { label: "filiales", value: snapshot.organisation.filiales },
          { label: "agences", value: snapshot.organisation.agences },
          { label: "directions", value: snapshot.organisation.directions },
          { label: "départements", value: snapshot.organisation.departements },
          { label: "services", value: snapshot.organisation.services },
          { label: "équipes", value: snapshot.organisation.equipes },
        ]} />

        <CategoryCard icon={Users} title="Capital humain" href="/administration/utilisateurs" items={[
          { label: "collaborateurs", value: snapshot.capitalHumain.collaborateurs },
          { label: "actifs", value: snapshot.capitalHumain.actifs },
          { label: "managers", value: snapshot.capitalHumain.managers },
          { label: "compétences", value: snapshot.capitalHumain.competences },
          { label: "en surcharge", value: snapshot.capitalHumain.enSurcharge, warn: true },
        ]} />

        <CategoryCard icon={FolderKanban} title="Activités" href="/projets" items={[
          { label: "projets", value: snapshot.activites.projets },
          { label: "programmes", value: snapshot.activites.programmes },
          { label: "tâches", value: snapshot.activites.taches },
          { label: "processus", value: snapshot.activites.processus },
          { label: "workflows", value: snapshot.activites.workflows },
        ]} />

        <CategoryCard icon={Boxes} title="Ressources" href="/projets" items={[
          { label: "matériel/logiciel", value: snapshot.ressources.materiellesEtLogicielles },
          { label: "budget total", value: snapshot.ressources.budgetTotal },
          { label: "RH disponibles", value: snapshot.ressources.ressourcesHumaines },
        ]} />

        <CategoryCard icon={Handshake} title="Relations" href="/crm/organisations" items={[
          { label: "clients", value: snapshot.relations.clients },
          { label: "partenaires", value: snapshot.relations.partenaires },
          { label: "fournisseurs", value: snapshot.relations.fournisseurs },
          { label: "institutions", value: snapshot.relations.institutions },
          { label: "investisseurs", value: snapshot.relations.investisseurs },
        ]} />

        <CategoryCard icon={Landmark} title="Gouvernance" href="/gouvernance" items={[
          { label: "instances", value: snapshot.gouvernance.instances },
          { label: "réunions", value: snapshot.gouvernance.reunions },
          { label: "décisions en cours", value: snapshot.gouvernance.decisions },
          { label: "responsabilités", value: snapshot.gouvernance.responsabilites },
        ]} />

        <CategoryCard icon={TrendingUp} title="Performance" href="/risques" items={[
          { label: "KPI", value: snapshot.performance.kpi },
          { label: "objectifs", value: snapshot.performance.objectifs },
          { label: "risques", value: snapshot.performance.risques, warn: true },
          { label: "incidents", value: snapshot.performance.incidents, warn: true },
          { label: "audits", value: snapshot.performance.audits },
        ]} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Liens inter-domaines</CardTitle>
          <p className="text-xs text-muted-foreground">
            Comment les composantes s&apos;influencent mutuellement — dépendances enregistrées entre entités de
            types différents (cartographie des dépendances, §13). Pour une exploration visuelle et navigable, voir
            le Graphe organisationnel (§5).
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {snapshot.liensInterDomaines.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun lien inter-domaines enregistré pour le moment.</p>
          )}
          {snapshot.liensInterDomaines.map((l, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline">{l.sourceType}</Badge>
              <span>{labels.get(`${l.sourceType}:${l.sourceId}`) ?? l.sourceId}</span>
              <span className="text-muted-foreground">{DEP_TYPE_LABELS[l.type] ?? l.type}</span>
              <Badge variant="outline">{l.targetType}</Badge>
              <span>{labels.get(`${l.targetType}:${l.targetId}`) ?? l.targetId}</span>
            </div>
          ))}
          <Link href="/dependances" className="text-xs text-primary hover:underline">
            Voir toutes les dépendances →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
