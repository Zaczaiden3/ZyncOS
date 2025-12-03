import React, { useEffect, useRef, useState } from 'react';
import { liveClient } from '../services/live/liveClient';
import { Mic, MicOff, PhoneOff, Activity, Zap } from 'lucide-react';

interface LiveVoiceInterfaceProps {
  onClose: () => void;
}

const LiveVoiceInterface: React.FC<LiveVoiceInterfaceProps> = ({ onClose }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [isMicOn, setIsMicOn] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    // Initialize Client
    liveClient.onConnect = () => setStatus('connected');
    liveClient.onDisconnect = () => {
        setStatus('connecting');
        onClose();
    };
    liveClient.onError = (err) => {
        console.error("Live Error", err);
        setStatus('error');
    };

    liveClient.connect();

    return () => {
      liveClient.disconnect();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [onClose]);

  // Visualizer Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const time = Date.now() / 1000;
      
      // Clear with trail effect
      ctx.fillStyle = 'rgba(2, 6, 23, 0.2)'; // Slate-950 with opacity
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Dynamic Circle (Breathing)
      const baseRadius = 80;
      const pulse = Math.sin(time * 2) * 5;
      const radius = baseRadius + pulse;

      // Glow
      const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.5, centerX, centerY, radius * 1.5);
      
      if (status === 'connected') {
          gradient.addColorStop(0, 'rgba(34, 211, 238, 0.1)'); // Cyan
          gradient.addColorStop(0.5, 'rgba(34, 211, 238, 0.3)');
          gradient.addColorStop(1, 'rgba(34, 211, 238, 0)');
      } else if (status === 'error') {
          gradient.addColorStop(0, 'rgba(239, 68, 68, 0.1)'); // Red
          gradient.addColorStop(0.5, 'rgba(239, 68, 68, 0.3)');
          gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
      } else {
          gradient.addColorStop(0, 'rgba(148, 163, 184, 0.1)'); // Slate
          gradient.addColorStop(0.5, 'rgba(148, 163, 184, 0.3)');
          gradient.addColorStop(1, 'rgba(148, 163, 184, 0)');
      }

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Core Ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = status === 'connected' ? '#22d3ee' : (status === 'error' ? '#ef4444' : '#94a3b8');
      ctx.stroke();

      // Inner Activity (Simulated Waveform in Circle)
      if (status === 'connected') {
          ctx.beginPath();
          for (let i = 0; i < 360; i += 5) {
              const angle = (i * Math.PI) / 180;
              const wave = Math.sin(i * 0.1 + time * 5) * (Math.random() * 10);
              const r = radius - 10 + wave;
              const x = centerX + Math.cos(angle) * r;
              const y = centerY + Math.sin(angle) * r;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)';
          ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    // Resize handling
    const resize = () => {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    draw();

    return () => window.removeEventListener('resize', resize);
  }, [status]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="absolute top-8 left-0 right-0 flex justify-center">
        <div className="bg-slate-900/50 border border-slate-800 rounded-full px-4 py-2 flex items-center gap-2 backdrop-blur-sm">
            <Zap size={16} className={status === 'connected' ? "text-cyan-400 fill-cyan-400" : "text-slate-500"} />
            <span className="text-sm font-medium text-slate-300">
                {status === 'connecting' && 'Establishing Uplink...'}
                {status === 'connected' && 'Live Neural Link Active'}
                {status === 'error' && 'Link Unstable'}
            </span>
        </div>
      </div>

      {/* Main Visualizer */}
      <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
         <canvas ref={canvasRef} className="w-full h-full" />
         
         {/* Center Icon */}
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {status === 'connecting' && <Activity className="text-cyan-400 animate-pulse" size={48} />}
         </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-12 flex items-center gap-6">
        
        <button 
            onClick={() => setIsMicOn(!isMicOn)}
            className={`p-4 rounded-full transition-all duration-200 ${isMicOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}`}
        >
            {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
        </button>

        <button 
            onClick={onClose}
            aria-label="End Live Session"
            className="p-6 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 transition-all duration-200 hover:scale-105 active:scale-95"
        >
            <PhoneOff size={32} />
        </button>

      </div>
    </div>
  );
};

export default LiveVoiceInterface;
