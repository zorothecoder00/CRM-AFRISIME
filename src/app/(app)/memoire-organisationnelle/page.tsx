import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { searchOrganizationalMemory } from "@/lib/organizational-memory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MemorySearch } from "@/components/memory/memory-search";
import { MemoryEntryFormDialog } from "@/components/memory/memory-entry-form-dialog";

// Organizational Memory + AI Memory Organisationnelle (cahier des charges
// V3.0 §17-18) — "l'organisation ne perd plus facilement son intelligence
// lorsqu'une personne quitte l'entreprise" : archive consultable des
// décisions, projets, procédures, transformations, connaissances et
// recommandations déjà enregistrées dans l'app, plus les entrées manuelles
// (succès/échecs/expériences) sans entité dédiée.
export default async function OrganizationalMemoryPage() {
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.MEMORY_MANAGE);

  const recentResults = await searchOrganizationalMemory();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Mémoire organisationnelle</h1>
          <p className="text-sm text-muted-foreground">
            Décisions, projets, procédures, transformations, connaissances et recommandations passées — l&apos;archive
            institutionnelle de l&apos;organisation.
          </p>
        </div>
        {canManage && <MemoryEntryFormDialog />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rechercher dans les archives</CardTitle>
        </CardHeader>
        <CardContent>
          <MemorySearch initialResults={recentResults} />
        </CardContent>
      </Card>
    </div>
  );
}
