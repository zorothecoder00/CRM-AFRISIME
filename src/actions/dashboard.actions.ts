"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import {
  updatePreferencesSchema,
  type UpdatePreferencesInput,
} from "@/lib/validations/dashboard.schema";

export async function updateDashboardPreferences(input: UpdatePreferencesInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.DASHBOARD_READ);

  const data = updatePreferencesSchema.parse(input);

  await prisma.dashboardWidgetPreference.upsert({
    where: { userId: session.user.id },
    update: { widgets: data.widgets },
    create: { userId: session.user.id, widgets: data.widgets },
  });

  revalidatePath("/tableaux-de-bord");
}
