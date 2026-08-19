import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { AdminTabs } from "@/components/administration/admin-tabs";
import { ExchangeRateFormDialog } from "@/components/administration/exchange-rate-form-dialog";
import { DeleteExchangeRateButton } from "@/components/administration/delete-exchange-rate-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * Taux de change (revue applicative du 2026-08-19, point faible "pas de
 * moteur de conversion de change") — aucune clé API de taux en direct
 * disponible dans cette instance, taux maintenus manuellement ici comme le
 * ferait une équipe finance sans flux temps réel. Consommé par
 * src/lib/exchange-rates.ts, utilisé pour convertir les totaux budgétaires
 * consolidés multi-entités (src/lib/consolidation.ts) qui, sans ça,
 * additionnaient des montants dans des devises différentes sous une
 * étiquette unique.
 */
export default async function DevisesPage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.ENTITY_MANAGE)) {
    redirect("/dashboard");
  }

  const rates = await prisma.exchangeRate.findMany({
    include: { updatedBy: { select: { name: true } } },
    orderBy: [{ fromDevise: "asc" }, { toDevise: "asc" }],
  });

  return (
    <div className="space-y-6">
      <AdminTabs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Devises &amp; taux de change</h1>
          <p className="text-sm text-muted-foreground">
            Taux saisis manuellement, utilisés pour convertir les totaux consolidés entre entités qui opèrent dans
            des devises différentes.
          </p>
        </div>
        <ExchangeRateFormDialog />
      </div>

      {rates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun taux enregistré. Tant qu&apos;une paire de devises n&apos;a pas de taux, les montants dans cette
          devise ne sont pas convertis dans les totaux consolidés (affichés bruts, avec un avertissement).
        </p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Taux enregistrés ({rates.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>De</TableHead>
                  <TableHead>Vers</TableHead>
                  <TableHead>Taux</TableHead>
                  <TableHead>Mis à jour par</TableHead>
                  <TableHead>Le</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.fromDevise}</TableCell>
                    <TableCell className="font-medium">{r.toDevise}</TableCell>
                    <TableCell>
                      1 {r.fromDevise} = {Number(r.taux)} {r.toDevise}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.updatedBy.name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.updatedAt.toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell>
                      <DeleteExchangeRateButton id={r.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
