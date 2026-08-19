import { prisma } from "@/lib/prisma";
import { OrgDesignEditor } from "@/components/org-designer/org-design-editor";

export default async function NouveauBrouillonOrgPage() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nouveau brouillon organisationnel</h1>
        <p className="text-sm text-muted-foreground">
          Ex. Direction Afrique de l&apos;Ouest → Togo → Bénin → Côte d&apos;Ivoire, puis équipes, responsables,
          compétences, projets et processus par niveau.
        </p>
      </div>
      <OrgDesignEditor users={users.map((u) => ({ id: u.id, label: u.name }))} />
    </div>
  );
}
