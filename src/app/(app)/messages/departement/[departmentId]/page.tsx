import { notFound, redirect } from "next/navigation";
import { getAppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { ensureDepartmentConversation } from "@/lib/department-conversation";

// Ouvre (en le créant au besoin) le canal d'un département puis redirige vers
// la conversation. Réservé aux membres du département et aux gestionnaires
// des départements (lien "Canal" de /administration/departements).
export default async function DepartmentChannelPage({ params }: { params: Promise<{ departmentId: string }> }) {
  const { departmentId } = await params;
  const session = await getAppSession();
  const userId = session!.user.id;

  const [department, me] = await Promise.all([
    prisma.department.findUnique({ where: { id: departmentId }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { departmentId: true } }),
  ]);
  if (!department) notFound();

  const canOpen =
    me?.departmentId === departmentId || session!.user.permissions.includes(PERMISSIONS.DEPARTMENT_MANAGE);
  if (!canOpen) redirect("/messages");

  const conversationId = await ensureDepartmentConversation(departmentId, userId);
  redirect(`/messages/${conversationId}`);
}
