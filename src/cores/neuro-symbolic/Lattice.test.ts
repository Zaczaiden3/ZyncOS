import { describe, it, expect, beforeEach } from 'vitest';
import { Lattice } from './Lattice';
import { LatticeNode, LatticeEdge } from './types';

describe('Lattice', () => {
  let lattice: Lattice;

  beforeEach(() => {
    lattice = new Lattice();
  });

  it('should add and retrieve nodes', () => {
    const node: LatticeNode = { id: '1', label: 'Test', confidence: 1.0, type: 'concept' };
    lattice.addNode(node);
    expect(lattice.getNode('1')).toEqual(node);
    expect(lattice.getNodes()).toContain(node);
  });

  it('should add and retrieve edges', () => {
    const edge: LatticeEdge = { sourceId: '1', targetId: '2', relationType: 'rel', weight: 1.0 };
    lattice.addEdge(edge);
    expect(lattice.getEdges()).toContain(edge);
  });

  it('should find activation path', () => {
    const n1: LatticeNode = { id: '1', label: 'Start', confidence: 1.0, type: 'concept' };
    const n2: LatticeNode = { id: '2', label: 'Middle', confidence: 1.0, type: 'concept' };
    const n3: LatticeNode = { id: '3', label: 'End', confidence: 1.0, type: 'concept' };
    
    lattice.addNode(n1);
    lattice.addNode(n2);
    lattice.addNode(n3);

    lattice.addEdge({ sourceId: '1', targetId: '2', relationType: 'to', weight: 1.0 });
    lattice.addEdge({ sourceId: '2', targetId: '3', relationType: 'to', weight: 1.0 });

    const path = lattice.findActivationPath('Start', 'End');
    
    expect(path).not.toBeNull();
    expect(path?.nodes.length).toBe(3);
    expect(path?.nodes[0].id).toBe('1');
    expect(path?.nodes[2].id).toBe('3');
  });

  it('should get activated subgraph', () => {
    const n1: LatticeNode = { id: '1', label: 'Apple', confidence: 1.0, type: 'concept' };
    const n2: LatticeNode = { id: '2', label: 'Banana', confidence: 1.0, type: 'concept' };
    
    lattice.addNode(n1);
    lattice.addNode(n2);
    lattice.addEdge({ sourceId: '1', targetId: '2', relationType: 'fruit', weight: 1.0 });

    const subgraph = lattice.getActivatedSubgraph(['Apple']);
    
    expect(subgraph.nodes).toContainEqual(n1);
    expect(subgraph.nodes).not.toContainEqual(n2); // Banana doesn't match 'Apple'
    // Edges are filtered by activated nodes. Since n2 is not active, edge 1->2 should not be included?
    // Let's check logic: activatedEdges = edges.filter(e => activatedIds.has(source) && activatedIds.has(target))
    // So if n2 is not active, edge is not active.
    expect(subgraph.edges.length).toBe(0);
  });

  it('should ingest semantic tags', () => {
    lattice.ingestSemanticTags(['Tag1', 'Tag2']);
    
    const nodes = lattice.getNodes();
    expect(nodes.length).toBe(2);
    expect(nodes.some(n => n.label === 'Tag1')).toBe(true);
    
    // Check for co-occurrence edge
    const edges = lattice.getEdges();
    expect(edges.length).toBe(1);
    expect(edges[0].relationType).toBe('co_occurring');
  });
});
