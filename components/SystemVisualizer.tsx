import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { SystemStats, WorkflowExecutionLog } from '../types';
import { Activity, Database, Zap, List, BarChart3, Brain, Network, ChevronRight, X, Cpu, AlertTriangle, RefreshCw, Shield, AlertCircle, Info } from 'lucide-react';
import LatticeVisualizer from './LatticeVisualizer';
import { LatticeNode, LatticeEdge } from '../cores/neuro-symbolic/types';
import { autonomicSystem, OperationalEvent } from '../services/autonomicSystem';
import './SystemVisualizer.css';

// --- Self-Healing: Error Boundary for Component Resilience ---
class VisualizerErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; errorInfo: string | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("SystemVisualizer Critical Failure:", error, errorInfo);
    this.setState({ errorInfo: error?.toString() });
  }

  handleReset = () => {
    this.setState({ hasError: false, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-red-400 font-mono bg-slate-950/50 border border-red-900/30 rounded-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
          <AlertTriangle size={32} className="mb-3 animate-pulse text-red-500" />
          <h3 className="text-sm font-bold tracking-widest uppercase">VISUALIZER_OFFLINE</h3>
          <p className="text-[10px] opacity-70 mt-2 text-center max-w-[200px]">
            Telemetry subsystem encountered a fatal exception.
          </p>
          
          {this.state.errorInfo && (
             <div className="mt-4 p-2 bg-black/40 border border-red-900/50 rounded text-[9px] w-full overflow-hidden text-ellipsis whitespace-nowrap opacity-60">
                {this.state.errorInfo}
             </div>
          )}

          <button 
            onClick={this.handleReset}
            className="mt-6 px-4 py-2 bg-red-500/10 border border-red-500/50 rounded hover:bg-red-500 hover:text-white transition-all duration-300 text-[10px] uppercase tracking-wider flex items-center gap-2 group"
          >
            <RefreshCw size={10} className="group-hover:animate-spin" />
            Reboot Subsystem
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Logical Parameters: Configuration Interface ---
export interface VisualizerConfig {
  showLattice?: boolean;
  showHeuristics?: boolean;
  showLatencyChart?: boolean;
  ghostLogEnabled?: boolean;
  maxChartPoints?: number;
  refreshRate?: number;
}

interface SystemVisualizerProps {
  stats: SystemStats;
  isReflexActive: boolean;
  isMemoryActive: boolean;
  onClose?: () => void;
  lattice?: { nodes: LatticeNode[], edges: LatticeEdge[] };
  config?: VisualizerConfig;
  isDreaming?: boolean;
  activeModels?: {
    reflex: { name: string; status: string };
    memory: { name: string; status: string };
  };
  workflowLogs?: WorkflowExecutionLog[];
}

const SystemVisualizer: React.FC<SystemVisualizerProps> = ({ 
  stats, 
  isReflexActive, 
  isMemoryActive, 
  onClose, 
  lattice,
  config = {} as VisualizerConfig,
  isDreaming = false,
  activeModels,
  workflowLogs = []
}) => {
  // Apply Default Logical Parameters
  const {
    showLattice = true,
    showHeuristics = true,
    showLatencyChart = true,
    ghostLogEnabled = true,
    maxChartPoints = 50
  } = config;

  // Self-Healing: Safe Data Access
  // Ensure we never crash due to undefined stats or arrays
  const safeStats = useMemo(() => ({
    currentTask: stats?.currentTask || 'SYSTEM_IDLE',
    reflexLatency: Array.isArray(stats?.reflexLatency) ? stats.reflexLatency : [],
    memoryDepth: Array.isArray(stats?.memoryDepth) ? stats.memoryDepth : [],
    lastReflexTokens: stats?.lastReflexTokens || 0,
    lastMemoryTokens: stats?.lastMemoryTokens || 0,
    reflexConfidence: stats?.reflexConfidence || 0,
    memoryConfidence: stats?.memoryConfidence || 0,
    neuroConfidence: stats?.neuroConfidence || 0,
  }), [stats]);

  const [displayTask, setDisplayTask] = useState(safeStats.currentTask);
  const [isFading, setIsFading] = useState(false);
  const [ghostLog, setGhostLog] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Handle fluid transition for task text
  useEffect(() => {
    if (safeStats.currentTask !== displayTask) {
      setIsFading(true);
      const timer = setTimeout(() => {
        setDisplayTask(safeStats.currentTask);
        setIsFading(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [safeStats.currentTask, displayTask]);

  // Ghost Logging Logic
  useEffect(() => {
    if (!ghostLogEnabled || safeStats.currentTask !== 'SYSTEM_IDLE') {
      setGhostLog(null);
      return;
    }

    const backgroundTasks = [
      'GARBAGE_COLLECTION', 'CACHE_FLUSH', 'PING_CHECK: 12ms', 
      'INDEX_REVALIDATE', 'MEM_OPTIMIZE', 'DAEMON_SYNC', 'VECTOR_NORMALIZE',
      'HEAP_COMPACTION', 'THREAD_POOL_ADJUST', 'SOCKET_KEEPALIVE', 'ENTROPY_CHECK'
    ];

    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        const task = backgroundTasks[Math.floor(Math.random() * backgroundTasks.length)];
        setGhostLog(task);
        setTimeout(() => setGhostLog(null), 2000);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [safeStats.currentTask, ghostLogEnabled]);

  // Self-Healing: Data Sanitization for Charts
  const chartData = useMemo(() => {
    try {
      // Limit data points to prevent performance degradation (Self-Healing)
      const slicedReflex = safeStats.reflexLatency.slice(-maxChartPoints);
      const slicedMemory = safeStats.memoryDepth.slice(-maxChartPoints);
      
      return slicedReflex.map((val, i) => ({
        name: i,
        reflex: typeof val === 'number' ? val : 0,
        memory: typeof slicedMemory[i] === 'number' ? slicedMemory[i] : 0,
      }));
    } catch (e) {
      console.warn("Chart data generation failed, using fallback", e);
      return [];
    }
  }, [safeStats.reflexLatency, safeStats.memoryDepth, maxChartPoints]);

  return (
    <VisualizerErrorBoundary>
      <div 
        className="flex flex-col h-full p-6 overflow-y-auto scrollbar-none text-slate-200 relative bg-transparent"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <h2 className="text-xs font-mono font-bold text-cyan-400 tracking-[0.2em] uppercase flex items-center gap-2">
             <Activity size={14} />
             Telemetry
          </h2>
          <div className="flex items-center gap-3">
              <div className="text-[10px] text-slate-500 font-mono hidden md:block">V.2.6.0_CHIMERA</div>
              {onClose && (
                  <button onClick={onClose} aria-label="Close telemetry panel" className="md:hidden p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                      <X size={18} />
                  </button>
              )}
          </div>
        </div>

        {/* Main Content Stack */}
        <div className="flex flex-col gap-6 overflow-y-auto md:overflow-visible pr-2 md:pr-0">
          
          {/* 3D Lattice Visualization (Glass Box) */}
          {showLattice && lattice && lattice.nodes.length > 0 && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-700">
                  <LatticeVisualizer nodes={lattice.nodes} edges={lattice.edges} isActive={true} />
              </div>
          )}

          {/* Workflow Trace */}
          {workflowLogs.length > 0 && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-700">
               <h3 className="text-[10px] font-mono text-slate-500 mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <Network size={12} /> Workflow Trace
               </h3>
               <WorkflowTrace logs={workflowLogs} />
            </div>
          )}

          {/* Network & Quota Status */}
          <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/40 p-2 rounded border border-slate-800 flex flex-col gap-1">
                  <span className="text-[9px] text-slate-500 font-mono uppercase">Net Latency</span>
                  <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-xs font-mono text-slate-300">24ms</span>
                  </div>
              </div>
              <div className="bg-slate-900/40 p-2 rounded border border-slate-800 flex flex-col gap-1">
                  <span className="text-[9px] text-slate-500 font-mono uppercase">API Quota</span>
                  <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
                      <span className="text-xs font-mono text-slate-300">84%</span>
                  </div>
              </div>
          </div>
          
          {/* Active Status HUD Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Reflex Card */}
              <div className={`
                  relative p-4 rounded-xl border backdrop-blur-md transition-all duration-500 overflow-hidden group cursor-default
                  ${isReflexActive ? 'border-cyan-500/50 bg-cyan-950/20 shadow-[0_0_20px_-5px_rgba(6,182,212,0.3)]' : 'border-slate-800/50 bg-slate-900/20 hover:border-slate-700'}
              `} title={`Model: ${activeModels?.reflex.name || 'Unknown'}`}>
              <div className={`
                  absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/20 rounded-full blur-2xl 
                  transition-all duration-700 
                  ${isReflexActive ? 'opacity-100 animate-pulse' : 'opacity-40 animate-breathing-slow'}
                  group-hover:opacity-80 group-hover:scale-110 group-hover:blur-3xl
              `}></div>
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                  <Zap className={`w-5 h-5 transition-colors duration-300 ${isReflexActive ? 'text-cyan-400' : 'text-slate-600 group-hover:text-cyan-400/70'}`} />
                  <div className={`w-2 h-2 rounded-full transition-all duration-300 ${isReflexActive ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'bg-slate-800 group-hover:bg-cyan-900 animate-breathing-slow'}`}></div>
              </div>
              <div className="text-[10px] font-mono text-slate-500 mb-1">REFLEX_CORE</div>
              <div className={`text-sm font-bold tracking-wider transition-colors duration-300 ${isReflexActive ? 'text-cyan-100' : 'text-slate-400 group-hover:text-slate-300'}`}>
                  {isReflexActive ? 'PROCESSING' : 'STANDBY'}
              </div>
              </div>

              {/* Memory Card */}
              <div className={`
                  relative p-4 rounded-xl border backdrop-blur-md transition-all duration-500 overflow-hidden group cursor-default
                  ${isMemoryActive || isDreaming ? 'border-fuchsia-500/50 bg-fuchsia-950/20 shadow-[0_0_20px_-5px_rgba(217,70,239,0.3)]' : 'border-slate-800/50 bg-slate-900/20 hover:border-slate-700'}
              `} title={`Model: ${activeModels?.memory.name || 'Unknown'}`}>
              <div className={`
                  absolute -right-4 -top-4 w-24 h-24 bg-fuchsia-500/20 rounded-full blur-2xl 
                  transition-all duration-700
                  ${(isMemoryActive || isDreaming) ? 'opacity-100 animate-pulse' : 'opacity-40 animate-breathing-slow'}
                  group-hover:opacity-80 group-hover:scale-110 group-hover:blur-3xl
              `}></div>

              <div className="flex justify-between items-start mb-4 relative z-10">
                  <Database className={`w-5 h-5 transition-colors duration-300 ${isMemoryActive || isDreaming ? 'text-fuchsia-400' : 'text-slate-600 group-hover:text-fuchsia-400/70'}`} />
                  <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${isMemoryActive || isDreaming ? 'bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.8)]' : 'bg-slate-800 group-hover:bg-fuchsia-900 animate-breathing-slow'}`}></div>
              </div>
              <div className="text-[10px] font-mono text-slate-500 mb-1">MEMORY_CORE</div>
              <div className={`text-sm font-bold tracking-wider transition-colors duration-300 ${isMemoryActive || isDreaming ? 'text-fuchsia-100' : 'text-slate-400 group-hover:text-slate-300'}`}>
                  {isMemoryActive ? 'ANALYZING' : (isDreaming ? 'DREAMING' : 'SYNCED')}
              </div>
              </div>
          </div>

          {/* Task Monitor */}
          <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg pointer-events-none"></div>
              <div className="p-4 bg-black/40 rounded-lg border border-slate-800/80 font-mono text-[10px] shadow-inner backdrop-blur-sm">
                  <div className="flex items-center justify-between text-slate-500 mb-3 border-b border-slate-800/50 pb-2">
                  <div className="flex items-center gap-2">
                      <List size={12} className="text-emerald-500/70" />
                      <span>PROCESS_LOG</span>
                  </div>
                  <span className="text-[8px] opacity-50">LIVE_FEED</span>
                  </div>
                  <div className="h-12 flex flex-col justify-center relative">
                      {/* Main Task with Blinking Cursor */}
                      <div className={`text-emerald-400 font-bold flex items-center gap-2 transition-opacity duration-300 ${isFading ? 'opacity-0 blur-sm' : 'opacity-100 blur-0'}`}>
                          <ChevronRight size={10} />
                          <span className="tracking-wide truncate text-xs">
                             {displayTask}
                             <span className="animate-cursor-blink ml-0.5 text-emerald-500">_</span>
                          </span>
                      </div>

                      {/* Ghost Logs */}
                      <div className={`absolute bottom-0 left-5 text-slate-600 text-[9px] italic transition-all duration-700 transform ${ghostLog ? 'opacity-60 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                          {ghostLog && `> ${ghostLog}...`}
                      </div>
                  </div>
              </div>
          </div>

          {/* Token Context Load */}
          <div>
              <h3 className="text-[10px] font-mono text-slate-500 flex items-center gap-2 uppercase tracking-wider mb-3">
              <Brain size={12} /> TOKEN CONTEXT LOAD
              </h3>
              <div className="space-y-3">
              {/* Reflex Bar */}
              <div className="bg-slate-900/30 p-4 rounded-lg border border-slate-800 hover:border-cyan-500/30 transition-colors duration-300">
                  <div className="flex justify-between items-end mb-2">
                      <span className="text-[10px] text-cyan-400 font-mono font-bold">REFLEX</span>
                      <div className="text-right">
                          <span className="text-lg text-white font-mono font-bold block leading-none tracking-tight">{safeStats.lastReflexTokens}</span>
                          <span className="text-[9px] text-slate-500 font-mono uppercase opacity-70">/ 8,192 Cap</span>
                      </div>
                  </div>
                  <div className="w-full bg-slate-800/50 h-1.5 rounded-full overflow-hidden shadow-inner mt-1.5">
                      <ReflexBar widthPercentage={Math.min((safeStats.lastReflexTokens / 8192) * 100, 100)} />
                  </div>
              </div>
              {/* Memory Bar */}
              <div className="bg-slate-900/30 p-4 rounded-lg border border-slate-800 hover:border-fuchsia-500/30 transition-colors duration-300">
                  <div className="flex justify-between items-end mb-2">
                      <span className="text-[10px] text-fuchsia-400 font-mono font-bold">MEMORY</span>
                      <div className="text-right">
                          <span className="text-lg text-white font-mono font-bold block leading-none tracking-tight">{safeStats.lastMemoryTokens}</span>
                          <span className="text-[9px] text-slate-500 font-mono uppercase opacity-70">/ 8,192 Cap</span>
                      </div>
                  </div>
                  <div className="w-full bg-slate-800/50 h-1.5 rounded-full overflow-hidden shadow-inner mt-1.5">
                      <MemoryBar widthPercentage={Math.min((safeStats.lastMemoryTokens / 8192) * 100, 100)} />
                  </div>
              </div>
              </div>
          </div>

          {/* Memory Node Topology */}
          <div className="min-h-[140px] flex flex-col">
              <h3 className="text-[10px] font-mono text-slate-500 mb-3 flex items-center gap-2 uppercase tracking-wider">
              <Network size={12} /> Node Topology
              </h3>
              <div className="flex-1 bg-slate-900/30 rounded-xl border border-slate-800/50 p-4 relative overflow-hidden flex items-end">
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
                  
                  <div className="relative z-10 w-full h-full flex items-end justify-between gap-1">
                      {safeStats.memoryDepth.map((depth, index) => (
                          <TopologyNode key={index} depth={depth} index={index} isHovered={isHovered} currentTask={safeStats.currentTask} />
                      ))}
                  </div>
              </div>
          </div>

          {/* Heuristics */}
          {showHeuristics && (
            <div>
                <h3 className="text-[10px] font-mono text-slate-500 mb-3 flex items-center gap-2 uppercase tracking-wider">
                <BarChart3 size={12} /> Heuristics (Conf)
                </h3>
                <div className="bg-slate-900/30 rounded-lg border border-slate-800 p-4 space-y-4 relative">
                    {/* Legend/Tooltip for Threshold */}
                    <div className="absolute top-2 right-2 text-[8px] text-slate-600 font-mono flex items-center gap-1">
                        <div className="w-0.5 h-2 bg-red-500/50"></div>
                        <span>TRIGGER (85%)</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-cyan-400 w-8">REF</span>
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden relative group">
                            {/* Threshold Marker */}
                            <div className="absolute top-0 bottom-0 w-px bg-red-500/50 z-20" style={{ left: '85%' }}></div>
                            
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-45 animate-shimmer z-10"></div>
                            <ConfBar 
                                width={safeStats.reflexConfidence} 
                                className={`conf-bar h-full transition-all duration-500 ease-out relative z-0 ${
                                    safeStats.reflexConfidence < 85 
                                    ? 'bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]' 
                                    : 'bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]'
                                }`}
                            />
                        </div>
                        <span className={`text-[10px] font-mono w-8 text-right ${safeStats.reflexConfidence < 85 ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
                            {safeStats.reflexConfidence.toFixed(0)}%
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-fuchsia-400 w-8">MEM</span>
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden relative group">
                            {/* Threshold Marker */}
                            <div className="absolute top-0 bottom-0 w-px bg-red-500/50 z-20" style={{ left: '85%' }}></div>

                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-45 animate-shimmer z-10"></div>
                            <ConfBar 
                                width={safeStats.memoryConfidence} 
                                className={`conf-bar h-full transition-all duration-500 ease-out relative z-0 ${
                                    safeStats.memoryConfidence < 85 
                                    ? 'bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]' 
                                    : 'bg-gradient-to-r from-fuchsia-600 to-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.5)]'
                                }`}
                            />
                        </div>
                        <span className={`text-[10px] font-mono w-8 text-right ${safeStats.memoryConfidence < 85 ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
                            {safeStats.memoryConfidence.toFixed(0)}%
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-emerald-400 w-8">NEU</span>
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-45 animate-shimmer z-10"></div>
                            <ConfBar 
                                width={safeStats.neuroConfidence} 
                                className="conf-bar bg-gradient-to-r from-emerald-600 to-emerald-400 h-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(16,185,129,0.5)] relative z-0"
                            />
                        </div>
                        <span className="text-[10px] font-mono text-slate-300 w-8 text-right">{safeStats.neuroConfidence.toFixed(0)}%</span>
                    </div>
                </div>
            </div>
          )}

          {/* Latency Chart */}
          {showLatencyChart && (
            <div className="h-32 relative group mt-2">
                <div className="absolute top-0 right-0 z-10 flex items-center gap-1 px-2 py-1 bg-slate-950/80 rounded text-[8px] font-mono text-slate-500 border border-slate-800">
                    <Activity size={8} /> LATENCY
                </div>
                <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <defs>
                    <linearGradient id="colorReflex" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d946ef" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#d946ef" stopOpacity={0}/>
                    </linearGradient>
                    </defs>
                    <XAxis dataKey="name" hide />
                    <YAxis hide domain={[0, 'auto']} />
                    <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: '#334155', fontSize: '10px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }} 
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ display: 'none' }}
                    />
                    <Area 
                    type="monotone" 
                    dataKey="reflex" 
                    stroke="#06b6d4" 
                    fillOpacity={1} 
                    fill="url(#colorReflex)" 
                    strokeWidth={2}
                    isAnimationActive={false}
                    />
                    <Area 
                    type="monotone" 
                    dataKey="memory" 
                    stroke="#d946ef" 
                    fillOpacity={1} 
                    fill="url(#colorMemory)" 
                    strokeWidth={2}
                    isAnimationActive={false}
                    />
                </AreaChart>
                </ResponsiveContainer>
            </div>
          )}
          
          {/* Autonomic Ops Timeline */}
          <div className="mt-4">
              <h3 className="text-[10px] font-mono text-slate-500 mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <Shield size={12} /> Autonomic Ops
              </h3>
              <OpsTimeline />
          </div>

          {/* Footer */}
          <div className="flex justify-center pt-4 border-t border-slate-800/30 shrink-0">
              <div className="text-[10px] text-slate-600 font-mono flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
                  <Cpu size={10} />
                  SYSTEM_OPERATIONAL
              </div>
          </div>

        </div>
      </div>
    </VisualizerErrorBoundary>
  );
};

export default SystemVisualizer;

// --- Subcomponents ---

const WorkflowTrace = ({ logs }: { logs: WorkflowExecutionLog[] }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div ref={scrollRef} className="bg-slate-950/50 rounded-lg border border-slate-800/50 p-3 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent font-mono text-[10px] space-y-2 shadow-inner">
      {logs.length === 0 ? (
        <div className="text-slate-600 italic text-center py-4">Waiting for workflow execution...</div>
      ) : (
        logs.map((log, i) => (
          <div key={i} className="group relative border-l-2 border-slate-800 pl-3 py-1 transition-all hover:border-cyan-500/50 hover:bg-slate-900/30 rounded-r">
            <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-slate-600 text-[9px]">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}</span>
                    <span className={`font-bold tracking-wider ${
                        log.status === 'completed' ? 'text-emerald-400' : 
                        log.status === 'failed' ? 'text-red-400' : 
                        log.status === 'running' ? 'text-cyan-400 animate-pulse' : 'text-slate-500'
                    }`}>
                        {log.status === 'completed' && <Shield size={10} className="inline mr-1" />}
                        {log.status === 'failed' && <AlertTriangle size={10} className="inline mr-1" />}
                        {log.status === 'running' && <RefreshCw size={10} className="inline mr-1 animate-spin" />}
                        {log.stepId}
                    </span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                    log.status === 'completed' ? 'bg-emerald-500/10 text-emerald-300' : 
                    log.status === 'failed' ? 'bg-red-500/10 text-red-300' : 
                    log.status === 'running' ? 'bg-cyan-500/10 text-cyan-300' : 'bg-slate-800 text-slate-400'
                }`}>
                    {log.status.toUpperCase()}
                </span>
            </div>
            
            {/* Details on Hover */}
            <div className="hidden group-hover:block mt-2 p-2 bg-black/60 rounded border border-slate-700/50 text-slate-300 text-[9px] animate-in fade-in slide-in-from-top-1">
                {log.input && (
                    <div className="mb-1">
                        <span className="text-slate-500 uppercase mr-2">Input:</span>
                        <span className="font-mono text-cyan-200/80 break-all">{JSON.stringify(log.input)}</span>
                    </div>
                )}
                {log.output && (
                    <div>
                        <span className="text-slate-500 uppercase mr-2">Output:</span>
                        <span className="font-mono text-emerald-200/80 break-all">{JSON.stringify(log.output)}</span>
                    </div>
                )}
                {log.error && (
                    <div className="text-red-400 mt-1">
                        <span className="uppercase mr-2 font-bold">Error:</span>
                        {log.error}
                    </div>
                )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const OpsTimeline = () => {
    const [events, setEvents] = useState<OperationalEvent[]>([]);

    useEffect(() => {
        const unsubscribe = autonomicSystem.subscribe((updatedEvents) => {
            setEvents(updatedEvents);
        });
        return unsubscribe;
    }, []);

    return (
        <div className="bg-slate-900/30 rounded-lg border border-slate-800 p-2 h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent font-mono text-[9px]">
            {events.length === 0 ? (
                <div className="text-slate-600 italic text-center mt-4">No operational events recorded.</div>
            ) : (
                <div className="space-y-1.5">
                    {events.map(event => (
                        <div key={event.id} className="flex gap-2 items-start opacity-80 hover:opacity-100 transition-opacity">
                            <span className="text-slate-500 shrink-0">{new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}</span>
                            <div className="shrink-0 mt-0.5">
                                {event.type === 'ERROR' && <AlertCircle size={10} className="text-red-400" />}
                                {event.type === 'WARNING' && <AlertTriangle size={10} className="text-amber-400" />}
                                {event.type === 'REMEDIATION' && <Shield size={10} className="text-emerald-400" />}
                                {event.type === 'INFO' && <Info size={10} className="text-blue-400" />}
                            </div>
                            <span className={`break-words ${
                                event.type === 'ERROR' ? 'text-red-300' : 
                                event.type === 'WARNING' ? 'text-amber-300' : 
                                event.type === 'REMEDIATION' ? 'text-emerald-300' : 'text-slate-300'
                            }`}>
                                {event.message}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const ReflexBar = ({ widthPercentage }: { widthPercentage: number }) => {
    const ref = React.useRef<HTMLDivElement>(null);
    useEffect(() => {
        // Ensure at least 2% width if there is any activity, so it's visible
        const effectiveWidth = widthPercentage > 0 ? Math.max(2, widthPercentage) : 0;
        if (ref.current) ref.current.style.setProperty('--reflex-width', `${effectiveWidth}%`);
    }, [widthPercentage]);
    return <div ref={ref} className="reflex-bar bg-gradient-to-r from-cyan-600 to-cyan-400 h-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>;
};

const MemoryBar = ({ widthPercentage }: { widthPercentage: number }) => {
    const ref = React.useRef<HTMLDivElement>(null);
    useEffect(() => {
        // Ensure at least 2% width if there is any activity
        const effectiveWidth = widthPercentage > 0 ? Math.max(2, widthPercentage) : 0;
        if (ref.current) ref.current.style.setProperty('--memory-width', `${effectiveWidth}%`);
    }, [widthPercentage]);
    return <div ref={ref} className="memory-bar bg-gradient-to-r from-fuchsia-600 to-fuchsia-400 h-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(232,121,249,0.5)]"></div>;
};

const ConfBar = ({ width, className }: { width: number, className: string }) => {
    const ref = React.useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (ref.current) ref.current.style.setProperty('--conf-width', `${width}%`);
    }, [width]);
    return <div ref={ref} className={className}></div>;
};

const TopologyNode = ({ depth, index, isHovered, currentTask }: { depth: number, index: number, isHovered: boolean, currentTask: string }) => {
    const ref = React.useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (ref.current) {
            const baseDuration = 1.5 + (index * 1337 % 2000) / 1000;
            const duration = isHovered ? baseDuration * 0.2 : baseDuration;
            ref.current.style.setProperty('--node-height', `${Math.max(5, depth)}%`);
            ref.current.style.setProperty('--anim-duration', `${duration}s`);
            ref.current.style.setProperty('--anim-delay', `-${(index * 997 % 2000) / 1000}s`);
        }
    }, [depth, index, isHovered]);

    return (
        <div 
            ref={ref}
            className={`
                topology-node flex-1 min-w-[4px] rounded-t-sm bg-fuchsia-500/20 border-t border-fuchsia-500/30 transition-all duration-700 ease-out origin-bottom
                ${currentTask === 'SYSTEM_IDLE' ? 'animate-neural-bar' : ''}
            `}
        ></div>
    );
};
