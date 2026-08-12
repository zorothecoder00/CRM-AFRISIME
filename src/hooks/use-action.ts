"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

type ActionResult<TResult> = { ok: true; data: TResult } | { ok: false; error: unknown };

type UseActionOptions<TResult> = {
  /** Affiche un toast de succes ; peut deriver le message du resultat. */
  successMessage?: string | ((result: TResult) => string);
};

/**
 * Centralise le pattern repete dans les composants client de ce projet :
 * `useState(isSubmitting)` + `try/catch` + `toast.success/error`. Ne decide
 * pas quoi faire apres coup (fermer un dialogue, revert un etat optimiste,
 * ignorer) — l'appelant garde ce controle via le `{ ok }` retourne, pour que
 * chaque logique de revert/fermeture reste lisible dans son propre closure
 * plutot que force dans une signature de callback generique.
 */
export function useAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  options?: UseActionOptions<TResult>
) {
  const [isPending, setIsPending] = useState(false);

  const run = useCallback(
    async (...args: TArgs): Promise<ActionResult<TResult>> => {
      setIsPending(true);
      try {
        const data = await action(...args);
        if (options?.successMessage) {
          toast.success(
            typeof options.successMessage === "function" ? options.successMessage(data) : options.successMessage
          );
        }
        return { ok: true, data };
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erreur.");
        return { ok: false, error };
      } finally {
        setIsPending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [action, options?.successMessage]
  );

  return { run, isPending };
}
