import React, { useEffect, useRef, useState } from 'react';
import { LatticeNode, LatticeEdge } from '../cores/neuro-symbolic/types';
import './LatticeVisualizer.css';

interface LatticeVisualizerProps {
  nodes: LatticeNode[];
  edges: LatticeEdge[];
  isActive: boolean;
}

const LatticeVisualizer: React.FC<LatticeVisualizerProps> = ({ nodes, edges, isActive }) => {
  const rotatorRef = useRef<HTMLDivElement>(null);
  const rotation = useRef({ x: 0, y: 0 });

  // Auto-rotation effect (Optimized: No React Render Loop)
  useEffect(() => {
    if (!isActive) return;
    let animationFrame: number;
    
    const animate = () => {
      rotation.current.x += 0.2;
      rotation.current.y += 0.5;
      
      if (rotatorRef.current) {
        rotatorRef.current.style.transform = `translateZ(-100px) rotateX(${rotation.current.x}deg) rotateY(${rotation.current.y}deg)`;
      }
      
      animationFrame = requestAnimationFrame(animate);
    };
    
    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, [isActive]);

  // Generate random 3D positions for nodes if not present (simulated layout)
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number, y: number, z: number }>>(new Map());

  useEffect(() => {
    const newPositions = new Map();
    nodes.forEach((node, i) => {
      // Sphere distribution
      const phi = Math.acos(-1 + (2 * i) / nodes.length);
      const theta = Math.sqrt(nodes.length * Math.PI) * phi;
      const r = 100; // Radius

      newPositions.set(node.id, {
        x: r * Math.cos(theta) * Math.sin(phi),
        y: r * Math.sin(theta) * Math.sin(phi),
        z: r * Math.cos(phi)
      });
    });
    setNodePositions(newPositions);
  }, [nodes]);

  if (!isActive && nodes.length === 0) return null;

  return (
    <div className="w-full h-64 relative overflow-hidden perspective-1000 bg-slate-950/50 rounded-xl border border-emerald-500/20">
      <div className="absolute top-2 left-2 text-[10px] font-mono text-emerald-500 uppercase tracking-wider z-10">
        Neuro-Symbolic Lattice (Zync_TNG: R1T Chimera)
      </div>
      
      <div 
        ref={rotatorRef}
        className="lattice-rotator w-full h-full preserve-3d absolute top-0 left-0 flex items-center justify-center transition-transform duration-100 ease-linear"
      >
        {/* Render Edges */}
        {edges.map((edge, i) => {
          const start = nodePositions.get(edge.sourceId);
          const end = nodePositions.get(edge.targetId);
          if (!start || !end) return null;
          return <LatticeEdgeItem key={`edge-${i}`} start={start} end={end} />;
        })}

        {/* Render Nodes */}
        {nodes.map((node) => {
          const pos = nodePositions.get(node.id);
          if (!pos) return null;
          return <LatticeNodeItem key={node.id} node={node} pos={pos} />;
        })}
      </div>
      
      {/* Overlay Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.8)_100%)] pointer-events-none"></div>
    </div>
  );
};

export default React.memo(LatticeVisualizer);

const LatticeEdgeItem: React.FC<{ start: { x: number, y: number, z: number }, end: { x: number, y: number, z: number } }> = ({ start, end }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const dz = end.z - start.z;
      const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      // Midpoint
      const mx = (start.x + end.x) / 2;
      const my = (start.y + end.y) / 2;
      const mz = (start.z + end.z) / 2;

      // Rotation (Euler Angles)
      // This is an approximation for CSS 3D. True 3D lines in CSS are tricky.
      // We rotate around Z to align with the 2D projection, then Y for depth.
      const rotZ = Math.atan2(dy, dx) * (180 / Math.PI);
      const rotY = Math.atan2(dz, Math.sqrt(dx * dx + dy * dy)) * (180 / Math.PI);

      ref.current.style.width = `${length}px`;
      ref.current.style.transform = `translate3d(${mx}px, ${my}px, ${mz}px) rotateZ(${rotZ}deg) rotateY(${-rotY}deg) translate(-50%, -50%)`;
    }
  }, [start, end]);

  return <div ref={ref} className="lattice-edge absolute bg-emerald-500/30 h-[1px] transform-gpu origin-center" />;
};

const LatticeNodeItem: React.FC<{ node: LatticeNode, pos: { x: number, y: number, z: number } }> = ({ node, pos }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.setProperty('--node-transform', `translate3d(${pos.x}px, ${pos.y}px, ${pos.z}px)`);
    }
  }, [pos]);

  // Dynamic Styling based on Node Type
  let nodeColor = 'bg-emerald-400';
  let shadowColor = 'rgba(52,211,153,0.8)';
  let labelColor = 'text-emerald-200';
  let scale = 'scale-100';

  if (node.type === 'memory') {
      nodeColor = 'bg-fuchsia-500';
      shadowColor = 'rgba(217,70,239,0.8)';
      labelColor = 'text-fuchsia-200';
      scale = 'scale-125';
  } else if (node.type === 'ghost') {
      nodeColor = 'bg-slate-200';
      shadowColor = 'rgba(255,255,255,0.5)';
      labelColor = 'text-slate-300';
      scale = 'scale-90 opacity-60';
  }

  return (
    <div
      ref={ref}
      className={`lattice-node absolute transform-gpu flex items-center justify-center group ${scale}`}
    >
      <div className={`w-2 h-2 rounded-full shadow-[0_0_10px_${shadowColor}] group-hover:scale-150 transition-transform ${nodeColor}`}></div>
      <div className={`absolute top-3 left-1/2 -translate-x-1/2 text-[8px] ${labelColor} opacity-0 group-hover:opacity-100 whitespace-nowrap bg-black/80 px-1 rounded pointer-events-none z-20`}>
        {node.label} <span className="opacity-50 text-[6px] uppercase">({node.type})</span>
      </div>
    </div>
  );
};
