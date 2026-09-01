import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BackLink } from "@/components/ui/back-link";
import { PersonalPlanningCrosslinks } from "@/components/personal-planning/personal-planning-crosslinks";
import { CalendarSearch } from "lucide-react";

type StatutDemande = "EN_ATTENTE" | "ACCEPTEE" | "REFUSEE" | "ANNULEE";

const STATUS_TONE: Record<StatutDemande, "secondary" | "success" | "destructive" | "outline"> = {
  EN_ATTENTE: "secondary",
  ACCEPTEE: "success",
  REFUSEE: "destructive",
  ANNULEE: "outline",
};

const STATUS_LABEL: Record<StatutDemande, string> = {
  EN_ATTENTE: "En attente",
  ACCEPTEE: "Acceptée",
  REFUSEE: "Refusée",
  ANNULEE: "Annulée",
};

function formatRange(dateDebut: Date, dateFin: Date) {
  const opts: Intl.DateTimeFormatOptions = { dateStyle: "short", timeStyle: "short" };
  return `${dateDebut.toLocaleString("fr-FR", opts)} → ${dateFin.toLocaleString("fr-FR", opts)}`;
}

/**
 * Historique complet des demandes de créneau (§ Demander un créneau) — les
 * cartes "Demandes reçues"/"Demandes envoyées" sur /planning-personnel ne
 * montrent qu'un aperçu limité pour ne pas allonger la page ; cette page
 * rend l'historique complet consultable, sans limite, avec filtres.
 */
export default async function PersonalPlanningDemandesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; du?: string; au?: string; statut?: string }>;
}) {
  const { type: typeParam, du, au, statut } = await searchParams;
  const type = typeParam === "envoyees" ? "envoyees" : "recues";
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const where: Prisma.AvailabilityRequestWhereInput =
    type === "recues" ? { targetUserId: userId } : { requestedById: userId };
  if (du || au) {
    where.dateDebut = { ...(du ? { gte: new Date(du) } : {}), ...(au ? { lte: new Date(au) } : {}) };
  }
  if (statut) {
    where.statut = statut as StatutDemande;
  }

  const requests = await prisma.availabilityRequest.findMany({
    where,
    include: { requestedBy: { select: { name: true } }, targetUser: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const hasFilters = !!du || !!au || !!statut;
  const baseHref = `/planning-personnel/demandes?type=${type}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackLink href="/planning-personnel" label="Retour à mon planning personnel" />
      <PersonalPlanningCrosslinks current="/planning-personnel" />

      <div className="flex items-center gap-2">
        <CalendarSearch className="size-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Historique de mes demandes de créneau</h1>
          <p className="text-sm text-muted-foreground">{requests.length} demande(s).</p>
        </div>
      </div>

      <div className="flex rounded-md border w-fit">
        <Link href="/planning-personnel/demandes?type=recues">
          <Button variant={type === "recues" ? "default" : "ghost"} size="sm" className="rounded-r-none">
            Reçues
          </Button>
        </Link>
        <Link href="/planning-personnel/demandes?type=envoyees">
          <Button variant={type === "envoyees" ? "default" : "ghost"} size="sm" className="rounded-l-none">
            Envoyées
          </Button>
        </Link>
      </div>

      <form className="flex flex-wrap items-end gap-2" action={baseHref.split("?")[0]}>
        <input type="hidden" name="type" value={type} />
        <Input name="du" type="date" defaultValue={du} className="w-auto" />
        <Input name="au" type="date" defaultValue={au} className="w-auto" />
        <Select name="statut" defaultValue={statut}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tous statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EN_ATTENTE">En attente</SelectItem>
            <SelectItem value="ACCEPTEE">Acceptée</SelectItem>
            <SelectItem value="REFUSEE">Refusée</SelectItem>
            <SelectItem value="ANNULEE">Annulée</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" variant="outline">
          Filtrer
        </Button>
        {hasFilters && (
          <Link href={baseHref}>
            <Button type="button" variant="ghost">
              Réinitialiser
            </Button>
          </Link>
        )}
      </form>

      <div className="space-y-3">
        {requests.map((r) => (
          <Card key={r.id}>
            <CardContent className="space-y-1 py-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{r.titre}</p>
                  <p className="text-xs text-muted-foreground">
                    {type === "recues" ? `De ${r.requestedBy.name}` : `À ${r.targetUser.name}`} · {formatRange(r.dateDebut, r.dateFin)}
                  </p>
                </div>
                <Badge variant={STATUS_TONE[r.statut]}>{STATUS_LABEL[r.statut]}</Badge>
              </div>
              {r.message && <p className="text-xs text-muted-foreground">{r.message}</p>}
              {r.statut === "REFUSEE" && r.motifRefus && (
                <p className="text-xs text-muted-foreground">Motif du refus : {r.motifRefus}</p>
              )}
            </CardContent>
          </Card>
        ))}
        {requests.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucune demande {hasFilters ? "pour ces filtres" : type === "recues" ? "reçue" : "envoyée"}.
          </p>
        )}
      </div>
    </div>
  );
}
