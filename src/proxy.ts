import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { PERMISSIONS } from "@/lib/permissions";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Le portail client (session separee, cookie portal-session-token, cf.
  // src/lib/portal-auth.ts) n'a pas de compte User interne — il n'a donc
  // jamais le token verifie ci-dessous. Chaque page /portail/* verifie sa
  // propre session portail elle-meme ; on bypass entierement la garde
  // interne ici plutot que de la faire echouer systematiquement.
  if (pathname.startsWith("/portail")) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/administration")) {
    const permissions = (token.permissions as string[]) ?? [];
    if (!permissions.includes(PERMISSIONS.ADMINISTRATION_ACCESS)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // manifest.webmanifest exclu (V3.0 §43) : un navigateur peut le requêter
  // avant toute connexion (éligibilité "Ajouter à l'écran d'accueil") — le
  // laisser passer par la garde d'authentification le redirigeait vers
  // /login au lieu de servir le JSON attendu.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest).*)"],
};
