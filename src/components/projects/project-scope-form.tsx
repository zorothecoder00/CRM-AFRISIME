"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { updateProjectScope } from "@/actions/project.actions";
import { updateProjectScopeSchema, type UpdateProjectScopeInput } from "@/lib/validations/project.schema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ProjectScopeData = {
  perimetreInclus: string | null;
  perimetreExclus: string | null;
  contraintes: string | null;
  limites: string | null;
  criteresReussite: string | null;
  gouvernance: string | null;
};

const FIELDS: { key: keyof ProjectScopeData; label: string; placeholder?: string }[] = [
  { key: "perimetreInclus", label: "Inclus dans le projet" },
  { key: "perimetreExclus", label: "Exclu du projet" },
  { key: "contraintes", label: "Contraintes" },
  { key: "limites", label: "Limites" },
  { key: "criteresReussite", label: "Critères de réussite" },
  { key: "gouvernance", label: "Gouvernance" },
];

/** Scope Management (Project Studio §17) — évite les dérives de périmètre. */
export function ProjectScopeForm({
  projectId,
  scope,
  canManage,
}: {
  projectId: string;
  scope: ProjectScopeData;
  canManage: boolean;
}) {
  const { register, handleSubmit } = useForm<UpdateProjectScopeInput>({
    resolver: zodResolver(updateProjectScopeSchema),
    defaultValues: {
      projectId,
      perimetreInclus: scope.perimetreInclus ?? "",
      perimetreExclus: scope.perimetreExclus ?? "",
      contraintes: scope.contraintes ?? "",
      limites: scope.limites ?? "",
      criteresReussite: scope.criteresReussite ?? "",
      gouvernance: scope.gouvernance ?? "",
    },
  });
  const { run: submit, isPending } = useAction(updateProjectScope, { successMessage: "Périmètre enregistré." });

  return (
    <form onSubmit={handleSubmit((data) => submit(data))} className="space-y-4">
      {FIELDS.map(({ key, label }) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={key}>{label}</Label>
          <Textarea id={key} rows={3} disabled={!canManage} {...register(key)} />
        </div>
      ))}
      {canManage && (
        <Button type="submit" disabled={isPending}>
          {isPending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      )}
    </form>
  );
}
