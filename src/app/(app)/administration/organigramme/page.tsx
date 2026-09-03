import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { AdminTabs } from "@/components/administration/admin-tabs";
import { OrgChart, type OrgChartNodeData } from "@/components/administration/org-chart-tree";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

/** Construit une forêt d'arbres a partir d'une liste plate {id, parentId}. */
function buildForest<T extends { id: string; parentId: string | null }>(
  items: T[],
  toNode: (item: T) => Omit<OrgChartNodeData, "children">
): OrgChartNodeData[] {
  const nodeById = new Map<string, OrgChartNodeData>();
  for (const item of items) {
    nodeById.set(item.id, { ...toNode(item), children: [] });
  }
  const roots: OrgChartNodeData[] = [];
  for (const item of items) {
    const node = nodeById.get(item.id)!;
    if (item.parentId && nodeById.has(item.parentId)) {
      nodeById.get(item.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export default async function OrganigrammePage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.ADMINISTRATION_ACCESS)) {
    redirect("/dashboard");
  }

  const [departments, users, sites] = await Promise.all([
    prisma.department.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      include: { role: true, site: true },
      orderBy: { name: "asc" },
    }),
    prisma.site.findMany({ orderBy: { nom: "asc" } }),
  ]);

  const departmentForest = buildForest(
    departments.map((d) => ({ id: d.id, parentId: d.parentId })),
    (d) => {
      const dept = departments.find((x) => x.id === d.id)!;
      return { id: dept.id, label: dept.name, sublabel: dept.code, badge: `${dept._count.users} collab.` };
    }
  );

  const userForest = buildForest(
    users.map((u) => ({ id: u.id, parentId: u.managerId })),
    (u) => {
      const user = users.find((x) => x.id === u.id)!;
      return { id: user.id, label: user.name, sublabel: user.role.label, badge: null };
    }
  );

  /** Répartition par site (§XVIII) — Site n'a pas de hiérarchie propre, donc un
   * simple groupement à 2 niveaux (site → collaborateurs), pas un arbre. */
  const usersBySite = new Map<string, typeof users>();
  for (const u of users) {
    const key = u.siteId ?? "__sans_site__";
    const list = usersBySite.get(key) ?? [];
    list.push(u);
    usersBySite.set(key, list);
  }
  const siteForest: OrgChartNodeData[] = [
    ...sites.map((s) => ({
      id: s.id,
      label: s.nom,
      sublabel: [s.ville, s.pays].filter(Boolean).join(", ") || null,
      badge: `${(usersBySite.get(s.id) ?? []).length} collab.`,
      children: (usersBySite.get(s.id) ?? []).map((u) => ({
        id: u.id,
        label: u.name,
        sublabel: u.role.label,
        badge: null,
        children: [] as OrgChartNodeData[],
      })),
    })),
    ...(usersBySite.has("__sans_site__")
      ? [
          {
            id: "__sans_site__",
            label: "Sans site",
            sublabel: null,
            badge: `${usersBySite.get("__sans_site__")!.length} collab.`,
            children: usersBySite.get("__sans_site__")!.map((u) => ({
              id: u.id,
              label: u.name,
              sublabel: u.role.label,
              badge: null,
              children: [] as OrgChartNodeData[],
            })),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <AdminTabs />
      <div>
        <h1 className="text-2xl font-semibold">Organigramme</h1>
        <p className="text-sm text-muted-foreground">
          Vue graphique (cahier des charges §I) — la vue « Départements » reste l&apos;écran de gestion (créer,
          renommer, rattacher).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Structure (départements)</CardTitle>
          <CardDescription>Direction Générale → Direction → Département → Service → Équipe.</CardDescription>
        </CardHeader>
        <CardContent>
          <OrgChart roots={departmentForest} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hiérarchie individuelle</CardTitle>
          <CardDescription>
            Rattachement manager de chaque collaborateur — indépendant du département (organisation matricielle).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrgChart roots={userForest} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Répartition par site</CardTitle>
          <CardDescription>Implantation géographique des collaborateurs actifs.</CardDescription>
        </CardHeader>
        <CardContent>
          <OrgChart roots={siteForest} />
        </CardContent>
      </Card>
    </div>
  );
}
