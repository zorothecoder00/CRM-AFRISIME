"use client";

import { useAction } from "@/hooks/use-action";
import { revokeApiKey } from "@/actions/api-key.actions";
import { Button } from "@/components/ui/button";

export function ApiKeyRevokeButton({ id }: { id: string }) {
  const { run, isPending } = useAction(revokeApiKey, { successMessage: "Clé révoquée." });

  return (
    <Button variant="destructive" size="sm" disabled={isPending} onClick={() => run(id)}>
      Révoquer
    </Button>
  );
}
