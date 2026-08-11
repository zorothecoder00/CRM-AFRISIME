"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ThemeProvider } from "next-themes";

type Language = "fr" | "en";
type Currency = "XOF" | "EUR" | "USD";

type AppSettings = {
  language: Language;
  setLanguage: (language: Language) => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
};

const STORAGE_KEY = "afriflow-app-settings";

const AppSettingsContext = createContext<AppSettings | null>(null);

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("fr");
  const [currency, setCurrency] = useState<Currency>("XOF");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      // Lecture unique post-montage pour rester identique au rendu serveur
      // (localStorage n'existe pas cote serveur) et eviter un hydration mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (parsed.language) setLanguage(parsed.language);
      if (parsed.currency) setCurrency(parsed.currency);
    } catch {
      // valeur corrompue, on garde les defauts
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ language, currency }));
  }, [language, currency]);

  return (
    <AppSettingsContext.Provider value={{ language, setLanguage, currency, setCurrency }}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error("useAppSettings doit etre utilise a l'interieur de AppSettingsProvider");
  }
  return context;
}
