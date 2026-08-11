import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { RoleKey } from "../src/generated/prisma/enums";
import { PERMISSION_CATALOG, DEFAULT_ROLE_PERMISSIONS } from "../src/lib/permissions";

/**
 * Crée le tout premier compte (Super Admin), indépendamment de
 * prisma/seed.ts qui génère en plus un jeu de données de démo. Ne
 * touche à aucune donnée métier — uniquement le catalogue de rôles/
 * permissions (indispensable au fonctionnement de l'appli, y compris
 * au formulaire "Nouvel utilisateur" de /administration/utilisateurs)
 * et le compte demandé.
 *
 * Usage :
 *   DATABASE_URL="<url-prod>" ADMIN_NAME="..." ADMIN_EMAIL="..." ADMIN_PASSWORD="..." \
 *     npm run create-admin
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
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error(
      "ADMIN_NAME, ADMIN_EMAIL et ADMIN_PASSWORD sont requis (variables d'environnement)."
    );
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD doit contenir au moins 8 caractères.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Un compte existe déjà pour ${email} — rien à faire.`);
    return;
  }

  console.log("Mise en place du catalogue de rôles et permissions...");
  for (const perm of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { label: perm.label, category: perm.category },
      create: { key: perm.key, label: perm.label, category: perm.category },
    });
  }

  let superAdminRoleId: string | null = null;
  for (const roleKey of Object.values(RoleKey)) {
    const role = await prisma.role.upsert({
      where: { key: roleKey },
      update: { label: ROLE_LABELS[roleKey] },
      create: { key: roleKey, label: ROLE_LABELS[roleKey] },
    });
    if (roleKey === RoleKey.SUPER_ADMIN) superAdminRoleId = role.id;

    const permissionKeys = DEFAULT_ROLE_PERMISSIONS[roleKey] ?? [];
    for (const permKey of permissionKeys) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { key: permKey } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }
  if (!superAdminRoleId) throw new Error("Rôle SUPER_ADMIN introuvable après upsert.");

  console.log(`Création du compte ${email}...`);
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, passwordHash, roleId: superAdminRoleId },
  });

  console.log(`Compte Super Admin créé : ${email}. Connectez-vous via /login.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
