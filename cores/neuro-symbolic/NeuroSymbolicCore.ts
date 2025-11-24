import { Lattice } from './Lattice';
import { LatticeNode, LatticePath } from './types';

export class NeuroSymbolicCore {
  private lattice: Lattice;

  constructor() {
    this.lattice = new Lattice();
    this.initializeBaseKnowledge();
  }

  private initializeBaseKnowledge() {
    // Seeding some base symbolic knowledge
    // In a real system, this would be loaded from a database or learned
    const nodes: LatticeNode[] = [
      { id: 'n1', label: 'Neural Network', vector: [], symbolicTags: { category: 'AI' }, confidence: 0.9, type: 'concept' },
      { id: 'n2', label: 'Deep Learning', vector: [], symbolicTags: { category: 'AI' }, confidence: 0.95, type: 'concept' },
      { id: 'n3', label: 'Symbolic Logic', vector: [], symbolicTags: { category: 'Math' }, confidence: 1.0, type: 'concept' },
      { id: 'n4', label: 'Neuro-Symbolic AI', vector: [], symbolicTags: { category: 'Hybrid' }, confidence: 0.85, type: 'concept' },
      { id: 'n5', label: 'Explainability', vector: [], symbolicTags: { importance: 'high' }, confidence: 0.9, type: 'concept' },
    ];

    nodes.forEach(n => this.lattice.addNode(n));

    this.lattice.addEdge({ sourceId: 'n1', targetId: 'n2', relationType: 'enables', weight: 0.9 });
    this.lattice.addEdge({ sourceId: 'n1', targetId: 'n4', relationType: 'part_of', weight: 0.8 });
    this.lattice.addEdge({ sourceId: 'n3', targetId: 'n4', relationType: 'part_of', weight: 0.8 });
    this.lattice.addEdge({ sourceId: 'n4', targetId: 'n5', relationType: 'promotes', weight: 0.95 });
  }

  public reason(query: string): { reasoningTrace: string; confidence: number; graph: any } {
    // 1. Parse Query (Simple keyword extraction for now)
    const keywords = query.split(' ').filter(w => w.length > 3);
    
    // 2. Activate Subgraph
    const subgraph = this.lattice.getActivatedSubgraph(keywords);
    
    // 3. Find Connections (Symbolic Reasoning)
    let reasoningTrace = "Neuro-Symbolic Reasoning Trace:\n";
    let totalConfidence = 0;
    
    if (subgraph.nodes.length > 0) {
      reasoningTrace += `- Activated ${subgraph.nodes.length} concepts: ${subgraph.nodes.map(n => n.label).join(', ')}\n`;
      
      subgraph.edges.forEach(edge => {
        const source = subgraph.nodes.find(n => n.id === edge.sourceId);
        const target = subgraph.nodes.find(n => n.id === edge.targetId);
        if (source && target) {
            reasoningTrace += `- Inference: ${source.label} --[${edge.relationType}]--> ${target.label} (Weight: ${edge.weight})\n`;
        }
      });

      // Simple confidence calculation
      const nodeConf = subgraph.nodes.reduce((acc, n) => acc + n.confidence, 0) / subgraph.nodes.length;
      totalConfidence = nodeConf;
    } else {
      reasoningTrace += "- No existing symbolic priors found. Relying on pure neural intuition.\n";
      totalConfidence = 0.5; // Default uncertainty
    }

    return {
      reasoningTrace,
      confidence: totalConfidence,
      graph: subgraph
    };
  }
}

export const neuroSymbolicCore = new NeuroSymbolicCore();
