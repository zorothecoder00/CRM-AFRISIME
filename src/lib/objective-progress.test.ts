import { describe, it, expect } from "vitest";
import {
  indicatorProgress,
  objectiveProgress,
  timeElapsedRatio,
  computeObjectiveProgress,
} from "@/lib/objective-progress";

describe("indicatorProgress", () => {
  it("calcule le pourcentage actuelle/cible", () => {
    expect(indicatorProgress(50, 100)).toBe(50);
    expect(indicatorProgress(25, 50)).toBe(50);
  });

  it("plafonne a 100 meme si la valeur actuelle depasse la cible", () => {
    expect(indicatorProgress(150, 100)).toBe(100);
  });

  it("retourne 0 si la cible est 0 (evite la division par zero)", () => {
    expect(indicatorProgress(10, 0)).toBe(0);
  });
});

describe("objectiveProgress", () => {
  it("retourne 0 sans indicateur", () => {
    expect(objectiveProgress([])).toBe(0);
  });

  it("fait la moyenne de plusieurs indicateurs", () => {
    expect(
      objectiveProgress([
        { valeurActuelle: 100, valeurCible: 100 }, // 100%
        { valeurActuelle: 0, valeurCible: 100 }, // 0%
      ])
    ).toBe(50);
  });
});

describe("timeElapsedRatio", () => {
  it("retourne 1 si la periode est deja terminee", () => {
    const dateDebut = new Date("2026-01-01");
    const dateFin = new Date("2026-02-01");
    expect(timeElapsedRatio(dateDebut, dateFin)).toBe(1);
  });

  it("retourne 1 si dateFin <= dateDebut (periode degeneree)", () => {
    const date = new Date("2026-01-01");
    expect(timeElapsedRatio(date, date)).toBe(1);
  });
});

describe("computeObjectiveProgress", () => {
  it("signale un ecart positif quand l'objectif est en retard sur son echeancier", () => {
    // Periode entierement ecoulee (elapsed = 1) mais indicateurs a 0% -> retard maximal.
    const result = computeObjectiveProgress({
      dateDebut: new Date("2020-01-01"),
      dateFin: new Date("2020-02-01"),
      indicators: [{ valeurCible: 100, valeurActuelle: 0 }],
    });
    expect(result.timeElapsedRatio).toBe(1);
    expect(result.progressRatio).toBe(0);
    expect(result.ecart).toBe(1);
  });

  it("ecart nul quand l'objectif est deja atteint a 100% (independamment du temps ecoule)", () => {
    const result = computeObjectiveProgress({
      dateDebut: new Date("2020-01-01"),
      dateFin: new Date("2020-02-01"),
      indicators: [{ valeurCible: 100, valeurActuelle: 100 }],
    });
    expect(result.progressRatio).toBe(1);
    expect(result.ecart).toBe(0);
  });
});
