"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ReactFlow, Background, Controls, Handle, Position, type Node, type Edge, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { GraphNode, GraphEdge } from "@/lib/relationship-graph";
import { Building2, User, Handshake, MessageSquare, FolderKanban, ListChecks } from "lucide-react";

const TYPE_META: Record<string, { label: string; icon: typeof Building2; className: string }> = {
  CrmOrganization: { label: "Organisation", icon: Building2, className: "border-info bg-info/10" },
  CrmContact: { label: "Contact", icon: User, className: "border-primary bg-primary/10" },
  User: { label: "Commercial", icon: User, className: "border-success bg-success/10" },
  CrmOpportunity: { label: "Opportunité", icon: Handshake, className: "border-warning bg-warning/10" },
  CrmInteraction: { label: "Interaction", icon: MessageSquare, className: "border-muted-foreground/40 bg-muted" },
  Project: { label: "Projet", icon: FolderKanban, className: "border-info bg-info/10" },
  Task: { label: "Tâche", icon: ListChecks, className: "border-muted-foreground/40 bg-muted" },
};

type EntityNodeData = { label: string; entityType: string; href?: string };

function EntityNode({ data }: NodeProps & { data: EntityNodeData }) {
  const meta = TYPE_META[data.entityType] ?? { label: data.entityType, icon: Building2, className: "border-border bg-card" };
  const Icon = meta.icon;
  const content = (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs shadow-sm ${meta.className}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <div className="min-w-0">
        <div className="truncate font-medium">{data.label}</div>
        <div className="text-[10px] text-muted-foreground">{meta.label}</div>
      </div>
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <Handle type="source" position={Position.Right} className="!opacity-0" />
    </div>
  );
  return data.href ? (
    <Link href={data.href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

const nodeTypes = { entityNode: EntityNode };

/**
 * V2.2 §12 — Relationship Intelligence. Wrapper @xyflow/react ; le layout
 * (positions x/y) est déjà calculé par src/lib/relationship-graph.ts (une
 * colonne fixe par type d'entité), pas de layout dynamique côté client.
 */
export function RelationshipGraphView({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const rfNodes: Node[] = useMemo(
    () =>
      nodes.map((n) => ({
        id: n.id,
        type: "entityNode",
        position: n.position,
        data: n.data,
      })),
    [nodes]
  );
  const rfEdges: Edge[] = useMemo(
    () => edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label, animated: false })),
    [edges]
  );

  if (nodes.length <= 1) {
    return <p className="text-sm text-muted-foreground">Aucune relation à cartographier pour le moment.</p>;
  }

  return (
    <div style={{ height: 500 }} className="rounded-md border">
      <ReactFlow nodes={rfNodes} edges={rfEdges} nodeTypes={nodeTypes} fitView proOptions={{ hideAttribution: true }}>
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
