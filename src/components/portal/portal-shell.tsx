import type { ReactNode } from "react";
import { PortalHeader } from "@/components/portal/portal-header";
import { PortalNav } from "@/components/portal/portal-nav";
import type { PortalNavVisibility } from "@/lib/portal-nav-visibility";

/** Coquille commune (header + nav + conteneur) partagée par toutes les pages du portail. */
export function PortalShell({
  name,
  email,
  label,
  visibility,
  children,
  maxWidthClassName = "max-w-4xl",
}: {
  name: string;
  email: string;
  label: string;
  visibility: PortalNavVisibility;
  children: ReactNode;
  maxWidthClassName?: string;
}) {
  return (
    <div className="min-h-screen bg-muted/20">
      <PortalHeader name={name} email={email} label={label} />
      <PortalNav visibility={visibility} />
      <main className={`mx-auto space-y-6 p-4 sm:p-6 ${maxWidthClassName}`}>{children}</main>
    </div>
  );
}
