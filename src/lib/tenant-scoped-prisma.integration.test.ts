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
let teamA: { id: string };
let teamB: { id: string };
let projectA: { id: string };
let projectB: { id: string };
let taskA: { id: string };
let taskB: { id: string };
let sectionA: { id: string };
let sectionB: { id: string };
let docA: { id: string };
let docB: { id: string };
let meetingA: { id: string };
let meetingB: { id: string };
let folderA: { id: string };
let folderB: { id: string };
let adminUser: { id: string };
let roleId: string;

describe("RLS — isolation User/Department/Team/Project/Task/ProjectSection/Document/Meeting/DocumentFolder par organisation", () => {
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

    teamA = await admin.team.create({
      data: { nom: "Team A", departmentId: deptA.id, createdById: userA.id, organizationId: orgA.id },
    });
    teamB = await admin.team.create({
      data: { nom: "Team B", departmentId: deptB.id, createdById: userB.id, organizationId: orgB.id },
    });

    projectA = await admin.project.create({
      data: {
        nom: "Project A",
        departmentId: deptA.id,
        responsableId: userA.id,
        createdById: userA.id,
        organizationId: orgA.id,
      },
    });
    projectB = await admin.project.create({
      data: {
        nom: "Project B",
        departmentId: deptB.id,
        responsableId: userB.id,
        createdById: userB.id,
        organizationId: orgB.id,
      },
    });

    taskA = await admin.task.create({
      data: {
        titre: "Task A",
        projectId: projectA.id,
        responsablePrincipalId: userA.id,
        createdById: userA.id,
        organizationId: orgA.id,
      },
    });
    taskB = await admin.task.create({
      data: {
        titre: "Task B",
        projectId: projectB.id,
        responsablePrincipalId: userB.id,
        createdById: userB.id,
        organizationId: orgB.id,
      },
    });

    sectionA = await admin.projectSection.create({
      data: { projectId: projectA.id, type: "PHASE", nom: "Section A", organizationId: orgA.id },
    });
    sectionB = await admin.projectSection.create({
      data: { projectId: projectB.id, type: "PHASE", nom: "Section B", organizationId: orgB.id },
    });

    docA = await admin.document.create({
      data: {
        projectId: projectA.id,
        nom: "Doc A",
        url: "https://example.com/doc-a",
        uploadedById: userA.id,
        organizationId: orgA.id,
      },
    });
    docB = await admin.document.create({
      data: {
        projectId: projectB.id,
        nom: "Doc B",
        url: "https://example.com/doc-b",
        uploadedById: userB.id,
        organizationId: orgB.id,
      },
    });

    meetingA = await admin.meeting.create({
      data: {
        projectId: projectA.id,
        titre: "Reunion A",
        dateHeure: new Date(),
        createdById: userA.id,
        organizationId: orgA.id,
      },
    });
    meetingB = await admin.meeting.create({
      data: {
        projectId: projectB.id,
        titre: "Reunion B",
        dateHeure: new Date(),
        createdById: userB.id,
        organizationId: orgB.id,
      },
    });

    folderA = await admin.documentFolder.create({
      data: {
        projectId: projectA.id,
        nom: "Dossier A",
        createdById: userA.id,
        organizationId: orgA.id,
      },
    });
    folderB = await admin.documentFolder.create({
      data: {
        projectId: projectB.id,
        nom: "Dossier B",
        createdById: userB.id,
        organizationId: orgB.id,
      },
    });
  });

  afterAll(async () => {
    // Nettoyage via le role admin (le role restreint ne peut de toute facon
    // pas voir/supprimer les lignes hors de son organisation). Ordre inverse
    // des FK : Meeting/DocumentFolder/Document/Task/ProjectSection
    // referencent Project+User, Project/Team referencent User+Department,
    // qui referencent PlatformOrganization.
    await admin.meeting.deleteMany({ where: { id: { in: [meetingA.id, meetingB.id] } } });
    await admin.documentFolder.deleteMany({ where: { id: { in: [folderA.id, folderB.id] } } });
    await admin.document.deleteMany({ where: { id: { in: [docA.id, docB.id] } } });
    await admin.projectSection.deleteMany({ where: { id: { in: [sectionA.id, sectionB.id] } } });
    await admin.task.deleteMany({ where: { id: { in: [taskA.id, taskB.id] } } });
    await admin.project.deleteMany({ where: { id: { in: [projectA.id, projectB.id] } } });
    await admin.team.deleteMany({ where: { id: { in: [teamA.id, teamB.id] } } });
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

  it("Team : un role scope a l'organisation A ne voit que les equipes de A", async () => {
    const teams = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.team.findMany({ where: { id: { in: [teamA.id, teamB.id] } } })
    );
    expect(teams.map((t) => t.id)).toEqual([teamA.id]);
  });

  it("Project : un role scope a l'organisation B ne voit que les projets de B", async () => {
    const projects = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.project.findMany({ where: { id: { in: [projectA.id, projectB.id] } } })
    );
    expect(projects.map((p) => p.id)).toEqual([projectB.id]);
  });

  it("Project : le role non-proprietaire ne peut pas modifier un projet hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.project.update({ where: { id: projectB.id }, data: { nom: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("Task : un role scope a l'organisation A ne voit que les taches de A", async () => {
    const tasks = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.task.findMany({ where: { id: { in: [taskA.id, taskB.id] } } })
    );
    expect(tasks.map((t) => t.id)).toEqual([taskA.id]);
  });

  it("Task : le role non-proprietaire ne peut pas modifier une tache hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.task.update({ where: { id: taskB.id }, data: { titre: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("ProjectSection : un role scope a l'organisation A ne voit que les sections de A", async () => {
    const sections = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.projectSection.findMany({ where: { id: { in: [sectionA.id, sectionB.id] } } })
    );
    expect(sections.map((s) => s.id)).toEqual([sectionA.id]);
  });

  it("Document : un role scope a l'organisation B ne voit que les documents de B", async () => {
    const docs = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.document.findMany({ where: { id: { in: [docA.id, docB.id] } } })
    );
    expect(docs.map((d) => d.id)).toEqual([docB.id]);
  });

  it("Document : le role non-proprietaire ne peut pas modifier un document hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.document.update({ where: { id: docB.id }, data: { nom: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("Meeting : un role scope a l'organisation A ne voit que les reunions de A", async () => {
    const meetings = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
      tx.meeting.findMany({ where: { id: { in: [meetingA.id, meetingB.id] } } })
    );
    expect(meetings.map((m) => m.id)).toEqual([meetingA.id]);
  });

  it("Meeting : le role non-proprietaire ne peut pas modifier une reunion hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.meeting.update({ where: { id: meetingB.id }, data: { titre: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });

  it("DocumentFolder : un role scope a l'organisation B ne voit que les dossiers de B", async () => {
    const folders = await withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgB.id, (tx) =>
      tx.documentFolder.findMany({ where: { id: { in: [folderA.id, folderB.id] } } })
    );
    expect(folders.map((f) => f.id)).toEqual([folderB.id]);
  });

  it("DocumentFolder : le role non-proprietaire ne peut pas modifier un dossier hors de son organisation", async () => {
    await expect(
      withTenantScope(TENANT_ROLE_CONNECTION_STRING, orgA.id, (tx) =>
        tx.documentFolder.update({ where: { id: folderB.id }, data: { nom: "Tentative depuis A" } })
      )
    ).rejects.toThrow();
  });
});
