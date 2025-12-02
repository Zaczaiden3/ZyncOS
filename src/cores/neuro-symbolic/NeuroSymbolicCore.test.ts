import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('NeuroSymbolicCore', () => {
  let NeuroSymbolicCoreClass: any;
  let core: any;
  let mockLatticeInstance: any;
  let memoryStoreMock: any;
  let generateNeuroReasoningMock: any;
  let topologicalMemoryMock: any;

  beforeEach(async () => {
    vi.resetModules();

    // Setup mocks
    mockLatticeInstance = {
      addNode: vi.fn(),
      addEdge: vi.fn(),
      getNodes: vi.fn().mockReturnValue([]),
      getEdges: vi.fn().mockReturnValue([]),
      getActivatedSubgraph: vi.fn().mockReturnValue({ nodes: [], edges: [] })
    };

    vi.doMock('./Lattice', () => ({
      Lattice: vi.fn().mockImplementation(function() { return mockLatticeInstance; })
    }));

    memoryStoreMock = { search: vi.fn() };
    vi.doMock('../../services/vectorDb', () => ({
      memoryStore: memoryStoreMock
    }));
    
    generateNeuroReasoningMock = vi.fn();
    vi.doMock('../../services/gemini', () => ({
      generateNeuroReasoning: generateNeuroReasoningMock
    }));

    topologicalMemoryMock = { getAllNodes: vi.fn() };
    vi.doMock('../memory/TopologicalMemory', () => ({
      topologicalMemory: topologicalMemoryMock
    }));

    // Dynamic import of the module under test
    const module = await import('./NeuroSymbolicCore');
    NeuroSymbolicCoreClass = module.NeuroSymbolicCore;
    
    core = new NeuroSymbolicCoreClass();
  });

  it('should initialize with base knowledge', () => {
    expect(mockLatticeInstance.addNode).toHaveBeenCalled();
    expect(mockLatticeInstance.addEdge).toHaveBeenCalled();
  });

  it('should reason about a query', async () => {
    const query = 'test query';
    const mockDocs = [{ content: 'doc1', embedding: [], sentiment: 'neutral' }];
    const mockTrace = { trace: 'reasoning trace', confidence: 0.9 };

    memoryStoreMock.search.mockResolvedValue(mockDocs);
    topologicalMemoryMock.getAllNodes.mockReturnValue([]);
    generateNeuroReasoningMock.mockResolvedValue(mockTrace);

    const result = await core.reason(query);

    expect(memoryStoreMock.search).toHaveBeenCalledWith(query, 3);
    expect(mockLatticeInstance.addNode).toHaveBeenCalled();
    expect(mockLatticeInstance.getActivatedSubgraph).toHaveBeenCalled();
    expect(generateNeuroReasoningMock).toHaveBeenCalled();
    expect(result.reasoningTrace).toBe(mockTrace.trace);
  });

  it('should dream and create new connections', async () => {
    const nodes = [
      { id: 'n1', label: 'A', symbolicTags: { cat: 'X' } },
      { id: 'n2', label: 'B', symbolicTags: { cat: 'X' } }
    ];
    mockLatticeInstance.getNodes.mockReturnValue(nodes);
    mockLatticeInstance.getEdges.mockReturnValue([]);

    const result = await core.dream();

    expect(mockLatticeInstance.addEdge).toHaveBeenCalled();
    expect(result.newEdges).toBeGreaterThan(0);
    expect(result.insights.length).toBeGreaterThan(0);
  });

  it('should simulate counterfactuals', async () => {
    const nodes = [
      { id: 'n1', label: 'HighConf', confidence: 0.95 },
      { id: 'n2', label: 'Other', confidence: 0.5 }
    ];
    mockLatticeInstance.getNodes.mockReturnValue(nodes);

    const scenarios = await core.simulateCounterfactuals('what if');

    expect(scenarios.length).toBeGreaterThan(0);
    expect(scenarios[0]).toContain('Skeptic Persona');
  });

  it('should validate consistency', async () => {
    const nodes = [
      { id: 'n1', label: 'Truth', confidence: 0.99 }
    ];
    mockLatticeInstance.getNodes.mockReturnValue(nodes);

    const issues = await core.validateConsistency('Truth is false');

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toContain('Contradiction detected');
  });
});
