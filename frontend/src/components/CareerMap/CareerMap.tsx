import { useEffect, useMemo } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { BurnoutZone } from "./burnout";
import type { CareerEdge, CareerNode } from "../../types/careerMap";

export type CareerMapProps = {
  /** Nodes from backend / Gemini (React Flow shape) */
  nodes: CareerNode[];
  /** Directed edges between roles / milestones */
  edges: CareerEdge[];
  /**
   * When `risk`, high-stress / long-horizon paths fade; low-stress near-term steps pop.
   * Wire this to your burnout score bucket from the dashboard.
   */
  burnoutZone?: BurnoutZone;
  className?: string;
};

/**
 * Inner chart: must sit under ReactFlowProvider (see export default wrapper below).
 */
function CareerMapInner({
  nodes: nodesProp,
  edges: edgesProp,
  burnoutZone = "healthy",
  className = "",
}: CareerMapProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(nodesProp);
  const [edges, setEdges, onEdgesChange] = useEdgesState(edgesProp);

  // Keep internal RF state in sync when the parent refetches from the API
  useEffect(() => {
    setNodes(nodesProp);
  }, [nodesProp, setNodes]);

  useEffect(() => {
    setEdges(edgesProp);
  }, [edgesProp, setEdges]);

  const styledNodes = useMemo(() => {
    if (burnoutZone !== "risk") {
      return nodes.map((n) => ({
        ...n,
        style: { ...n.style, opacity: 1 },
      }));
    }

    return nodes.map((n) => {
      const stress = n.data?.stressLevel;
      const months = n.data?.timelineMonths ?? 0;
      // Paths that are cognitively "heavy" when the user is already depleted
      const isHighLoad = stress === "high" || months >= 12;
      const isMicroLowStress =
        stress === "low" && months <= 3;

      return {
        ...n,
        style: {
          ...n.style,
          opacity: isHighLoad ? 0.22 : 1,
          filter: isHighLoad ? "grayscale(0.6)" : undefined,
        },
        className: [
          n.className,
          isMicroLowStress ? "ring-2 ring-emerald-400/80 ring-offset-2 ring-offset-slate-950" : "",
        ]
          .filter(Boolean)
          .join(" "),
      };
    });
  }, [nodes, burnoutZone]);

  return (
    <div className={`h-full min-h-[420px] w-full rounded-xl border border-slate-800 bg-slate-900/50 ${className}`}>
      <ReactFlow
        nodes={styledNodes}
        edges={edges}
        fitView
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        proOptions={{ hideAttribution: true }}
      >
        <MiniMap className="!bg-slate-900/90" maskColor="rgb(15 23 42 / 0.85)" />
        <Controls className="!bg-slate-900 !border-slate-700 [&_button]:!fill-slate-200" />
        <Background color="#334155" gap={20} size={1} />
      </ReactFlow>
    </div>
  );
}

/**
 * Career roadmap canvas. Pass JSON `nodes` / `edges` from FastAPI; optionally drive
 * adaptive styling with `burnoutZone`.
 */
export function CareerMap(props: CareerMapProps) {
  return (
    <ReactFlowProvider>
      <CareerMapInner {...props} />
    </ReactFlowProvider>
  );
}

export default CareerMap;
