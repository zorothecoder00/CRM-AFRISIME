import type { ReactNode } from "react";
import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { GUIDE_CHAPTERS } from "./guide-data";

/** Briques de mise en page du guide d'utilisation (/guide). */

export function Chapter({ id, intro, children }: { id: string; intro?: ReactNode; children: ReactNode }) {
  const index = GUIDE_CHAPTERS.findIndex((c) => c.id === id);
  const chapter = GUIDE_CHAPTERS[index];
  return (
    <section id={id} className="scroll-mt-4 space-y-5">
      <div className="space-y-1.5 border-b-2 border-foreground pb-3">
        <div className="font-mono text-xs uppercase tracking-wider text-primary">Chapitre {String(index + 1).padStart(2, "0")}</div>
        <h2 className="text-2xl font-bold text-balance sm:text-3xl">{chapter.title}</h2>
        {intro && <p className="max-w-3xl text-muted-foreground">{intro}</p>}
      </div>
      {children}
    </section>
  );
}

export function Panel({ title, children, className }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0 space-y-2.5 rounded-lg border bg-card p-4", className)}>
      {title && <h4 className="font-semibold">{title}</h4>}
      {children}
    </div>
  );
}

export function Grid({ cols = 2, children }: { cols?: 2 | 3; children: ReactNode }) {
  return <div className={cn("grid gap-4", cols === 2 ? "md:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3")}>{children}</div>;
}

export function Note({ title, tone = "warning", children }: { title: string; tone?: "warning" | "info"; children: ReactNode }) {
  return (
    <div
      className={cn(
        "max-w-4xl space-y-1 rounded-r-lg border-l-4 px-4 py-3 text-sm",
        tone === "warning" ? "border-warning bg-warning/10" : "border-info bg-info/10"
      )}
    >
      <div className="font-semibold">{title}</div>
      <div>{children}</div>
    </div>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return <div className="max-w-3xl space-y-3 leading-relaxed">{children}</div>;
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export type FlowStep = { title: string; text: ReactNode; kind?: "auto" | "ext" };

/** Parcours numéroté : étapes manuelles, automatiques (pointillés) ou externes. */
export function Flow({ steps }: { steps: FlowStep[] }) {
  return (
    <ol className="flex flex-wrap gap-2">
      {steps.map((step, i) => (
        <li
          key={step.title}
          className={cn(
            "min-w-0 flex-[1_1_170px] space-y-1 rounded-lg border bg-card p-3",
            step.kind === "auto" && "border-dashed bg-muted/50",
            step.kind === "ext" && "border-warning"
          )}
        >
          <div className={cn("font-mono text-xs text-primary", step.kind === "auto" && "text-violet-600 dark:text-violet-400")}>
            {i + 1}
            {step.kind === "auto" && " · automatique"}
            {step.kind === "ext" && " · côté externe"}
          </div>
          <div className="font-semibold">{step.title}</div>
          <div className="text-sm text-muted-foreground">{step.text}</div>
        </li>
      ))}
    </ol>
  );
}

/** Chaîne d'éléments reliés par une flèche (hiérarchie, statuts...). */
export function Chain({ items, separator = "→" }: { items: ReactNode[]; separator?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="text-muted-foreground">{separator}</span>}
          {typeof item === "string" ? <span className="rounded-md border bg-card px-2.5 py-0.5">{item}</span> : item}
        </Fragment>
      ))}
    </div>
  );
}

export function Tags({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className="rounded-md border bg-muted/60 px-2.5 py-0.5 text-sm">
          {item}
        </span>
      ))}
    </div>
  );
}

export function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

export function Callout({ n }: { n: number }) {
  return (
    <span className="inline-grid h-5 w-5 shrink-0 place-items-center rounded-full bg-warning font-mono text-[0.7rem] font-bold text-white">
      {n}
    </span>
  );
}
