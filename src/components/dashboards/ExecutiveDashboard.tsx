import React from 'react';
import { SystemStats } from '../../types';
import { Activity, Zap, Database, Brain, TrendingUp, DollarSign, Users, Clock, Cpu } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface ExecutiveDashboardProps {
  stats: SystemStats;
}

const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ stats }) => {
  // Mock data for executive charts (since we don't have historical persistence for all metrics yet)
  const costData = [
    { name: 'Mon', cost: 1.20 },
    { name: 'Tue', cost: 2.10 },
    { name: 'Wed', cost: 1.80 },
    { name: 'Thu', cost: 3.50 },
    { name: 'Fri', cost: 2.90 },
    { name: 'Sat', cost: 0.50 },
    { name: 'Sun', cost: 0.80 },
  ];

  const tokenUsageData = [
    { name: 'Reflex', tokens: stats.lastReflexTokens || 1200, color: '#06b6d4' },
    { name: 'Memory', tokens: stats.lastMemoryTokens || 3500, color: '#d946ef' },
    { name: 'Consensus', tokens: 800, color: '#f59e0b' },
  ];

  return (
    <div className="flex flex-col h-full p-8 bg-slate-950 text-slate-200 overflow-y-auto">
      <header className="mb-8 flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Executive Overview</h1>
            <p className="text-slate-500 mt-1">System Performance & Cost Analysis</p>
        </div>
        <div className="flex gap-4">
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-400"><Activity size={20} /></div>
                <div>
                    <div className="text-xs text-slate-500 uppercase font-bold">System Health</div>
                    <div className="text-lg font-bold text-emerald-400">98.4%</div>
                </div>
            </div>
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-full text-blue-400"><Clock size={20} /></div>
                <div>
                    <div className="text-xs text-slate-500 uppercase font-bold">Uptime</div>
                    <div className="text-lg font-bold text-white">24d 12h</div>
                </div>
            </div>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 hover:border-cyan-500/30 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400"><Zap size={24} /></div>
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1"><TrendingUp size={12} /> +12%</span>
            </div>
            <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider">Reflex Latency</h3>
            <div className="text-3xl font-bold text-white mt-1">{stats.reflexLatency[stats.reflexLatency.length - 1] || 0}ms</div>
        </div>

        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 hover:border-fuchsia-500/30 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-fuchsia-500/10 rounded-lg text-fuchsia-400"><Database size={24} /></div>
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1"><TrendingUp size={12} /> +5%</span>
            </div>
            <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider">Memory Depth</h3>
            <div className="text-3xl font-bold text-white mt-1">{stats.activeMemoryNodes} Nodes</div>
        </div>

        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 hover:border-amber-500/30 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400"><DollarSign size={24} /></div>
                <span className="text-xs font-mono text-red-400 flex items-center gap-1"><TrendingUp size={12} /> +2.4%</span>
            </div>
            <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider">Est. Cost (Daily)</h3>
            <div className="text-3xl font-bold text-white mt-1">$2.84</div>
        </div>

        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 hover:border-emerald-500/30 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><Brain size={24} /></div>
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1"><TrendingUp size={12} /> 99%</span>
            </div>
            <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider">Neuro Confidence</h3>
            <div className="text-3xl font-bold text-white mt-1">{(stats.neuroConfidence || 0).toFixed(1)}%</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[300px]">
        {/* Cost Analysis */}
        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <DollarSign size={18} className="text-amber-400" /> Cost Analysis (7 Days)
            </h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={costData}>
                        <defs>
                            <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                            itemStyle={{ color: '#f59e0b' }}
                        />
                        <Area type="monotone" dataKey="cost" stroke="#f59e0b" fillOpacity={1} fill="url(#colorCost)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Token Usage Distribution */}
        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Cpu size={18} className="text-cyan-400" /> Token Usage by Core
            </h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tokenUsageData} layout="vertical">
                        <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={80} />
                        <Tooltip 
                            cursor={{fill: 'rgba(255,255,255,0.05)'}}
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                        />
                        <Bar dataKey="tokens" radius={[0, 4, 4, 0]} barSize={32}>
                            {tokenUsageData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
