import React, { useState, useEffect } from 'react';
import { Terminal, AlertCircle, Check, ArrowRight, Activity, Fingerprint, Lock, Mail, User, Cpu, Bug, Github } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
  onGlitch: (isGlitching: boolean) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onGlitch }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'FAILURE'>('IDLE');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Identity Card Generation State
  const [userHash, setUserHash] = useState('0x00000000');

  useEffect(() => {
    if (mode === 'signup') {
        // Simple hash visualizer
        const raw = `${fullName}${email}${Date.now()}`;
        let hash = 0;
        for (let i = 0; i < raw.length; i++) {
            hash = (hash << 5) - hash + raw.charCodeAt(i);
            hash |= 0;
        }
        setUserHash(`0x${Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')}`);
    }
  }, [fullName, email, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'PROCESSING') return; // Prevent double submit
    
    setStatus('PROCESSING');
    setErrorMsg(null);

    // Validation
    const isValid = email.includes('@') && password.length >= 6;
    
    // Bypass validation if it's the test user
    const isTestUser = email === 'test_user@zync.ai' && password === 'dev_mode_active';

    if (mode === 'signup' && (!fullName || !agreedToTerms) && !isTestUser) {
        triggerFailure("PROTOCOL_INCOMPLETE: MISSING DATA");
        return;
    }

    if (!isValid && !isTestUser) {
        triggerFailure("ACCESS_DENIED: INVALID CREDENTIALS");
        return;
    }

    // Success Sequence
    const processingTime = mode === 'signup' ? 2500 : 1200; // Longer boot sequence for signup

    setTimeout(() => {
        setStatus('SUCCESS');
        setTimeout(() => {
            onLogin();
        }, 800); // Wait for warp animation
    }, processingTime);
  };

  const triggerFailure = (msg: string) => {
    // Notify parent to trigger background glitch
    onGlitch(true);

    setTimeout(() => {
        setErrorMsg(msg);
        setStatus('FAILURE');
        setTimeout(() => {
            setStatus('IDLE');
            onGlitch(false); // Reset background
        }, 600); // Reset after glitch
    }, 800);
  };

  // Mockup Testing Helper
  const handleTestLogin = () => {
      // Switch to signin to keep it simple, or signup to test that flow
      if (mode === 'signup') {
          setFullName('TEST_OPERATOR');
          setAgreedToTerms(true);
      }
      setEmail('test_user@zync.ai');
      setPassword('dev_mode_active');
      
      // Visual delay to let user see the filled data before auto-submitting
      setTimeout(() => {
          const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
          handleSubmit(fakeEvent);
      }, 600);
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen p-4 relative z-10 font-sans transition-all duration-500 ${status === 'SUCCESS' ? 'animate-warp-out' : ''} ${status === 'FAILURE' ? 'animate-glitch' : ''}`}>
      
      {/* MONOLITH CONTAINER */}
      <div className={`w-full max-w-md perspective-1000 relative transition-all duration-500 ${mode === 'signup' ? 'max-w-lg' : 'max-w-md'}`}>
        
        {/* Breathing Border */}
        <div className={`absolute -inset-0.5 rounded-none bg-cyan-500/20 blur-sm transition-opacity duration-1000 ${status === 'FAILURE' ? 'bg-red-500/50 opacity-100' : 'animate-breathing-glow'}`}></div>

        <div className="relative bg-slate-950/80 backdrop-blur-md border border-slate-800 p-8 shadow-2xl overflow-hidden">
            
            {/* Top Bar / Status */}
            <div className="flex justify-between items-start mb-10 font-mono text-[10px] tracking-widest text-slate-500">
                <div className="flex flex-col gap-1">
                    <span className="uppercase text-cyan-500">SYSTEM_WAKE_SEQUENCE</span>
                    <span>NODE: {userHash}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${status === 'PROCESSING' ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'}`}></span>
                    {status === 'PROCESSING' ? (mode === 'signup' ? 'BOOTING...' : 'NEGOTIATING...') : 'READY'}
                </div>
            </div>

            {/* Header */}
            <div className="mb-12 text-center">
                <h1 className="text-4xl font-mono font-bold text-slate-100 tracking-[0.15em] mb-2 glitch-text" data-text="ZYNC_OS">
                    ZYNC<span className="text-cyan-500">_</span>OS
                </h1>
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-[0.3em]">
                    Human-grade intuition
                </p>
            </div>

            {/* Form Inputs (Bracket Style) */}
            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                
                {/* SIGNUP: Identity Card Metaphor Container */}
                <div className={`transition-all duration-500 ${mode === 'signup' ? 'border border-slate-700/50 bg-slate-900/30 p-4 rounded-lg relative overflow-hidden' : ''}`}>
                    {mode === 'signup' && (
                        <>
                           {/* Holographic Stripe */}
                           <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-fuchsia-500 via-cyan-500 to-fuchsia-500 opacity-50"></div>
                           {/* Barcode Visual */}
                           <div className="absolute bottom-2 right-4 opacity-20 pointer-events-none">
                                <div className="flex gap-0.5 items-end h-8">
                                    {[...Array(15)].map((_, i) => (
                                        <div key={i} className="w-1 bg-white" style={{ height: `${Math.random() * 100}%` }}></div>
                                    ))}
                                </div>
                           </div>
                        </>
                    )}

                    <div className="space-y-6">
                        {mode === 'signup' && (
                            <BracketInput 
                                label="USER DESIGNATION" 
                                value={fullName} 
                                onChange={setFullName} 
                                icon={<User size={14} />} 
                                placeholder="ENTER_NAME"
                            />
                        )}

                        <BracketInput 
                            label="IDENTITY KEY" 
                            type="text" 
                            value={email} 
                            onChange={setEmail} 
                            icon={<Mail size={14} />} 
                            placeholder="USER@DOMAIN.EXT"
                        />

                        <BracketInput 
                            label="ACCESS TOKEN" 
                            type="password" 
                            value={password} 
                            onChange={setPassword} 
                            icon={<Lock size={14} />} 
                            placeholder="••••••"
                        />
                    </div>
                </div>

                {/* Identity Card / Terms (Signup) */}
                {mode === 'signup' && (
                    <div className="pt-2 border-t border-slate-800/50">
                         <div className="flex items-center gap-4 mb-4">
                            <Fingerprint size={32} className="text-fuchsia-500/50" />
                            <div className="font-mono text-[9px] text-slate-500 leading-tight">
                                GENERATING ID: <span className="text-fuchsia-400">{userHash}</span><br/>
                                ENCRYPTION: SHA-256-R<br/>
                                STATUS: UNVERIFIED
                            </div>
                         </div>
                         <label className="flex items-center gap-3 cursor-pointer group">
                             <div className={`w-3 h-3 border border-slate-600 flex items-center justify-center transition-colors ${agreedToTerms ? 'bg-fuchsia-500 border-fuchsia-500' : 'bg-transparent'}`}>
                                 {agreedToTerms && <Check size={10} className="text-black" />}
                             </div>
                             <span className="text-[10px] font-mono text-slate-500 group-hover:text-cyan-400 transition-colors">ACCEPT PROTOCOLS</span>
                         </label>
                    </div>
                )}
                
                {/* Error Display */}
                {errorMsg && (
                    <div className="absolute top-0 left-0 right-0 bg-red-500/10 border-b border-red-500/50 p-2 text-[10px] font-mono text-red-400 flex items-center justify-center gap-2 animate-glitch">
                        <AlertCircle size={12} /> {errorMsg}
                    </div>
                )}

                {/* System Boot Progress Bar (Signup Only) */}
                {status === 'PROCESSING' && mode === 'signup' && (
                    <SystemBootLoader />
                )}

                {/* Action Button */}
                <div className="pt-4">
                    <DecodingButton 
                        text={mode === 'signin' ? 'INITIALIZE' : 'ESTABLISH LINK'} 
                        isLoading={status === 'PROCESSING'}
                    />
                </div>

                {/* Social Sign-In Protocol */}
                {mode === 'signin' && (
                    <>
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800/80"></div></div>
                            <div className="relative flex justify-center text-[9px] font-mono uppercase text-slate-600 bg-slate-950/80 px-2 tracking-widest">
                                [ Neural_Link_Protocol ]
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <SocialButton 
                                icon={<GoogleIcon />} 
                                label="GOOGLE" 
                                hoverClass="hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10" 
                                onClick={() => triggerFailure("API_GATEWAY_TIMEOUT")} // Simulation
                            />
                            <SocialButton 
                                icon={<Github size={16} />} 
                                label="GITHUB" 
                                hoverClass="hover:border-white/50 hover:text-white hover:bg-white/10"
                                onClick={() => triggerFailure("SSH_KEY_REJECTED")} // Simulation
                            />
                        </div>
                    </>
                )}

            </form>

            {/* Footer Switch */}
            <div className="mt-8 text-center space-y-4">
                 <button 
                    type="button"
                    onClick={() => {
                        setMode(mode === 'signin' ? 'signup' : 'signin');
                        setErrorMsg(null);
                    }}
                    className="text-[10px] font-mono text-slate-600 hover:text-cyan-400 uppercase tracking-widest transition-colors"
                 >
                    {mode === 'signin' ? '[ CREATE_UPLINK ]' : '[ RETURN_LOGIN ]'}
                 </button>

                 {/* Test User Button */}
                 <div className="pt-4 border-t border-slate-800/30">
                    <button
                        type="button"
                        onClick={handleTestLogin}
                        className="text-[9px] font-mono text-slate-700 hover:text-emerald-500 uppercase tracking-widest transition-colors flex items-center gap-1 mx-auto opacity-60 hover:opacity-100"
                    >
                        <Bug size={10} />
                        [ EXECUTE_TEST_PROTOCOL ]
                    </button>
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};

// --- Sub-Components ---

const GoogleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M23.52 12.212c0-0.852-0.077-1.682-0.223-2.487H12v4.704h6.454c-0.279 1.504-1.122 2.778-2.396 3.633v3.02h3.88c2.271-2.089 3.58-5.164 3.58-8.87z" />
        <path d="M12 24c3.24 0 5.957-1.074 7.942-2.908l-3.88-3.02c-1.076 0.72-2.452 1.147-4.062 1.147-3.124 0-5.769-2.111-6.716-4.948H1.321v3.114C3.325 21.365 7.393 24 12 24z" />
        <path d="M5.284 14.271c-0.24-0.72-0.377-1.491-0.377-2.271s0.137-1.551 0.377-2.271V6.615H1.321C0.479 8.288 0 10.098 0 12s0.479 3.712 1.321 5.385l3.963-3.114z" />
        <path d="M12 4.777c1.763 0 3.346 0.608 4.591 1.796l3.445-3.445C17.953 1.173 15.236 0 12 0 7.393 0 3.325 2.635 1.321 6.615l3.963 3.114c0.947-2.837 3.592-4.952 6.716-4.952z" />
    </svg>
);

const SocialButton = ({ icon, label, hoverClass, onClick }: { icon: React.ReactNode, label: string, hoverClass: string, onClick: () => void }) => (
    <button
        type="button"
        onClick={onClick}
        className={`
            flex items-center justify-center gap-3 py-2.5 px-4 
            bg-slate-900/50 border border-slate-700 
            text-slate-400 font-mono text-xs tracking-widest 
            transition-all duration-300
            hover:scale-[1.02] active:scale-95
            ${hoverClass}
        `}
    >
        <span className="opacity-80">{icon}</span>
        <span>{label}</span>
    </button>
);

const SystemBootLoader = () => {
    const [step, setStep] = useState(0);
    const steps = ["ALLOCATING_MEMORY", "VERIFYING_HASH", "ESTABLISHING_UPLINK"];
    
    useEffect(() => {
        const interval = setInterval(() => {
            setStep(prev => (prev + 1) % 3);
        }, 800);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between text-[9px] font-mono text-fuchsia-400">
                <span>{steps[step]}...</span>
                <span>{Math.min(100, (step + 1) * 33)}%</span>
            </div>
            <div className="h-1 bg-slate-800 w-full overflow-hidden rounded-full">
                <div className="h-full bg-gradient-to-r from-fuchsia-600 to-cyan-400 animate-[shimmer_1.5s_infinite]" style={{ width: `${(step + 1) * 33}%`, transition: 'width 0.5s' }}></div>
            </div>
        </div>
    );
}

const BracketInput = ({ label, value, onChange, type = "text", placeholder, icon }: any) => {
    const [focused, setFocused] = useState(false);
    const [touched, setTouched] = useState(false);

    return (
        <div className="group">
            <label className={`block text-[10px] font-mono tracking-[0.2em] mb-2 transition-colors ${focused ? 'text-cyan-400' : 'text-slate-600'}`}>
                {label}
            </label>
            <div className="relative flex items-center">
                
                {/* Left Bracket */}
                <span className={`absolute left-0 text-lg font-mono font-light transition-all duration-300 ${focused ? 'opacity-100 text-cyan-500 -translate-x-2' : 'opacity-0 translate-x-0'}`}>[</span>
                
                {/* Icon */}
                <div className={`absolute left-0 transition-all duration-300 ${focused ? 'opacity-0' : 'opacity-50 text-slate-500'}`}>
                    {icon}
                </div>

                <input 
                    type={type}
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setTouched(true);
                    }}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    className={`
                        w-full bg-transparent border-b border-slate-700 py-2 pl-6 pr-2 
                        font-mono text-sm text-slate-200 placeholder-slate-700 outline-none
                        transition-all duration-300
                        ${focused ? 'border-cyan-500 pl-2' : ''}
                    `}
                    placeholder={focused ? '' : placeholder}
                />

                {/* Right Bracket */}
                <span className={`absolute right-0 text-lg font-mono font-light transition-all duration-300 ${focused ? 'opacity-100 text-cyan-500 translate-x-2' : 'opacity-0 translate-x-0'}`}>]</span>
                
                {/* Typing Micro-Flash (Simplified) */}
                {focused && value.length > 0 && (
                     <div className="absolute right-0 bottom-0 w-2 h-2 bg-cyan-400 blur-sm animate-ping opacity-50"></div>
                )}
            </div>
        </div>
    )
}

const DecodingButton = ({ text, isLoading }: { text: string, isLoading: boolean }) => {
    const [displayText, setDisplayText] = useState(text);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890_@#&";
    
    // Reset display text when loading stops or text changes
    useEffect(() => {
        if (!isLoading) setDisplayText(text);
    }, [isLoading, text]);

    const scramble = () => {
        if (isLoading) return;
        let iteration = 0;
        const interval = setInterval(() => {
            setDisplayText(prev => 
                text.split("").map((letter, index) => {
                    if (index < iteration) return text[index];
                    return chars[Math.floor(Math.random() * chars.length)];
                }).join("")
            );
            if (iteration >= text.length) clearInterval(interval);
            iteration += 1 / 3;
        }, 30);
    };

    return (
        <button 
            type="submit"
            disabled={isLoading}
            onMouseEnter={scramble}
            className={`
                w-full h-12 relative overflow-hidden bg-slate-900 border border-slate-700 hover:border-cyan-500 transition-all group
                ${isLoading ? 'opacity-80 cursor-wait' : ''}
            `}
        >
            <div className="absolute inset-0 bg-cyan-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            
            <div className="relative flex items-center justify-center gap-3 font-mono font-bold tracking-[0.2em] text-sm text-slate-300 group-hover:text-cyan-400">
                {isLoading ? (
                    <>
                        <Terminal size={14} className="animate-spin" />
                        <span>ALLOCATING...</span>
                    </>
                ) : (
                    <>
                        <span>{displayText}</span>
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </>
                )}
            </div>
            
            {/* Corner Accents */}
            <div className="absolute top-0 left-0 w-1 h-1 bg-slate-500 group-hover:bg-cyan-500 transition-colors"></div>
            <div className="absolute bottom-0 right-0 w-1 h-1 bg-slate-500 group-hover:bg-cyan-500 transition-colors"></div>
        </button>
    )
}

export default LoginPage;