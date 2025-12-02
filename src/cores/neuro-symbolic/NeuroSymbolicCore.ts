import { Lattice } from './Lattice';
import { LatticeNode, LatticePath } from './types';
import { memoryStore } from '../../services/vectorDb';
import { generateNeuroReasoning } from '../../services/gemini';
import { topologicalMemory } from '../memory/TopologicalMemory';

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

    // --- FUSION: Inject Topological Memory ---
    const persistentNodes = topologicalMemory.getAllNodes();
    // Simple keyword match for now (in production, use vector similarity)
    const relevantPersistentNodes = persistentNodes.filter(n => 
        keywords.some(k => n.content.toLowerCase().includes(k.toLowerCase()))
    ).slice(0, 10); // Limit to top 10 relevant memories

    relevantPersistentNodes.forEach(n => {
        this.lattice.addNode({
            id: n.id,
            label: n.content.substring(0, 30) + '...',
            vector: [],
            symbolicTags: { category: 'Long-Term Memory', source: 'Topological' },
            confidence: n.confidence,
            type: 'memory'
        });
        
        // Link to dynamic nodes
        dynamicNodes.forEach(dn => {
            this.lattice.addEdge({
                sourceId: n.id,
                targetId: dn.id,
                relationType: 'recalls',
                weight: 0.6
            });
        });
    });

    // 2. Activate Subgraph (Hybrid Search)
    const subgraph = this.lattice.getActivatedSubgraph(keywords);
    
    // Ensure we always have something to show
    if (subgraph.nodes.length === 0) {
        dynamicNodes.forEach(n => subgraph.nodes.push(n));
    }

    // 3. Generate Sophisticated Reasoning Trace via R1T Chimera
    const contextDescription = `
      Active Concepts: ${subgraph.nodes.map(n => n.label).join(', ')}
      Relationships: ${subgraph.edges.map(e => `${e.sourceId}->${e.targetId} (${e.relationType})`).join(', ')}
      Retrieved Facts: ${retrievedDocs.map(d => d.content).join('; ')}
    `;

    const neuroResult = await generateNeuroReasoning(query, contextDescription);

    return {
      reasoningTrace: neuroResult.trace,
      confidence: neuroResult.confidence,
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
            if (!nodeA.symbolicTags || !nodeB.symbolicTags) continue;

            const tagsA = nodeA.symbolicTags;
            const tagsB = nodeB.symbolicTags;

            const sharedTags = Object.keys(tagsA).filter(tag => 
                tagsB[tag] === tagsA[tag]
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

  /**
   * Counterfactual Persona Simulation
   * Generates "What If" scenarios by mutating the graph.
   */
  public async simulateCounterfactuals(query: string): Promise<string[]> {
      const scenarios = [];
      
      // Scenario 1: The Skeptic (Invert high confidence nodes)
      const highConfNodes = this.lattice.getNodes().filter(n => n.confidence > 0.9);
      if (highConfNodes.length > 0) {
          const target = highConfNodes[Math.floor(Math.random() * highConfNodes.length)];
          scenarios.push(`Counterfactual: What if [${target.label}] was FALSE? (Skeptic Persona)`);
      }

      // Scenario 2: The Visionary (Connect unrelated concepts)
      const unrelated = this.lattice.getNodes().slice(0, 2);
      if (unrelated.length === 2) {
           scenarios.push(`Counterfactual: What if [${unrelated[0].label}] implies [${unrelated[1].label}]? (Visionary Persona)`);
      }

      // Scenario 3: The Engineer (Constraint relaxation)
      scenarios.push(`Counterfactual: If we ignore resource constraints, how does the solution space expand? (Engineer Persona)`);

      return scenarios;
  }
  /**
   * Validates content against the Neuro-Symbolic Lattice.
   * Checks for logical inconsistencies or contradictions with high-confidence nodes.
   */
  public async validateConsistency(content: string): Promise<string[]> {
      const issues: string[] = [];
      const nodes = this.lattice.getNodes();
      
      // 1. Check for contradictions with High-Confidence Axioms (>0.98)
      const axioms = nodes.filter(n => n.confidence > 0.98);
      for (const axiom of axioms) {
          // specific negation check (heuristic)
          if (content.toLowerCase().includes(`not ${axiom.label.toLowerCase()}`) || 
              content.toLowerCase().includes(`${axiom.label.toLowerCase()} is false`)) {
              issues.push(`Contradiction detected: Content denies high-confidence axiom [${axiom.label}].`);
          }
      }

      // 2. Check for Circular Logic (Heuristic)
      if (content.includes("therefore") && content.includes("because")) {
          const parts = content.split("therefore");
          if (parts[0].includes(parts[1].trim())) {
               issues.push("Potential Circular Logic detected: Conclusion appears in Premise.");
          }
      }

      return issues;
  }
}

export const neuroSymbolicCore = new NeuroSymbolicCore();
