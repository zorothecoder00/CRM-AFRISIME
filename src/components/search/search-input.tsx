"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const DEBOUNCE_MS = 350;

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

  // Toujours a jour a chaque rendu (contrairement a une dependance d'effet,
  // qui redeclencherait le debounce ci-dessous a chaque changement de filtre) —
  // lu seulement au moment ou le debounce se declenche, jamais perime.
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;
  const isFirstRender = useRef(true);

  // Recherche en direct pendant la frappe (mode page /recherche uniquement —
  // le mode compact, ex. barre de topbar, garde "valider pour chercher" pour
  // ne pas naviguer hors de la page courante a chaque frappe).
  useEffect(() => {
    if (compact) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const trimmed = value.trim();
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParamsRef.current.toString());
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      router.replace(`/recherche?${params.toString()}`);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, compact]);

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
