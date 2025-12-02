import React, { useState, useEffect } from 'react';
import { generateReflexResponseStream } from '../services/gemini';
import { Message, AIRole } from '../types';
import { FlaskConical, Plus, Trash2, Play, Save, X, MessageSquare, ThumbsUp, ThumbsDown } from 'lucide-react';

interface Persona {
  id: string;
  name: string;
  systemPrompt: string;
}

interface ExperimentResult {
  personaId: string;
  personaName: string;
  output: string;
  latency: number;
  rating?: 'up' | 'down';
}

interface ExperimentLabProps {
  onClose: () => void;
}

const DEFAULT_PERSONAS: Persona[] = [
  {
    id: 'default-reflex',
    name: 'Default Reflex',
    systemPrompt: 'You are the Reflex Core, a fast, tactical AI assistant.'
  },
  {
    id: 'sarcastic-bot',
    name: 'Sarcastic Bot',
    systemPrompt: 'You are a helpful assistant, but you are extremely sarcastic and dry in your responses.'
  },
  {
    id: 'eli5-bot',
    name: 'ELI5 Bot',
    systemPrompt: 'Explain everything as if the user is 5 years old. Use simple analogies.'
  }
];

const ExperimentLab: React.FC<ExperimentLabProps> = ({ onClose }) => {
  const [personas, setPersonas] = useState<Persona[]>(() => {
    const saved = localStorage.getItem('zync_experiment_personas');
    return saved ? JSON.parse(saved) : DEFAULT_PERSONAS;
  });

  const [selectedPersonas, setSelectedPersonas] = useState<Set<string>>(new Set(['default-reflex']));
  const [prompt, setPrompt] = useState('');
  const [results, setResults] = useState<ExperimentResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('zync_experiment_personas', JSON.stringify(personas));
  }, [personas]);

  const togglePersonaSelection = (id: string) => {
    const newSet = new Set(selectedPersonas);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedPersonas(newSet);
  };

  const handleRunExperiment = async () => {
    if (!prompt.trim() || selectedPersonas.size === 0) return;
    
    setIsRunning(true);
    setResults([]);
    
    const targets = personas.filter(p => selectedPersonas.has(p.id));
    const newResults: ExperimentResult[] = targets.map(p => ({
      personaId: p.id,
      personaName: p.name,
      output: '',
      latency: 0
    }));
    
    setResults(newResults);

    // Run in parallel
    const promises = targets.map(async (persona, index) => {
      const startTime = Date.now();
      try {
        const stream = generateReflexResponseStream(
          prompt, 
          [], // No history for isolated experiments
          null, 
          null, 
          persona.systemPrompt
        );

        for await (const update of stream) {
          setResults(prev => {
            const next = [...prev];
            next[index] = {
              ...next[index],
              output: update.fullText,
              latency: Date.now() - startTime
            };
            return next;
          });
        }
      } catch (e: any) {
        setResults(prev => {
            const next = [...prev];
            next[index] = {
              ...next[index],
              output: `Error: ${e.message}`,
              latency: Date.now() - startTime
            };
            return next;
          });
      }
    });

    await Promise.all(promises);
    setIsRunning(false);
  };

  const savePersona = (p: Persona) => {
    if (personas.find(existing => existing.id === p.id)) {
      setPersonas(personas.map(existing => existing.id === p.id ? p : existing));
    } else {
      setPersonas([...personas, p]);
    }
    setEditingPersona(null);
  };

  const deletePersona = (id: string) => {
    if (confirm('Delete this persona?')) {
      setPersonas(personas.filter(p => p.id !== id));
      const newSelected = new Set(selectedPersonas);
      newSelected.delete(id);
      setSelectedPersonas(newSelected);
    }
  };

  const handleRateResult = (personaId: string, rating: 'up' | 'down') => {
    setResults(prev => prev.map(r => {
        if (r.personaId === personaId) {
            return { ...r, rating: r.rating === rating ? undefined : rating };
        }
        return r;
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-7xl h-[90vh] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl flex overflow-hidden">
        
        {/* Sidebar: Personas */}
        <div className="w-1/4 border-r border-slate-700 flex flex-col bg-slate-900/50">
          <div className="p-4 border-b border-slate-700 flex justify-between items-center">
            <h2 className="text-sm font-mono font-bold text-fuchsia-500 flex items-center gap-2">
              <FlaskConical size={16} /> EXPERIMENT_LAB
            </h2>
            <button 
              onClick={() => setEditingPersona({ id: `p-${Date.now()}`, name: 'New Persona', systemPrompt: '' })}
              className="text-slate-400 hover:text-fuchsia-400"
              title="Add Persona"
            >
              <Plus size={18} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
            {personas.map(p => (
              <div 
                key={p.id}
                className={`p-3 rounded border cursor-pointer transition-all ${selectedPersonas.has(p.id) ? 'bg-fuchsia-500/10 border-fuchsia-500/50' : 'bg-slate-800/30 border-slate-700 hover:border-slate-600'}`}
                onClick={() => togglePersonaSelection(p.id)}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold text-slate-200">{p.name}</span>
                  <div className="flex gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingPersona(p); }}
                      className="text-slate-500 hover:text-cyan-400"
                      title="Edit Persona"
                      aria-label="Edit Persona"
                    >
                      <MessageSquare size={12} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deletePersona(p.id); }}
                      className="text-slate-500 hover:text-red-400"
                      title="Delete Persona"
                      aria-label="Delete Persona"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 line-clamp-2 font-mono">{p.systemPrompt}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 flex flex-col bg-slate-950">
          {/* Header & Controls */}
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <div className="flex-1 mr-4">
               <input 
                type="text" 
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Enter test prompt here..."
                aria-label="Test Prompt Input"
                className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-sm text-slate-200 focus:border-fuchsia-500 outline-none font-mono"
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleRunExperiment()}
               />
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={handleRunExperiment}
                    disabled={isRunning || !prompt.trim() || selectedPersonas.size === 0}
                    className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-xs font-mono flex items-center gap-2"
                    title="Run Experiment"
                >
                    {isRunning ? <ActivityIcon /> : <Play size={16} />} RUN_TEST
                </button>
                <button 
                    onClick={onClose} 
                    className="p-2 text-slate-500 hover:text-red-400"
                    title="Close Experiment Lab"
                    aria-label="Close Experiment Lab"
                >
                    <X size={20} />
                </button>
            </div>
          </div>

          {/* Results Grid */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            {results.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-700">
                    <FlaskConical size={64} className="mb-4 opacity-20" />
                    <p className="font-mono text-sm">SELECT PERSONAS AND RUN A PROMPT</p>
                </div>
            ) : (
                <div className={`grid gap-4 ${results.length === 1 ? 'grid-cols-1' : results.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {results.map(r => (
                        <div key={r.personaId} className="bg-slate-900 border border-slate-800 rounded-lg flex flex-col h-[60vh]">
                            <div className="p-3 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center">
                                <span className="text-xs font-bold text-fuchsia-400">{r.personaName}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-slate-500">{r.latency}ms</span>
                                    <div className="flex gap-1 ml-2 pl-2 border-l border-slate-700">
                                        <button 
                                            onClick={() => handleRateResult(r.personaId, 'up')}
                                            className={`p-1 rounded hover:bg-white/5 ${r.rating === 'up' ? 'text-green-400' : 'text-slate-500 hover:text-green-300'}`}
                                            title="Good Response"
                                        >
                                            <ThumbsUp size={12} />
                                        </button>
                                        <button 
                                            onClick={() => handleRateResult(r.personaId, 'down')}
                                            className={`p-1 rounded hover:bg-white/5 ${r.rating === 'down' ? 'text-red-400' : 'text-slate-500 hover:text-red-300'}`}
                                            title="Bad Response"
                                        >
                                            <ThumbsDown size={12} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                                {r.output || <span className="animate-pulse text-slate-600">...</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        {editingPersona && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-full max-w-lg shadow-2xl">
                    <h3 className="text-sm font-mono font-bold text-slate-200 mb-4">EDIT_PERSONA</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-mono text-slate-500 mb-1">NAME</label>
                            <input 
                                type="text" 
                                value={editingPersona.name}
                                onChange={e => setEditingPersona({...editingPersona, name: e.target.value})}
                                aria-label="Persona Name"
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-fuchsia-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-mono text-slate-500 mb-1">SYSTEM_PROMPT</label>
                            <textarea 
                                value={editingPersona.systemPrompt}
                                onChange={e => setEditingPersona({...editingPersona, systemPrompt: e.target.value})}
                                aria-label="System Prompt"
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-fuchsia-500 outline-none h-40 font-mono text-xs"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button 
                            onClick={() => setEditingPersona(null)}
                            className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-slate-200"
                        >
                            CANCEL
                        </button>
                        <button 
                            onClick={() => savePersona(editingPersona)}
                            className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded text-xs font-mono flex items-center gap-2"
                        >
                            <Save size={14} /> SAVE
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

const ActivityIcon = () => (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export default ExperimentLab;
