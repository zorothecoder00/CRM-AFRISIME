import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { ProjectTemplatesLibrary, type ProjectTemplateRow } from "@/components/projects/project-templates-library";

/** Bibliothèque de modèles de projet (cahier des charges Project Studio §60). */
export default async function ProjectTemplatesPage() {
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.PROJECT_CREATE);

  const templates = await prisma.projectTemplate.findMany({
    include: { phases: { orderBy: { ordre: "asc" } } },
    orderBy: { nom: "asc" },
  });

  const templateRows: ProjectTemplateRow[] = templates.map((t) => ({
    id: t.id,
    nom: t.nom,
    categorie: t.categorie,
    description: t.description,
    phases: t.phases.map((p) => ({ id: p.id, nom: p.nom, type: p.type, description: p.description, ordre: p.ordre })),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Modèles de projet</h1>
          <p className="text-sm text-muted-foreground">{templates.length} modèle(s)</p>
        </div>
        <Link href="/projets">
          <Button variant="outline" size="sm">
            Retour aux projets
          </Button>
        </Link>
      </div>

      <ProjectTemplatesLibrary templates={templateRows} canManage={canManage} />
    </div>
  );
}
