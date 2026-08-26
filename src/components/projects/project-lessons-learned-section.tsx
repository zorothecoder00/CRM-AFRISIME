"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createProjectLessonLearned, deleteProjectLessonLearned } from "@/actions/project.actions";
import { createProjectLessonLearnedSchema, type CreateProjectLessonLearnedInput } from "@/lib/validations/project.schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ThumbsUp, ThumbsDown } from "lucide-react";

export type LessonLearnedRow = {
  id: string;
  type: string;
  titre: string;
  pourquoi: string | null;
  actionRetenue: string | null;
  recommandations: string | null;
  createdAt: string;
};

/** Base de capitalisation (cahier des charges Project Studio §53). */
export function ProjectLessonsLearnedSection({
  projectId,
  lessons,
  canManage,
}: {
  projectId: string;
  lessons: LessonLearnedRow[];
  canManage: boolean;
}) {
  const { run: remove } = useAction(deleteProjectLessonLearned, { successMessage: "Leçon supprimée." });
  const sorted = [...lessons].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Ce qui a fonctionné, ce qui n&apos;a pas fonctionné, et pourquoi.</p>
        {canManage && <LessonFormDialog projectId={projectId} />}
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune leçon enregistrée.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((lesson) => (
            <Card key={lesson.id} size="sm">
              <CardContent className="space-y-1.5 px-(--card-spacing)">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    {lesson.type === "SUCCES" ? (
                      <ThumbsUp className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <ThumbsDown className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium">{lesson.titre}</span>
                        <Badge variant={lesson.type === "SUCCES" ? "success" : "destructive"}>
                          {lesson.type === "SUCCES" ? "Ce qui a fonctionné" : "Ce qui n'a pas fonctionné"}
                        </Badge>
                      </div>
                      {lesson.pourquoi && <p className="text-xs text-muted-foreground">Pourquoi : {lesson.pourquoi}</p>}
                      {lesson.actionRetenue && (
                        <p className="text-xs text-muted-foreground">
                          {lesson.type === "SUCCES" ? "À reproduire" : "À éviter"} : {lesson.actionRetenue}
                        </p>
                      )}
                      {lesson.recommandations && (
                        <p className="text-xs text-muted-foreground">Recommandations : {lesson.recommandations}</p>
                      )}
                    </div>
                  </div>
                  {canManage && (
                    <Button variant="ghost" size="icon-sm" onClick={() => remove({ lessonId: lesson.id })} aria-label="Supprimer">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function LessonFormDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"SUCCES" | "ECHEC">("SUCCES");
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateProjectLessonLearnedInput>({
    resolver: zodResolver(createProjectLessonLearnedSchema),
    defaultValues: { projectId, type: "SUCCES" },
  });
  const { run: submit, isPending } = useAction(createProjectLessonLearned, { successMessage: "Leçon ajoutée." });

  async function onSubmit(data: CreateProjectLessonLearnedInput) {
    const result = await submit({ ...data, projectId });
    if (result.ok) {
      reset({ projectId, type: "SUCCES" });
      setType("SUCCES");
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nouvelle leçon
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle leçon apprise</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              defaultValue="SUCCES"
              onValueChange={(v) => {
                const t = v as "SUCCES" | "ECHEC";
                setType(t);
                setValue("type", t);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SUCCES">Ce qui a fonctionné</SelectItem>
                <SelectItem value="ECHEC">Ce qui n&apos;a pas fonctionné</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="titre">Titre</Label>
            <Input id="titre" {...register("titre")} />
            {errors.titre && <p className="text-sm text-destructive">{errors.titre.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pourquoi">Pourquoi ?</Label>
            <Textarea id="pourquoi" {...register("pourquoi")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="actionRetenue">{type === "SUCCES" ? "Que faut-il reproduire ?" : "Que faut-il éviter ?"}</Label>
            <Textarea id="actionRetenue" {...register("actionRetenue")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recommandations">Recommandations</Label>
            <Textarea id="recommandations" {...register("recommandations")} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
