import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { SystemStats } from '../types';
import { Activity, Database, Zap, List, BarChart3, Brain, Network, ChevronRight, X, Cpu } from 'lucide-react';

interface SystemVisualizerProps {
  stats: SystemStats;
  isReflexActive: boolean;
  isMemoryActive: boolean;
  onClose?: () => void; // Optional close handler for mobile
}

const SystemVisualizer: React.FC<SystemVisualizerProps> = ({ stats, isReflexActive, isMemoryActive, onClose }) => {
  
  const [displayTask, setDisplayTask] = useState(stats.currentTask);
  const [isFading, setIsFading] = useState(false);
  const [ghostLog, setGhostLog] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Handle fluid transition for task text
  useEffect(() => {
    if (stats.currentTask !== displayTask) {
      setIsFading(true);
      const timer = setTimeout(() => {
        setDisplayTask(stats.currentTask);
        setIsFading(false);
      }, 200); // Wait for fade out
      return () => clearTimeout(timer);
    }
  }, [stats.currentTask, displayTask]);

  // Ghost Logging Logic (Recommendation B)
  useEffect(() => {
    if (stats.currentTask !== 'SYSTEM_IDLE') {
      setGhostLog(null);
      return;
    }

    // Random background tasks to simulate CLI liveness
    const backgroundTasks = [
      'GARBAGE_COLLECTION', 
      'CACHE_FLUSH', 
      'PING_CHECK: 12ms', 
      'INDEX_REVALIDATE', 
      'MEM_OPTIMIZE', 
      'DAEMON_SYNC', 
      'VECTOR_NORMALIZE'
    ];

    const interval = setInterval(() => {
      // 20% chance to spawn a log every 2 seconds
      if (Math.random() > 0.8) {
        const task = backgroundTasks[Math.floor(Math.random() * backgroundTasks.length)];
        setGhostLog(task);
        
        // Fade out after 2s
        setTimeout(() => {
          setGhostLog(null);
        }, 2000);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [stats.currentTask]);

  // Transform simple arrays into chart-friendly objects
  const chartData = stats.reflexLatency.map((val, i) => ({
    name: i,
    reflex: val,
    memory: stats.memoryDepth[i] || 0,
  }));

  return (
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
            <div className="text-[10px] text-slate-500 font-mono hidden md:block">V.2.5.1_STABLE</div>
            {onClose && (
                <button onClick={onClose} className="md:hidden p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                    <X size={18} />
                </button>
            )}
        </div>
      </div>

      {/* Main Content Stack - Scrollable on mobile if needed */}
      <div className="flex flex-col gap-6 overflow-y-auto md:overflow-visible pr-2 md:pr-0">
        
        {/* Network & Quota Status (New Granular Indicators) */}
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
            `}>
            {/* Background Glow - Breathing Animation */}
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
                ${isMemoryActive ? 'border-fuchsia-500/50 bg-fuchsia-950/20 shadow-[0_0_20px_-5px_rgba(217,70,239,0.3)]' : 'border-slate-800/50 bg-slate-900/20 hover:border-slate-700'}
            `}>
            {/* Background Glow - Breathing Animation */}
            <div className={`
                absolute -right-4 -top-4 w-24 h-24 bg-fuchsia-500/20 rounded-full blur-2xl 
                transition-all duration-700
                ${isMemoryActive ? 'opacity-100 animate-pulse' : 'opacity-40 animate-breathing-slow'}
                group-hover:opacity-80 group-hover:scale-110 group-hover:blur-3xl
            `}></div>

            <div className="flex justify-between items-start mb-4 relative z-10">
                <Database className={`w-5 h-5 transition-colors duration-300 ${isMemoryActive ? 'text-fuchsia-400' : 'text-slate-600 group-hover:text-fuchsia-400/70'}`} />
                <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${isMemoryActive ? 'bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.8)]' : 'bg-slate-800 group-hover:bg-fuchsia-900 animate-breathing-slow'}`}></div>
            </div>
            <div className="text-[10px] font-mono text-slate-500 mb-1">MEMORY_CORE</div>
            <div className={`text-sm font-bold tracking-wider transition-colors duration-300 ${isMemoryActive ? 'text-fuchsia-100' : 'text-slate-400 group-hover:text-slate-300'}`}>
                {isMemoryActive ? 'ANALYZING' : 'SYNCED'}
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
                        <span className="w-1.5 h-3 bg-emerald-500/50 animate-pulse ml-1 shrink-0 hidden"></span>
                    </div>

                    {/* Ghost Logs (Recommendation B) */}
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
                        <span className="text-lg text-white font-mono font-bold block leading-none tracking-tight">{stats.lastReflexTokens}</span>
                        <span className="text-[9px] text-slate-500 font-mono uppercase opacity-70">/ 8,192 Cap</span>
                    </div>
                </div>
                <div className="w-full bg-slate-800/50 h-1.5 rounded-full overflow-hidden shadow-inner mt-1.5">
                    <div 
                        className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(6,182,212,0.5)]" 
                        style={{ width: `${Math.min((stats.lastReflexTokens / 8192) * 100, 100)}%` }}
                    ></div>
                </div>
            </div>
            {/* Memory Bar */}
            <div className="bg-slate-900/30 p-4 rounded-lg border border-slate-800 hover:border-fuchsia-500/30 transition-colors duration-300">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] text-fuchsia-400 font-mono font-bold">MEMORY</span>
                    <div className="text-right">
                        <span className="text-lg text-white font-mono font-bold block leading-none tracking-tight">{stats.lastMemoryTokens}</span>
                        <span className="text-[9px] text-slate-500 font-mono uppercase opacity-70">/ 8,192 Cap</span>
                    </div>
                </div>
                <div className="w-full bg-slate-800/50 h-1.5 rounded-full overflow-hidden shadow-inner mt-1.5">
                    <div 
                        className="bg-gradient-to-r from-fuchsia-600 to-fuchsia-400 h-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(232,121,249,0.5)]" 
                        style={{ width: `${Math.min((stats.lastMemoryTokens / 8192) * 100, 100)}%` }}
                    ></div>
                </div>
            </div>
            </div>
        </div>

        {/* Memory Node Topology (Optimized CSS Version) */}
        <div className="min-h-[140px] flex flex-col">
            <h3 className="text-[10px] font-mono text-slate-500 mb-3 flex items-center gap-2 uppercase tracking-wider">
            <Network size={12} /> Node Topology
            </h3>
            <div className="flex-1 bg-slate-900/30 rounded-xl border border-slate-800/50 p-4 relative overflow-hidden flex items-end">
                {/* Grid Background */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
                
                {/* Lightweight Custom Visualizer (No Recharts for this specific dynamic element) */}
                <div className="relative z-10 w-full h-full flex items-end justify-between gap-1">
                    {stats.memoryDepth.map((depth, index) => {
                         // Calculate base duration
                        const baseDuration = 1.5 + (index * 1337 % 2000) / 1000;
                        // Speed up if hovered
                        const duration = isHovered ? baseDuration * 0.2 : baseDuration;

                        return (
                        <div 
                            key={index} 
                            className={`
                                flex-1 min-w-[4px] rounded-t-sm bg-fuchsia-500/20 border-t border-fuchsia-500/30 transition-all duration-700 ease-out origin-bottom
                                ${stats.currentTask === 'SYSTEM_IDLE' ? 'animate-neural-bar' : ''}
                            `}
                            style={{ 
                                height: `${Math.max(5, depth)}%`,
                                // Deterministic pseudo-random duration for Perlin Noise effect
                                // Range: 1.5s to 3.5s based on index (modulated by hover)
                                animationDuration: `${duration}s`,
                                // Negative delay ensures animation starts mid-cycle for instant activity
                                animationDelay: `-${(index * 997 % 2000) / 1000}s`
                            }}
                        ></div>
                    )})}
                </div>
            </div>
        </div>

        {/* Heuristics */}
        <div>
            <h3 className="text-[10px] font-mono text-slate-500 mb-3 flex items-center gap-2 uppercase tracking-wider">
            <BarChart3 size={12} /> Heuristics (Conf)
            </h3>
            <div className="bg-slate-900/30 rounded-lg border border-slate-800 p-4 space-y-4">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-cyan-400 w-8">REF</span>
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
                        {/* Shimmer Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-45 animate-shimmer z-10"></div>
                        <div 
                            className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(34,211,238,0.5)] relative z-0" 
                            style={{ width: `${stats.reflexConfidence}%` }}
                        ></div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-300 w-8 text-right">{stats.reflexConfidence.toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-fuchsia-400 w-8">MEM</span>
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
                        {/* Shimmer Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-45 animate-shimmer z-10"></div>
                        <div 
                            className="bg-gradient-to-r from-fuchsia-600 to-fuchsia-400 h-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(232,121,249,0.5)] relative z-0" 
                            style={{ width: `${stats.memoryConfidence}%` }}
                        ></div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-300 w-8 text-right">{stats.memoryConfidence.toFixed(0)}%</span>
                </div>
            </div>
        </div>

        {/* Latency Chart */}
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
        
        {/* Footer */}
        <div className="flex justify-center pt-4 border-t border-slate-800/30 shrink-0">
            <div className="text-[10px] text-slate-600 font-mono flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
                <Cpu size={10} />
                SYSTEM_OPERATIONAL
            </div>
        </div>

      </div>
    </div>
  );
};

export default SystemVisualizer;