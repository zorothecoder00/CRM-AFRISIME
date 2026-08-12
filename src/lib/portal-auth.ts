import { cookies } from "next/headers";
import { encode, decode, type JWT } from "next-auth/jwt";

/**
 * Session du portail client — completement separee de l'auth interne
 * (src/lib/auth.ts) : cookie distinct, pas de NextAuthOptions, pas de
 * role/permissions. Reutilise uniquement les primitives encode/decode de
 * next-auth/jwt (memes garanties crypto que le reste de l'app, sans
 * dupliquer la config NextAuth interne ni toucher a son typage global).
 */
export const PORTAL_SESSION_COOKIE = "portal-session-token";
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export type PortalSession = {
  contactId: string;
  name: string;
  email: string;
};

function secret() {
  return process.env.NEXTAUTH_SECRET!;
}

export async function createPortalSessionToken(session: PortalSession) {
  // Le type JWT global est augmente (src/types/next-auth.d.ts) pour l'auth
  // interne (roleKey/permissions/...) ; la session portail n'a rien a voir
  // avec ce schema, d'ou le cast — encode() ne fait que signer l'objet tel
  // quel, aucun risque a l'execution.
  return encode({ token: session as unknown as JWT, secret: secret(), maxAge: MAX_AGE_SECONDS });
}

export const portalSessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: MAX_AGE_SECONDS,
};

export async function getPortalSession(): Promise<PortalSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
  if (!raw) return null;

  const token = await decode({ token: raw, secret: secret() });
  if (!token || typeof token.contactId !== "string") return null;

  return {
    contactId: token.contactId,
    name: typeof token.name === "string" ? token.name : "",
    email: typeof token.email === "string" ? token.email : "",
  };
}
