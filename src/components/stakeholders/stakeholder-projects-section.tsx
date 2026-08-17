"use client";

import { useState } from "react";
import Link from "next/link";
import { useAction } from "@/hooks/use-action";
import { linkStakeholderToProject, unlinkStakeholderFromProject } from "@/actions/stakeholder.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Link2 } from "lucide-react";

type Option = { id: string; label: string };

export type StakeholderProjectRow = {
  linkId: string;
  projectId: string;
  projectNom: string;
  role: string | null;
};

/** "Projets associés" (cahier des charges V2.2 §21, pluriel — un profil sur plusieurs projets). */
export function StakeholderProjectsSection({
  stakeholderId,
  projects,
  availableProjects,
  canManage,
}: {
  stakeholderId: string;
  projects: StakeholderProjectRow[];
  availableProjects: Option[];
  canManage: boolean;
}) {
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [role, setRole] = useState("");
  const { run: link, isPending: linking } = useAction(linkStakeholderToProject, { successMessage: "Projet lié." });
  const { run: unlink } = useAction(unlinkStakeholderFromProject, { successMessage: "Projet retiré." });

  async function handleLink() {
    if (!selectedProjectId) return;
    const result = await link({ stakeholderId, projectId: selectedProjectId, role: role.trim() || undefined });
    if (result.ok) {
      setSelectedProjectId("");
      setRole("");
    }
  }

  return (
    <div className="space-y-3">
      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun projet associé.</p>
      ) : (
        <ul className="space-y-2">
          {projects.map((p) => (
            <li key={p.linkId} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
              <Link href={`/projets/${p.projectId}`} className="text-primary hover:underline">
                {p.projectNom}
              </Link>
              <div className="flex items-center gap-2">
                {p.role && <span className="text-xs text-muted-foreground">{p.role}</span>}
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => unlink({ stakeholderProjectId: p.linkId })}
                    aria-label="Retirer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage && availableProjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Choisir un projet" />
            </SelectTrigger>
            <SelectContent>
              {availableProjects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Rôle (optionnel)" value={role} onChange={(e) => setRole(e.target.value)} className="w-40" />
          <Button size="sm" onClick={handleLink} disabled={linking || !selectedProjectId}>
            <Link2 className="mr-1 h-4 w-4" />
            Lier
          </Button>
        </div>
      )}
    </div>
  );
}
