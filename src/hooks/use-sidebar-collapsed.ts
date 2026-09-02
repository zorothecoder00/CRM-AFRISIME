"use client";

import { useEffect, useState } from "react";

/**
 * Etat replie/deplie d'une sidebar, persiste en localStorage par cle — la
 * sidebar principale et celle du planning personnel restent independantes
 * l'une de l'autre. Lu apres montage (pas dans l'etat initial) pour rester
 * identique cote serveur/client au premier rendu.
 */
export function useSidebarCollapsed(storageKey: string) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(storageKey) === "1") setCollapsed(true);
  }, [storageKey]);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(storageKey, next ? "1" : "0");
      return next;
    });
  }

  return { collapsed, toggle };
}
