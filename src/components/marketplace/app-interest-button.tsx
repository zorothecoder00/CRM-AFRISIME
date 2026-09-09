"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { toggleAppCatalogInterest } from "@/actions/app-catalog.actions";
import { Button } from "@/components/ui/button";
import { Bell, BellRing } from "lucide-react";

/** "Me prévenir quand disponible" — pour une app pas encore DISPONIBLE (voir marketplace/page.tsx). */
export function AppInterestButton({
  appCatalogEntryId,
  initialInterested,
  initialCount,
}: {
  appCatalogEntryId: string;
  initialInterested: boolean;
  initialCount: number;
}) {
  const [interested, setInterested] = useState(initialInterested);
  const [count, setCount] = useState(initialCount);
  const { run, isPending } = useAction(toggleAppCatalogInterest);

  async function handleClick() {
    const previous = interested;
    setInterested(!previous);
    setCount((c) => (previous ? c - 1 : c + 1));
    const result = await run(appCatalogEntryId);
    if (!result.ok) {
      setInterested(previous);
      setCount((c) => (previous ? c + 1 : c - 1));
    }
  }

  return (
    <Button variant={interested ? "default" : "outline"} size="sm" onClick={handleClick} disabled={isPending}>
      {interested ? <BellRing className="mr-1 h-3.5 w-3.5" /> : <Bell className="mr-1 h-3.5 w-3.5" />}
      {interested ? "Vous serez prévenu" : "Me prévenir"}
      {count > 0 && <span className="ml-1 text-xs opacity-70">({count})</span>}
    </Button>
  );
}
