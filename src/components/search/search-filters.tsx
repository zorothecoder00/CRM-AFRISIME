"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlidersHorizontal } from "lucide-react";

type Option = { id: string; label: string };

const STATUTS = [
  { value: "A_FAIRE", label: "À faire" },
  { value: "EN_COURS", label: "En cours" },
  { value: "EN_REVISION", label: "En révision" },
  { value: "BLOQUEE", label: "Bloquée" },
  { value: "TERMINEE", label: "Terminée" },
  { value: "ANNULEE", label: "Annulée" },
];

const PRIORITES = [
  { value: "TRES_HAUTE", label: "Très haute" },
  { value: "HAUTE", label: "Haute" },
  { value: "MOYENNE", label: "Moyenne" },
  { value: "BASSE", label: "Basse" },
];

/** Filtres avancés de la recherche globale (cahier des charges §17). */
export function SearchFilters({ users, departments }: { users: Option[]; departments: Option[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/recherche?${params.toString()}`);
  }

  const activeCount = ["dateFrom", "dateTo", "responsableId", "statut", "priorite", "departmentId"].filter((k) =>
    searchParams.get(k)
  ).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <SlidersHorizontal className="mr-1.5 h-4 w-4" />
          Filtres{activeCount > 0 ? ` (${activeCount})` : ""}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Du</Label>
            <Input
              type="date"
              defaultValue={searchParams.get("dateFrom") ?? ""}
              onChange={(e) => setParam("dateFrom", e.target.value || undefined)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Au</Label>
            <Input
              type="date"
              defaultValue={searchParams.get("dateTo") ?? ""}
              onChange={(e) => setParam("dateTo", e.target.value || undefined)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Responsable</Label>
          <Select
            defaultValue={searchParams.get("responsableId") ?? undefined}
            onValueChange={(v) => setParam("responsableId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Département</Label>
          <Select
            defaultValue={searchParams.get("departmentId") ?? undefined}
            onValueChange={(v) => setParam("departmentId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Statut (tâches)</Label>
          <Select
            defaultValue={searchParams.get("statut") ?? undefined}
            onValueChange={(v) => setParam("statut", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              {STATUTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Priorité (tâches)</Label>
          <Select
            defaultValue={searchParams.get("priorite") ?? undefined}
            onValueChange={(v) => setParam("priorite", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Toutes" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {activeCount > 0 && (
          <Button variant="ghost" size="sm" className="w-full" onClick={() => router.push("/recherche?q=" + (searchParams.get("q") ?? ""))}>
            Réinitialiser les filtres
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
