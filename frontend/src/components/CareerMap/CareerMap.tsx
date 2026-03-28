import { useEffect, useMemo } from "react";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { BurnoutZone } from "./burnout";
import type { CareerEdge, CareerNode } from "../../types/careerMap";

export type CareerMapProps = {
  nodes: CareerNode[];
  edges: CareerEdge[];
  burnoutZone?: BurnoutZone;
  className?: string;
};

/* ── Custom node ─────────────────────────────────────────── */
function CareerNodeComponent({ data }: { data: Record<string, unknown> }) {
  const label = (data.label as string) ?? "Milestone";
  const role = data.role as string | undefined;
  const stress = (data.stressLevel as string) ?? "low";
  const months = (data.timelineMonths as number) ?? 0;
  const readiness = data.readiness as number | undefined;
  const description = data.description as string | undefined;

  const borderColor: Record<string, string> = {
    low: "border-emerald-500/50",
    medium: "border-amber-500/50",
    high: "border-red-500/50",
  };
  const badgeColor: Record<string, string> = {
    low: "bg-emerald-500/15 text-emerald-400",
    medium: "bg-amber-500/15 text-amber-400",
    high: "bg-red-500/15 text-red-400",
  };
  const timeline =
    months === 0 ? "Now" : months < 12 ? `${months} mo` : `${Math.round(months / 12)} yr`;

  return (
    <div
      className={`rounded-xl border bg-slate-900/90 px-4 py-3 shadow-lg backdrop-blur ${borderColor[stress] ?? borderColor.low}`}
      style={{ width: 200, fontFamily: "'Inter', sans-serif" }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-indigo-400 !border-slate-900"
      />

      <p className="text-[13px] font-semibold text-white leading-snug">{label}</p>
      {role && <p className="mt-0.5 text-[11px] text-slate-400">{role}</p>}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badgeColor[stress] ?? badgeColor.low}`}>
          {stress}
        </span>
        <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-[10px] font-medium text-slate-300">
          {timeline}
        </span>
        {readiness !== undefined && (
          <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
            {Math.round(readiness * 100)}%
          </span>
        )}
      </div>

      {description && (
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{description}</p>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-cyan-400 !border-slate-900"
      />
    </div>
  );
}

const nodeTypes = { default: CareerNodeComponent };

/* ── Inner (needs ReactFlowProvider ancestor) ────────────── */
function CareerMapInner({
  nodes: nodesProp,
  edges: edgesProp,
  burnoutZone = "healthy",
  className = "",
}: CareerMapProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<CareerNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<CareerEdge>([]);
  const { fitView } = useReactFlow();

  // Sync from props & fit view after data arrives
  useEffect(() => {
    if (!nodesProp.length) return;
    const mapped = nodesProp.map((n) => ({ ...n, type: "default" }));
    setNodes(mapped);
    setEdges(edgesProp);
    // Wait one tick so React Flow can measure, then fit
    requestAnimationFrame(() => {
      setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 50);
    });
  }, [nodesProp, edgesProp, setNodes, setEdges, fitView]);

  /* Burnout-adaptive styling */
  const styledNodes = useMemo(() => {
    return nodes.map((n) => {
      const stress = n.data?.stressLevel as string | undefined;
      const months = (n.data?.timelineMonths as number) ?? 0;
      const isHighLoad = stress === "high" || months >= 12;
      const isLow = stress === "low" && months <= 3;

      let opacity = 1;
      let filter: string | undefined;
      let extra = "";

      if (burnoutZone === "risk") {
        if (isHighLoad) {
          opacity = 0.15;
          filter = "grayscale(0.7)";
        } else if (isLow) {
          extra = "ring-2 ring-emerald-400/70 ring-offset-2 ring-offset-slate-950";
        }
      } else if (burnoutZone === "early_warning" && isHighLoad) {
        opacity = 0.45;
        filter = "grayscale(0.3)";
      }

      return {
        ...n,
        style: { ...n.style, opacity, filter, transition: "all 0.5s ease" },
        className: [n.className, extra].filter(Boolean).join(" "),
      };
    });
  }, [nodes, burnoutZone]);

  const styledEdges = useMemo(
    () =>
      edges.map((e) => ({
        ...e,
        type: "smoothstep" as const,
        style: {
          stroke: burnoutZone === "risk" ? "#475569" : "#6366f1",
          strokeWidth: 2,
          opacity: burnoutZone === "risk" ? 0.25 : 0.55,
        },
        animated: burnoutZone !== "risk",
      })),
    [edges, burnoutZone],
  );

  return (
    <div style={{ height: 500 }} className={`w-full overflow-hidden rounded-xl border border-slate-800/60 bg-slate-900/30 ${className}`}>
      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        proOptions={{ hideAttribution: true }}
        minZoom={0.3}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
      >
        <MiniMap
          className="!rounded-xl !bg-slate-900/90 !border-slate-800"
          maskColor="rgb(15 23 42 / 0.85)"
          nodeColor={() => "#6366f1"}
        />
        <Controls className="!bg-slate-900 !border-slate-700 !rounded-xl [&_button]:!fill-slate-200 [&_button]:!bg-slate-800 [&_button]:!border-slate-700" />
        <Background color="#334155" gap={24} size={1} />
      </ReactFlow>
    </div>
  );
}

/* ── Export ───────────────────────────────────────────────── */
export default function CareerMap(props: CareerMapProps) {
  return (
    <ReactFlowProvider>
      <CareerMapInner {...props} />
    </ReactFlowProvider>
  );
}
