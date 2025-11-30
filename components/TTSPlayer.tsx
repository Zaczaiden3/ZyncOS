import React, { useEffect } from 'react';
import { Play, Square, Volume2, AlertCircle } from 'lucide-react';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { AIRole } from '../types';

interface TTSPlayerProps {
  text: string;
  role: AIRole;
}

import { useSpeechContext } from '../contexts/SpeechContext';

const TTSPlayer: React.FC<TTSPlayerProps> = ({ text, role }) => {
  const { speak, cancel, isSpeaking, isSupported } = useTextToSpeech();
  const { isMuted, settings, voices } = useSpeechContext();
  
  // Clean text for speech (remove markdown symbols)
  const cleanText = React.useMemo(() => {
    return text
      .replace(/[*#`]/g, '') // Remove basic markdown chars
      .replace(/\[.*?\]/g, '') // Remove citations like [1]
      .replace(/https?:\/\/\S+/g, 'link'); // Replace URLs
  }, [text]);

  // Auto-stop when component unmounts
  useEffect(() => {
    return () => cancel();
  }, [cancel]);

  if (!isSupported) return null;

  const handlePlay = () => {
    if (isMuted) return; // Prevent playing if muted
    
    const selectedVoice = voices.find(v => v.voiceURI === settings.voiceURI);

    const options = {
        voice: selectedVoice,
        pitch: settings.pitch, // Use global pitch setting
        rate: settings.rate,   // Use global rate setting
        volume: settings.volume
    };
    speak(cleanText, options);
  };

  return (
    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button
            onClick={isSpeaking ? cancel : handlePlay}
            className={`
                p-1.5 rounded-md flex items-center gap-1.5 transition-all duration-200
                ${isSpeaking 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                    : 'bg-slate-800/50 text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-400 border border-transparent hover:border-cyan-500/30'
                }
            `}
            title={isSpeaking ? "Stop Speaking" : "Read Aloud"}
        >
            {isSpeaking ? (
                <>
                    <Square size={10} className="fill-current" />
                    <span className="text-[9px] font-mono uppercase tracking-wider">Stop</span>
                    <div className="flex gap-0.5 items-end h-2">
                        <div className="w-0.5 h-full bg-current animate-[pulse_0.5s_ease-in-out_infinite]"></div>
                        <div className="w-0.5 h-2/3 bg-current animate-[pulse_0.5s_ease-in-out_0.2s_infinite]"></div>
                        <div className="w-0.5 h-full bg-current animate-[pulse_0.5s_ease-in-out_0.4s_infinite]"></div>
                    </div>
                </>
            ) : (
                <Volume2 size={12} />
            )}
        </button>
    </div>
  );
};

export default TTSPlayer;
