"use client";

import { useSyncExternalStore } from "react";

/**
 * Preferences de navigation par navigateur (refonte « façon Jira ») :
 * entrees epinglees en Favoris et historique des pages Recentes. Simple
 * confort par utilisateur/appareil — localStorage suffit, et tout acces est
 * protege (navigation privee, stockage bloque) : la sidebar s'affiche
 * normalement, simplement sans memoire.
 *
 * Meme schema que sidebar-nav.tsx (groupes ouverts) : snapshot memoise par
 * valeur brute pour useSyncExternalStore + evenement custom, car
 * localStorage.setItem ne declenche pas "storage" dans l'onglet courant.
 */

const CHANGE_EVENT = "nav-prefs-change";
const EMPTY: string[] = [];
const MAX_RECENTS = 6;

const cache: Record<string, { raw: string | null; value: string[] }> = {};

function read(key: string): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    raw = null;
  }
  const hit = cache[key];
  if (hit && hit.raw === raw) return hit.value;
  let value: string[] = EMPTY;
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) value = parsed.filter((v): v is string => typeof v === "string");
  } catch {
    value = EMPTY;
  }
  cache[key] = { raw, value };
  return value;
}

function write(key: string, value: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Stockage indisponible : la preference reste simplement non memorisee.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function useStoredList(key: string): string[] {
  return useSyncExternalStore(
    subscribe,
    () => read(key),
    () => EMPTY
  );
}

const FAVORITES_KEY = "nav-favorites";
const RECENTS_KEY = "nav-recents";

export function useFavorites() {
  const favorites = useStoredList(FAVORITES_KEY);
  function toggleFavorite(href: string) {
    const current = read(FAVORITES_KEY);
    write(FAVORITES_KEY, current.includes(href) ? current.filter((h) => h !== href) : [...current, href]);
  }
  return { favorites, toggleFavorite };
}

export function useRecents() {
  return useStoredList(RECENTS_KEY);
}

/** Place `href` en tete de l'historique (sans doublon, borne a MAX_RECENTS). */
export function pushRecent(href: string) {
  const current = read(RECENTS_KEY);
  if (current[0] === href) return;
  write(RECENTS_KEY, [href, ...current.filter((h) => h !== href)].slice(0, MAX_RECENTS));
}
