import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BackLink } from "@/components/ui/back-link";
import { PersonalPlanningCrosslinks } from "@/components/personal-planning/personal-planning-crosslinks";
import { ChevronRight, Moon } from "lucide-react";

/**
 * §22 — Historique des bilans de fin de journée : la carte "Bilan de ma
 * journée" sur /planning-personnel n'a jamais montré que le jour courant,
 * alors que chaque jour est bien conservé en base (PersonalPlanningDailyReview,
 * une ligne par date). Cette page rend ce passé consultable.
 */
export default async function PersonalPlanningBilansPage({
  searchParams,
}: {
  searchParams: Promise<{ du?: string; au?: string }>;
}) {
  const { du, au } = await searchParams;
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const where: Prisma.PersonalPlanningDailyReviewWhereInput = {
    userId,
    notes: { not: null },
  };
  if (du || au) {
    where.date = {
      ...(du ? { gte: new Date(du) } : {}),
      ...(au ? { lte: new Date(au) } : {}),
    };
  }

  const reviews = await prisma.personalPlanningDailyReview.findMany({
    where,
    orderBy: { date: "desc" },
  });

  const hasFilters = !!du || !!au;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackLink href="/planning-personnel" label="Retour à mon planning personnel" />
      <PersonalPlanningCrosslinks current="/planning-personnel/bilans" />

      <div className="flex items-center gap-2">
        <Moon className="size-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Historique de mes bilans</h1>
          <p className="text-sm text-muted-foreground">
            {reviews.length} bilan(s) avec notes — strictement personnel, visible de vous seul(e).
          </p>
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-2" action="/planning-personnel/bilans">
        <Input name="du" type="date" defaultValue={du} className="w-auto" />
        <Input name="au" type="date" defaultValue={au} className="w-auto" />
        <Button type="submit" variant="outline">
          Filtrer
        </Button>
        {hasFilters && (
          <Link href="/planning-personnel/bilans">
            <Button type="button" variant="ghost">
              Réinitialiser
            </Button>
          </Link>
        )}
      </form>

      <div className="space-y-3">
        {reviews.map((r) => (
          <Card key={r.id}>
            <CardContent className="space-y-2 py-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium capitalize">{format(r.date, "EEEE d MMMM yyyy", { locale: fr })}</p>
                <Link
                  href={`/planning-personnel?vue=jour&semaine=${format(r.date, "yyyy-MM-dd")}`}
                  className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                >
                  Voir ce jour
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{r.notes}</p>
            </CardContent>
          </Card>
        ))}
        {reviews.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucun bilan {hasFilters ? "pour cette période" : "enregistré pour le moment"}.
          </p>
        )}
      </div>
    </div>
  );
}
