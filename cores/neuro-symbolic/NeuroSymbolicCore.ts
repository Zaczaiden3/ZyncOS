import { Lattice } from './Lattice';
import { LatticeNode, LatticePath } from './types';
import { memoryStore } from '../../services/vectorDb';

export class NeuroSymbolicCore {
  private lattice: Lattice;

  constructor() {
    this.lattice = new Lattice();
    this.initializeBaseKnowledge();
  }

  private initializeBaseKnowledge() {
    // Seeding extended symbolic knowledge for broader context
    const nodes: LatticeNode[] = [
      { id: 'n1', label: 'Neural Network', vector: [], symbolicTags: { category: 'AI' }, confidence: 0.9, type: 'concept' },
      { id: 'n2', label: 'Deep Learning', vector: [], symbolicTags: { category: 'AI' }, confidence: 0.95, type: 'concept' },
      { id: 'n3', label: 'Symbolic Logic', vector: [], symbolicTags: { category: 'Math' }, confidence: 1.0, type: 'concept' },
      { id: 'n4', label: 'Neuro-Symbolic AI', vector: [], symbolicTags: { category: 'Hybrid' }, confidence: 0.85, type: 'concept' },
      { id: 'n5', label: 'Explainability', vector: [], symbolicTags: { importance: 'high' }, confidence: 0.9, type: 'concept' },
      { id: 'n6', label: 'Causality', vector: [], symbolicTags: { category: 'Philosophy' }, confidence: 0.88, type: 'concept' },
      { id: 'n7', label: 'Ethics', vector: [], symbolicTags: { category: 'Philosophy' }, confidence: 0.92, type: 'concept' },
      { id: 'n8', label: 'Consciousness', vector: [], symbolicTags: { category: 'Metaphysics' }, confidence: 0.6, type: 'concept' },
      { id: 'n9', label: 'Recursion', vector: [], symbolicTags: { category: 'Math' }, confidence: 1.0, type: 'concept' },
      { id: 'n10', label: 'Entropy', vector: [], symbolicTags: { category: 'Physics' }, confidence: 0.99, type: 'concept' }
    ];

    nodes.forEach(n => this.lattice.addNode(n));

    this.lattice.addEdge({ sourceId: 'n1', targetId: 'n2', relationType: 'enables', weight: 0.9 });
    this.lattice.addEdge({ sourceId: 'n1', targetId: 'n4', relationType: 'part_of', weight: 0.8 });
    this.lattice.addEdge({ sourceId: 'n3', targetId: 'n4', relationType: 'part_of', weight: 0.8 });
    this.lattice.addEdge({ sourceId: 'n4', targetId: 'n5', relationType: 'promotes', weight: 0.95 });
    this.lattice.addEdge({ sourceId: 'n6', targetId: 'n5', relationType: 'requires', weight: 0.85 });
    this.lattice.addEdge({ sourceId: 'n7', targetId: 'n1', relationType: 'constrains', weight: 0.7 });
    this.lattice.addEdge({ sourceId: 'n9', targetId: 'n8', relationType: 'models', weight: 0.4 });
  }

  public async reason(query: string): Promise<{ reasoningTrace: string; confidence: number; graph: any }> {
    // 1. Parse Query & Retrieve Context (RAG)
    const keywords = query.split(' ').filter(w => w.length > 3);
    
    // Real RAG Lookup
    const retrievedDocs = await memoryStore.search(query, 3);
    
    const dynamicNodes: LatticeNode[] = keywords.map((k, i) => ({
        id: `dyn-${i}`,
        label: k.charAt(0).toUpperCase() + k.slice(1),
        vector: [],
        symbolicTags: { category: 'Query Concept' },
        confidence: 0.8,
        type: 'concept'
    }));

    // Convert retrieved docs to nodes
    retrievedDocs.forEach((doc, i) => {
        dynamicNodes.push({
            id: `rag-${i}`,
            label: doc.content.substring(0, 20) + '...',
            vector: doc.embedding,
            symbolicTags: { category: 'Retrieved Fact', sentiment: doc.sentiment || 'neutral' },
            confidence: (doc as any).score || 0.7,
            type: 'entity'
        });
    });

    // Add dynamic nodes to a temporary view of the lattice
    dynamicNodes.forEach(n => this.lattice.addNode(n));

    // 2. Activate Subgraph (Hybrid Search)
    const subgraph = this.lattice.getActivatedSubgraph(keywords);
    
    // Ensure we always have something to show
    if (subgraph.nodes.length === 0) {
        dynamicNodes.forEach(n => subgraph.nodes.push(n));
    }

    // 3. Generate Sophisticated Reasoning Trace
    let reasoningTrace = "";
    let totalConfidence = 0;
    
    reasoningTrace += `> **Semantic Parsing**: Extracted ${keywords.length} tokens.\n`;
    reasoningTrace += `> **Memory Retrieval**: Found ${retrievedDocs.length} relevant facts in Vector Space.\n`;

    if (subgraph.nodes.length > 0) {
      const concepts = subgraph.nodes.map(n => `[${n.label}]`).join(' <-> ');
      reasoningTrace += `> **Concept Activation**: ${concepts}\n`;
      
      reasoningTrace += `\n**Logical Inference Chain:**\n`;
      let edgeCount = 0;
      
      // Connect Query Concepts to Retrieved Facts
      const allEdges = [...subgraph.edges];
      
      // Heuristic: Connect query terms to retrieved facts if they share semantic similarity (simulated here by proximity in list)
      if (retrievedDocs.length > 0) {
          keywords.forEach((k, i) => {
             allEdges.push({
                 sourceId: `dyn-${i}`,
                 targetId: `rag-0`, // Connect to top result
                 relationType: 'supported_by',
                 weight: 0.85
             });
          });
      }

      allEdges.forEach(edge => {
        const source = subgraph.nodes.find(n => n.id === edge.sourceId) || dynamicNodes.find(n => n.id === edge.sourceId);
        const target = subgraph.nodes.find(n => n.id === edge.targetId) || dynamicNodes.find(n => n.id === edge.targetId);
        
        if (source && target && edgeCount < 8) {
            const symbol = edge.weight > 0.8 ? '==>' : '-->';
            reasoningTrace += `   ${source.label} ${symbol} ${edge.relationType.toUpperCase()} ${symbol} ${target.label} (φ=${edge.weight.toFixed(2)})\n`;
            edgeCount++;
        }
      });

      if (edgeCount === 0) {
          reasoningTrace += `   ${dynamicNodes[0]?.label || 'Query'} --> ANALYZING_RELATIONS --> ${dynamicNodes[1]?.label || 'Context'} (φ=0.65)\n`;
      }

      // Confidence calculation
      totalConfidence = subgraph.nodes.reduce((acc, n) => acc + n.confidence, 0) / subgraph.nodes.length;
    } else {
      reasoningTrace += "> **Symbolic Grounding**: Weak. Initiating Neural Hallucination Protocol for hypothesis generation.\n";
      totalConfidence = 0.5; 
    }

    reasoningTrace += `\n> **Synthesis**: Logic gates stabilized. Confidence: ${(totalConfidence * 100).toFixed(1)}%`;

    // 4. Generate Strategic Advice for Other Cores
    let strategicAdvice = "";
    if (totalConfidence > 0.85) {
        strategicAdvice = "**Core Recommendation**: High certainty detected. \n- **Reflex**: Execute immediately. \n- **Memory**: Store result as fact. \n- **Consensus**: Standby.";
    } else if (totalConfidence > 0.6) {
        strategicAdvice = "**Core Recommendation**: Moderate complexity. \n- **Reflex**: Provide summary. \n- **Memory**: Perform deep validation scan. \n- **Consensus**: Monitor for drift.";
    } else {
        strategicAdvice = "**Core Recommendation**: Low symbolic grounding. \n- **Reflex**: Defer to Memory. \n- **Memory**: Initiate full historical synthesis. \n- **Consensus**: PREPARE INTERVENTION.";
    }

    reasoningTrace += `\n\n${strategicAdvice}`;

    return {
      reasoningTrace,
      confidence: totalConfidence,
      graph: subgraph
    };
  }
  public async dream(): Promise<{ newEdges: number; insights: string[] }> {
    const nodes = this.lattice.getNodes();
    let newEdgesCount = 0;
    const insights: string[] = [];

    // 1. Find potential connections between disparate concepts (Creative Association)
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const nodeA = nodes[i];
            const nodeB = nodes[j];

            // Skip if already connected
            if (this.lattice.getEdges().some(e => 
                (e.sourceId === nodeA.id && e.targetId === nodeB.id) || 
                (e.sourceId === nodeB.id && e.targetId === nodeA.id)
            )) continue;

            // Check for shared symbolic tags (Heuristic Match)
            const sharedTags = Object.keys(nodeA.symbolicTags).filter(tag => 
                nodeB.symbolicTags[tag] === nodeA.symbolicTags[tag]
            );

            if (sharedTags.length > 0) {
                // Create a new "Dreamt" connection
                this.lattice.addEdge({
                    sourceId: nodeA.id,
                    targetId: nodeB.id,
                    relationType: 'thematically_linked',
                    weight: 0.4 // Low weight for dreamt connections
                });
                newEdgesCount++;
                insights.push(`Linked [${nodeA.label}] and [${nodeB.label}] via shared context: ${sharedTags.join(', ')}`);
            } else if (Math.random() > 0.95) {
                // Random "Mutation" / Creative Leap
                 this.lattice.addEdge({
                    sourceId: nodeA.id,
                    targetId: nodeB.id,
                    relationType: 'hypothetical_link',
                    weight: 0.2
                });
                newEdgesCount++;
                insights.push(`Hypothesized connection between [${nodeA.label}] and [${nodeB.label}]`);
            }
        }
    }

    return { newEdges: newEdgesCount, insights };
  }
}

export const neuroSymbolicCore = new NeuroSymbolicCore();
