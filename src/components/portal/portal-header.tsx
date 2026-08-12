"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Workflow, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PortalHeader({
  name,
  email,
  label = "Portail",
}: {
  name: string;
  email: string;
  label?: string;
}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/portal-auth/logout", { method: "POST" });
    router.push("/portail/connexion");
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur sm:px-6">
      <Link href="/portail" className="flex items-center gap-2.5 text-sm font-semibold">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: "#2a78d6" }}
        >
          <Workflow className="h-4 w-4" />
        </div>
        {label} — AfriSime
      </Link>
      <div className="flex items-center gap-3">
        <div className="hidden text-right text-sm sm:block">
          <div className="font-medium leading-none">{name}</div>
          <div className="text-xs text-muted-foreground">{email}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="mr-1 h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </header>
  );
}
