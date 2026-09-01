/**
 * Normalise un numero de telephone saisi librement (User.phone,
 * CrmContact.telephone...) au format E.164 attendu par les fournisseurs SMS/
 * WhatsApp (Africa's Talking, Twilio, Meta Cloud API — tous exigent le "+"
 * et l'indicatif pays, sans espaces/tirets). Un numero local (sans "+") est
 * complete avec DEFAULT_PHONE_PREFIX (Module 9 — Téléphonie & alertes),
 * l'indicatif du pays d'exploitation principal.
 */
export function normalizePhoneNumber(raw: string): string | null {
  const digitsAndPlus = raw.trim().replace(/[^\d+]/g, "");
  if (!digitsAndPlus) return null;

  if (digitsAndPlus.startsWith("+")) {
    return digitsAndPlus;
  }

  const defaultPrefix = process.env.DEFAULT_PHONE_PREFIX?.replace(/\D/g, "") || "228";
  // Numero local commencant par 0 (convention ouest-africaine) : le 0 est un
  // prefixe de composition national, remplace par l'indicatif pays plutot
  // que concatene.
  const withoutLeadingZero = digitsAndPlus.startsWith("0") ? digitsAndPlus.slice(1) : digitsAndPlus;
  return `+${defaultPrefix}${withoutLeadingZero}`;
}
