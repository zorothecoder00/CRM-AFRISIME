"use client";

import { useRouter } from "next/navigation";
import type { TaskRow } from "@/components/tasks/task-list-view";

export type MindMapTaskRow = TaskRow & { parentTaskId: string | null };

type LaidOutNode = {
  task: MindMapTaskRow;
  x: number;
  y: number;
  children: LaidOutNode[];
};

const NODE_WIDTH = 168;
const NODE_HEIGHT = 40;
const LEVEL_GAP = 64;
const SIBLING_GAP = 12;

function layout(tasks: MindMapTaskRow[]): { roots: LaidOutNode[]; width: number; height: number } {
  const byParent = new Map<string | null, MindMapTaskRow[]>();
  for (const task of tasks) {
    const key = task.parentTaskId && tasks.some((t) => t.id === task.parentTaskId) ? task.parentTaskId : null;
    const list = byParent.get(key) ?? [];
    list.push(task);
    byParent.set(key, list);
  }

  let cursorY = 0;

  function build(parentId: string | null, depth: number): LaidOutNode[] {
    const children = byParent.get(parentId) ?? [];
    return children.map((task) => {
      const kids = build(task.id, depth + 1);
      let y: number;
      if (kids.length > 0) {
        y = (kids[0].y + kids[kids.length - 1].y) / 2;
      } else {
        y = cursorY;
        cursorY += NODE_HEIGHT + SIBLING_GAP;
      }
      return { task, x: depth * (NODE_WIDTH + LEVEL_GAP), y, children: kids };
    });
  }

  const roots = build(null, 0);
  const maxDepth = Math.max(0, ...tasks.map((t) => (t.parentTaskId ? 1 : 0)));
  const width = (maxDepth + 1) * (NODE_WIDTH + LEVEL_GAP) + NODE_WIDTH;
  const height = Math.max(cursorY, NODE_HEIGHT);

  return { roots, width, height };
}

function flatten(nodes: LaidOutNode[]): LaidOutNode[] {
  return nodes.flatMap((n) => [n, ...flatten(n.children)]);
}

/** Vue Mind Map (cahier des charges §7) : hiérarchie tâches/sous-tâches en arbre. */
export function TaskMindMapView({ tasks }: { tasks: MindMapTaskRow[] }) {
  const router = useRouter();

  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune tâche.</p>;
  }

  const { roots, width, height } = layout(tasks);
  const allNodes = flatten(roots);

  return (
    <div className="overflow-x-auto overflow-y-auto rounded-md border" style={{ maxHeight: 560 }}>
      <svg
        width={Math.max(width, 400)}
        height={Math.max(height + NODE_HEIGHT, 200)}
        className="block"
        role="img"
        aria-label="Carte mentale des tâches"
      >
        {allNodes.map((node) =>
          node.children.map((child) => (
            <path
              key={`${node.task.id}-${child.task.id}`}
              d={`M ${node.x + NODE_WIDTH} ${node.y + NODE_HEIGHT / 2} C ${node.x + NODE_WIDTH + LEVEL_GAP / 2} ${node.y + NODE_HEIGHT / 2}, ${child.x - LEVEL_GAP / 2} ${child.y + NODE_HEIGHT / 2}, ${child.x} ${child.y + NODE_HEIGHT / 2}`}
              fill="none"
              className="stroke-muted-foreground/40"
              strokeWidth={1.5}
            />
          ))
        )}
        {allNodes.map((node) => (
          <g
            key={node.task.id}
            transform={`translate(${node.x}, ${node.y})`}
            className="cursor-pointer"
            onClick={() => router.push(`/taches/${node.task.id}`)}
          >
            <rect
              width={NODE_WIDTH}
              height={NODE_HEIGHT}
              rx={8}
              className="fill-card stroke-border"
              strokeWidth={1}
            />
            <foreignObject width={NODE_WIDTH} height={NODE_HEIGHT}>
              <div className="flex h-full items-center px-2.5 text-xs font-medium text-foreground">
                <span className="truncate">{node.task.titre}</span>
              </div>
            </foreignObject>
          </g>
        ))}
      </svg>
    </div>
  );
}
