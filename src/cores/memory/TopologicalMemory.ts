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
      const nodesArray = Array.from(this.nodes.values());
      const ghostsArray = Array.from(this.ghostBranches.values());
      
      // Safety Check: Quota Exceeded
      const serializedNodes = JSON.stringify(nodesArray);
      const serializedGhosts = JSON.stringify(ghostsArray);
      
      if (serializedNodes.length + serializedGhosts.length > 4500000) {
          console.warn("Topological Memory approaching localStorage limit. Pruning...");
          this.optimize(); // Auto-prune
      }

      localStorage.setItem(this.STORAGE_KEY_NODES, serializedNodes);
      localStorage.setItem(this.STORAGE_KEY_GHOSTS, serializedGhosts);
    } catch (e) {
      console.error("Failed to save Topological Memory", e);
    }
  }

  public clear() {
      this.nodes.clear();
      this.ghostBranches.clear();
      localStorage.removeItem(this.STORAGE_KEY_NODES);
      localStorage.removeItem(this.STORAGE_KEY_GHOSTS);
      console.log("Topological Memory Wiped.");
  }

  public getAllNodes(): MemoryNode[] {
      return Array.from(this.nodes.values());
  }

  public getAllGhostBranches(): GhostBranch[] {
      return Array.from(this.ghostBranches.values());
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
  /**
   * Delete a specific node and clean up references.
   */
  public deleteNode(nodeId: string) {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    // 1. Remove from parent's children list
    if (node.parentId) {
      const parent = this.nodes.get(node.parentId);
      if (parent) {
        parent.childrenIds = parent.childrenIds.filter(id => id !== nodeId);
      }
    }

    // 2. Remove associated ghost branches
    node.ghostBranchIds.forEach(ghostId => this.ghostBranches.delete(ghostId));

    // 3. Delete the node
    this.nodes.delete(nodeId);
    this.save();
  }

  /**
   * Prune memories below a confidence threshold.
   */
  public pruneMemory(threshold: number): number {
    let prunedCount = 0;
    for (const [id, node] of this.nodes.entries()) {
      if (node.confidence < threshold) {
        this.deleteNode(id);
        prunedCount++;
      }
    }
    return prunedCount;
  }

  /**
   * Compress a cluster of nodes into a single summary node.
   * @param nodeIds IDs of nodes to compress
   * @param summaryContent The summarized content (generated by LLM)
   */
  public compressCluster(nodeIds: string[], summaryContent: string): string | null {
    if (nodeIds.length === 0) return null;

    // 1. Determine parent for the new summary node (use the parent of the first node in cluster)
    const firstNode = this.nodes.get(nodeIds[0]);
    if (!firstNode) return null;
    const commonParentId = firstNode.parentId;

    // 2. Create the Summary Node
    const summaryId = `summary-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const summaryNode: MemoryNode = {
      id: summaryId,
      content: summaryContent,
      timestamp: Date.now(),
      parentId: commonParentId,
      childrenIds: [], // Will adopt children of compressed nodes
      ghostBranchIds: [],
      confidence: 1.0, // Reset confidence for summary
      tags: ['compressed', 'summary']
    };

    // 3. Adopt children and ghosts from the cluster
    nodeIds.forEach(id => {
      const node = this.nodes.get(id);
      if (node) {
        // Adopt children
        node.childrenIds.forEach(childId => {
            const child = this.nodes.get(childId);
            if (child) {
                child.parentId = summaryId;
                summaryNode.childrenIds.push(childId);
            }
        });
        // Adopt ghosts
        summaryNode.ghostBranchIds.push(...node.ghostBranchIds);
        
        // Delete the original node (without recursive cleanup since we handled children)
        this.nodes.delete(id);
        
        // Cleanup parent reference for the deleted node
        if (node.parentId) {
            const parent = this.nodes.get(node.parentId);
            if (parent) {
                parent.childrenIds = parent.childrenIds.filter(cid => cid !== id);
            }
        }
      }
    });

    // 4. Register Summary Node
    this.nodes.set(summaryId, summaryNode);
    
    // 5. Link to Parent
    if (commonParentId) {
        const parent = this.nodes.get(commonParentId);
        if (parent) {
            parent.childrenIds.push(summaryId);
        }
    }

    this.save();
    return summaryId;
  }
}

export const topologicalMemory = new TopologicalMemory();
