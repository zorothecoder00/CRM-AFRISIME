import { describe, it, expect } from "vitest";
import {
  toneForStatus,
  toneForPriority,
  toneForNiveau,
  toneForOpportunityStatus,
  toneForCriticite,
  accentForStatus,
} from "@/lib/status-tone";

describe("toneForStatus", () => {
  it("reconnait un statut bloque/en retard comme destructive", () => {
    expect(toneForStatus("BLOQUEE")).toBe("destructive");
    expect(toneForStatus("EN_RETARD")).toBe("destructive");
    expect(toneForStatus("NON_ATTEINT")).toBe("destructive");
  });

  it("reconnait un statut termine/atteint comme success", () => {
    expect(toneForStatus("TERMINEE")).toBe("success");
    expect(toneForStatus("ATTEINT")).toBe("success");
  });

  it("reconnait un statut en cours/en revision comme info", () => {
    expect(toneForStatus("EN_COURS")).toBe("info");
    expect(toneForStatus("EN_REVISION")).toBe("info");
  });

  it("est insensible a la casse", () => {
    expect(toneForStatus("termineE")).toBe("success");
  });

  it("retombe sur secondary pour un statut non reconnu", () => {
    expect(toneForStatus("A_FAIRE")).toBe("secondary");
  });
});

describe("toneForPriority", () => {
  it("classe TRES_HAUTE et CRITIQUE en destructive", () => {
    expect(toneForPriority("TRES_HAUTE")).toBe("destructive");
    expect(toneForPriority("CRITIQUE")).toBe("destructive");
  });

  it("classe HAUTE en warning, MOYENNE en success, le reste en secondary", () => {
    expect(toneForPriority("HAUTE")).toBe("warning");
    expect(toneForPriority("MOYENNE")).toBe("success");
    expect(toneForPriority("BASSE")).toBe("secondary");
  });
});

describe("toneForNiveau", () => {
  it("mappe FAIBLE/ELEVE/MOYEN sur secondary/destructive/warning", () => {
    expect(toneForNiveau("FAIBLE")).toBe("secondary");
    expect(toneForNiveau("ELEVE")).toBe("destructive");
    expect(toneForNiveau("MOYEN")).toBe("warning");
  });
});

describe("toneForOpportunityStatus", () => {
  it("suit le vocabulaire propre au pipeline CRM (table exacte, pas des mots-cles)", () => {
    expect(toneForOpportunityStatus("GAGNEE")).toBe("success");
    expect(toneForOpportunityStatus("PERDUE")).toBe("destructive");
    expect(toneForOpportunityStatus("NOUVEAU")).toBe("secondary");
  });
});

describe("toneForCriticite", () => {
  it("classe ELEVE et CRITIQUE tous deux en destructive (echelle a 5 crans)", () => {
    expect(toneForCriticite("ELEVE")).toBe("destructive");
    expect(toneForCriticite("CRITIQUE")).toBe("destructive");
  });
});

describe("accentForStatus", () => {
  it("degrade la teinte secondary en accent none (pas de secondary cote Card)", () => {
    expect(accentForStatus("A_FAIRE")).toBe("none");
  });

  it("conserve les autres teintes telles quelles pour l'accent de carte", () => {
    expect(accentForStatus("TERMINEE")).toBe("success");
  });
});
