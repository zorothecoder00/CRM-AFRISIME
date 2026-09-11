import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { AdminTabs } from "@/components/administration/admin-tabs";
import { OrganizationProfileForm } from "@/components/administration/organization-profile-form";

export default async function OrganizationProfilePage() {
  const session = await getAppSession();
  if (!session!.user.permissions.includes(PERMISSIONS.ADMINISTRATION_ACCESS)) {
    redirect("/dashboard");
  }

  // Un profil par organisation (revue de robustesse 2026-09-11) — repli sur
  // l'ancien id fixe pour une session pas encore rattachée à une
  // organisation, voir organization-profile.actions.ts.
  const profile = session!.user.organizationId
    ? await prisma.organizationProfile.findUnique({ where: { organizationId: session!.user.organizationId } })
    : await prisma.organizationProfile.findUnique({ where: { id: "org-profile" } });

  return (
    <div className="space-y-6">
      <AdminTabs />
      <div>
        <h1 className="text-2xl font-semibold">Profil de l&apos;organisation</h1>
        <p className="text-sm text-muted-foreground">
          Identité globale de l&apos;organisation (cahier des charges §I).
        </p>
      </div>

      <OrganizationProfileForm
        initial={{
          nom: profile?.nom ?? "Mon organisation",
          logoUrl: profile?.logoUrl ?? null,
          description: profile?.description ?? null,
          vision: profile?.vision ?? null,
          mission: profile?.mission ?? null,
          valeurs: profile?.valeurs ?? null,
          siteWeb: profile?.siteWeb ?? null,
          devise: profile?.devise ?? "FCFA",
        }}
      />
    </div>
  );
}
