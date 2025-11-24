import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Activity, X } from 'lucide-react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onStateChange: (isListening: boolean) => void;
  disabled?: boolean;
}

// Add TypeScript support for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript, onStateChange, disabled }) => {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Stop after one sentence/command
      recognition.interimResults = true; // Show real-time results
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        onStateChange(true);
        setError(null);
      };

      recognition.onend = () => {
        setIsListening(false);
        onStateChange(false);
        setInterimText('');
      };

      recognition.onerror = (event: any) => {
        console.error("ASR Error:", event.error);
        setIsListening(false);
        onStateChange(false);
        if (event.error === 'not-allowed') {
            setError('MIC_ACCESS_DENIED');
        } else {
            setError(`ASR_ERR: ${event.error.toUpperCase()}`);
        }
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (interim) setInterimText(interim);
        if (finalTranscript) {
            onTranscript(finalTranscript);
        }
      };

      recognitionRef.current = recognition;
    } else {
      setError('API_UNSUPPORTED');
    }
  }, [onTranscript, onStateChange]);

  // Toggle Listening
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setInterimText('');
      recognitionRef.current?.start();
    }
  };

  // Audio Visualizer Animation (The "Acoustic Model" Visualization)
  useEffect(() => {
    if (!isListening || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let phase = 0;

    const drawWave = () => {
      if (!canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Dynamic styling
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#22d3ee'; // Cyan-400

      ctx.beginPath();
      
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // Draw multiple sine waves to simulate voice harmonics
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        for (let x = 0; x < width; x++) {
            // Combine sine waves
            // Frequency varies with x and phase
            // Amplitude varies based on "interimText" length (simulating volume)
            const amplitude = 5 + (interimText.length > 0 ? 15 : 2) * (1 - i * 0.3);
            const frequency = 0.02 + (i * 0.01);
            const speed = 0.1 + (i * 0.05);
            
            const y = centerY + Math.sin(x * frequency + phase * speed) * amplitude * Math.sin(x / width * Math.PI); // Envelope
            
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.globalAlpha = 1 - (i * 0.3);
        ctx.stroke();
      }

      phase += 0.5; // Animation speed
      animationId = requestAnimationFrame(drawWave);
    };

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    drawWave();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isListening, interimText]);

  // --- Render States ---

  // 1. Active Listening HUD
  if (isListening) {
    return (
      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md rounded-xl border border-cyan-500/50 z-50 flex items-center px-4 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Icon Indicator */}
        <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center mr-4 shrink-0 relative">
            <div className="absolute inset-0 rounded-full bg-cyan-400 animate-ping opacity-20"></div>
            <Mic size={16} className="text-cyan-400" />
        </div>

        {/* Visualization / Text Area */}
        <div className="flex-1 h-full relative flex items-center overflow-hidden">
             {/* Audio Waveform (Canvas) */}
             <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" />
             
             {/* Text Stream */}
             <div className="relative z-10 font-mono text-sm w-full">
                {interimText ? (
                    <span className="text-cyan-100">{interimText}</span>
                ) : (
                    <span className="text-cyan-500/50 flex items-center gap-2 text-[10px] tracking-widest uppercase">
                        <Activity size={12} className="animate-pulse" />
                        Acoustic Model Active...
                    </span>
                )}
             </div>
        </div>

        {/* Close / Stop Button */}
        <button 
            onClick={toggleListening}
            className="ml-4 p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-red-400 transition-colors"
        >
            <X size={18} />
        </button>
      </div>
    );
  }

  // 2. Resting State Button
  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={disabled || !!error}
      className={`
        p-1.5 rounded-md transition-all duration-300 group/mic
        ${error ? 'text-red-500/50 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-800 hover:text-cyan-400'}
      `}
      title={error || "Voice Command Input"}
    >
      {error ? (
         <MicOff size={18} />
      ) : (
         <div className="relative">
            <Mic size={18} className="group-hover/mic:scale-110 transition-transform" />
         </div>
      )}
    </button>
  );
};

export default VoiceInput;