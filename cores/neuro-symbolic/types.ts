export interface LatticeNode {
  id: string;
  label: string;
  vector: number[]; // Placeholder for embedding vector
  symbolicTags: Record<string, string | number | boolean>;
  confidence: number;
  type: 'concept' | 'entity' | 'rule' | 'constraint';
}

export interface LatticeEdge {
  sourceId: string;
  targetId: string;
  relationType: string; // e.g., "is_a", "causes", "implies"
  weight: number;
}

export interface LatticePath {
  nodes: LatticeNode[];
  edges: LatticeEdge[];
  confidenceScore: number;
}
