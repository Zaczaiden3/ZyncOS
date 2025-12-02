import React, { useState, useEffect } from 'react';
import { topologicalMemory } from '../cores/memory/TopologicalMemory';
import { MemoryNode, GhostBranch } from '../cores/memory/types';
import { Search, Database, GitBranch, Activity, X, Trash2 } from 'lucide-react';

interface MemoryInspectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const MemoryInspector: React.FC<MemoryInspectorProps> = ({ isOpen, onClose }) => {
  const [nodes, setNodes] = useState<MemoryNode[]>([]);
  const [ghosts, setGhosts] = useState<GhostBranch[]>([]);
  const [filter, setFilter] = useState('');
  const [selectedNode, setSelectedNode] = useState<MemoryNode | null>(null);
  const [selectedGhost, setSelectedGhost] = useState<GhostBranch | null>(null);
  const [activeTab, setActiveTab] = useState<'nodes' | 'ghosts'>('nodes');

  useEffect(() => {
    if (isOpen) {
      refreshData();
    }
  }, [isOpen]);

  const refreshData = () => {
    setNodes(topologicalMemory.getAllNodes().sort((a, b) => b.timestamp - a.timestamp));
    setGhosts(topologicalMemory.getAllGhostBranches().sort((a, b) => b.timestamp - a.timestamp));
  };

  if (!isOpen) return null;

  const filteredNodes = nodes.filter(n => 
    n.content.toLowerCase().includes(filter.toLowerCase()) || 
    n.id.toLowerCase().includes(filter.toLowerCase())
  );

  const filteredGhosts = ghosts.filter(g => 
    g.content.toLowerCase().includes(filter.toLowerCase()) || 
    g.reasonForRejection.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-8 animate-in fade-in duration-200">
      <div className="w-full max-w-6xl h-[80vh] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-3">
            <Database className="text-fuchsia-500" size={20} />
            <h2 className="text-lg font-mono font-bold text-slate-200 tracking-wider">MEMORY_INSPECTOR_V1</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-red-400 transition-colors" aria-label="Close">
            <X size={24} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-700 flex gap-4 items-center bg-slate-800/30">
          <div className="flex bg-slate-950 border border-slate-700 rounded p-1">
            <button 
              onClick={() => { setActiveTab('nodes'); setSelectedGhost(null); }}
              className={`px-4 py-1.5 rounded text-xs font-mono transition-all ${activeTab === 'nodes' ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/20' : 'text-slate-400 hover:text-slate-200'}`}
            >
              ACTIVE_NODES ({nodes.length})
            </button>
            <button 
              onClick={() => { setActiveTab('ghosts'); setSelectedNode(null); }}
              className={`px-4 py-1.5 rounded text-xs font-mono transition-all ${activeTab === 'ghosts' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-slate-200'}`}
            >
              GHOST_BRANCHES ({ghosts.length})
            </button>
          </div>

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text" 
              placeholder="SEARCH_MEMORY_LATTICE..." 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded py-1.5 pl-9 pr-4 text-xs font-mono text-slate-300 focus:border-fuchsia-500 outline-none"
            />
          </div>
          
          <button onClick={refreshData} className="p-2 text-slate-400 hover:text-emerald-400 transition-colors" title="Refresh Data">
            <Activity size={18} />
          </button>
          
          <button 
            onClick={() => {
                const count = topologicalMemory.pruneMemory(0.3); // Prune below 30% confidence
                alert(`Pruned ${count} weak memory nodes.`);
                refreshData();
            }}
            className="p-2 text-slate-400 hover:text-red-400 transition-colors" 
            title="Prune Weak Memories (< 30%)"
          >
            <Trash2 size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* List View */}
          <div className="w-1/3 border-r border-slate-700 overflow-y-auto custom-scrollbar bg-slate-900/50">
            {activeTab === 'nodes' ? (
              <div className="divide-y divide-slate-800">
                {filteredNodes.map(node => (
                  <div 
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className={`p-4 cursor-pointer hover:bg-slate-800/50 transition-colors ${selectedNode?.id === node.id ? 'bg-fuchsia-500/10 border-l-2 border-fuchsia-500' : 'border-l-2 border-transparent'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-mono text-slate-500">{node.id}</span>
                      <span className={`text-[10px] font-mono px-1.5 rounded ${node.confidence > 0.8 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {(node.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2 font-sans">{node.content}</p>
                    <div className="mt-2 flex gap-2 text-[10px] text-slate-600 font-mono">
                      <span>CHILDS: {node.childrenIds.length}</span>
                      <span>GHOSTS: {node.ghostBranchIds.length}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {filteredGhosts.map(ghost => (
                  <div 
                    key={ghost.id}
                    onClick={() => setSelectedGhost(ghost)}
                    className={`p-4 cursor-pointer hover:bg-slate-800/50 transition-colors ${selectedGhost?.id === ghost.id ? 'bg-cyan-500/10 border-l-2 border-cyan-500' : 'border-l-2 border-transparent'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-mono text-slate-500">{ghost.id}</span>
                      <GitBranch size={12} className="text-cyan-500" />
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2 font-sans">{ghost.content}</p>
                    <p className="text-[10px] text-red-400 mt-1 font-mono line-clamp-1">REJECTED: {ghost.reasonForRejection}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details View */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950 p-6">
            {activeTab === 'nodes' && selectedNode ? (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-sm font-mono text-fuchsia-500 mb-2">NODE_CONTENT</h3>
                    </div>
                    <button 
                        onClick={() => {
                            if (confirm('Delete this memory node? This cannot be undone.')) {
                                topologicalMemory.deleteNode(selectedNode.id);
                                setSelectedNode(null);
                                refreshData();
                            }
                        }}
                        className="text-xs flex items-center gap-1 text-red-400 hover:text-red-300 border border-red-900/50 bg-red-950/20 px-2 py-1 rounded"
                    >
                        <Trash2 size={12} /> DELETE_NODE
                    </button>
                </div>
                <div className="p-4 bg-slate-900 rounded border border-slate-800 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedNode.content}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-xs font-mono text-slate-500 mb-2">METADATA</h3>
                    <div className="p-3 bg-slate-900 rounded border border-slate-800 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">ID:</span>
                        <span className="text-slate-300 font-mono">{selectedNode.id}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">TIMESTAMP:</span>
                        <span className="text-slate-300 font-mono">{new Date(selectedNode.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">CONFIDENCE:</span>
                        <span className="text-emerald-400 font-mono">{(selectedNode.confidence * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-mono text-slate-500 mb-2">CONNECTIONS</h3>
                    <div className="p-3 bg-slate-900 rounded border border-slate-800 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">PARENT:</span>
                        <span className="text-slate-300 font-mono">{selectedNode.parentId || 'ROOT'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">CHILDREN:</span>
                        <span className="text-slate-300 font-mono">{selectedNode.childrenIds.length}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">GHOSTS:</span>
                        <span className="text-slate-300 font-mono">{selectedNode.ghostBranchIds.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* JSON View for Debugging */}
                <div>
                    <h3 className="text-xs font-mono text-slate-600 mb-2">RAW_JSON</h3>
                    <pre className="text-[10px] text-slate-600 bg-black p-2 rounded overflow-x-auto">
                        {JSON.stringify(selectedNode, null, 2)}
                    </pre>
                </div>
              </div>
            ) : activeTab === 'ghosts' && selectedGhost ? (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                 <div>
                  <h3 className="text-sm font-mono text-cyan-500 mb-2">GHOST_CONTENT</h3>
                  <div className="p-4 bg-slate-900 rounded border border-slate-800 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                    {selectedGhost.content}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-mono text-red-400 mb-2">REJECTION_REASON</h3>
                  <div className="p-4 bg-red-950/20 rounded border border-red-900/50 text-sm text-red-300 font-mono">
                    {selectedGhost.reasonForRejection}
                  </div>
                </div>

                <div>
                    <h3 className="text-xs font-mono text-slate-500 mb-2">ORIGIN</h3>
                    <div className="p-3 bg-slate-900 rounded border border-slate-800 text-xs">
                        <span className="text-slate-500">BRANCHED FROM: </span>
                        <span className="text-slate-300 font-mono">{selectedGhost.originNodeId}</span>
                    </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600">
                <Database size={48} className="mb-4 opacity-20" />
                <p className="font-mono text-sm">SELECT_NODE_TO_INSPECT</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemoryInspector;
