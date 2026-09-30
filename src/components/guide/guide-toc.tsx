"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { GUIDE_CHAPTERS } from "./guide-data";

/** Sommaire du guide — surligne le chapitre en cours de lecture. */
export function GuideToc() {
  const [active, setActive] = useState(GUIDE_CHAPTERS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    for (const { id } of GUIDE_CHAPTERS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Sommaire du guide" className="rounded-lg border bg-card p-3 lg:sticky lg:top-0 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:border-0 lg:bg-transparent lg:p-0">
      <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Sommaire</div>
      <ol className="grid gap-0.5 sm:grid-cols-2 lg:grid-cols-1">
        {GUIDE_CHAPTERS.map((chapter, i) => (
          <li key={chapter.id}>
            <a
              href={`#${chapter.id}`}
              className={cn(
                "flex gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-muted",
                active === chapter.id && "bg-sidebar text-sidebar-foreground hover:bg-sidebar"
              )}
            >
              <span className={cn("w-5 shrink-0 font-mono text-xs leading-5 text-muted-foreground", active === chapter.id && "text-sidebar-foreground/70")}>
                {String(i + 1).padStart(2, "0")}
              </span>
              {chapter.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
