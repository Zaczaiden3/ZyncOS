import { LatticeNode, LatticeEdge, LatticePath } from './types';

export class Lattice {
  private nodes: Map<string, LatticeNode>;
  private edges: LatticeEdge[];

  constructor() {
    this.nodes = new Map();
    this.edges = [];
  }

  addNode(node: LatticeNode): void {
    this.nodes.set(node.id, node);
  }

  addEdge(edge: LatticeEdge): void {
    this.edges.push(edge);
  }

  getNode(id: string): LatticeNode | undefined {
    return this.nodes.get(id);
  }

  getNodes(): LatticeNode[] {
    return Array.from(this.nodes.values());
  }

  getEdges(): LatticeEdge[] {
    return this.edges;
  }

  // Simulate finding a path based on semantic activation
  // In a real system, this would use vector similarity search + graph traversal
  findActivationPath(startConcept: string, endConcept: string): LatticePath | null {
    // BFS for demonstration
    const startNode = Array.from(this.nodes.values()).find(n => n.label.includes(startConcept));
    const endNode = Array.from(this.nodes.values()).find(n => n.label.includes(endConcept));

    if (!startNode || !endNode) return null;

    const queue: { node: LatticeNode; path: LatticePath }[] = [
      { 
        node: startNode, 
        path: { nodes: [startNode], edges: [], confidenceScore: startNode.confidence } 
      }
    ];

    const visited = new Set<string>();

    while (queue.length > 0) {
      const { node, path } = queue.shift()!;

      if (node.id === endNode.id) {
        return path;
      }

      visited.add(node.id);

      const neighbors = this.edges
        .filter(e => e.sourceId === node.id)
        .map(e => ({ edge: e, target: this.nodes.get(e.targetId)! }));

      for (const { edge, target } of neighbors) {
        if (!visited.has(target.id)) {
          queue.push({
            node: target,
            path: {
              nodes: [...path.nodes, target],
              edges: [...path.edges, edge],
              confidenceScore: path.confidenceScore * edge.weight * target.confidence
            }
          });
        }
      }
    }

    return null;
  }

  // "Glass Box" Transparency: Return the subgraph activated by a query
  getActivatedSubgraph(queryTokens: string[]): { nodes: LatticeNode[], edges: LatticeEdge[] } {
    const activatedNodes = Array.from(this.nodes.values()).filter(n => 
      queryTokens.some(token => n.label.toLowerCase().includes(token.toLowerCase()))
    );

    const activatedIds = new Set(activatedNodes.map(n => n.id));
    const activatedEdges = this.edges.filter(e => 
      activatedIds.has(e.sourceId) && activatedIds.has(e.targetId)
    );

    return { nodes: activatedNodes, edges: activatedEdges };
  }

  /**
   * Ingest Semantic Tags from AI Cores
   * Dynamically updates the graph with new concepts found during analysis.
   */
  ingestSemanticTags(tags: string[], sourceId?: string): void {
    const newNodes: LatticeNode[] = [];

    tags.forEach(tag => {
      // Normalize tag
      const label = tag.trim();
      const id = label.toLowerCase().replace(/\s+/g, '-');

      if (!this.nodes.has(id)) {
        const node: LatticeNode = {
          id,
          label,
          type: 'concept', // Default type for auto-ingested tags
          confidence: 0.8, // Initial confidence for AI-generated tags
          activationLevel: 0
        };
        this.addNode(node);
        newNodes.push(node);
      } else {
        // Reinforce existing node
        const node = this.nodes.get(id)!;
        node.confidence = Math.min(1.0, node.confidence + 0.05);
      }

      // Link to source if provided (e.g., the specific task or file concept)
      if (sourceId && this.nodes.has(sourceId)) {
        this.addEdge({
          sourceId,
          targetId: id,
          weight: 0.5,
          relationType: 'related_to'
        });
      }
    });

    // Create weak associations between all new tags in this batch (co-occurrence)
    for (let i = 0; i < newNodes.length; i++) {
      for (let j = i + 1; j < newNodes.length; j++) {
        this.addEdge({
          sourceId: newNodes[i].id,
          targetId: newNodes[j].id,
          weight: 0.3,
          relationType: 'co_occurring'
        });
      }
    }
  }
}
