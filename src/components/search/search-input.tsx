"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function SearchInput({
  defaultValue = "",
  compact = false,
}: {
  defaultValue?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim().length < 2) return;
    // Preserve les filtres avances actifs (§17) quand la recherche est
    // soumise depuis la page /recherche elle-meme, pas depuis la barre
    // compacte de la topbar qui n'a pas ce contexte.
    const params = compact ? new URLSearchParams() : new URLSearchParams(searchParams.toString());
    params.set("q", value.trim());
    router.push(`/recherche?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? "relative w-56" : "relative max-w-md"}>
      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Rechercher..."
        className="h-9 pl-8"
      />
    </form>
  );
}
