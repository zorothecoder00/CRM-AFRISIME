import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Peuple la bibliothèque de modèles de projet (Project Studio §60) avec les
 * 7 exemples du cahier des charges — additif seulement (upsert par nom),
 * aucune donnée métier existante n'est touchée.
 *
 * Usage :
 *   DATABASE_URL="<url>" npm run seed-project-templates
 */

const TEMPLATES: {
  nom: string;
  categorie: string;
  description: string;
  phases: string[];
}[] = [
  {
    nom: "Modèle ONG",
    categorie: "ONG",
    description: "Structure type d'un projet associatif/ONG.",
    phases: ["Diagnostic & mobilisation", "Conception & planification", "Mise en œuvre", "Suivi-évaluation", "Clôture & capitalisation"],
  },
  {
    nom: "Modèle IT",
    categorie: "IT",
    description: "Structure type d'un projet informatique.",
    phases: ["Cadrage & spécifications", "Conception", "Développement", "Tests & recette", "Déploiement", "Stabilisation"],
  },
  {
    nom: "Modèle événement",
    categorie: "EVENEMENTIEL",
    description: "Structure type d'un projet événementiel.",
    phases: ["Conception & budget", "Logistique & prestataires", "Communication", "Jour J", "Bilan post-événement"],
  },
  {
    nom: "Modèle formation",
    categorie: "FORMATION",
    description: "Structure type d'un programme de formation.",
    phases: ["Analyse des besoins", "Conception pédagogique", "Recrutement des participants", "Déroulement des sessions", "Évaluation & certification"],
  },
  {
    nom: "Modèle agricole",
    categorie: "AGRICOLE",
    description: "Structure type d'un projet agricole.",
    phases: ["Étude de faisabilité", "Préparation des terrains/intrants", "Campagne agricole", "Récolte & post-récolte", "Commercialisation"],
  },
  {
    nom: "Modèle BTP",
    categorie: "BTP",
    description: "Structure type d'un projet de construction.",
    phases: ["Études & permis", "Appel d'offres", "Gros œuvre", "Second œuvre", "Réception & livraison"],
  },
  {
    nom: "Modèle donor-funded project",
    categorie: "DONOR_FUNDED",
    description: "Structure type d'un projet financé par un bailleur.",
    phases: ["Cadrage & convention de financement", "Mise en œuvre", "Rapportage bailleur", "Audit & conformité", "Clôture contractuelle"],
  },
];

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Peuplement de la bibliothèque de modèles de projet...");

  const admin = await prisma.user.findFirst({
    where: { role: { key: "SUPER_ADMIN" }, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (!admin) {
    throw new Error("Aucun SUPER_ADMIN actif trouvé — impossible d'attribuer createdById.");
  }

  for (const t of TEMPLATES) {
    const existing = await prisma.projectTemplate.findFirst({ where: { nom: t.nom } });
    if (existing) {
      console.log(`- "${t.nom}" existe déjà, ignoré.`);
      continue;
    }

    await prisma.projectTemplate.create({
      data: {
        nom: t.nom,
        categorie: t.categorie as never,
        description: t.description,
        createdById: admin.id,
        phases: {
          create: t.phases.map((nom, ordre) => ({ nom, type: "PHASE", ordre })),
        },
      },
    });
    console.log(`+ "${t.nom}" créé avec ${t.phases.length} phase(s).`);
  }

  console.log("Terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
