import React, { useState, useEffect } from 'react';
import { X, Settings, Key, Cpu, Mic, Monitor, Save, RefreshCw, Play, Square, Trash2 } from 'lucide-react';
import { useSpeechContext } from '../contexts/SpeechContext';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { getSettings, saveSettings, AppSettings } from '../services/settings';

interface SettingsPanelProps {
  onClose: () => void;
}

type Tab = 'general' | 'api' | 'models' | 'voice';

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [appSettings, setAppSettings] = useState<AppSettings>(getSettings());
  const [isSaved, setIsSaved] = useState(false);

  // Voice State
  const { voices, settings: voiceSettings, updateSettings: updateVoiceSettings } = useSpeechContext();
  const { speak, cancel, isSpeaking } = useTextToSpeech();

  const handleSave = () => {
    saveSettings(appSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleVoiceTest = () => {
    if (isSpeaking) {
      cancel();
    } else {
      const selectedVoice = voices.find(v => v.voiceURI === voiceSettings.voiceURI);
      speak("System voice calibration initiated. Audio output nominal.", {
        voice: selectedVoice,
        rate: voiceSettings.rate,
        pitch: voiceSettings.pitch,
        volume: voiceSettings.volume
      });
    }
  };

  const clearMemory = () => {
    if (confirm('Are you sure you want to clear all local memory? This cannot be undone.')) {
        localStorage.clear();
        window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex overflow-hidden h-[600px]">
        
        {/* Sidebar */}
        <div className="w-48 bg-slate-950 border-r border-slate-800 p-4 flex flex-col gap-2">
            <h2 className="text-sm font-bold text-slate-400 mb-4 px-2 flex items-center gap-2">
                <Settings size={16} /> SETTINGS
            </h2>
            
            <button 
                onClick={() => setActiveTab('general')}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-mono transition-colors ${activeTab === 'general' ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <Monitor size={14} /> GENERAL
            </button>
            <button 
                onClick={() => setActiveTab('api')}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-mono transition-colors ${activeTab === 'api' ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <Key size={14} /> API_KEYS
            </button>
            <button 
                onClick={() => setActiveTab('models')}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-mono transition-colors ${activeTab === 'models' ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <Cpu size={14} /> MODELS
            </button>
            <button 
                onClick={() => setActiveTab('voice')}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-mono transition-colors ${activeTab === 'voice' ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <Mic size={14} /> VOICE
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col bg-slate-900">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">{activeTab} CONFIGURATION</h3>
                <button onClick={onClose} className="text-slate-500 hover:text-white" title="Close Settings">
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                
                {/* GENERAL TAB */}
                {activeTab === 'general' && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-mono text-slate-500">THEME</label>
                            <select 
                                value={appSettings.theme}
                                onChange={(e) => setAppSettings({...appSettings, theme: e.target.value as any})}
                                aria-label="Select Theme"
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-300 focus:border-cyan-500 outline-none"
                            >
                                <option value="dark">Dark Protocol</option>
                                <option value="light">Light (Experimental)</option>
                                <option value="cyber">Cyberpunk High Contrast</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-mono text-slate-500">USER ROLE (VIEW MODE)</label>
                            <select 
                                value={appSettings.userRole || 'DEVELOPER'}
                                onChange={(e) => setAppSettings({...appSettings, userRole: e.target.value as any})}
                                aria-label="Select User Role"
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-300 focus:border-cyan-500 outline-none"
                            >
                                <option value="ADMIN">Admin (God Mode)</option>
                                <option value="DEVELOPER">Developer (Standard)</option>
                                <option value="EXECUTIVE">Executive (Metrics Only)</option>
                                <option value="USER">User (Simple Chat)</option>
                            </select>
                        </div>

                        <div className="pt-6 border-t border-slate-800">
                            <h4 className="text-xs font-bold text-red-400 mb-4 flex items-center gap-2"><Trash2 size={14} /> DANGER ZONE</h4>
                            <button 
                                onClick={clearMemory}
                                className="px-4 py-2 bg-red-500/10 border border-red-500/50 text-red-400 rounded text-xs font-mono hover:bg-red-500/20 transition-colors w-full text-left"
                            >
                                FACTORY RESET (CLEAR ALL DATA)
                            </button>
                        </div>
                    </div>
                )}

                {/* API KEYS TAB */}
                {activeTab === 'api' && (
                    <div className="space-y-6">
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-300 font-mono mb-4">
                            WARNING: Keys are stored in your browser's local storage. Do not use on shared devices.
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-mono text-slate-500">GEMINI_API_KEY</label>
                            <input 
                                type="password" 
                                value={appSettings.geminiApiKey}
                                onChange={(e) => setAppSettings({...appSettings, geminiApiKey: e.target.value})}
                                placeholder="AIzaSy..."
                                aria-label="Gemini API Key"
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-300 focus:border-cyan-500 outline-none font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-mono text-slate-500">OPENROUTER_API_KEY</label>
                            <input 
                                type="password" 
                                value={appSettings.openRouterApiKey}
                                onChange={(e) => setAppSettings({...appSettings, openRouterApiKey: e.target.value})}
                                placeholder="sk-or-..."
                                aria-label="OpenRouter API Key"
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-300 focus:border-cyan-500 outline-none font-mono"
                            />
                        </div>
                    </div>
                )}

                {/* MODELS TAB */}
                {activeTab === 'models' && (
                    <div className="space-y-6">
                         <div className="space-y-2">
                            <label className="text-xs font-mono text-cyan-400">REFLEX CORE MODEL (Fast)</label>
                            <input 
                                type="text" 
                                value={appSettings.reflexModel}
                                onChange={(e) => setAppSettings({...appSettings, reflexModel: e.target.value})}
                                aria-label="Reflex Core Model"
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-300 focus:border-cyan-500 outline-none font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-mono text-fuchsia-400">MEMORY CORE MODEL (Reasoning)</label>
                            <input 
                                type="text" 
                                value={appSettings.memoryModel}
                                onChange={(e) => setAppSettings({...appSettings, memoryModel: e.target.value})}
                                aria-label="Memory Core Model"
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-300 focus:border-fuchsia-500 outline-none font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-mono text-amber-400">CONSENSUS MODEL (Recovery)</label>
                            <input 
                                type="text" 
                                value={appSettings.consensusModel}
                                onChange={(e) => setAppSettings({...appSettings, consensusModel: e.target.value})}
                                aria-label="Consensus Model"
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-300 focus:border-amber-500 outline-none font-mono"
                            />
                        </div>
                    </div>
                )}

                {/* VOICE TAB */}
                {activeTab === 'voice' && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-mono text-cyan-400 uppercase tracking-wider">Voice Model</label>
                            <select 
                            value={voiceSettings.voiceURI || ''} 
                            onChange={(e) => updateVoiceSettings({ voiceURI: e.target.value })}
                            aria-label="Select Voice Model"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-cyan-500 focus:outline-none"
                            >
                            <option value="">Default System Voice</option>
                            {voices.map((voice) => (
                                <option key={voice.voiceURI} value={voice.voiceURI}>
                                {voice.name} ({voice.lang})
                                </option>
                            ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                            <label className="font-mono text-cyan-400 uppercase tracking-wider">Speed Rate</label>
                            <span className="text-slate-400 font-mono">{voiceSettings.rate.toFixed(1)}x</span>
                            </div>
                            <input 
                            type="range" 
                            min="0.5" 
                            max="2.0" 
                            step="0.1" 
                            value={voiceSettings.rate} 
                            onChange={(e) => updateVoiceSettings({ rate: parseFloat(e.target.value) })}
                            aria-label="Voice Speed Rate"
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                            <label className="font-mono text-cyan-400 uppercase tracking-wider">Pitch</label>
                            <span className="text-slate-400 font-mono">{voiceSettings.pitch.toFixed(1)}</span>
                            </div>
                            <input 
                            type="range" 
                            min="0.5" 
                            max="2.0" 
                            step="0.1" 
                            value={voiceSettings.pitch} 
                            onChange={(e) => updateVoiceSettings({ pitch: parseFloat(e.target.value) })}
                            aria-label="Voice Pitch"
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                            />
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button 
                            onClick={handleVoiceTest}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all
                                ${isSpeaking 
                                ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30' 
                                : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30'
                                }
                            `}
                            >
                            {isSpeaking ? <Square size={14} /> : <Play size={14} />}
                            {isSpeaking ? 'Stop Test' : 'Test Audio'}
                            </button>
                        </div>
                    </div>
                )}

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 flex justify-end">
                <button 
                    onClick={handleSave}
                    className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-mono text-sm font-bold flex items-center gap-2 transition-all"
                >
                    {isSaved ? <CheckIcon /> : <Save size={16} />}
                    {isSaved ? 'SAVED' : 'SAVE_CHANGES'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

const CheckIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
    </svg>
);

export default SettingsPanel;
