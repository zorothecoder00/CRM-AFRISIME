"use client";

import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { generateProjectConceptNote, updateProjectConceptNote } from "@/actions/project-concept-note.actions";
import {
  updateProjectConceptNoteSchema,
  type UpdateProjectConceptNoteInput,
} from "@/lib/validations/project-concept-note.schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText } from "lucide-react";

export type ProjectConceptNoteData = {
  id: string;
  titre: string;
  contexte: string | null;
  probleme: string | null;
  justification: string | null;
  objectifs: string | null;
  beneficiaires: string | null;
  approche: string | null;
  resultatsAttendus: string | null;
  duree: string | null;
  budgetIndicatif: number | null;
  partenaires: string | null;
  financementRecherche: number | null;
};

export function ProjectConceptNotePanel({
  ideaId,
  note,
  canManage,
}: {
  ideaId: string;
  note: ProjectConceptNoteData | null;
  canManage: boolean;
}) {
  const { run: generate, isPending: isGenerating } = useAction(generateProjectConceptNote, {
    successMessage: "Concept Note générée à partir de l'idée.",
  });

  if (!note) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Concept Note</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Génère une synthèse pré-projet à partir des informations déjà saisies sur l&apos;idée — à affiner ensuite.
          </p>
          {canManage && (
            <Button size="sm" onClick={() => generate({ ideaId })} disabled={isGenerating}>
              <FileText className="mr-1 h-4 w-4" />
              {isGenerating ? "Génération..." : "Générer la Concept Note"}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return <ConceptNoteForm note={note} canManage={canManage} />;
}

function ConceptNoteForm({ note, canManage }: { note: ProjectConceptNoteData; canManage: boolean }) {
  const { register, handleSubmit } = useForm<UpdateProjectConceptNoteInput>({
    resolver: zodResolver(updateProjectConceptNoteSchema),
    defaultValues: {
      conceptNoteId: note.id,
      titre: note.titre,
      contexte: note.contexte ?? undefined,
      probleme: note.probleme ?? undefined,
      justification: note.justification ?? undefined,
      objectifs: note.objectifs ?? undefined,
      beneficiaires: note.beneficiaires ?? undefined,
      approche: note.approche ?? undefined,
      resultatsAttendus: note.resultatsAttendus ?? undefined,
      duree: note.duree ?? undefined,
      budgetIndicatif: note.budgetIndicatif !== null ? String(note.budgetIndicatif) : undefined,
      partenaires: note.partenaires ?? undefined,
      financementRecherche: note.financementRecherche !== null ? String(note.financementRecherche) : undefined,
    },
  });
  const { run: submit, isPending } = useAction(updateProjectConceptNote, { successMessage: "Concept Note enregistrée." });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Concept Note</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((data) => submit(data))} className="space-y-4">
          <Field label="Titre" htmlFor="titre">
            <Input id="titre" disabled={!canManage} {...register("titre")} />
          </Field>
          <Field label="Contexte" htmlFor="contexte">
            <Textarea id="contexte" disabled={!canManage} {...register("contexte")} />
          </Field>
          <Field label="Problème" htmlFor="probleme">
            <Textarea id="probleme" disabled={!canManage} {...register("probleme")} />
          </Field>
          <Field label="Justification" htmlFor="justification">
            <Textarea id="justification" disabled={!canManage} {...register("justification")} />
          </Field>
          <Field label="Objectifs" htmlFor="objectifs">
            <Textarea id="objectifs" disabled={!canManage} {...register("objectifs")} />
          </Field>
          <Field label="Bénéficiaires" htmlFor="beneficiaires">
            <Textarea id="beneficiaires" disabled={!canManage} {...register("beneficiaires")} />
          </Field>
          <Field label="Approche" htmlFor="approche">
            <Textarea id="approche" disabled={!canManage} {...register("approche")} />
          </Field>
          <Field label="Résultats attendus" htmlFor="resultatsAttendus">
            <Textarea id="resultatsAttendus" disabled={!canManage} {...register("resultatsAttendus")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Durée" htmlFor="duree">
              <Input id="duree" disabled={!canManage} {...register("duree")} />
            </Field>
            <Field label="Budget indicatif" htmlFor="budgetIndicatif">
              <Input id="budgetIndicatif" type="number" step="0.01" disabled={!canManage} {...register("budgetIndicatif")} />
            </Field>
          </div>
          <Field label="Partenaires" htmlFor="partenaires">
            <Input id="partenaires" disabled={!canManage} {...register("partenaires")} />
          </Field>
          <Field label="Financement recherché" htmlFor="financementRecherche">
            <Input id="financementRecherche" type="number" step="0.01" disabled={!canManage} {...register("financementRecherche")} />
          </Field>
          {canManage && (
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
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
