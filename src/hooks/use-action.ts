"use client";

import { useCallback, useRef, useState } from "react";
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
  // Verrou synchrone en plus du state `isPending` : `setIsPending(true)` ne se
  // reflete qu'au prochain rendu, donc un double-clic (ou Entree + clic) tres
  // rapproche peut relancer run() une seconde fois avant que le bouton ne
  // devienne visuellement/effectivement disabled — surtout perceptible en dev
  // avec la recompilation Turbopack, qui ralentit ce cycle de rendu. La ref
  // se met a jour immediatement, donc ce garde-fou ferme la fenetre de race.
  const pendingRef = useRef(false);

  const run = useCallback(
    async (...args: TArgs): Promise<ActionResult<TResult>> => {
      if (pendingRef.current) {
        return { ok: false, error: new Error("Une action est déjà en cours.") };
      }
      pendingRef.current = true;
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
        pendingRef.current = false;
        setIsPending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [action, options?.successMessage]
  );

  return { run, isPending };
}
