import React, { useRef, useEffect } from 'react';

interface Props {
  variant?: 'sidebar' | 'centered';
  isGlitching?: boolean;
}

const DataStreamBackground: React.FC<Props> = ({ variant = 'sidebar', isGlitching = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const particleCount = variant === 'centered' ? 100 : 80;
    let synapse: Synapse;
    
    // Mouse tracking for interaction
    let mouse = { x: -1000, y: -1000 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Particle Class with Gravity Physics & Grid Capable
    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      originalSize: number;
      
      // Color properties for dynamic updates
      rgb: string;
      baseAlpha: number;
      currentAlpha: number;

      constructor(w: number, h: number) {
        // Random spawn
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        
        // Initial Brownian Velocity (Random slow drift)
        this.vx = (Math.random() - 0.5) * 0.2;
        this.vy = (Math.random() - 0.5) * 0.2;
        
        this.originalSize = Math.random() * 1.5 + 0.5;
        this.size = this.originalSize;
        
        // COGNITIVE LOAD OPTIMIZATION:
        // Base Opacity strictly limited to 5-20% range
        this.baseAlpha = Math.random() * 0.15 + 0.05; 
        this.currentAlpha = this.baseAlpha;
        
        this.rgb = isGlitching ? '239, 68, 68' : (Math.random() > 0.5 
            ? '6, 182, 212' // Cyan
            : '217, 70, 239'); // Fuchsia
      }

      update(w: number, h: number) {
        // 1. Brownian Impulse (Random jitter)
        this.vx += (Math.random() - 0.5) * 0.01;
        this.vy += (Math.random() - 0.5) * 0.01;

        // 2. Gravity Well Logic
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Tuned Gravity Radius (User Request: ~100px radius for gentle pull, but we'll use 150px for better visibility)
        const gravityRadius = 150; 

        if (distance < gravityRadius) {
            // Calculate pull force (Inverse square-ish law for feel)
            const force = (gravityRadius - distance) / gravityRadius;
            const pullStrength = 0.08; // Slightly stronger pull for tactile feedback
            
            // Accelerate towards mouse
            this.vx += dx * force * pullStrength * 0.1;
            this.vy += dy * force * pullStrength * 0.1;

            // VISUAL BOOST: Ignite particles near cursor
            // Grow size up to 2.5x
            const targetSize = this.originalSize + (force * 3);
            this.size = this.size * 0.9 + targetSize * 0.1;

            // Boost Opacity up to 4x (capped at 0.5 to keep text readable)
            const targetAlpha = Math.min(0.5, this.baseAlpha + (force * 0.4));
            this.currentAlpha = this.currentAlpha * 0.9 + targetAlpha * 0.1;

        } else {
            // Return to normal state (decay)
            if (this.size > this.originalSize) {
                this.size = this.size * 0.95 + this.originalSize * 0.05;
            }
            if (this.currentAlpha > this.baseAlpha) {
                this.currentAlpha = this.currentAlpha * 0.95 + this.baseAlpha * 0.05;
            }
        }

        // Glitch override
        if (isGlitching) {
             this.x += (Math.random() - 0.5) * 10;
             this.rgb = '239, 68, 68'; // Red
             this.currentAlpha = Math.random();
        } else {
             this.rgb = Math.random() > 0.5 ? '6, 182, 212' : '217, 70, 239';
        }

        // 3. Fluid Resistance (Damping)
        this.vx *= 0.96;
        this.vy *= 0.96;

        // 4. Update Position
        this.x += this.vx;
        this.y += this.vy;

        // 5. Boundary Wrap (Toroidal topology)
        if (this.x < 0) this.x = w;
        else if (this.x > w) this.x = 0;
        
        if (this.y < 0) this.y = h;
        else if (this.y > h) this.y = 0;
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.rgb}, ${this.currentAlpha})`;
        ctx.fill();
      }
    }

    // Synapse Class: The connecting line between Cores (Reflex <-> Memory)
    class Synapse {
      p1x: number; p1y: number; // Anchor 1
      p2x: number; p2y: number; // Anchor 2
      cx: number; cy: number;   // Control Point
      
      pulseT: number;
      pulseDir: number; // 1 or -1 for ping-pong effect

      constructor() {
        this.p1x = 0; this.p1y = 0;
        this.p2x = 0; this.p2y = 0;
        this.cx = 0; this.cy = 0;
        this.pulseT = 0;
        this.pulseDir = 1;
      }

      update(w: number, h: number) {
        // Responsive Anchoring based on Variant
        if (variant === 'centered') {
           // Login Mode: Span across the center branding area
           const centerX = w / 2;
           const centerY = h / 2;
           // Connect top-left of card area to bottom-right abstractly
           this.p1x = centerX - 250; this.p1y = centerY - 100;
           this.p2x = centerX + 250; this.p2y = centerY + 100;
        } else {
            // Sidebar Mode (Default App)
            if (w >= 768) {
                this.p1x = 88; this.p1y = 110; 
                this.p2x = 232; this.p2y = 110;
            } else {
                this.p1x = w/2 - 60; this.p1y = 60;
                this.p2x = w/2 + 60; this.p2y = 60;
            }
        }

        const restX = (this.p1x + this.p2x) / 2;
        const restY = (this.p1y + this.p2y) / 2;
        
        // Mouse Tension Physics
        let targetCx = restX;
        let targetCy = restY;

        if (mouse.x !== -1000) {
            const dx = mouse.x - restX;
            const dy = mouse.y - restY;
            
            // "Bends slightly" - Tension Factor
            const tension = 0.15; 
            targetCx = restX + dx * tension;
            targetCy = restY + dy * tension;
        }

        // Elastic Easing
        this.cx += (targetCx - this.cx) * 0.1;
        this.cy += (targetCy - this.cy) * 0.1;
        
        // Pulse Logic (Ping Pong)
        this.pulseT += 0.015 * this.pulseDir;
        if (this.pulseT >= 1) {
            this.pulseT = 1;
            this.pulseDir = -1;
        } else if (this.pulseT <= 0) {
            this.pulseT = 0;
            this.pulseDir = 1;
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.moveTo(this.p1x, this.p1y);
        ctx.quadraticCurveTo(this.cx, this.cy, this.p2x, this.p2y);
        
        const gradient = ctx.createLinearGradient(this.p1x, this.p1y, this.p2x, this.p2y);
        if (isGlitching) {
            gradient.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
            gradient.addColorStop(1, 'rgba(239, 68, 68, 0.1)');
        } else {
            gradient.addColorStop(0, 'rgba(6, 182, 212, 0.2)'); // Cyan
            gradient.addColorStop(1, 'rgba(217, 70, 239, 0.2)'); // Fuchsia
        }
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Pulse Dot
        const t = this.pulseT;
        const mt = 1 - t;
        const px = (mt * mt * this.p1x) + (2 * mt * t * this.cx) + (t * t * this.p2x);
        const py = (mt * mt * this.p1y) + (2 * mt * t * this.cy) + (t * t * this.p2y);

        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = isGlitching ? 'rgba(255, 0, 0, 0.9)' : `rgba(255, 255, 255, 0.8)`; 
        ctx.shadowBlur = 6;
        ctx.shadowColor = isGlitching ? 'red' : 'rgba(255,255,255,0.8)';
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle(canvas.width, canvas.height));
      }
      synapse = new Synapse();
    };

    const drawGrid = (ctx: CanvasRenderingContext2D) => {
        // Node Topology Grid Logic
        // Connect particles if they are close enough
        const connectDistance = 120;
        
        ctx.lineWidth = 1;

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const p1 = particles[i];
                const p2 = particles[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < connectDistance) {
                    // Calculate proximity to mouse for "Proximity Lighting"
                    const mx = (p1.x + p2.x) / 2 - mouse.x;
                    const my = (p1.y + p2.y) / 2 - mouse.y;
                    const mDist = Math.sqrt(mx * mx + my * my);
                    const mouseRange = 250;
                    
                    let alpha = (1 - dist / connectDistance) * 0.15; // Base alpha
                    
                    if (mDist < mouseRange) {
                        // Brighten connections near mouse
                        alpha += (1 - mDist / mouseRange) * 0.3;
                    }

                    if (isGlitching) alpha = Math.random() * 0.5;

                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = isGlitching 
                        ? `rgba(239, 68, 68, ${alpha})` 
                        : `rgba(6, 182, 212, ${alpha})`;
                    ctx.stroke();
                }
            }
        }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update & Draw Synapse Background Layer
      synapse.update(canvas.width, canvas.height);
      synapse.draw(ctx);

      // Draw Grid Connections First
      drawGrid(ctx);

      // Update & Draw Particles
      particles.forEach(p => {
        p.update(canvas.width, canvas.height);
        p.draw(ctx);
      });
      
      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();

    const handleResize = () => {
        init();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [variant, isGlitching]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 pointer-events-none z-0 mix-blend-screen"
    />
  );
};

export default DataStreamBackground;