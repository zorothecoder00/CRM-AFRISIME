import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { prisma } from "@/lib/prisma";

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
      async authorize(credentials) {
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
          const isValidTotp = authenticator.verify({ token: totp, secret: user.mfaSecret! });
          if (!isValidTotp) {
            throw new Error("MFA_INVALID");
          }
        }

        await prisma.auditLog.create({
          data: { userId: user.id, action: "auth.login_success", entityType: "User", entityId: user.id },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image ?? undefined,
          roleKey: user.role.key,
          roleLabel: user.role.label,
          departmentId: user.departmentId,
          permissions: user.role.permissions.map((rp) => rp.permission.key),
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
        token.permissions = user.permissions;
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
      session.user.permissions = token.permissions;
      return session;
    },
  },
};
