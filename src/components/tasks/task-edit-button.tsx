"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TaskEditDialog, type TaskEditData } from "@/components/tasks/task-edit-dialog";
import { Pencil } from "lucide-react";

type Option = { id: string; label: string };

/** Bouton "Modifier" pour la fiche tâche — la page est un server component, TaskEditDialog a besoin d'un state client. */
export function TaskEditButton({ task, users }: { task: TaskEditData; users: Option[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="mr-1 h-3.5 w-3.5" />
        Modifier
      </Button>
      <TaskEditDialog
        task={task}
        users={users}
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) router.refresh();
        }}
      />
    </>
  );
}
