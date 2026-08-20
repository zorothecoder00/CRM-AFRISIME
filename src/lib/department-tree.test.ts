import { describe, it, expect } from "vitest";
import {
  departmentLevelLabel,
  computeDepartmentDepth,
  collectDescendantIds,
  directChildren,
  buildBreadcrumb,
  type DepartmentNode,
} from "@/lib/department-tree";

// Meme arborescence que celle creee en base de demo dans cette session :
// Departement IT (racine) -> Developpement Web -> Frontend
//                          -> Infrastructure
const it_ = { id: "it", name: "Departement IT", parentId: null };
const devWeb = { id: "devweb", name: "Developpement Web", parentId: "it" };
const frontend = { id: "frontend", name: "Frontend", parentId: "devweb" };
const infra = { id: "infra", name: "Infrastructure", parentId: "it" };
const all: DepartmentNode[] = [it_, devWeb, frontend, infra];
const byId = new Map(all.map((d) => [d.id, d]));

describe("departmentLevelLabel", () => {
  it("mappe la profondeur 0 sur Direction, 1 sur Departement, 2+ sur Service", () => {
    expect(departmentLevelLabel(0)).toBe("Direction");
    expect(departmentLevelLabel(1)).toBe("Département");
    expect(departmentLevelLabel(2)).toBe("Service");
    expect(departmentLevelLabel(5)).toBe("Service");
  });
});

describe("computeDepartmentDepth", () => {
  it("calcule la profondeur exacte a chaque niveau de l'arbre", () => {
    expect(computeDepartmentDepth("it", byId)).toBe(0);
    expect(computeDepartmentDepth("devweb", byId)).toBe(1);
    expect(computeDepartmentDepth("frontend", byId)).toBe(2);
  });

  it("ne boucle pas indefiniment si une reference circulaire existe", () => {
    const cyclic = new Map([
      ["a", { id: "a", name: "A", parentId: "b" }],
      ["b", { id: "b", name: "B", parentId: "a" }],
    ]);
    expect(() => computeDepartmentDepth("a", cyclic)).not.toThrow();
  });
});

describe("collectDescendantIds", () => {
  it("inclut le noeud lui-meme et tous ses descendants", () => {
    const ids = collectDescendantIds("it", all);
    expect(ids.sort()).toEqual(["devweb", "frontend", "infra", "it"].sort());
  });

  it("s'arrete a une feuille sans descendant", () => {
    expect(collectDescendantIds("frontend", all)).toEqual(["frontend"]);
  });
});

describe("directChildren", () => {
  it("retourne uniquement les enfants directs, pas les petits-enfants", () => {
    const children = directChildren("it", all);
    expect(children.map((c) => c.id).sort()).toEqual(["devweb", "infra"]);
  });

  it("retourne un tableau vide pour une feuille", () => {
    expect(directChildren("frontend", all)).toEqual([]);
  });
});

describe("buildBreadcrumb", () => {
  it("construit le fil d'ariane de la racine jusqu'au noeud courant", () => {
    const breadcrumb = buildBreadcrumb("frontend", byId);
    expect(breadcrumb.map((d) => d.id)).toEqual(["it", "devweb", "frontend"]);
  });

  it("retourne juste le noeud pour une racine", () => {
    expect(buildBreadcrumb("it", byId).map((d) => d.id)).toEqual(["it"]);
  });
});
