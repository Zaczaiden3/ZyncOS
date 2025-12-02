import React, { useState, useEffect } from 'react';
import { Terminal, AlertCircle, Check, ArrowRight, Activity, Fingerprint, Lock, Mail, User, Cpu, Bug, Github, Shield } from 'lucide-react';
import { loginUser, registerUser } from '../services/auth';
import zyncLogo from '@/assets/logo.png';
import './LoginPage.css';

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

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
        let result;
        if (mode === 'signup') {
            result = await registerUser(email, password, fullName);
        } else {
            result = await loginUser(email, password);
        }

        if (result.error) {
            triggerFailure(`AUTH_FAILURE: ${result.error.toUpperCase()}`);
        } else {
            // Success Sequence
            setStatus('SUCCESS');
            setTimeout(() => {
                onLogin();
            }, 800); // Wait for warp animation
        }
    } catch (err) {
        triggerFailure("SYSTEM_ERROR: CONNECTION LOST");
        console.error(err);
    }
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
  const handleTestLogin = async () => {
      // Switch to signin to keep it simple, or signup to test that flow
      if (mode === 'signup') {
          setFullName('TEST_OPERATOR');
          setAgreedToTerms(true);
      }
      const testEmail = 'test_user@zync.ai';
      const testPass = 'dev_mode_active';
      
      setEmail(testEmail);
      setPassword(testPass);
      
      // Visual delay to let user see the filled data
      await new Promise(r => setTimeout(r, 600));

      if (status === 'PROCESSING') return;
      
      setStatus('PROCESSING');
      setErrorMsg(null);

      try {
          const result = await loginUser(testEmail, testPass);

          if (result.error) {
              triggerFailure(`AUTH_FAILURE: ${result.error.toUpperCase()}`);
          } else {
              // Success Sequence
              setStatus('SUCCESS');
              setTimeout(() => {
                  onLogin();
              }, 800); 
          }
      } catch (err) {
          triggerFailure("SYSTEM_ERROR: CONNECTION LOST");
          console.error(err);
      }
  };

  return (
    <div className={`login-container flex flex-col items-center justify-center min-h-screen p-4 relative z-10 font-sans transition-all duration-500 ${status === 'SUCCESS' ? 'animate-warp-out' : ''} ${status === 'FAILURE' ? 'animate-glitch' : ''}`}>
      
      {/* Background Video */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute inset-0 bg-slate-950/80 z-10"></div> {/* Overlay for readability */}
        <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover opacity-40 grayscale hover:grayscale-0 transition-all duration-1000"
        >
            <source src="/src/assets/marketing.mp4" type="video/mp4" />
        </video>
      </div>
      
      {/* MONOLITH CONTAINER */}
      <div className={`w-full max-w-md perspective-1000 relative transition-all duration-500 ${mode === 'signup' ? 'max-w-lg' : 'max-w-md'}`}>
        
        {/* Breathing Border */}
        <div className={`absolute -inset-0.5 rounded-none bg-cyan-500/20 blur-sm transition-opacity duration-1000 ${status === 'FAILURE' ? 'bg-red-500/50 opacity-100' : 'animate-breathing-glow'}`}></div>

        <div className="monolith-border relative bg-slate-950/90 backdrop-blur-xl border border-slate-800 p-8 shadow-2xl overflow-hidden rounded-sm">
            
            {/* Top Bar / Status */}
            <div className="flex justify-between items-start mb-10 font-mono text-[10px] tracking-widest text-slate-500 border-b border-slate-800/50 pb-2">
                <div className="flex flex-col gap-1">
                    <span className="uppercase text-cyan-500 flex items-center gap-1"><Shield size={10} /> SYSTEM_WAKE_SEQUENCE</span>
                    <span className="opacity-50">NODE_ID: {userHash.substring(0, 10)}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${status === 'PROCESSING' ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'}`}></span>
                    {status === 'PROCESSING' ? (mode === 'signup' ? 'BOOTING...' : 'NEGOTIATING...') : 'READY'}
                </div>
            </div>

            {/* Header */}
            <div className="mb-10 text-center relative flex flex-col items-center">
                <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent -z-10"></div>
                <div className="bg-slate-950 px-6 py-2 inline-block">
                    <img src={zyncLogo} alt="ZyncAI" className="h-16 w-auto object-contain" />
                </div>
                <p className="text-[9px] font-mono text-slate-400 uppercase tracking-[0.4em] mt-4">
                    Human-grade intuition v2.4
                </p>
            </div>

            {/* Form Inputs (Bracket Style) */}
            <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                
                {/* SIGNUP: Identity Card Metaphor Container */}
                <div className={`transition-all duration-500 ${mode === 'signup' ? 'border border-slate-700/50 bg-slate-900/30 p-5 rounded-lg relative overflow-hidden' : ''}`}>
                    {mode === 'signup' && (
                        <>
                           {/* Holographic Stripe */}
                           <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-fuchsia-500 via-cyan-500 to-fuchsia-500 opacity-70"></div>
                           {/* Barcode Visual */}
                           <div className="absolute bottom-3 right-4 opacity-20 pointer-events-none">
                                <div className="flex gap-0.5 items-end h-6">
                                    {[...Array(20)].map((_, i) => (
                                        <BarcodeLine key={i} />
                                    ))}
                                </div>
                           </div>
                        </>
                    )}

                    <div className="space-y-5">
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
                    <div className="pt-3 border-t border-slate-800/50 animate-in fade-in slide-in-from-top-2">
                         <div className="flex items-center gap-4 mb-4">
                            <div className="p-2 bg-slate-900 rounded border border-slate-800">
                                <Fingerprint size={24} className="text-fuchsia-500/70" />
                            </div>
                            <div className="font-mono text-[9px] text-slate-500 leading-tight">
                                GENERATING ID: <span className="text-fuchsia-400 font-bold">{userHash}</span><br/>
                                ENCRYPTION: SHA-256-R<br/>
                                STATUS: <span className="text-amber-500">UNVERIFIED</span>
                            </div>
                         </div>
                         <label className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-slate-900/50 rounded transition-colors">
                             <div className={`w-3.5 h-3.5 border border-slate-600 flex items-center justify-center transition-colors rounded-sm ${agreedToTerms ? 'bg-fuchsia-500 border-fuchsia-500' : 'bg-transparent'}`}>
                                 {agreedToTerms && <Check size={10} className="text-black" />}
                             </div>
                             <span className="text-[10px] font-mono text-slate-500 group-hover:text-cyan-400 transition-colors">ACCEPT NEURAL PROTOCOLS</span>
                         </label>
                    </div>
                )}
                
                {/* Error Display */}
                {errorMsg && (
                    <div className="bg-red-500/10 border-l-2 border-red-500 p-3 text-[10px] font-mono text-red-400 flex items-center gap-3 animate-glitch rounded-r">
                        <AlertCircle size={14} className="shrink-0" /> 
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* System Boot Progress Bar (Signup Only) */}
                {status === 'PROCESSING' && mode === 'signup' && (
                    <SystemBootLoader />
                )}

                {/* Action Button */}
                <div className="pt-2">
                    <DecodingButton 
                        text={mode === 'signin' ? 'INITIALIZE' : 'ESTABLISH LINK'} 
                        isLoading={status === 'PROCESSING'}
                    />
                </div>

                {/* Social Sign-In Protocol */}
                {mode === 'signin' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800/60"></div></div>
                            <div className="relative flex justify-center text-[9px] font-mono uppercase text-slate-600 bg-slate-950 px-2 tracking-widest">
                                [ Neural_Link_Protocol ]
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <SocialButton 
                                icon={<GoogleIcon />} 
                                label="GOOGLE" 
                                hoverClass="hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/5" 
                                onClick={() => triggerFailure("API_GATEWAY_TIMEOUT")} // Simulation
                            />
                            <SocialButton 
                                icon={<Github size={16} />} 
                                label="GITHUB" 
                                hoverClass="hover:border-white/50 hover:text-white hover:bg-white/5"
                                onClick={() => triggerFailure("SSH_KEY_REJECTED")} // Simulation
                            />
                        </div>
                    </div>
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
                    className="text-[10px] font-mono text-slate-600 hover:text-cyan-400 uppercase tracking-widest transition-colors border-b border-transparent hover:border-cyan-500/50 pb-0.5"
                 >
                    {mode === 'signin' ? '[ CREATE_NEW_UPLINK ]' : '[ RETURN_TO_LOGIN ]'}
                 </button>

                 {/* Test User Button */}
                 <div className="pt-4 border-t border-slate-800/30">
                    <button
                        type="button"
                        onClick={handleTestLogin}
                        className="text-[9px] font-mono text-slate-700 hover:text-emerald-500 uppercase tracking-widest transition-colors flex items-center gap-1.5 mx-auto opacity-60 hover:opacity-100 group"
                    >
                        <Bug size={10} className="group-hover:rotate-12 transition-transform" />
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
            social-btn flex items-center justify-center gap-3 py-3 px-4 
            border border-slate-800 rounded
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
    const progressRef = React.useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const interval = setInterval(() => {
            setStep(prev => (prev + 1) % 3);
        }, 800);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (progressRef.current) {
            progressRef.current.style.setProperty('--progress-width', `${(step + 1) * 33}%`);
        }
    }, [step]);

    return (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between text-[9px] font-mono text-fuchsia-400">
                <span>{steps[step]}...</span>
                <span>{Math.min(100, (step + 1) * 33)}%</span>
            </div>
            <div className="h-1 bg-slate-800 w-full overflow-hidden rounded-full">
                <div 
                    ref={progressRef}
                    className="h-full bg-gradient-to-r from-fuchsia-600 to-cyan-400 animate-[shimmer_1.5s_infinite] boot-progress-bar" 
                ></div>
            </div>
        </div>
    );
}

const BarcodeLine = () => {
    const ref = React.useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (ref.current) {
            ref.current.style.setProperty('--bar-height', `${Math.random() * 100}%`);
        }
    }, []);

    return <div ref={ref} className="w-0.5 bg-white barcode-line"></div>;
};

const BracketInput = ({ label, value, onChange, type = "text", placeholder, icon }: any) => {
    const [focused, setFocused] = useState(false);
    const [touched, setTouched] = useState(false);

    return (
        <div className="group input-group">
            <label className={`block text-[10px] font-mono tracking-[0.2em] mb-2 transition-colors duration-300 ${focused ? 'text-cyan-400' : 'text-slate-500'}`}>
                {label}
            </label>
            <div className="relative flex items-center">
                
                {/* Left Bracket */}
                <span className={`input-bracket-l absolute left-0 text-lg font-mono font-light opacity-0 translate-x-0 text-slate-700`}>[</span>
                
                {/* Icon */}
                <div className={`absolute left-0 transition-all duration-300 ${focused ? 'opacity-0 -translate-x-2' : 'opacity-50 text-slate-500 translate-x-0'}`}>
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
                        w-full bg-transparent border-b border-slate-800 py-2 pl-6 pr-2 
                        font-mono text-sm text-slate-200 placeholder-slate-700 outline-none
                        transition-all duration-300
                        ${focused ? 'border-cyan-500 pl-3' : 'hover:border-slate-700'}
                    `}
                    placeholder={focused ? '' : placeholder}
                />

                {/* Right Bracket */}
                <span className={`input-bracket-r absolute right-0 text-lg font-mono font-light opacity-0 translate-x-0 text-slate-700`}>]</span>
                
                {/* Typing Micro-Flash */}
                {focused && value.length > 0 && (
                     <div className="absolute right-2 bottom-2 w-1.5 h-1.5 bg-cyan-400 blur-[2px] animate-pulse opacity-70"></div>
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
                w-full h-12 relative overflow-hidden bg-slate-900 border border-slate-700 hover:border-cyan-500 transition-all group rounded-sm
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
            <div className="absolute top-0 left-0 w-1 h-1 bg-slate-600 group-hover:bg-cyan-500 transition-colors"></div>
            <div className="absolute bottom-0 right-0 w-1 h-1 bg-slate-600 group-hover:bg-cyan-500 transition-colors"></div>
        </button>
    )
}

export default LoginPage;