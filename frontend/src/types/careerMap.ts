import type { Edge, Node } from "@xyflow/react";

/**
 * `data` payload expected on each career node (from Gemini JSON or FastAPI).
 */
export type CareerNodeData = {
  label: string;
  role?: string;
  /** Rough horizon for the path; used by adaptive UI when burnout is high */
  timelineMonths?: number;
  readiness?: number;
  stressLevel?: "low" | "medium" | "high";
  /** Short advice or description for the milestone */
  description?: string;
};

export type CareerNode = Node<CareerNodeData, string | undefined>;
export type CareerEdge = Edge;

/** API envelope: `GET /api/career-map/...` */
export type CareerMapPayload = {
  nodes: CareerNode[];
  edges: CareerEdge[];
};
