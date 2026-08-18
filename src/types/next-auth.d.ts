import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roleKey: string;
      roleLabel: string;
      departmentId: string | null;
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
    permissions: string[];
    sessionId: string;
  }
}
