import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  RoleKey,
  SectionType,
  SectionStatus,
  TaskStatus,
  TaskPriority,
} from "../src/generated/prisma/enums";
import {
  PERMISSION_CATALOG,
  DEFAULT_ROLE_PERMISSIONS,
} from "../src/lib/permissions";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

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

const DEMO_PASSWORD = "Password123!";

async function main() {
  console.log("Seed AfriFlow — démarrage...");

  // Départements
  const [directionGenerale, departementIT, departementCommercial] =
    await Promise.all([
      prisma.department.upsert({
        where: { code: "DG" },
        update: {},
        create: { name: "Direction Générale", code: "DG" },
      }),
      prisma.department.upsert({
        where: { code: "IT" },
        update: {},
        create: { name: "Département IT", code: "IT" },
      }),
      prisma.department.upsert({
        where: { code: "COM" },
        update: {},
        create: { name: "Département Commercial", code: "COM" },
      }),
      prisma.department.upsert({
        where: { code: "RH" },
        update: {},
        create: { name: "Département RH", code: "RH" },
      }),
    ]);

  // Permissions
  for (const perm of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { label: perm.label, category: perm.category },
      create: { key: perm.key, label: perm.label, category: perm.category },
    });
  }

  // Rôles + matrice de permissions
  const roles: Record<string, { id: string }> = {};
  for (const roleKey of Object.values(RoleKey)) {
    const role = await prisma.role.upsert({
      where: { key: roleKey },
      update: { label: ROLE_LABELS[roleKey] },
      create: { key: roleKey, label: ROLE_LABELS[roleKey] },
    });
    roles[roleKey] = role;

    const permissionKeys = DEFAULT_ROLE_PERMISSIONS[roleKey] ?? [];
    for (const permKey of permissionKeys) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { key: permKey },
      });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  // Utilisateurs démo
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const demoUsers = [
    { email: "admin@afriflow.local", name: "Aïcha Super Admin", roleKey: RoleKey.SUPER_ADMIN, departmentId: directionGenerale.id },
    { email: "dg@afriflow.local", name: "Koffi DG", roleKey: RoleKey.DIRECTEUR_GENERAL, departmentId: directionGenerale.id },
    { email: "chefprojet@afriflow.local", name: "Fatou Chef de Projet", roleKey: RoleKey.CHEF_PROJET, departmentId: departementIT.id },
    { email: "manager@afriflow.local", name: "Yao Manager", roleKey: RoleKey.MANAGER, departmentId: departementIT.id },
    { email: "collaborateur@afriflow.local", name: "Awa Collaboratrice", roleKey: RoleKey.COLLABORATEUR, departmentId: departementIT.id },
    { email: "invite@afriflow.local", name: "Jean Invité", roleKey: RoleKey.INVITE, departmentId: departementCommercial.id },
  ];

  const users: Record<string, { id: string }> = {};
  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        passwordHash,
        roleId: roles[u.roleKey].id,
        departmentId: u.departmentId,
      },
    });
    users[u.roleKey] = user;
  }

  // Projet démo
  const project = await prisma.project.upsert({
    where: { id: "demo-project-refonte-site" },
    update: {},
    create: {
      id: "demo-project-refonte-site",
      nom: "Refonte Site Web AfriSime",
      description: "Refonte complète du site institutionnel et de l'espace client.",
      objectif: "Améliorer l'image de marque et le taux de conversion en ligne.",
      responsableId: users[RoleKey.CHEF_PROJET].id,
      departmentId: departementIT.id,
      priorite: "HAUTE",
      statut: "EN_COURS",
      avancement: 35,
      dateDebut: new Date(),
      dateFin: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      createdById: users[RoleKey.CHEF_PROJET].id,
      members: {
        create: [
          { userId: users[RoleKey.CHEF_PROJET].id, roleOnProject: "CHEF_PROJET" },
          { userId: users[RoleKey.MANAGER].id, roleOnProject: "MEMBRE" },
          { userId: users[RoleKey.COLLABORATEUR].id, roleOnProject: "MEMBRE" },
        ],
      },
    },
  });

  const phaseConception = await prisma.projectSection.upsert({
    where: { id: "demo-section-conception" },
    update: {},
    create: {
      id: "demo-section-conception",
      projectId: project.id,
      type: SectionType.PHASE,
      nom: "Conception",
      statut: SectionStatus.TERMINE,
      responsableId: users[RoleKey.CHEF_PROJET].id,
      ordre: 1,
    },
  });

  const phaseDeveloppement = await prisma.projectSection.upsert({
    where: { id: "demo-section-developpement" },
    update: {},
    create: {
      id: "demo-section-developpement",
      projectId: project.id,
      type: SectionType.PHASE,
      nom: "Développement",
      statut: SectionStatus.EN_COURS,
      responsableId: users[RoleKey.MANAGER].id,
      ordre: 2,
    },
  });

  const lotFrontend = await prisma.projectSection.upsert({
    where: { id: "demo-section-lot-frontend" },
    update: {},
    create: {
      id: "demo-section-lot-frontend",
      projectId: project.id,
      parentId: phaseDeveloppement.id,
      type: SectionType.LOT,
      nom: "Lot Frontend",
      statut: SectionStatus.EN_COURS,
      responsableId: users[RoleKey.COLLABORATEUR].id,
      ordre: 1,
    },
  });

  const today = new Date();
  const daysFromNow = (n: number) => new Date(today.getTime() + n * 24 * 60 * 60 * 1000);

  const taskDefs = [
    { id: "demo-task-1", titre: "Rédiger le cahier des charges", sectionId: phaseConception.id, statut: TaskStatus.TERMINEE, echeance: daysFromNow(-10), assignee: RoleKey.CHEF_PROJET, tempsEstimeHeures: 8, tempsReelHeures: 10 },
    { id: "demo-task-2", titre: "Maquettes UI", sectionId: phaseConception.id, statut: TaskStatus.TERMINEE, echeance: daysFromNow(-3), assignee: RoleKey.COLLABORATEUR, tempsEstimeHeures: 12, tempsReelHeures: 14 },
    { id: "demo-task-3", titre: "Intégration page d'accueil", sectionId: lotFrontend.id, statut: TaskStatus.EN_COURS, echeance: daysFromNow(0), assignee: RoleKey.COLLABORATEUR, tempsEstimeHeures: 20 },
    { id: "demo-task-4", titre: "Intégration espace client", sectionId: lotFrontend.id, statut: TaskStatus.A_FAIRE, echeance: daysFromNow(2), assignee: RoleKey.COLLABORATEUR, tempsEstimeHeures: 16 },
    { id: "demo-task-5", titre: "API authentification", sectionId: phaseDeveloppement.id, statut: TaskStatus.EN_COURS, echeance: daysFromNow(-1), assignee: RoleKey.MANAGER, tempsEstimeHeures: 15 },
    { id: "demo-task-6", titre: "Tests de charge", sectionId: phaseDeveloppement.id, statut: TaskStatus.A_FAIRE, echeance: daysFromNow(5), assignee: RoleKey.MANAGER, tempsEstimeHeures: 10 },
    { id: "demo-task-7", titre: "Rédaction contenus", sectionId: phaseDeveloppement.id, statut: TaskStatus.BLOQUEE, echeance: daysFromNow(-5), assignee: RoleKey.COLLABORATEUR, tempsEstimeHeures: 8 },
    { id: "demo-task-8", titre: "Recette finale", sectionId: phaseDeveloppement.id, statut: TaskStatus.A_FAIRE, echeance: daysFromNow(6), assignee: RoleKey.CHEF_PROJET, tempsEstimeHeures: 6 },
  ];

  const tasks: Record<string, { id: string }> = {};
  for (const t of taskDefs) {
    const task = await prisma.task.upsert({
      where: { id: t.id },
      update: {
        statut: t.statut,
        echeance: t.echeance,
        tempsEstimeHeures: t.tempsEstimeHeures,
        tempsReelHeures: t.tempsReelHeures,
      },
      create: {
        id: t.id,
        projectId: project.id,
        sectionId: t.sectionId,
        titre: t.titre,
        priorite: TaskPriority.HAUTE,
        statut: t.statut,
        echeance: t.echeance,
        responsablePrincipalId: users[t.assignee].id,
        createdById: users[RoleKey.CHEF_PROJET].id,
        tempsEstimeHeures: t.tempsEstimeHeures,
        tempsReelHeures: t.tempsReelHeures,
      },
    });
    tasks[t.id] = task;
  }

  await prisma.checklistItem.createMany({
    skipDuplicates: true,
    data: [
      { id: "demo-checklist-1", taskId: tasks["demo-task-3"].id, label: "Header responsive", isDone: true, ordre: 1 },
      { id: "demo-checklist-2", taskId: tasks["demo-task-3"].id, label: "Section hero", isDone: false, ordre: 2 },
    ],
  });

  await prisma.taskComment.upsert({
    where: { id: "demo-comment-1" },
    update: {},
    create: {
      id: "demo-comment-1",
      taskId: tasks["demo-task-5"].id,
      authorId: users[RoleKey.CHEF_PROJET].id,
      content: "Merci de prioriser l'API d'authentification avant la fin de semaine.",
    },
  });

  await prisma.taskDependency.upsert({
    where: {
      taskId_dependsOnTaskId: {
        taskId: tasks["demo-task-4"].id,
        dependsOnTaskId: tasks["demo-task-3"].id,
      },
    },
    update: {},
    create: {
      taskId: tasks["demo-task-4"].id,
      dependsOnTaskId: tasks["demo-task-3"].id,
    },
  });

  // Réunion démo avec une décision qui génère automatiquement une tâche
  const meeting = await prisma.meeting.upsert({
    where: { id: "demo-meeting-1" },
    update: {},
    create: {
      id: "demo-meeting-1",
      projectId: project.id,
      titre: "Point d'avancement hebdomadaire",
      dateHeure: daysFromNow(-2),
      lieu: "Salle de réunion A / Teams",
      ordreDuJour: "1. Avancement du frontend\n2. Blocages contenus\n3. Prochaines échéances",
      compteRendu:
        "L'intégration de la page d'accueil avance bien. La rédaction des contenus est bloquée en attente de validation marketing.",
      statut: "TERMINEE",
      createdById: users[RoleKey.CHEF_PROJET].id,
      participants: {
        create: [
          { userId: users[RoleKey.CHEF_PROJET].id },
          { userId: users[RoleKey.MANAGER].id },
          { userId: users[RoleKey.COLLABORATEUR].id },
        ],
      },
    },
  });

  const decisionTask = await prisma.task.upsert({
    where: { id: "demo-task-from-decision" },
    update: { tempsEstimeHeures: 4 },
    create: {
      id: "demo-task-from-decision",
      projectId: project.id,
      titre: "Débloquer la validation marketing des contenus",
      statut: TaskStatus.A_FAIRE,
      priorite: TaskPriority.HAUTE,
      echeance: daysFromNow(3),
      responsablePrincipalId: users[RoleKey.CHEF_PROJET].id,
      createdById: users[RoleKey.CHEF_PROJET].id,
      tempsEstimeHeures: 4,
    },
  });

  await prisma.meetingDecision.upsert({
    where: { id: "demo-decision-1" },
    update: {},
    create: {
      id: "demo-decision-1",
      meetingId: meeting.id,
      description: "Débloquer la validation marketing des contenus",
      responsableId: users[RoleKey.CHEF_PROJET].id,
      echeance: daysFromNow(3),
      taskId: decisionTask.id,
    },
  });

  // Espace documentaire démo : un dossier avec sous-dossier, un document lié
  // à une tâche, un document lié à la réunion, un document à la racine.
  const folderContrats = await prisma.documentFolder.upsert({
    where: { id: "demo-folder-contenus" },
    update: {},
    create: {
      id: "demo-folder-contenus",
      projectId: project.id,
      nom: "Contenus & maquettes",
      createdById: users[RoleKey.CHEF_PROJET].id,
    },
  });

  const folderMaquettes = await prisma.documentFolder.upsert({
    where: { id: "demo-folder-maquettes-ui" },
    update: {},
    create: {
      id: "demo-folder-maquettes-ui",
      projectId: project.id,
      parentId: folderContrats.id,
      nom: "Maquettes UI",
      createdById: users[RoleKey.COLLABORATEUR].id,
    },
  });

  const docMaquette = await prisma.document.upsert({
    where: { id: "demo-document-maquette" },
    update: {},
    create: {
      id: "demo-document-maquette",
      projectId: project.id,
      folderId: folderMaquettes.id,
      taskId: tasks["demo-task-2"].id,
      nom: "Maquette page d'accueil v1",
      description: "Export Figma de la maquette validée en phase de conception.",
      url: "https://figma.com/file/demo-maquette-accueil",
      mimeType: "application/figma",
      uploadedById: users[RoleKey.COLLABORATEUR].id,
      versions: {
        create: [
          {
            url: "https://figma.com/file/demo-maquette-accueil",
            mimeType: "application/figma",
            createdById: users[RoleKey.COLLABORATEUR].id,
          },
        ],
      },
    },
  });

  await prisma.documentVersion.upsert({
    where: { id: "demo-version-maquette-2" },
    update: {},
    create: {
      id: "demo-version-maquette-2",
      documentId: docMaquette.id,
      url: "https://figma.com/file/demo-maquette-accueil-v2",
      note: "Ajout de la version mobile après retours du Chef de Projet.",
      createdById: users[RoleKey.COLLABORATEUR].id,
    },
  });

  await prisma.document.update({
    where: { id: docMaquette.id },
    data: { url: "https://figma.com/file/demo-maquette-accueil-v2" },
  });

  await prisma.document.upsert({
    where: { id: "demo-document-compte-rendu" },
    update: {},
    create: {
      id: "demo-document-compte-rendu",
      projectId: project.id,
      meetingId: meeting.id,
      nom: "Support de présentation du point hebdo",
      url: "https://docs.example.com/demo-support-reunion.pdf",
      mimeType: "application/pdf",
      uploadedById: users[RoleKey.CHEF_PROJET].id,
      versions: {
        create: [
          {
            url: "https://docs.example.com/demo-support-reunion.pdf",
            mimeType: "application/pdf",
            createdById: users[RoleKey.CHEF_PROJET].id,
          },
        ],
      },
    },
  });

  await prisma.document.upsert({
    where: { id: "demo-document-cahier-des-charges" },
    update: {},
    create: {
      id: "demo-document-cahier-des-charges",
      projectId: project.id,
      nom: "Cahier des charges - Refonte site web",
      description: "Document de référence du projet, à la racine de l'espace documentaire.",
      url: "https://docs.example.com/demo-cahier-des-charges.pdf",
      mimeType: "application/pdf",
      uploadedById: users[RoleKey.CHEF_PROJET].id,
      versions: {
        create: [
          {
            url: "https://docs.example.com/demo-cahier-des-charges.pdf",
            mimeType: "application/pdf",
            createdById: users[RoleKey.CHEF_PROJET].id,
          },
        ],
      },
    },
  });

  // Congés démo : une demande en attente, une déjà approuvée
  await prisma.leave.upsert({
    where: { id: "demo-leave-pending" },
    update: {},
    create: {
      id: "demo-leave-pending",
      userId: users[RoleKey.COLLABORATEUR].id,
      type: "CONGE_PAYE",
      dateDebut: daysFromNow(10),
      dateFin: daysFromNow(14),
      motif: "Congés familiaux",
      statut: "EN_ATTENTE",
    },
  });

  await prisma.leave.upsert({
    where: { id: "demo-leave-approved" },
    update: {},
    create: {
      id: "demo-leave-approved",
      userId: users[RoleKey.MANAGER].id,
      type: "MALADIE",
      dateDebut: daysFromNow(-6),
      dateFin: daysFromNow(-4),
      statut: "APPROUVE",
      decidedById: users[RoleKey.CHEF_PROJET].id,
    },
  });

  // Événements démo : un événement d'entreprise, un événement de projet
  await prisma.event.upsert({
    where: { id: "demo-event-entreprise" },
    update: {},
    create: {
      id: "demo-event-entreprise",
      titre: "Journée portes ouvertes AfriSime",
      description: "Événement d'entreprise, visible de tous.",
      dateDebut: daysFromNow(8),
      createdById: users[RoleKey.DIRECTEUR_GENERAL].id,
    },
  });

  await prisma.event.upsert({
    where: { id: "demo-event-projet" },
    update: {},
    create: {
      id: "demo-event-projet",
      titre: "Lancement officiel du site",
      projectId: project.id,
      dateDebut: daysFromNow(15),
      dateFin: daysFromNow(16),
      createdById: users[RoleKey.CHEF_PROJET].id,
    },
  });

  // Objectifs & KPI démo : individuel, équipe (projet), département
  const objectiveIndividuel = await prisma.objective.upsert({
    where: { id: "demo-objective-individuel" },
    update: {},
    create: {
      id: "demo-objective-individuel",
      titre: "Monter en compétence sur l'intégration frontend",
      periode: "TRIMESTRIEL",
      scope: "INDIVIDUEL",
      userId: users[RoleKey.COLLABORATEUR].id,
      dateDebut: daysFromNow(-30),
      dateFin: daysFromNow(60),
      createdById: users[RoleKey.CHEF_PROJET].id,
    },
  });

  await prisma.indicator.upsert({
    where: { id: "demo-indicator-individuel-1" },
    update: {},
    create: {
      id: "demo-indicator-individuel-1",
      objectiveId: objectiveIndividuel.id,
      nom: "Pages intégrées de manière autonome",
      unite: "pages",
      valeurCible: 10,
      valeurActuelle: 4,
    },
  });

  const objectiveEquipe = await prisma.objective.upsert({
    where: { id: "demo-objective-equipe" },
    update: {},
    create: {
      id: "demo-objective-equipe",
      titre: "Livrer la refonte du site dans les délais",
      periode: "TRIMESTRIEL",
      scope: "EQUIPE",
      projectId: project.id,
      dateDebut: daysFromNow(-30),
      dateFin: daysFromNow(60),
      createdById: users[RoleKey.CHEF_PROJET].id,
    },
  });

  await prisma.indicator.upsert({
    where: { id: "demo-indicator-equipe-1" },
    update: {},
    create: {
      id: "demo-indicator-equipe-1",
      objectiveId: objectiveEquipe.id,
      nom: "Avancement du projet",
      unite: "%",
      valeurCible: 100,
      valeurActuelle: 35,
    },
  });

  await prisma.indicator.upsert({
    where: { id: "demo-indicator-equipe-2" },
    update: {},
    create: {
      id: "demo-indicator-equipe-2",
      objectiveId: objectiveEquipe.id,
      nom: "Tâches terminées",
      unite: "tâches",
      valeurCible: 8,
      valeurActuelle: 2,
    },
  });

  const objectiveDepartement = await prisma.objective.upsert({
    where: { id: "demo-objective-departement" },
    update: {},
    create: {
      id: "demo-objective-departement",
      titre: "Réduire le taux de retard des projets IT",
      periode: "ANNUEL",
      scope: "DEPARTEMENT",
      departmentId: departementIT.id,
      dateDebut: daysFromNow(-90),
      dateFin: daysFromNow(270),
      createdById: users[RoleKey.DIRECTEUR_GENERAL].id,
    },
  });

  await prisma.indicator.upsert({
    where: { id: "demo-indicator-departement-1" },
    update: {},
    create: {
      id: "demo-indicator-departement-1",
      objectiveId: objectiveDepartement.id,
      nom: "Taux de respect des délais",
      unite: "%",
      valeurCible: 90,
      valeurActuelle: 62,
    },
  });

  // Messagerie démo : une conversation directe et un message avec mention
  const conversation = await prisma.conversation.upsert({
    where: { id: "demo-conversation-1" },
    update: {},
    create: {
      id: "demo-conversation-1",
      isGroup: false,
      createdById: users[RoleKey.CHEF_PROJET].id,
      participants: {
        create: [
          { userId: users[RoleKey.CHEF_PROJET].id },
          { userId: users[RoleKey.COLLABORATEUR].id },
        ],
      },
    },
  });

  const demoMessage = await prisma.message.upsert({
    where: { id: "demo-message-1" },
    update: {},
    create: {
      id: "demo-message-1",
      conversationId: conversation.id,
      authorId: users[RoleKey.CHEF_PROJET].id,
      content: "Bonjour @Awa, peux-tu avancer sur l'intégration de la page d'accueil ?",
    },
  });

  await prisma.reaction.upsert({
    where: { id: "demo-reaction-1" },
    update: {},
    create: {
      id: "demo-reaction-1",
      emoji: "👍",
      userId: users[RoleKey.COLLABORATEUR].id,
      messageId: demoMessage.id,
    },
  });

  await prisma.reaction.upsert({
    where: { id: "demo-reaction-2" },
    update: {},
    create: {
      id: "demo-reaction-2",
      emoji: "🎉",
      userId: users[RoleKey.CHEF_PROJET].id,
      taskCommentId: "demo-comment-1",
    },
  });

  // Notifications démo (au-delà de celles générées automatiquement par les
  // actions ci-dessus : mention dans le message, tâches assignées...)
  await prisma.notification.upsert({
    where: {
      userId_type_entityType_entityId: {
        userId: users[RoleKey.COLLABORATEUR].id,
        type: "MENTION",
        entityType: "Message",
        entityId: demoMessage.id,
      },
    },
    update: {},
    create: {
      userId: users[RoleKey.COLLABORATEUR].id,
      type: "MENTION",
      titre: "Vous avez été mentionné(e) dans un message.",
      lien: `/messages/${conversation.id}`,
      entityType: "Message",
      entityId: demoMessage.id,
    },
  });

  // Automatisations démo : une règle "tâche terminée → créer la suivante"
  await prisma.automationRule.upsert({
    where: { id: "demo-rule-1" },
    update: {},
    create: {
      id: "demo-rule-1",
      projectId: project.id,
      nom: "Recette après chaque tâche terminée",
      trigger: "TASK_COMPLETED",
      action: "CREATE_NEXT_TASK",
      nextTaskTitre: "Vérifier la recette",
      nextTaskResponsableId: users[RoleKey.CHEF_PROJET].id,
      nextTaskDelaiJours: 2,
      createdById: users[RoleKey.CHEF_PROJET].id,
    },
  });

  await prisma.automationRule.upsert({
    where: { id: "demo-rule-2" },
    update: {},
    create: {
      id: "demo-rule-2",
      projectId: project.id,
      nom: "Notifier l'équipe à 100 %",
      trigger: "PROJECT_COMPLETED",
      action: "NOTIFY_STAKEHOLDERS",
      createdById: users[RoleKey.CHEF_PROJET].id,
    },
  });

  // Tâche en attente de validation, pour démontrer le flux d'approbation
  await prisma.task.update({
    where: { id: "demo-task-8" },
    data: { statut: TaskStatus.EN_REVISION },
  });

  console.log("\nSeed terminé avec succès.\n");
  console.log("Comptes de démonstration (mot de passe pour tous : Password123!) :");
  for (const u of demoUsers) {
    console.log(`  - ${u.email}  (${ROLE_LABELS[u.roleKey]})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
