import Link from "next/link";
import { buildDigitalTwinSnapshot } from "@/lib/digital-twin";
import { resolveDependencyLabels } from "@/lib/dependencies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UsersRound,
  Building2,
  FolderKanban,
  GitBranch,
  Boxes,
  Target,
  ShieldAlert,
  Link2,
  Landmark,
} from "lucide-react";

const DEP_TYPE_LABELS: Record<string, string> = { BLOQUE: "bloque", LIE_A: "est lié à" };

function DomainCard({
  icon: Icon,
  title,
  href,
  children,
}: {
  icon: React.ElementType;
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50">
        <CardHeader className="flex flex-row items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">{children}</CardContent>
      </Card>
    </Link>
  );
}

// Jumeau numerique organisationnel (cahier des charges V2.2 §26) — vue de
// synthese domaine par domaine (choix explicite : pas un graphe visuel, voir
// §27 pour la version graphe). Objectif du cahier ("comprendre comment les
// composantes s'influencent mutuellement") rendu par la section "Liens
// inter-domaines" ci-dessous, qui reutilise le modele Dependency existant.
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
          Représentation numérique de l&apos;organisation — personnes, équipes, structures, projets, processus,
          ressources, objectifs, risques, relations, décisions.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DomainCard icon={Users} title="Personnes" href="/administration/utilisateurs">
          <p>{snapshot.personnes.total} personne(s)</p>
          <p>{snapshot.personnes.actifs} active(s)</p>
        </DomainCard>

        <DomainCard icon={UsersRound} title="Équipes" href="/administration/equipes">
          <p>{snapshot.equipes.total} équipe(s)</p>
        </DomainCard>

        <DomainCard icon={Building2} title="Structures" href="/administration/organigramme">
          <p>{snapshot.structures.departments} direction(s)/département(s)/service(s)</p>
          <p>{snapshot.structures.entities} entité(s) du groupe</p>
        </DomainCard>

        <DomainCard icon={FolderKanban} title="Projets" href="/projets">
          <p>{snapshot.projets.total} projet(s), {snapshot.projets.enCours} en cours</p>
          {snapshot.projets.critiques > 0 && (
            <Badge variant="destructive">{snapshot.projets.critiques} critique(s)</Badge>
          )}
        </DomainCard>

        <DomainCard icon={GitBranch} title="Processus" href="/processus">
          <p>{snapshot.processus.total} processus, {snapshot.processus.actifs} actif(s)</p>
        </DomainCard>

        <DomainCard icon={Boxes} title="Ressources" href="/projets">
          <p>{snapshot.ressources.total} ressource(s) projet</p>
        </DomainCard>

        <DomainCard icon={Target} title="Objectifs" href="/objectifs">
          <p>{snapshot.objectifs.total} objectif(s)</p>
          {snapshot.objectifs.enRetard > 0 && (
            <Badge variant="warning">{snapshot.objectifs.enRetard} en retard</Badge>
          )}
        </DomainCard>

        <DomainCard icon={ShieldAlert} title="Risques" href="/risques">
          <p>{snapshot.risques.total} risque(s)</p>
          {snapshot.risques.critiques > 0 && (
            <Badge variant="destructive">{snapshot.risques.critiques} critique(s)</Badge>
          )}
        </DomainCard>

        <DomainCard icon={Link2} title="Relations" href="/parties-prenantes">
          <p>{snapshot.relations.stakeholders} partie(s) prenante(s)</p>
          <p>{snapshot.relations.dependencies} lien(s) de dépendance</p>
        </DomainCard>

        <DomainCard icon={Landmark} title="Décisions" href="/gouvernance">
          <p>{snapshot.decisions.enAttente} décision(s) en cours</p>
        </DomainCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Liens inter-domaines</CardTitle>
          <p className="text-xs text-muted-foreground">
            Comment les composantes s&apos;influencent mutuellement — dépendances enregistrées entre entités de
            types différents (cartographie des dépendances, §13).
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
