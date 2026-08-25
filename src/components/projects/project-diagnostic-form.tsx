"use client";

import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { saveProjectDiagnostic } from "@/actions/project-diagnostic.actions";
import {
  saveProjectDiagnosticSchema,
  type SaveProjectDiagnosticInput,
} from "@/lib/validations/project-diagnostic.schema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ProjectDiagnosticData = {
  id: string;
  analyseContexte: string | null;
  analyseBesoins: string | null;
  analyseCauses: string | null;
  analyseConsequences: string | null;
  donneesStatistiques: string | null;
  enquetes: string | null;
  consultations: string | null;
  etudesExistantes: string | null;
  analyseDocumentaire: string | null;
};

const FIELDS: { key: keyof Omit<SaveProjectDiagnosticInput, "projectId">; label: string; help?: string }[] = [
  { key: "analyseContexte", label: "Analyse du contexte" },
  { key: "analyseBesoins", label: "Analyse des besoins" },
  { key: "analyseCauses", label: "Analyse des causes" },
  { key: "analyseConsequences", label: "Analyse des conséquences" },
  { key: "donneesStatistiques", label: "Données statistiques" },
  { key: "enquetes", label: "Enquêtes" },
  { key: "consultations", label: "Consultations" },
  { key: "etudesExistantes", label: "Études existantes" },
  { key: "analyseDocumentaire", label: "Analyse documentaire" },
];

/** Espace de diagnostic (Project Studio §6) — un champ texte libre par outil du cahier. */
export function ProjectDiagnosticForm({
  projectId,
  diagnostic,
  canManage,
}: {
  projectId: string;
  diagnostic: ProjectDiagnosticData | null;
  canManage: boolean;
}) {
  const { register, handleSubmit } = useForm<SaveProjectDiagnosticInput>({
    resolver: zodResolver(saveProjectDiagnosticSchema),
    defaultValues: {
      projectId,
      analyseContexte: diagnostic?.analyseContexte ?? "",
      analyseBesoins: diagnostic?.analyseBesoins ?? "",
      analyseCauses: diagnostic?.analyseCauses ?? "",
      analyseConsequences: diagnostic?.analyseConsequences ?? "",
      donneesStatistiques: diagnostic?.donneesStatistiques ?? "",
      enquetes: diagnostic?.enquetes ?? "",
      consultations: diagnostic?.consultations ?? "",
      etudesExistantes: diagnostic?.etudesExistantes ?? "",
      analyseDocumentaire: diagnostic?.analyseDocumentaire ?? "",
    },
  });
  const { run: submit, isPending } = useAction(saveProjectDiagnostic, { successMessage: "Diagnostic enregistré." });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Espace de diagnostic du projet — contexte, besoins, causes et conséquences, appuyés sur données, enquêtes et
        études existantes.
      </p>
      <form onSubmit={handleSubmit((data) => submit(data))} className="space-y-4">
        {FIELDS.map(({ key, label }) => (
          <Field key={key} label={label} htmlFor={key}>
            <Textarea id={key} rows={3} disabled={!canManage} {...register(key)} />
          </Field>
        ))}
        {canManage && (
          <Button type="submit" disabled={isPending}>
            {isPending ? "Enregistrement..." : "Enregistrer le diagnostic"}
          </Button>
        )}
      </form>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
