import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { withTenantScope } from "@/lib/tenant-scoped-prisma";

/**
 * Multi-tenant Phase 3 — preuve de concept RLS, contre une VRAIE base (pas de
 * mock, conformément à la règle du projet), avec un VRAI rôle Postgres non-
 * propriétaire (seul moyen de tester une politique RLS pour de vrai — voir
 * tenant-scoped-prisma.ts). Prérequis local, une seule fois :
 *
 *   npx tsx scripts/setup-local-rls-test-role.ts
 *
 * Séparé des tests rapides (*.test.ts) sous *.integration.test.ts, exclu du
 * `npm test` par défaut (voir vitest.config.mts) — lancé via
 * `npm run test:integration`.
 */

const TENANT_ROLE_CONNECTION_STRING =
  "postgresql://afriflow_tenant_scoped:afriflow_tenant_scoped_local_test_only@localhost:5432/afriflow?schema=public";

const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

let orgA: { id: string };
let orgB: { id: string };
let userA: { id: string };
let userB: { id: string };
let deptA: { id: string };
let deptB: { id: string };
let adminUser: { id: string };
let roleId: string;

describe("RLS — isolation User/Department par organisation", () => {
  beforeAll(async () => {
    // Fixtures créées via le role admin (proprietaire, exempte de RLS) — un
    // role/utilisateur "arbitraire" existant sert de createdBy/roleId.
    adminUser = await admin.user.findFirstOrThrow({ select: { id: true } });
    const role = await admin.role.findFirstOrThrow({ select: { id: true } });
    roleId = role.id;

    orgA = await admin.platformOrganization.create({
      data: { nom: "RLS Test Org A", slug: `rls-test-a-${Date.now()}`, createdById: adminUser.id },
    });
    orgB = await admin.platformOrganization.create({
      data: { nom: "RLS Test Org B", slug: `rls-test-b-${Date.now()}`, createdById: adminUser.id },
    });

    deptA = await admin.department.create({
      data: { name: "Dept A", code: `RLSA-${Date.now()}`, organizationId: orgA.id },
    });
    deptB = await admin.department.create({
      data: { name: "Dept B", code: `RLSB-${Date.now()}`, organizationId: orgB.id },
    });

    userA = await admin.user.create({
      data: {
        name: "User Org A",
        email: `rls-user-a-${Date.now()}@example.com`,
        passwordHash: "unused",
        roleId,
        organizationId: orgA.id,
      },
    });
    userB = await admin.user.create({
      data: {
        name: "User Org B",
        email: `rls-user-b-${Date.now()}@example.com`,
        passwordHash: "unused",
        roleId,
        organizationId: orgB.id,
      },
    });
  });

  afterAll(async () => {
    // Nettoyage via le role admin (le role restreint ne peut de toute facon
    // pas voir/supprimer les lignes hors de son organisation).
    await admin.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    await admin.department.deleteMany({ where: { id: { in: [deptA.id, deptB.id] } } });
    await admin.platformOrganization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
    await admin.$disconnect();
  });

  it("un role non-proprietaire scope a l'organisation A ne voit que les lignes de A", async () => {
    const users = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.user.findMany({ where: { id: { in: [userA.id, userB.id] } } })
    );
    expect(users.map((u) => u.id)).toEqual([userA.id]);
  });

  it("un role non-proprietaire scope a l'organisation B ne voit que les lignes de B", async () => {
    const depts = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.department.findMany({ where: { id: { in: [deptA.id, deptB.id] } } })
    );
    expect(depts.map((d) => d.id)).toEqual([deptB.id]);
  });

  it("sans app.current_org_id defini, le role non-proprietaire ne voit AUCUNE ligne (deny-by-default)", async () => {
    const adapter = new PrismaPg({ connectionString: TENANT_ROLE_CONNECTION_STRING });
    const client = new PrismaClient({ adapter });
    try {
      const users = await client.user.findMany({ where: { id: { in: [userA.id, userB.id] } } });
      expect(users).toHaveLength(0);
    } finally {
      await client.$disconnect();
    }
  });

  it("le role non-proprietaire ne peut pas modifier une ligne hors de son organisation (WITH CHECK)", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.user.update({ where: { id: userB.id }, data: { name: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("le role proprietaire (admin) voit toujours toutes les lignes, RLS ou pas", async () => {
    const users = await admin.user.findMany({ where: { id: { in: [userA.id, userB.id] } } });
    expect(users.map((u) => u.id).sort()).toEqual([userA.id, userB.id].sort());
  });
});
