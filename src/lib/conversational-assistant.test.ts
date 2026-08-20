import { describe, it, expect } from "vitest";
import { parseIntent, getAiRoleFlavor } from "@/lib/conversational-assistant";

describe("parseIntent", () => {
  it("detecte une demande de rendez-vous aujourd'hui par defaut", () => {
    expect(parseIntent("Quels sont mes rendez-vous ?")).toEqual({
      type: "RENDEZ_VOUS",
      when: "aujourd'hui",
    });
  });

  it("detecte une demande de rendez-vous demain", () => {
    expect(parseIntent("mes réunions de demain")).toEqual({
      type: "RENDEZ_VOUS",
      when: "demain",
    });
  });

  it("detecte les projets critiques", () => {
    expect(parseIntent("Montre-moi les projets critiques")).toEqual({
      type: "PROJETS_CRITIQUES",
    });
  });

  it("extrait le responsable et le titre d'une proposition de creation de tache", () => {
    expect(parseIntent("Crée une tâche pour Jean concernant le rapport trimestriel")).toEqual({
      type: "CREER_TACHE_PROPOSAL",
      responsableNom: "Jean",
      titre: "le rapport trimestriel",
    });
  });

  it("retire la ponctuation finale du titre de tache extrait", () => {
    const result = parseIntent("Crée une tâche pour Marie concernant le budget.");
    expect(result).toMatchObject({ type: "CREER_TACHE_PROPOSAL", titre: "le budget" });
  });

  it("retombe sur INCONNU si aucune regle ne correspond", () => {
    expect(parseIntent("bonjour comment ça va")).toEqual({
      type: "INCONNU",
      texte: "bonjour comment ça va",
    });
  });
});

describe("getAiRoleFlavor", () => {
  it("retourne le cadrage specifique d'un role connu", () => {
    const flavor = getAiRoleFlavor("DIRECTEUR_GENERAL");
    expect(flavor.label).toBe("IA stratégique");
    expect(flavor.suggestions.length).toBeGreaterThan(0);
  });

  it("retombe sur un cadrage generique sans suggestion pour un role inconnu/absent", () => {
    const flavor = getAiRoleFlavor(undefined);
    expect(flavor.label).toBe("IA générale");
    expect(flavor.suggestions).toEqual([]);
  });
});
