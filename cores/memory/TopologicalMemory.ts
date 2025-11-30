import { MemoryNode, GhostBranch } from './types';
import { memoryStore } from '../../services/vectorDb';

export class TopologicalMemory {
  private nodes: Map<string, MemoryNode>;
  private ghostBranches: Map<string, GhostBranch>;
  private readonly STORAGE_KEY_NODES = 'ZYNC_TOPO_NODES';
  private readonly STORAGE_KEY_GHOSTS = 'ZYNC_TOPO_GHOSTS';

  constructor() {
    this.nodes = new Map();
    this.ghostBranches = new Map();
    this.load();
  }

  private load() {
    try {
      const storedNodes = localStorage.getItem(this.STORAGE_KEY_NODES);
      const storedGhosts = localStorage.getItem(this.STORAGE_KEY_GHOSTS);

      if (storedNodes) {
        const parsedNodes: MemoryNode[] = JSON.parse(storedNodes);
        parsedNodes.forEach(n => this.nodes.set(n.id, n));
      }

      if (storedGhosts) {
        const parsedGhosts: GhostBranch[] = JSON.parse(storedGhosts);
        parsedGhosts.forEach(g => this.ghostBranches.set(g.id, g));
      }
    } catch (e) {
      console.error("Failed to load Topological Memory", e);
    }
  }

  private save() {
    // Debounce or immediate save? For critical topology, immediate for now.
    // In production, move to IndexedDB or debounce.
    try {
      localStorage.setItem(this.STORAGE_KEY_NODES, JSON.stringify(Array.from(this.nodes.values())));
      localStorage.setItem(this.STORAGE_KEY_GHOSTS, JSON.stringify(Array.from(this.ghostBranches.values())));
    } catch (e) {
      console.error("Failed to save Topological Memory", e);
    }
  }

  async addMemory(content: string, parentId?: string, confidence: number = 1.0): Promise<string> {
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

    this.save();

    // Integrate with Vector Store for Semantic Search
    // We fire and forget this promise to not block the UI
    memoryStore.add(content, { type: 'memory_node', nodeId: id }, 'analytical').catch(err => {
        console.warn("Failed to index memory node to vector DB", err);
    });

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

    this.save();
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

  /**
   * Dream State Optimization
   * Clusters nodes, prunes weak connections, and consolidates memory.
   */
  async optimize(): Promise<{ clusters: number; pruned: number; consolidated: number }> {
    // 1. Consolidate Duplicate Memories (Simulated Clustering)
    // In a real system, we'd use vector similarity. Here, we use exact content match or simple substring.
    let consolidatedCount = 0;
    const contentMap = new Map<string, string[]>(); // content -> [ids]

    this.nodes.forEach(node => {
        const key = node.content.trim().toLowerCase();
        if (!contentMap.has(key)) {
            contentMap.set(key, []);
        }
        contentMap.get(key)?.push(node.id);
    });

    contentMap.forEach((ids, content) => {
        if (ids.length > 1) {
            // Keep the first one (oldest), merge others
            const [primaryId, ...duplicates] = ids;
            duplicates.forEach(dupId => {
                const dupNode = this.nodes.get(dupId);
                const primaryNode = this.nodes.get(primaryId);
                
                if (dupNode && primaryNode) {
                    // Merge children
                    primaryNode.childrenIds.push(...dupNode.childrenIds);
                    // Merge ghosts
                    primaryNode.ghostBranchIds.push(...dupNode.ghostBranchIds);
                    // Boost confidence
                    primaryNode.confidence = Math.min(1.0, primaryNode.confidence + 0.1);
                    
                    // Remove duplicate
                    this.nodes.delete(dupId);
                    consolidatedCount++;
                }
            });
        }
    });

    // 2. Prune Old Ghost Branches
    let prunedCount = 0;
    const now = Date.now();
    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

    for (const [id, ghost] of this.ghostBranches.entries()) {
        if (now - ghost.timestamp > ONE_WEEK) {
            this.ghostBranches.delete(id);
            prunedCount++;
        }
    }

    // 3. Update Node Confidence (Decay)
    this.nodes.forEach(node => {
        node.confidence = Math.max(0.1, node.confidence * 0.995);
    });

    this.save();
    
    // Clusters is just a metric of unique concepts remaining
    const clusters = contentMap.size;

    return { clusters, pruned: prunedCount, consolidated: consolidatedCount };
  }
}

export const topologicalMemory = new TopologicalMemory();
