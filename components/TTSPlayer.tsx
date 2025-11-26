import React, { useState, useRef, useEffect } from 'react';
import { Volume2, StopCircle, AudioWaveform, Loader2 } from 'lucide-react';
import { generateSpeech, decodeAudioData } from '../services/gemini';
import { AIRole } from '../types';

interface TTSPlayerProps {
  text: string;
  role: AIRole;
}

type TTSStatus = 'IDLE' | 'ANALYZING_TEXT' | 'SYNTHESIZING' | 'DECODING_PCM' | 'PLAYING';

const TTSPlayer: React.FC<TTSPlayerProps> = ({ text, role }) => {
  const [status, setStatus] = useState<TTSStatus>('IDLE');
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const isMemory = role === AIRole.MEMORY;
  const isReflex = role === AIRole.REFLEX;

  // Visualizer Loop (Waveform Style)
  const drawVisualizer = () => {
    if (!canvasRef.current || !analyzerRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyzerRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const render = () => {
        if (!analyzerRef.current) return;
        
        analyzerRef.current.getByteTimeDomainData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.lineWidth = 2;
        const r = isMemory ? 232 : 6;   // Fuchsia vs Cyan
        const g = isMemory ? 121 : 182;
        const b = isMemory ? 249 : 212;
        ctx.strokeStyle = `rgb(${r},${g},${b})`;
        ctx.beginPath();

        const sliceWidth = canvas.width * 1.0 / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * canvas.height / 2;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();

        if (status === 'PLAYING') {
            animationFrameRef.current = requestAnimationFrame(render);
        }
    };
    render();
  };

  const handlePlay = async () => {
    if (status === 'PLAYING') {
        stopPlayback();
        return;
    }

    try {
        setError(null);
        
        // 1. Initialize Audio Context
        if (!audioContextRef.current) {
            const AudioContext = window.AudioContext || (window as any).webkitSpeechRecognition;
            audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') await ctx.resume();

        // 2. Text Analysis & Synthesis
        setStatus('ANALYZING_TEXT');
        // Removed artificial delay for speed
        setStatus('SYNTHESIZING');
        
        const base64Audio = await generateSpeech(text, role);
        
        if (!base64Audio) {
            throw new Error("Empty audio response from Neural Core");
        }

        // 3. Decode PCM
        setStatus('DECODING_PCM');
        const audioBuffer = await decodeAudioData(base64Audio, ctx);

        // 4. Play
        setStatus('PLAYING');
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        
        // Connect Analyzer for visualization
        const analyzer = ctx.createAnalyser();
        analyzer.fftSize = 2048; // Larger FFT size for better waveform resolution
        source.connect(analyzer);
        analyzer.connect(ctx.destination);
        
        sourceRef.current = source;
        analyzerRef.current = analyzer;

        source.start(0);
        
        // Start Visualizer
        drawVisualizer();

        source.onended = () => {
            setStatus('IDLE');
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };

    } catch (err: any) {
        console.error("TTS Error:", err);
        let errorMessage = "TTS_FAIL";
        if (err.message) {
            if (err.message.includes("404")) errorMessage = "MODEL_NOT_FOUND";
            else if (err.message.includes("400")) errorMessage = "BAD_REQUEST";
            else if (err.message.includes("quota")) errorMessage = "QUOTA_EXCEEDED";
            else errorMessage = err.message.slice(0, 20) + "...";
        }
        setError(errorMessage);
        setStatus('IDLE');
    }
  };

  const stopPlayback = () => {
    if (sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current = null;
    }
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
    }
    setStatus('IDLE');
  };

  // Cleanup
  useEffect(() => {
    return () => stopPlayback();
  }, []);

  const themeColor = isMemory ? 'text-fuchsia-400' : 'text-cyan-400';
  const borderColor = isMemory ? 'border-fuchsia-500/30' : 'border-cyan-500/30';
  const bgHover = isMemory ? 'hover:bg-fuchsia-500/10' : 'hover:bg-cyan-500/10';

  return (
    <div className="flex items-center gap-3 mt-3 select-none">
        <button
            onClick={handlePlay}
            className={`
                flex items-center gap-2 px-3 py-1.5 rounded-md border ${borderColor} bg-black/20 ${bgHover}
                transition-all duration-300 text-xs font-mono
            `}
        >
            {status === 'IDLE' && (
                <>
                    <Volume2 size={14} className={themeColor} />
                    <span className="opacity-70">PLAY_AUDIO</span>
                </>
            )}
            
            {(status === 'ANALYZING_TEXT' || status === 'SYNTHESIZING' || status === 'DECODING_PCM') && (
                <>
                    <Loader2 size={14} className={`${themeColor} animate-spin`} />
                    <span className="opacity-70">
                        {status === 'ANALYZING_TEXT' && 'PARSING_LINGUISTICS...'}
                        {status === 'SYNTHESIZING' && 'GENERATING_WAVEFORM...'}
                        {status === 'DECODING_PCM' && 'DECODING_STREAM...'}
                    </span>
                </>
            )}

            {status === 'PLAYING' && (
                <>
                    <StopCircle size={14} className="text-red-400 animate-pulse" />
                    <span className="opacity-70 text-red-300">STOP_STREAM</span>
                </>
            )}
        </button>

        {/* Mini Visualizer Canvas */}
        {status === 'PLAYING' && (
            <div className="h-6 w-24 bg-black/40 rounded border border-slate-800 overflow-hidden relative">
                 <canvas ref={canvasRef} width={96} height={24} className="w-full h-full" />
            </div>
        )}

        {error && <span className="text-[10px] text-red-400 font-mono">{error}</span>}
    </div>
  );
};

export default TTSPlayer;
