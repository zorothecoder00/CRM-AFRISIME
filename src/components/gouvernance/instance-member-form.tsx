"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { addInstanceMember, removeInstanceMember, updateInstanceMemberStatus } from "@/actions/gouvernance.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

type Option = { id: string; label: string };

export type MemberData = {
  id: string;
  userId: string;
  userName: string;
  fonction: string | null;
  role: string | null;
  mandat: string | null;
  dateDebut: string | null;
  dateFin: string | null;
  statut: string;
};

const STATUT_LABELS: Record<string, string> = {
  ACTIF: "Actif",
  TERMINE: "Terminé",
  SUSPENDU: "Suspendu",
};

function MemberStatusSelect({ memberId, statut }: { memberId: string; statut: string }) {
  const { run } = useAction(updateInstanceMemberStatus, { successMessage: "Statut mis à jour." });
  return (
    <Select value={statut} onValueChange={(v) => run(memberId, v as "ACTIF" | "TERMINE" | "SUSPENDU")}>
      <SelectTrigger className="h-7 w-28 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(STATUT_LABELS).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function InstanceMemberForm({
  instanceId,
  members,
  users,
  canManage,
}: {
  instanceId: string;
  members: MemberData[];
  users: Option[];
  canManage: boolean;
}) {
  const [userId, setUserId] = useState<string | undefined>();
  const [fonction, setFonction] = useState("");
  const [role, setRole] = useState("");
  const { run: add, isPending } = useAction(addInstanceMember, { successMessage: "Membre ajouté." });
  const { run: remove } = useAction(removeInstanceMember, { successMessage: "Membre retiré." });

  async function handleAdd() {
    if (!userId) return;
    const result = await add({
      instanceId,
      userId,
      fonction: fonction.trim() || undefined,
      role: role.trim() || undefined,
    });
    if (result.ok) {
      setUserId(undefined);
      setFonction("");
      setRole("");
    }
  }

  const memberUserIds = new Set(members.map((m) => m.userId));
  const availableUsers = users.filter((u) => !memberUserIds.has(u.id));

  return (
    <div className="space-y-3">
      {members.map((m) => (
        <div key={m.id} className="flex items-start justify-between gap-2 rounded-md border p-3 text-sm">
          <div>
            <p className="font-medium">{m.userName}</p>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {m.fonction && <span>{m.fonction}</span>}
              {m.role && <Badge variant="outline">{m.role}</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canManage ? (
              <>
                <MemberStatusSelect memberId={m.id} statut={m.statut} />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(m.id)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <Badge variant="outline">{STATUT_LABELS[m.statut]}</Badge>
            )}
          </div>
        </div>
      ))}
      {members.length === 0 && <p className="text-sm text-muted-foreground">Aucun membre pour le moment.</p>}

      {canManage && (
        <div className="space-y-2 rounded-md border p-3">
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Ajouter un membre" />
            </SelectTrigger>
            <SelectContent>
              {availableUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Fonction (optionnel)" value={fonction} onChange={(e) => setFonction(e.target.value)} />
            <Input placeholder="Rôle (optionnel)" value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
          <Button size="sm" onClick={handleAdd} disabled={isPending || !userId}>
            {isPending ? "Ajout..." : "Ajouter le membre"}
          </Button>
        </div>
      )}
    </div>
  );
}
