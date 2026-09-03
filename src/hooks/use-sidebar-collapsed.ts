"use client";

import { useSyncExternalStore } from "react";

/** Evenement local (les ecritures localStorage dans le meme onglet ne declenchent pas l'evenement natif "storage") — permet a useSyncExternalStore de re-lire apres un toggle(). */
const LOCAL_CHANGE_EVENT = "sidebar-collapsed-change";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(LOCAL_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LOCAL_CHANGE_EVENT, callback);
  };
}

function readStorage(storageKey: string): boolean {
  try {
    return window.localStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

/**
 * Etat replie/deplie d'une sidebar, persiste en localStorage par cle — la
 * sidebar principale et celle du planning personnel restent independantes
 * l'une de l'autre. `useSyncExternalStore` (plutot qu'un useEffect+setState,
 * qui declenche un rendu en cascade) : `getServerSnapshot` renvoie toujours
 * false, donc identique cote serveur/client au premier rendu — la vraie
 * valeur localStorage n'arrive qu'ensuite, sans jamais desynchroniser
 * l'hydratation.
 */
export function useSidebarCollapsed(storageKey: string) {
  const collapsed = useSyncExternalStore(
    subscribe,
    () => readStorage(storageKey),
    () => false
  );

  function toggle() {
    const next = !collapsed;
    try {
      window.localStorage.setItem(storageKey, next ? "1" : "0");
    } catch {
      // localStorage indisponible (navigation privee...) — pas bloquant, juste pas memorise.
    }
    window.dispatchEvent(new Event(LOCAL_CHANGE_EVENT));
  }

  return { collapsed, toggle };
}
