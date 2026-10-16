"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { findNavLocation } from "./nav-config";

/**
 * Fil d'Ariane au-dessus du titre de page (convention Jira : « Espaces /
 * CRM / Pipeline »). Deduit de nav-config — une page de detail
 * (/crm/contacts/123) affiche le module parent comme dernier lien cliquable.
 */
export function Breadcrumbs() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const location = findNavLocation(pathname);
  if (!location) return null;

  const isDetail = pathname !== location.item.href;
  const title = t(`items.${location.item.titleKey}`);

  return (
    <nav aria-label="Fil d'Ariane" className="mb-3 flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
      {location.groupKey && (
        <>
          <span className="truncate">{t(`groups.${location.groupKey}`)}</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </>
      )}
      {isDetail ? (
        <Link href={location.item.href} className="truncate hover:text-foreground hover:underline">
          {title}
        </Link>
      ) : (
        <span aria-current="page" className="truncate">
          {title}
        </span>
      )}
    </nav>
  );
}
