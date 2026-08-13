import Link from "next/link";

export type RoadmapProjectRow = {
  id: string;
  nom: string;
  statut: string;
  avancement: number;
  dateDebut: string | null;
  dateFin: string | null;
  departmentNom: string;
};

// Meme principe que TaskGanttView (couleurs de statut fixes, jamais
// recyclees comme couleur categorielle) mais avec la palette ProjectStatus
// (PLANIFIE/EN_COURS/EN_PAUSE/TERMINE/ANNULE) plutot que TaskStatus.
const STATUS_COLOR: Record<string, string> = {
  TERMINE: "#0ca30c",
  EN_COURS: "#2a78d6",
  EN_PAUSE: "#fab219",
  PLANIFIE: "#8994a0",
  ANNULE: "#8994a0",
};

const STATUS_LABELS: Record<string, string> = {
  PLANIFIE: "Planifié",
  EN_COURS: "En cours",
  EN_PAUSE: "En pause",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Vue Roadmap multi-projets : une barre par projet sur une échelle temporelle commune, avec repères mensuels et la date du jour. */
export function ProjectRoadmapView({ projects }: { projects: RoadmapProjectRow[] }) {
  const withDates = projects.filter((p) => p.dateDebut || p.dateFin);
  const withoutDates = projects.filter((p) => !p.dateDebut && !p.dateFin);

  if (withDates.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun projet avec une date pour construire la roadmap.</p>;
  }

  const now = new Date().getTime();
  const starts = withDates.map((p) => new Date(p.dateDebut ?? p.dateFin!).getTime());
  const ends = withDates.map((p) => new Date(p.dateFin ?? p.dateDebut!).getTime());
  const rangeStart = startOfMonth(new Date(Math.min(...starts, now))).getTime();
  const rangeEndRaw = Math.max(...ends, now) + DAY_MS * 15;
  const rangeEnd = startOfMonth(new Date(rangeEndRaw)).getTime() + DAY_MS * 31;
  const rangeSpan = Math.max(rangeEnd - rangeStart, DAY_MS);

  const months: { label: string; left: number }[] = [];
  const cursor = new Date(rangeStart);
  while (cursor.getTime() < rangeEnd) {
    months.push({
      label: cursor.toLocaleDateString("fr-FR", { month: "short", year: "numeric" }),
      left: ((cursor.getTime() - rangeStart) / rangeSpan) * 100,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const todayLeft = ((now - rangeStart) / rangeSpan) * 100;
  const sorted = [...withDates].sort(
    (a, b) => new Date(a.dateDebut ?? a.dateFin!).getTime() - new Date(b.dateDebut ?? b.dateFin!).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="relative mb-2 grid grid-cols-[220px_1fr] gap-2">
            <div />
            <div className="relative h-5 border-b text-xs text-muted-foreground">
              {months.map((m, i) => (
                <span key={i} className="absolute -translate-x-1/2" style={{ left: `${m.left}%` }}>
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            {sorted.map((project) => {
              const start = new Date(project.dateDebut ?? project.dateFin!).getTime();
              const end = Math.max(
                new Date(project.dateFin ?? project.dateDebut!).getTime(),
                start + DAY_MS
              );
              const left = ((start - rangeStart) / rangeSpan) * 100;
              const width = Math.max(((end - start) / rangeSpan) * 100, 0.8);
              const color = STATUS_COLOR[project.statut] ?? STATUS_COLOR.PLANIFIE;

              return (
                <Link
                  key={project.id}
                  href={`/projets/${project.id}`}
                  className="grid grid-cols-[220px_1fr] items-center gap-2 rounded-md py-1 text-sm hover:bg-muted"
                  title={`${project.nom} — ${STATUS_LABELS[project.statut] ?? project.statut} — ${project.avancement}%`}
                >
                  <span className="truncate">
                    {project.nom}
                    <span className="ml-1.5 text-xs text-muted-foreground">{project.departmentNom}</span>
                  </span>
                  <div className="relative h-5 rounded bg-muted/60">
                    {todayLeft >= 0 && todayLeft <= 100 && (
                      <div
                        className="absolute top-0 h-full w-px bg-foreground/30"
                        style={{ left: `${todayLeft}%` }}
                      />
                    )}
                    <div
                      className="absolute top-0.5 h-4 rounded-full"
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        backgroundColor: `${color}33`,
                        border: `1px solid ${color}`,
                      }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${project.avancement}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {withoutDates.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {withoutDates.length} projet(s) sans date de début ni de fin, non représentés ci-dessus.
        </p>
      )}
    </div>
  );
}
