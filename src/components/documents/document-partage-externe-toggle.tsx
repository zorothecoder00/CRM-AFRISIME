"use client";

import { useAction } from "@/hooks/use-action";
import { togglePartageExterne } from "@/actions/portal.actions";
import { Button } from "@/components/ui/button";
import { Globe, Lock } from "lucide-react";

/**
 * Isolation des données confidentielles internes (cahier des charges §19) :
 * un document de projet n'apparaît dans le portail externe QUE s'il a été
 * explicitement marqué partageable ici, en plus d'appartenir à un projet
 * autorisé pour le contact.
 */
export function DocumentPartageExterneToggle({
  documentId,
  partageExterne,
}: {
  documentId: string;
  partageExterne: boolean;
}) {
  const { run, isPending } = useAction(togglePartageExterne);

  if (partageExterne) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => run({ documentId, partageExterne: false })}
        disabled={isPending}
      >
        <Globe className="mr-1 h-4 w-4" />
        Partagé au portail — retirer
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={() => run({ documentId, partageExterne: true })} disabled={isPending}>
      <Lock className="mr-1 h-4 w-4" />
      Partager au portail externe
    </Button>
  );
}
