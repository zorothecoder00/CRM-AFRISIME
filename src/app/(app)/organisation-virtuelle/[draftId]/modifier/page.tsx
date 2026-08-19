import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { OrgDesignNode } from "@/lib/org-designer";
import { OrgDesignEditor } from "@/components/org-designer/org-design-editor";

export default async function ModifierBrouillonOrgPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const [draft, users] = await Promise.all([
    prisma.orgDesignDraft.findUnique({ where: { id: draftId } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!draft || draft.statut === "DEPLOYE") notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Modifier le brouillon</h1>
      </div>
      <OrgDesignEditor
        draftId={draft.id}
        initialNom={draft.nom}
        initialDescription={draft.description ?? ""}
        initialStructure={draft.structure as unknown as OrgDesignNode}
        users={users.map((u) => ({ id: u.id, label: u.name }))}
      />
    </div>
  );
}
