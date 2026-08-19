import { getRequestConfig } from "next-intl/server";

// Mode non-routé (pas de prefixe /fr, /en dans les URLs) — cahier des
// charges V3.0 §3 (objectif "préparer la plateforme à fonctionner à
// l'échelle internationale") ne demande pas encore de restructurer les
// routes existantes, seulement de sortir les chaînes du code en dur.
// Locale statique pour l'instant : aucune deuxième langue n'est encore
// fournie (voir messages/fr.json), donc rien à négocier côté utilisateur.
export default getRequestConfig(async () => {
  const locale = "fr";
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
