import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { Mic, MicOff, Activity, X, Check, AlertCircle } from 'lucide-react';

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

const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript, onStateChange, disabled, onStartLiveMode }) => {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { cancel } = useTextToSpeech();
  
  const recognitionRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup function for Audio Context
  const cleanupAudio = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  // Initialize Audio Visualization
  const startVisualization = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

    } catch (err) {
      console.warn("Audio visualization failed to start:", err);
      // We don't block speech recognition if viz fails
    }
  };

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; 
      recognition.interimResults = true; 
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        onStateChange(true);
        setError(null);
        cancel();
        startVisualization();
      };

      recognition.onend = () => {
        setIsListening(false);
        onStateChange(false);
        setInterimText('');
        cleanupAudio();
      };

      recognition.onerror = (event: any) => {
        console.error("ASR Error:", event.error);
        setIsListening(false);
        onStateChange(false);
        cleanupAudio();
        
        if (event.error === 'not-allowed') {
            setError('MIC_ACCESS_DENIED');
        } else if (event.error === 'no-speech') {
            // Ignore no-speech error, just close
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

    return () => {
        cleanupAudio();
    };
  }, [onTranscript, onStateChange, cleanupAudio]);

  // Toggle Listening
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setInterimText('');
      recognitionRef.current?.start();
    }
  };

  // Animation Loop
  useEffect(() => {
    if (!isListening || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const draw = () => {
      if (!canvas || !analyserRef.current) {
          // Fallback animation if no real audio data
          if (canvas && ctx) {
             ctx.clearRect(0, 0, canvas.width, canvas.height);
             const time = Date.now() / 1000;
             ctx.beginPath();
             ctx.strokeStyle = '#22d3ee';
             ctx.lineWidth = 2;
             for(let x = 0; x < canvas.width; x++) {
                 const y = canvas.height/2 + Math.sin(x * 0.05 + time * 5) * 20;
                 if(x===0) ctx.moveTo(x, y);
                 else ctx.lineTo(x, y);
             }
             ctx.stroke();
          }
          animationId = requestAnimationFrame(draw);
          return;
      }

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const barWidth = (width / bufferLength) * 2.5;
      let x = 0;

      // Create gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#22d3ee'); // Cyan
      gradient.addColorStop(1, '#3b82f6'); // Blue

      ctx.fillStyle = gradient;

      // Mirror effect
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height * 0.8; // Scale factor
        
        // Top half
        ctx.fillRect(x, height / 2 - barHeight / 2, barWidth, barHeight);
        
        x += barWidth + 1;
      }
      
      animationId = requestAnimationFrame(draw);
    };

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isListening]);

  // --- Render States ---

  // 1. Active Listening HUD
  if (isListening) {
    return (
      <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl rounded-xl border border-cyan-500/50 z-50 flex items-center px-4 animate-in fade-in zoom-in-95 duration-200 shadow-[0_0_30px_-5px_rgba(34,211,238,0.3)]">
        
        {/* Icon Indicator */}
        <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center mr-4 shrink-0 relative border border-cyan-500/30">
            <div className="absolute inset-0 rounded-full bg-cyan-400 animate-ping opacity-20"></div>
            <Mic size={16} className="text-cyan-400" />
        </div>

        {/* Visualization / Text Area */}
        <div className="flex-1 h-full relative flex items-center overflow-hidden">
             {/* Audio Waveform (Canvas) */}
             <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-40 pointer-events-none mix-blend-screen" />
             
             {/* Text Stream */}
             <div className="relative z-10 font-mono text-sm w-full truncate px-2">
                {interimText ? (
                    <span className="text-cyan-50 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">{interimText}</span>
                ) : (
                    <span className="text-cyan-500/50 flex items-center gap-2 text-[10px] tracking-widest uppercase">
                        <Activity size={12} className="animate-pulse" />
                        Listening...
                    </span>
                )}
             </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 ml-2">
            {/* Manual Stop/Send */}
            <button 
                onClick={toggleListening}
                className="p-2 hover:bg-cyan-500/20 rounded-full text-cyan-400 transition-colors"
                title="Stop & Send"
            >
                <Check size={16} />
            </button>
            
            {/* Cancel */}
            <button 
                onClick={() => {
                    recognitionRef.current?.abort();
                    setInterimText('');
                }}
                className="p-2 hover:bg-red-500/20 rounded-full text-slate-500 hover:text-red-400 transition-colors"
                title="Cancel"
            >
                <X size={16} />
            </button>
        </div>
      </div>
    );
  }

  // 2. Resting State Button
  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={disabled || !!error}
      aria-label={error ? "Voice input unavailable" : "Start voice input"}
      className={`
        p-1.5 rounded-md transition-all duration-300 group/mic relative
        ${error ? 'text-red-500/50 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-800 hover:text-cyan-400'}
      `}
      title={error || "Voice Command Input"}
    >
      {error ? (
         <div className="relative">
             <MicOff size={18} />
             <AlertCircle size={10} className="absolute -top-1 -right-1 text-red-500" />
         </div>
      ) : (
         <div className="relative">
            <Mic size={18} className="group-hover/mic:scale-110 transition-transform" />
            {/* Subtle glow hint */}
            <div className="absolute inset-0 bg-cyan-400/0 group-hover/mic:bg-cyan-400/10 rounded-full blur-md transition-colors"></div>
         </div>
      )}
    </button>
  );
};

export default VoiceInput;