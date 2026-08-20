import { describe, it, expect } from "vitest";
import { classifyWorkload, computeWorkload } from "@/lib/workload";

describe("classifyWorkload", () => {
  it("classe sous 70% comme SOUS_CHARGE", () => {
    expect(classifyWorkload(0)).toBe("SOUS_CHARGE");
    expect(classifyWorkload(69)).toBe("SOUS_CHARGE");
  });

  it("classe entre 70 et 99% comme CHARGE_NORMALE", () => {
    expect(classifyWorkload(70)).toBe("CHARGE_NORMALE");
    expect(classifyWorkload(99)).toBe("CHARGE_NORMALE");
  });

  it("classe 100% et au-dela comme SURCHARGE", () => {
    expect(classifyWorkload(100)).toBe("SURCHARGE");
    expect(classifyWorkload(150)).toBe("SURCHARGE");
  });
});

describe("computeWorkload", () => {
  const baseUser = { id: "u1", name: "Awa", roleLabel: "Collaboratrice", capaciteHebdomadaireHeures: 35 };

  it("calcule le taux d'occupation a partir des taches actives assignees", () => {
    const result = computeWorkload(
      [baseUser],
      [
        {
          statut: "EN_COURS",
          tempsEstimeHeures: 14,
          tempsReelHeures: null,
          responsablePrincipalId: "u1",
          assigneeIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          statut: "TERMINEE",
          tempsEstimeHeures: 10,
          tempsReelHeures: null,
          responsablePrincipalId: "u1",
          assigneeIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      []
    );

    expect(result).toHaveLength(1);
    // Seule la tache EN_COURS (active) compte dans la charge, pas la terminee.
    expect(result[0].chargeHeures).toBe(14);
    expect(result[0].tauxOccupation).toBe(Math.round((14 / 35) * 100));
    expect(result[0].statut).toBe("SOUS_CHARGE");
  });

  it("compte une tache une seule fois meme si responsable ET assignee", () => {
    const result = computeWorkload(
      [baseUser],
      [
        {
          statut: "EN_COURS",
          tempsEstimeHeures: 20,
          tempsReelHeures: null,
          responsablePrincipalId: "u1",
          assigneeIds: ["u1"],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      []
    );
    expect(result[0].tacheCount).toBe(1);
    expect(result[0].chargeHeures).toBe(20);
  });

  it("calcule la disponibilite restante sans jamais descendre sous zero", () => {
    const surcharge = computeWorkload(
      [baseUser],
      [
        {
          statut: "EN_COURS",
          tempsEstimeHeures: 50,
          tempsReelHeures: null,
          responsablePrincipalId: "u1",
          assigneeIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      []
    );
    expect(surcharge[0].disponibiliteHeures).toBe(0);
    expect(surcharge[0].enSurcharge).toBe(true);
  });

  it("calcule le temps moyen de realisation uniquement sur les taches terminees avec temps reel", () => {
    const result = computeWorkload(
      [baseUser],
      [
        {
          statut: "TERMINEE",
          tempsEstimeHeures: null,
          tempsReelHeures: 8,
          responsablePrincipalId: "u1",
          assigneeIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          statut: "TERMINEE",
          tempsEstimeHeures: null,
          tempsReelHeures: 12,
          responsablePrincipalId: "u1",
          assigneeIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          statut: "EN_COURS",
          tempsEstimeHeures: null,
          tempsReelHeures: 100,
          responsablePrincipalId: "u1",
          assigneeIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      []
    );
    expect(result[0].tempsMoyenRealisationHeures).toBe(10);
  });

  it("retourne null pour le temps moyen si aucune tache terminee", () => {
    const result = computeWorkload([baseUser], [], []);
    expect(result[0].tempsMoyenRealisationHeures).toBeNull();
  });

  it("marque en conge aujourd'hui uniquement si un conge APPROUVE couvre la date du jour", () => {
    const today = new Date("2026-08-20T12:00:00Z");
    const result = computeWorkload(
      [baseUser],
      [],
      [
        {
          userId: "u1",
          dateDebut: new Date("2026-08-19"),
          dateFin: new Date("2026-08-21"),
          statut: "APPROUVE",
        },
      ],
      today
    );
    expect(result[0].enCongeAujourdhui).toBe(true);
  });

  it("ignore un conge non APPROUVE pour le statut de conge du jour", () => {
    const today = new Date("2026-08-20T12:00:00Z");
    const result = computeWorkload(
      [baseUser],
      [],
      [
        {
          userId: "u1",
          dateDebut: new Date("2026-08-19"),
          dateFin: new Date("2026-08-21"),
          statut: "EN_ATTENTE",
        },
      ],
      today
    );
    expect(result[0].enCongeAujourdhui).toBe(false);
  });

  it("trie le resultat par taux d'occupation decroissant", () => {
    const result = computeWorkload(
      [
        { id: "u1", name: "Peu charge", roleLabel: "R", capaciteHebdomadaireHeures: 35 },
        { id: "u2", name: "Tres charge", roleLabel: "R", capaciteHebdomadaireHeures: 35 },
      ],
      [
        {
          statut: "EN_COURS",
          tempsEstimeHeures: 5,
          tempsReelHeures: null,
          responsablePrincipalId: "u1",
          assigneeIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          statut: "EN_COURS",
          tempsEstimeHeures: 30,
          tempsReelHeures: null,
          responsablePrincipalId: "u2",
          assigneeIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      []
    );
    expect(result.map((r) => r.userId)).toEqual(["u2", "u1"]);
  });
});
