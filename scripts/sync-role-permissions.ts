import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { RoleKey } from "../src/generated/prisma/enums";
import { PERMISSION_CATALOG, DEFAULT_ROLE_PERMISSIONS } from "../src/lib/permissions";

/**
 * Synchronise UNIQUEMENT le catalogue Permission/Role/RolePermission avec
 * src/lib/permissions.ts — aucune donnée métier (users, projet démo, etc.)
 * n'est touchée, contrairement à prisma/seed.ts. Additif seulement (upsert
 * avec update: {} sur RolePermission) : ne retire jamais un droit déjà
 * accordé manuellement depuis /administration/roles.
 *
 * Usage :
 *   DATABASE_URL="<url>" npm run sync-role-permissions
 */

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Administrateur",
  DIRECTEUR_GENERAL: "Directeur Général",
  DIRECTEUR: "Directeur",
  CHEF_DEPARTEMENT: "Chef de Département",
  CHEF_PROJET: "Chef de Projet",
  RESPONSABLE: "Responsable",
  MANAGER: "Manager",
  COLLABORATEUR: "Collaborateur",
  CONSULTANT_EXTERNE: "Consultant externe",
  PRESTATAIRE: "Prestataire",
  INVITE: "Invité",
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Synchronisation Permission/Role/RolePermission...");

  for (const perm of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { label: perm.label, category: perm.category },
      create: { key: perm.key, label: perm.label, category: perm.category },
    });
  }

  for (const roleKey of Object.values(RoleKey)) {
    const role = await prisma.role.upsert({
      where: { key: roleKey },
      update: { label: ROLE_LABELS[roleKey] },
      create: { key: roleKey, label: ROLE_LABELS[roleKey] },
    });

    const permissionKeys = DEFAULT_ROLE_PERMISSIONS[roleKey] ?? [];
    for (const permKey of permissionKeys) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { key: permKey } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
    console.log(`  ${roleKey}: ${permissionKeys.length} permission(s) attendues en base`);
  }

  console.log("Synchronisation terminée.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
