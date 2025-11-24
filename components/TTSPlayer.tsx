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

  // Visualizer Loop
  const drawVisualizer = () => {
    if (!canvasRef.current || !analyzerRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyzerRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const render = () => {
        analyzerRef.current!.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 2; // Scale down
            
            const r = isMemory ? 217 : 6;   // Fuchsia vs Cyan
            const g = isMemory ? 70 : 182;
            const b = isMemory ? 239 : 212;

            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

            x += barWidth + 1;
        }

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
            const AudioContext = window.AudioContext || window.webkitSpeechRecognition;
            audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') await ctx.resume();

        // 2. Text Analysis & Synthesis
        setStatus('ANALYZING_TEXT');
        await new Promise(r => setTimeout(r, 300)); // Visual delay for "Processing" feel
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
        analyzer.fftSize = 64;
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
        console.error(err);
        setError("TTS_FAIL");
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
