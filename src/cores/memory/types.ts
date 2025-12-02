export interface MemoryNode {
  id: string;
  content: string;
  timestamp: number;
  embedding?: number[];
  parentId?: string;
  childrenIds: string[];
  ghostBranchIds: string[]; // IDs of alternative/rejected paths
  confidence: number;
  tags: string[];
}

export interface GhostBranch {
  id: string;
  originNodeId: string;
  content: string;
  reasonForRejection: string;
  timestamp: number;
}
