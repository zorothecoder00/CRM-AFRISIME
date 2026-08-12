import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { portalLoginSchema } from "@/lib/validations/portal-auth.schema";
import {
  PORTAL_SESSION_COOKIE,
  createPortalSessionToken,
  portalSessionCookieOptions,
} from "@/lib/portal-auth";

const GENERIC_ERROR = "Email ou mot de passe incorrect.";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = portalLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const account = await prisma.portalAccount.findUnique({
    where: { email: parsed.data.email },
    include: { contact: true },
  });

  if (!account || !account.isActive || !account.passwordHash) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const isValid = await bcrypt.compare(parsed.data.password, account.passwordHash);
  if (!isValid) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  await prisma.portalAccount.update({
    where: { id: account.id },
    data: { lastLoginAt: new Date() },
  });

  const token = await createPortalSessionToken({
    contactId: account.contactId,
    name: `${account.contact.prenom} ${account.contact.nom}`,
    email: account.email,
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(PORTAL_SESSION_COOKIE, token, portalSessionCookieOptions);
  return response;
}
