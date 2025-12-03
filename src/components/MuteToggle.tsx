import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useSpeechContext } from '../contexts/SpeechContext';

const MuteToggle: React.FC = () => {
  const { isMuted, toggleMute } = useSpeechContext();
  return (
    <button
      onClick={toggleMute}
      className={`p-2 rounded-lg transition-all duration-300 ${isMuted ? 'text-slate-500 hover:text-slate-300' : 'text-cyan-400 hover:text-cyan-300 bg-cyan-500/10'}`}
      title={isMuted ? "Unmute Audio" : "Mute Audio"}
    >
      {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </button>
  );
};

export default MuteToggle;
