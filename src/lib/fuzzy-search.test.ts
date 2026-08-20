import { describe, it, expect } from "vitest";
import { sortByRelevance } from "@/lib/fuzzy-search";

describe("sortByRelevance", () => {
  it("reordonne les lignes selon l'ordre des ids fourni (le plus pertinent en tete)", () => {
    const rows = [
      { id: "c", label: "C" },
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ];
    const result = sortByRelevance(rows, ["a", "b", "c"]);
    expect(result.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("ne mute pas le tableau d'entree", () => {
    const rows = [
      { id: "b", label: "B" },
      { id: "a", label: "A" },
    ];
    const original = [...rows];
    sortByRelevance(rows, ["a", "b"]);
    expect(rows).toEqual(original);
  });

  it("place les ids absents de orderedIds en tete (rang par defaut 0)", () => {
    const rows = [
      { id: "z", label: "Absent du classement" },
      { id: "b", label: "B" },
    ];
    // "z" n'est pas dans orderedIds -> rang 0, arrive avant "b" (rang 1).
    const result = sortByRelevance(rows, ["a", "b"]);
    expect(result[0].id).toBe("z");
  });
});
