import { MemoryNode, GhostBranch } from './types';

export class TopologicalMemory {
  private nodes: Map<string, MemoryNode>;
  private ghostBranches: Map<string, GhostBranch>;

  constructor() {
    this.nodes = new Map();
    this.ghostBranches = new Map();
  }

  addMemory(content: string, parentId?: string, confidence: number = 1.0): string {
    const id = `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNode: MemoryNode = {
      id,
      content,
      timestamp: Date.now(),
      parentId,
      childrenIds: [],
      ghostBranchIds: [],
      confidence,
      tags: []
    };

    this.nodes.set(id, newNode);

    if (parentId) {
      const parent = this.nodes.get(parentId);
      if (parent) {
        parent.childrenIds.push(id);
      }
    }

    return id;
  }

  addGhostBranch(originNodeId: string, content: string, reason: string): void {
    const id = `ghost-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const ghost: GhostBranch = {
      id,
      originNodeId,
      content,
      reasonForRejection: reason,
      timestamp: Date.now()
    };

    this.ghostBranches.set(id, ghost);
    
    const origin = this.nodes.get(originNodeId);
    if (origin) {
      origin.ghostBranchIds.push(id);
    }
  }

  getTrace(nodeId: string): MemoryNode[] {
    const trace: MemoryNode[] = [];
    let current = this.nodes.get(nodeId);
    while (current) {
      trace.unshift(current);
      if (current.parentId) {
        current = this.nodes.get(current.parentId);
      } else {
        current = undefined;
      }
    }
    return trace;
  }

  getGhostBranchesForTrace(nodeId: string): GhostBranch[] {
    const trace = this.getTrace(nodeId);
    const ghosts: GhostBranch[] = [];
    trace.forEach(node => {
      node.ghostBranchIds.forEach(ghostId => {
        const ghost = this.ghostBranches.get(ghostId);
        if (ghost) ghosts.push(ghost);
      });
    });
    return ghosts;
  }
}

export const topologicalMemory = new TopologicalMemory();
