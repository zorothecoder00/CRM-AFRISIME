"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notify";
import {
  createActivityReportSchema,
  shareActivityReportSchema,
  unshareActivityReportSchema,
  deleteActivityReportSchema,
  type CreateActivityReportInput,
  type ShareActivityReportInput,
  type UnshareActivityReportInput,
  type DeleteActivityReportInput,
} from "@/lib/validations/activity-report.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/** /rapports, bloc "Rapports d'activité (manuels)" — import d'un fichier rédigé hors de l'application. */
export async function createActivityReport(input: CreateActivityReportInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.REPORT_EXPORT);

  const data = createActivityReportSchema.parse(input);

  const report = await prisma.activityReport.create({
    data: {
      titre: data.titre,
      description: data.description,
      url: data.url,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "activity_report.created",
    entityType: "ActivityReport",
    entityId: report.id,
    changes: { titre: report.titre },
  });

  revalidatePath("/rapports");
  return report;
}

// Pas de permission REPORT_DELETE dediee : l'auteur peut toujours supprimer
// son propre rapport ; document.delete (deja utilise pour les fichiers de
// projet) sert de repli pour un gestionnaire qui doit nettoyer un rapport
// qui n'est pas le sien.
export async function deleteActivityReport(input: DeleteActivityReportInput) {
  const session = await requireSession();
  const data = deleteActivityReportSchema.parse(input);

  const report = await prisma.activityReport.findUniqueOrThrow({
    where: { id: data.reportId },
    select: { createdById: true, titre: true },
  });
  const isOwner = report.createdById === session.user.id;
  if (!isOwner) requirePermission(session.user.permissions, PERMISSIONS.DOCUMENT_DELETE);

  await prisma.activityReport.delete({ where: { id: data.reportId } });

  await logAudit({
    userId: session.user.id,
    action: "activity_report.deleted",
    entityType: "ActivityReport",
    entityId: data.reportId,
    changes: { titre: report.titre },
  });

  revalidatePath("/rapports");
}

/** Partage à un utilisateur ou une équipe (voir shareActivityReportSchema — jamais les deux à la fois). */
export async function shareActivityReport(input: ShareActivityReportInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.REPORT_EXPORT);

  const data = shareActivityReportSchema.parse(input);

  const report = await prisma.activityReport.findUniqueOrThrow({
    where: { id: data.reportId },
    select: { titre: true, createdById: true },
  });

  const share = data.userId
    ? await prisma.activityReportShare.upsert({
        where: { reportId_userId: { reportId: data.reportId, userId: data.userId } },
        update: {},
        create: { reportId: data.reportId, userId: data.userId, createdById: session.user.id },
      })
    : await prisma.activityReportShare.upsert({
        where: { reportId_teamId: { reportId: data.reportId, teamId: data.teamId! } },
        update: {},
        create: { reportId: data.reportId, teamId: data.teamId, createdById: session.user.id },
      });

  await logAudit({
    userId: session.user.id,
    action: "activity_report.shared",
    entityType: "ActivityReport",
    entityId: data.reportId,
    changes: { userId: data.userId, teamId: data.teamId },
  });

  if (data.userId && data.userId !== session.user.id) {
    await createNotification({
      userId: data.userId,
      type: "MODIFICATION",
      titre: `Un rapport d'activité « ${report.titre} » a été partagé avec vous.`,
      lien: "/rapports",
      entityType: "ActivityReport",
      entityId: data.reportId,
    });
  }

  revalidatePath("/rapports");
  return share;
}

export async function unshareActivityReport(input: UnshareActivityReportInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.REPORT_EXPORT);

  const data = unshareActivityReportSchema.parse(input);

  await prisma.activityReportShare.delete({ where: { id: data.shareId } });

  await logAudit({
    userId: session.user.id,
    action: "activity_report.unshared",
    entityType: "ActivityReportShare",
    entityId: data.shareId,
  });

  revalidatePath("/rapports");
}
