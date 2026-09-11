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
  type CreateActivityReportInput,
  type ShareActivityReportInput,
  type UnshareActivityReportInput,
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

  // Revue de robustesse (2026-09-11) — la seule permission globale
  // REPORT_EXPORT permettait de supprimer le partage de n'importe quel
  // rapport via son shareId. Restreint à qui a créé ce partage précis ou
  // qui gère le rapport concerné (createdById, déjà suivi sur les deux
  // tables).
  const share = await prisma.activityReportShare.findUniqueOrThrow({
    where: { id: data.shareId },
    select: { createdById: true, report: { select: { createdById: true } } },
  });
  if (share.createdById !== session.user.id && share.report.createdById !== session.user.id) {
    throw new Error("Vous ne gérez pas ce partage.");
  }

  await prisma.activityReportShare.delete({ where: { id: data.shareId } });

  await logAudit({
    userId: session.user.id,
    action: "activity_report.unshared",
    entityType: "ActivityReportShare",
    entityId: data.shareId,
  });

  revalidatePath("/rapports");
}
