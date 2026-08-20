import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roleKey: string;
      roleLabel: string;
      departmentId: string | null;
      // Multi-tenant Phase 1 (V3.0 §27, 2026-08-20) — nullable : pas encore
      // NOT NULL en base (voir User.organizationId dans schema.prisma), et
      // aucune donnee n'est encore scopee dessus (pas de RLS/filtre Prisma
      // systematique). Present dans la session pour que la Phase 2+ (RLS,
      // filtrage) ait deja le tenant courant disponible sans reprendre l'auth.
      organizationId: string | null;
      permissions: string[];
      sessionId: string;
    } & DefaultSession["user"];
    // V2.2 §36 — vrai quand la UserSession correlee a ce JWT a ete revoquee
    // (voir callback session dans auth.ts) : src/app/(app)/layout.tsx
    // redirige alors vers /login au prochain rendu de page.
    revoked?: boolean;
  }

  interface User {
    id: string;
    roleKey: string;
    roleLabel: string;
    departmentId: string | null;
    organizationId: string | null;
    permissions: string[];
    sessionId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    roleKey: string;
    roleLabel: string;
    departmentId: string | null;
    organizationId: string | null;
    permissions: string[];
    sessionId: string;
  }
}
