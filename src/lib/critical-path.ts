// Chemin critique (Project Studio §19) — méthode du chemin critique (CPM),
// généralisée aux 4 types de dépendance du Gantt Builder (§18) via les
// formules standard du Precedence Diagramming Method. Les durées sont en
// jours entiers (pas d'heures/minutes) : cohérent avec le reste de l'app qui
// ne modélise les tâches qu'au jour près (Task.dateDebut/echeance).

export type CriticalPathTaskInput = {
  id: string;
  titre: string;
  dateDebut: Date | null;
  echeance: Date | null;
  tempsEstimeHeures: number | null;
};

export type CriticalPathDependencyInput = {
  taskId: string;
  dependsOnTaskId: string;
  type: string;
};

export type CriticalPathResult = {
  id: string;
  titre: string;
  dureeJours: number;
  debutAuPlusTot: number;
  finAuPlusTot: number;
  debutAuPlusTard: number;
  finAuPlusTard: number;
  marge: number;
  critique: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function computeDuration(task: CriticalPathTaskInput): number {
  if (task.dateDebut && task.echeance) {
    return Math.max(1, Math.round((task.echeance.getTime() - task.dateDebut.getTime()) / DAY_MS));
  }
  if (task.tempsEstimeHeures) {
    return Math.max(1, Math.ceil(task.tempsEstimeHeures / 8));
  }
  return 1;
}

/**
 * Retourne null si le graphe de dépendances contient un cycle (impossible à
 * ordonner topologiquement) — le chemin critique n'a pas de sens dans ce cas,
 * l'appelant doit l'afficher comme une erreur plutôt qu'un résultat partiel.
 */
export function computeCriticalPath(
  tasks: CriticalPathTaskInput[],
  dependencies: CriticalPathDependencyInput[]
): { tasks: CriticalPathResult[]; projectEndDays: number } | null {
  const duration = new Map(tasks.map((t) => [t.id, computeDuration(t)]));
  const taskIds = new Set(tasks.map((t) => t.id));
  const edges = dependencies.filter((d) => taskIds.has(d.taskId) && taskIds.has(d.dependsOnTaskId));

  const predecessors = new Map<string, CriticalPathDependencyInput[]>();
  const successors = new Map<string, CriticalPathDependencyInput[]>();
  for (const t of tasks) {
    predecessors.set(t.id, []);
    successors.set(t.id, []);
  }
  for (const e of edges) {
    predecessors.get(e.taskId)!.push(e);
    successors.get(e.dependsOnTaskId)!.push(e);
  }

  // Tri topologique (Kahn) sur dependsOnTaskId -> taskId.
  const inDegree = new Map(tasks.map((t) => [t.id, predecessors.get(t.id)!.length]));
  const queue = tasks.filter((t) => inDegree.get(t.id) === 0).map((t) => t.id);
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const succ of successors.get(id)!) {
      const remaining = inDegree.get(succ.taskId)! - 1;
      inDegree.set(succ.taskId, remaining);
      if (remaining === 0) queue.push(succ.taskId);
    }
  }
  if (order.length !== tasks.length) return null; // cycle

  const es = new Map<string, number>();
  const ef = new Map<string, number>();
  for (const id of order) {
    const dur = duration.get(id)!;
    let start = 0;
    for (const dep of predecessors.get(id)!) {
      const predEs = es.get(dep.dependsOnTaskId)!;
      const predEf = ef.get(dep.dependsOnTaskId)!;
      if (dep.type === "START_TO_START") start = Math.max(start, predEs);
      else if (dep.type === "FINISH_TO_FINISH") start = Math.max(start, predEf - dur);
      else if (dep.type === "START_TO_FINISH") start = Math.max(start, predEs - dur);
      else start = Math.max(start, predEf); // FINISH_TO_START (defaut), BLOQUE, LIE_A
    }
    es.set(id, start);
    ef.set(id, start + dur);
  }

  const projectEndDays = Math.max(...order.map((id) => ef.get(id)!));

  const lf = new Map<string, number>();
  const ls = new Map<string, number>();
  for (const id of [...order].reverse()) {
    const dur = duration.get(id)!;
    const succs = successors.get(id)!;
    let finish = projectEndDays;
    if (succs.length > 0) {
      finish = Math.min(
        ...succs.map((dep) => {
          const succLs = ls.get(dep.taskId)!;
          const succLf = lf.get(dep.taskId)!;
          if (dep.type === "START_TO_START") return succLs + dur;
          if (dep.type === "FINISH_TO_FINISH") return succLf;
          if (dep.type === "START_TO_FINISH") return succLf + dur;
          return succLs; // FINISH_TO_START (defaut), BLOQUE, LIE_A
        })
      );
    }
    lf.set(id, finish);
    ls.set(id, finish - dur);
  }

  const results: CriticalPathResult[] = tasks.map((t) => {
    const marge = ls.get(t.id)! - es.get(t.id)!;
    return {
      id: t.id,
      titre: t.titre,
      dureeJours: duration.get(t.id)!,
      debutAuPlusTot: es.get(t.id)!,
      finAuPlusTot: ef.get(t.id)!,
      debutAuPlusTard: ls.get(t.id)!,
      finAuPlusTard: lf.get(t.id)!,
      marge,
      critique: marge <= 0,
    };
  });

  return { tasks: results, projectEndDays };
}
