"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/administration/profil", label: "Profil" },
  { href: "/administration/utilisateurs", label: "Utilisateurs" },
  { href: "/administration/departements", label: "Départements" },
  { href: "/administration/entites", label: "Entités" },
  { href: "/administration/devises", label: "Devises" },
  { href: "/administration/organigramme", label: "Organigramme" },
  { href: "/administration/postes", label: "Postes" },
  { href: "/administration/equipes", label: "Équipes" },
  { href: "/administration/competences", label: "Compétences" },
  { href: "/administration/sites", label: "Sites" },
  { href: "/administration/delegations", label: "Délégations" },
  { href: "/administration/roles", label: "Rôles & permissions" },
  { href: "/administration/acces-avances", label: "Accès avancés" },
  { href: "/administration/workflows", label: "Circuits de validation" },
  { href: "/administration/securite", label: "Sécurité" },
  { href: "/administration/audit", label: "Audit" },
  { href: "/administration/integrations", label: "Intégrations" },
  { href: "/administration/api-keys", label: "Clés API" },
  { href: "/administration/donnees", label: "Sauvegarde & données" },
  { href: "/administration/plateforme", label: "Plateforme" },
];

// Position de defilement horizontal partagee entre les pages : AdminTabs est
// rendu par chaque page (pas par un layout commun), donc remonte a chaque
// navigation et repartait a scrollLeft = 0 — les derniers onglets (Clés API,
// Plateforme...) sortaient alors de l'ecran et il fallait re-defiler a chaque
// fois. Module-level (pas de stockage navigateur) : suffit pour la session.
let savedScrollLeft = 0;

export function AdminTabs() {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);

  // useLayoutEffect : repositionne avant l'affichage, sans saut visible.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollLeft = savedScrollLeft;
    // Si l'onglet actif reste hors champ (arrivee directe par URL...), on le
    // centre.
    const active = activeRef.current;
    if (active) {
      const left = active.offsetLeft - container.offsetLeft;
      const right = left + active.offsetWidth;
      if (left < container.scrollLeft || right > container.scrollLeft + container.clientWidth) {
        container.scrollLeft = left - (container.clientWidth - active.offsetWidth) / 2;
      }
    }
    savedScrollLeft = container.scrollLeft;
  }, [pathname]);

  return (
    <div
      ref={containerRef}
      onScroll={(e) => {
        savedScrollLeft = e.currentTarget.scrollLeft;
      }}
      className="flex gap-1 overflow-x-auto border-b"
    >
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          ref={pathname === tab.href ? activeRef : undefined}
          className={cn(
            "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
            pathname === tab.href
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
