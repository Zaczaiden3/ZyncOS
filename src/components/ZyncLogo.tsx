import React from 'react';

interface ZyncLogoProps {
  className?: string;
  showText?: boolean;
  animated?: boolean;
}

const ZyncLogo: React.FC<ZyncLogoProps> = ({ className = "h-10 w-auto", showText = true, animated = false }) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <svg 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full ${animated ? 'animate-pulse-slow' : ''}`}
        style={{ maxHeight: '100%' }}
      >
        <defs>
          <linearGradient id="zync-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" /> {/* Cyan-500 */}
            <stop offset="100%" stopColor="#d946ef" /> {/* Fuchsia-500 */}
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Main Z Shape - Constructed from two dynamic swooshes/tech parts */}
        <path 
          d="M20 30 L60 30 L35 70 L75 70" 
          stroke="url(#zync-gradient)" 
          strokeWidth="12" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          filter="url(#glow)"
        />
        
        {/* Tech Accents */}
        <circle cx="75" cy="30" r="6" fill="#d946ef" className={animated ? "animate-ping" : ""} style={{ animationDuration: '3s' }} />
        <circle cx="20" cy="70" r="6" fill="#06b6d4" className={animated ? "animate-ping" : ""} style={{ animationDuration: '3s', animationDelay: '1.5s' }} />
      </svg>
      
      {showText && (
        <div className="flex flex-col justify-center">
          <span className="font-sans font-bold text-2xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 leading-none">
            ZYNC
          </span>
          <span className="font-mono text-[0.6rem] tracking-[0.3em] text-cyan-400 uppercase leading-none mt-1">
            AI CORE
          </span>
        </div>
      )}
    </div>
  );
};

export default ZyncLogo;
