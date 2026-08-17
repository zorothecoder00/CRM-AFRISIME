import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { BenchmarkComparisonTable } from "@/components/benchmarking/benchmark-comparison-table";
import {
  benchmarkProjects,
  benchmarkTeams,
  benchmarkEntities,
  benchmarkPeriods,
  type BenchmarkColumn,
} from "@/lib/benchmarking";

const AXES = [
  { key: "temps", label: "Dans le temps" },
  { key: "equipes", label: "Entre équipes" },
  { key: "entites", label: "Entre entités" },
  { key: "projets", label: "Entre projets" },
] as const;

type Axe = (typeof AXES)[number]["key"];

export default async function BenchmarkingPage({
  searchParams,
}: {
  searchParams: Promise<{
    axe?: string;
    ids?: string | string[];
    p1Start?: string;
    p1End?: string;
    p2Start?: string;
    p2End?: string;
  }>;
}) {
  const sp = await searchParams;
  const axe: Axe = AXES.some((a) => a.key === sp.axe) ? (sp.axe as Axe) : "projets";
  const selectedIds = sp.ids ? (Array.isArray(sp.ids) ? sp.ids : [sp.ids]) : [];

  await getServerSession(authOptions);

  let columns: BenchmarkColumn[] = [];
  let candidates: { id: string; label: string }[] = [];

  if (axe === "projets") {
    const projects = await prisma.project.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } });
    candidates = projects.map((p) => ({ id: p.id, label: p.nom }));
    if (selectedIds.length >= 2) columns = await benchmarkProjects(selectedIds);
  } else if (axe === "equipes") {
    const teams = await prisma.team.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } });
    candidates = teams.map((t) => ({ id: t.id, label: t.nom }));
    if (selectedIds.length >= 2) columns = await benchmarkTeams(selectedIds);
  } else if (axe === "entites") {
    const entities = await prisma.entity.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } });
    candidates = entities.map((e) => ({ id: e.id, label: e.nom }));
    if (selectedIds.length >= 2) columns = await benchmarkEntities(selectedIds);
  } else if (axe === "temps") {
    if (sp.p1Start && sp.p1End && sp.p2Start && sp.p2End) {
      columns = await benchmarkPeriods([
        { label: `${sp.p1Start} → ${sp.p1End}`, start: sp.p1Start, end: sp.p1End },
        { label: `${sp.p2Start} → ${sp.p2End}`, start: sp.p2Start, end: sp.p2End },
      ]);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Benchmarking</h1>
        <p className="text-sm text-muted-foreground">
          Comparaison des performances dans le temps, entre équipes, entre entités et entre projets.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-md border p-1">
        {AXES.map((a) => (
          <Link key={a.key} href={`/benchmarking?axe=${a.key}`}>
            <Button variant={axe === a.key ? "default" : "ghost"} size="sm">
              {a.label}
            </Button>
          </Link>
        ))}
      </div>

      {axe === "temps" ? (
        <form method="get" className="space-y-4 rounded-md border p-4">
          <input type="hidden" name="axe" value="temps" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Période 1</Label>
              <div className="flex items-center gap-2">
                <Input type="date" name="p1Start" defaultValue={sp.p1Start} required />
                <span className="text-sm text-muted-foreground">à</span>
                <Input type="date" name="p1End" defaultValue={sp.p1End} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Période 2</Label>
              <div className="flex items-center gap-2">
                <Input type="date" name="p2Start" defaultValue={sp.p2Start} required />
                <span className="text-sm text-muted-foreground">à</span>
                <Input type="date" name="p2End" defaultValue={sp.p2End} required />
              </div>
            </div>
          </div>
          <Button type="submit" size="sm">
            Comparer
          </Button>
        </form>
      ) : (
        <form method="get" className="space-y-3 rounded-md border p-4">
          <input type="hidden" name="axe" value={axe} />
          <p className="text-sm text-muted-foreground">Choisissez au moins deux éléments à comparer.</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {candidates.map((c) => (
              <label key={c.id} className={cn("flex items-center gap-2 rounded-md border p-2 text-sm")}>
                <Checkbox name="ids" value={c.id} defaultChecked={selectedIds.includes(c.id)} />
                {c.label}
              </label>
            ))}
          </div>
          {candidates.length === 0 && <p className="text-sm text-muted-foreground">Aucun élément disponible.</p>}
          <Button type="submit" size="sm">
            Comparer
          </Button>
        </form>
      )}

      <BenchmarkComparisonTable columns={columns} />
    </div>
  );
}
