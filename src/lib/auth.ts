import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {      
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Identifiants",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
        totp: { label: "Code de vérification", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        });

        if (!user || !user.isActive) return null;

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          await prisma.auditLog.create({
            data: { action: "auth.login_failed", entityType: "AuthAttempt", entityId: credentials.email },
          });
          return null;
        }

        // Deuxième facteur (cahier des charges §22). authorize() est appelé
        // une seconde fois par le client une fois le code saisi (voir
        // src/app/login/page.tsx) — un Error jeté ici est propagé comme
        // `result.error` par signIn(), ce qui permet au client de distinguer
        // "code requis" de "code invalide" sans exposer les identifiants.
        if (user.mfaEnabled) {
          const totp = credentials.totp?.trim();
          if (!totp) {
            throw new Error("MFA_REQUIRED");
          }
          const isValidTotp = authenticator.verify({
            token: totp,
            secret: decryptSecret(user.mfaSecret!),
          });
          if (!isValidTotp) {
            throw new Error("MFA_INVALID");
          }
        }

        await prisma.auditLog.create({
          data: { userId: user.id, action: "auth.login_success", entityType: "User", entityId: user.id },
        });

        // Registre de sessions/appareils (cahier des charges V2.2 §36) —
        // parallele au JWT sans etat : chaque connexion cree une ligne,
        // correlee via sessionId embarque dans le token (voir callback jwt
        // ci-dessous), pour permettre une revocation admin reelle.
        const userSession = await prisma.userSession.create({
          data: {
            userId: user.id,
            userAgent: req?.headers?.["user-agent"] ?? undefined,
            ipAddress: (req?.headers?.["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? undefined,
          },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image ?? undefined,
          roleKey: user.role.key,
          roleLabel: user.role.label,
          departmentId: user.departmentId,
          organizationId: user.organizationId,
          permissions: user.role.permissions.map((rp) => rp.permission.key),
          sessionId: userSession.id,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.roleKey = user.roleKey;
        token.roleLabel = user.roleLabel;
        token.departmentId = user.departmentId;
        token.organizationId = user.organizationId;
        token.permissions = user.permissions;
        token.sessionId = user.sessionId;
      }
      // Permet a useSession().update(...) (voir ProfileForm) de rafraichir
      // immediatement le JWT apres une modification du profil, sans quoi la
      // session JWT resterait figee sur les valeurs de la connexion initiale.
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.email) token.email = session.email;
        if (session.image) token.picture = session.image;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.roleKey = token.roleKey;
      session.user.roleLabel = token.roleLabel;
      session.user.departmentId = token.departmentId;
      session.user.organizationId = token.organizationId;
      session.user.permissions = token.permissions;
      session.user.sessionId = token.sessionId;

      // Revocation de session (V2.2 §36) — verifiee a chaque lecture de
      // session (getServerSession appelle ce callback a chaque requete,
      // contrairement au callback jwt qui ne s'execute qu'a la connexion).
      // Une session revoquee perd toutes ses permissions immediatement (bloque
      // toute action serveur gardee par requirePermission) et
      // src/app/(app)/layout.tsx force la redirection vers /login au prochain
      // rendu de page — sans abandonner la strategie JWT sans etat.
      if (token.sessionId) {
        const userSession = await prisma.userSession.findUnique({
          where: { id: token.sessionId },
          select: { revokedAt: true, lastSeenAt: true },
        });
        if (!userSession || userSession.revokedAt) {
          session.revoked = true;
          session.user.permissions = [];
        } else if (Date.now() - userSession.lastSeenAt.getTime() > 5 * 60 * 1000) {
          // Throttle : n'ecrit lastSeenAt qu'au plus une fois toutes les 5
          // minutes par session, pas a chaque page vue.
          await prisma.userSession.update({ where: { id: token.sessionId }, data: { lastSeenAt: new Date() } });
        }
      }

      return session;
    },
  },
};
