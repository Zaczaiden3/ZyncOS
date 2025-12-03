import React from 'react';

// Particle Component to avoid inline styles in JSX
const ParticleView = ({ p }: { p: any }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  
  React.useLayoutEffect(() => {
    if (ref.current) {
      ref.current.style.setProperty('--p-left', p.left);
      ref.current.style.setProperty('--p-delay', p.animationDelay);
      ref.current.style.setProperty('--p-width', p.width);
      ref.current.style.setProperty('--p-height', p.height);
      ref.current.style.setProperty('--p-opacity', String(p.opacity));
    }
  }, [p]);

  return <div ref={ref} className="dream-particle" />;
};

const DreamOverlay: React.FC = React.memo(() => {
  const particles = React.useMemo(() => {
    return [...Array(20)].map((_, i) => ({
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 8}s`,
      width: `${Math.random() * 3 + 1}px`,
      height: `${Math.random() * 3 + 1}px`,
      opacity: Math.random() * 0.5 + 0.2
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-900/10 via-transparent to-fuchsia-900/10 mix-blend-overlay animate-pulse-subtle"></div>
      {particles.map((p, i) => (
        <ParticleView key={i} p={p} />
      ))}
    </div>
  );
});

export default DreamOverlay;
