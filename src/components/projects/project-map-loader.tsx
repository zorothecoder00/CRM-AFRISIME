"use client";

import dynamic from "next/dynamic";

// Leaflet touche `window` des l'initialisation de la carte : le rendu cote
// serveur doit etre desactive. `ssr: false` n'est autorise que depuis un
// Client Component, d'ou cet intermediaire (project-map.tsx reste importable
// normalement partout ailleurs si besoin).
export const ProjectMapLoader = dynamic(
  () => import("@/components/projects/project-map").then((m) => m.ProjectMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[560px] w-full items-center justify-center rounded-md border text-sm text-muted-foreground">
        Chargement de la carte...
      </div>
    ),
  }
);
