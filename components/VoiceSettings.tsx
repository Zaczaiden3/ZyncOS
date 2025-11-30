import React from 'react';
import { useSpeechContext } from '../contexts/SpeechContext';
import { X, Play, Square, Settings } from 'lucide-react';
import { useTextToSpeech } from '../hooks/useTextToSpeech';

interface VoiceSettingsProps {
  onClose: () => void;
}

const VoiceSettings: React.FC<VoiceSettingsProps> = ({ onClose }) => {
  const { voices, settings, updateSettings } = useSpeechContext();
  const { speak, cancel, isSpeaking } = useTextToSpeech();

  const handleTest = () => {
    if (isSpeaking) {
      cancel();
    } else {
      const selectedVoice = voices.find(v => v.voiceURI === settings.voiceURI);
      speak("System voice calibration initiated. Audio output nominal.", {
        voice: selectedVoice,
        rate: settings.rate,
        pitch: settings.pitch,
        volume: settings.volume
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
        
        <button 
          onClick={onClose}
          aria-label="Close settings"
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
          <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
            <Settings size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Voice Configuration</h2>
            <p className="text-xs text-slate-400 font-mono">AUDIO_SYNTHESIS_PARAMS</p>
          </div>
        </div>

        <div className="space-y-6">
          
          {/* Voice Selection */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-cyan-400 uppercase tracking-wider">Voice Model</label>
            <select 
              value={settings.voiceURI || ''} 
              onChange={(e) => updateSettings({ voiceURI: e.target.value })}
              aria-label="Select voice model"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            >
              <option value="">Default System Voice</option>
              {voices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>

          {/* Rate Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <label className="font-mono text-cyan-400 uppercase tracking-wider">Speed Rate</label>
              <span className="text-slate-400 font-mono">{settings.rate.toFixed(1)}x</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="2.0" 
              step="0.1" 
              value={settings.rate} 
              onChange={(e) => updateSettings({ rate: parseFloat(e.target.value) })}
              aria-label="Adjust speech rate"
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* Pitch Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <label className="font-mono text-cyan-400 uppercase tracking-wider">Pitch</label>
              <span className="text-slate-400 font-mono">{settings.pitch.toFixed(1)}</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="2.0" 
              step="0.1" 
              value={settings.pitch} 
              onChange={(e) => updateSettings({ pitch: parseFloat(e.target.value) })}
              aria-label="Adjust speech pitch"
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* Test Button */}
          <div className="pt-4 flex justify-end">
            <button 
              onClick={handleTest}
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
      </div>
    </div>
  );
};

export default VoiceSettings;
