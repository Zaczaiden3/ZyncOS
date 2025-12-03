import React, { useRef, useEffect } from 'react';

interface Props {
  isActive: boolean; // True when AI is responding
}

const WaveBackground: React.FC<Props> = ({ isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    // Configuration
    const waveCount = 5;
    const baseAmplitude = 30;
    const activeAmplitude = 80;
    const speed = 0.02;
    
    // Gradient Colors (Orange -> Pink -> Blue/Cyan)
    // We'll create the gradient in the draw loop based on canvas width

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const drawWave = (yOffset: number, frequency: number, amplitude: number, phase: number, color: string) => {
      ctx.beginPath();
      ctx.moveTo(0, yOffset);

      for (let x = 0; x < canvas.width; x++) {
        // Sine wave formula: y = A * sin(B * x + C) + D
        // Modulate amplitude slightly along x for a more organic look
        const modulatedAmp = amplitude * (0.8 + 0.4 * Math.sin(x * 0.005 + time));
        const y = yOffset + Math.sin(x * frequency + phase + time) * modulatedAmp;
        ctx.lineTo(x, y);
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Background is handled by CSS, we just draw waves
      
      // Create Gradient for the waves
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, '#f97316'); // Orange
      gradient.addColorStop(0.5, '#d946ef'); // Pink
      gradient.addColorStop(1, '#06b6d4'); // Cyan

      const currentAmplitude = isActive ? activeAmplitude : baseAmplitude;
      // Smooth transition for amplitude could be added here, but direct switch is okay for now
      // or we can lerp it if we had state for it. For now, let's just use the prop.
      
      const centerY = canvas.height / 2;

      // Draw multiple waves
      for (let i = 0; i < waveCount; i++) {
        const offset = (i - waveCount / 2) * 20;
        const frequency = 0.003 + (i * 0.0005);
        const phase = i * 0.5;
        
        // We set strokeStyle to the gradient
        // Note: strokeStyle can be a gradient object
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x++) {
            // Complex wave composition
            const y = centerY + offset + 
                      Math.sin(x * frequency + time + phase) * currentAmplitude * (Math.sin(time * 0.5) * 0.5 + 1);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      time += isActive ? speed * 2 : speed;
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isActive]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 pointer-events-none z-0 opacity-80"
    />
  );
};

export default WaveBackground;
