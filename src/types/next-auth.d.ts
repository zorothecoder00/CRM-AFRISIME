import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roleKey: string;
      roleLabel: string;
      departmentId: string | null;
      permissions: string[];
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    roleKey: string;
    roleLabel: string;
    departmentId: string | null;
    permissions: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    roleKey: string;
    roleLabel: string;
    departmentId: string | null;
    permissions: string[];
  }
}
