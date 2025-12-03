import React, { useState, useEffect } from 'react';
import { AlertCircle, Check, ArrowRight, Mail, Lock, User, Github, Shield } from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'PROCESSING') return;
    
    setStatus('PROCESSING');
    setErrorMsg(null);

    // Validation
    const isValid = email.includes('@') && password.length >= 6;
    const isTestUser = email === 'test_user@zync.ai' && password === 'dev_mode_active';

    if (mode === 'signup' && (!fullName || !agreedToTerms) && !isTestUser) {
        triggerFailure("Please complete all fields.");
        return;
    }

    if (!isValid && !isTestUser) {
        triggerFailure("Invalid credentials.");
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
            triggerFailure(result.error);
        } else {
            setStatus('SUCCESS');
            setTimeout(() => {
                onLogin();
            }, 800);
        }
    } catch (err) {
        triggerFailure("Connection lost.");
        console.error(err);
    }
  };

  const triggerFailure = (msg: string) => {
    setErrorMsg(msg);
    setStatus('FAILURE');
    setTimeout(() => {
        setStatus('IDLE');
    }, 2000);
  };

  const handleTestLogin = async () => {
      if (mode === 'signup') {
          setFullName('Test User');
          setAgreedToTerms(true);
      }
      setEmail('test_user@zync.ai');
      setPassword('dev_mode_active');
      
      await new Promise(r => setTimeout(r, 600));
      if (status === 'PROCESSING') return;
      setStatus('PROCESSING');
      setErrorMsg(null);

      try {
          const result = await loginUser('test_user@zync.ai', 'dev_mode_active');
          if (result.error) {
              triggerFailure(result.error);
          } else {
              setStatus('SUCCESS');
              setTimeout(() => {
                  onLogin();
              }, 800); 
          }
      } catch (err) {
          triggerFailure("Connection lost.");
      }
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen p-4 relative z-10 font-sans transition-opacity duration-1000 ${status === 'SUCCESS' ? 'opacity-0 scale-95' : 'opacity-100'}`}>
      
      {/* Glass Card */}
      <div className="w-full max-w-md relative glass-panel p-10 shadow-2xl rounded-3xl backdrop-blur-xl border border-white/10">
            
            {/* Header */}
            <div className="mb-12 text-center">
                <div className="inline-block relative group cursor-default">
                    <div className="absolute -inset-4 bg-gradient-to-r from-fuchsia-500/20 to-cyan-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <img src={zyncLogo} alt="ZyncAI" className="h-12 w-auto object-contain relative z-10 logo-glow" />
                </div>
                <p className="text-sm text-slate-400 mt-4 font-light tracking-wide">
                    {mode === 'signin' ? 'Welcome back to the flow.' : 'Join the neural network.'}
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                
                {mode === 'signup' && (
                    <WaveInput 
                        label="Full Name" 
                        value={fullName} 
                        onChange={setFullName} 
                        icon={<User size={16} />} 
                        placeholder="Enter your name"
                    />
                )}

                <WaveInput 
                    label="Email Address" 
                    type="email" 
                    value={email} 
                    onChange={setEmail} 
                    icon={<Mail size={16} />} 
                    placeholder="name@example.com"
                />

                <WaveInput 
                    label="Password" 
                    type="password" 
                    value={password} 
                    onChange={setPassword} 
                    icon={<Lock size={16} />} 
                    placeholder="••••••••"
                />

                {/* Terms (Signup) */}
                {mode === 'signup' && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                         <label className="flex items-center gap-3 cursor-pointer group">
                             <div className={`w-4 h-4 border border-slate-600 rounded flex items-center justify-center transition-all ${agreedToTerms ? 'bg-gradient-to-r from-fuchsia-500 to-cyan-500 border-transparent' : 'bg-transparent'}`}>
                                 {agreedToTerms && <Check size={12} className="text-white" />}
                             </div>
                             <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">I accept the terms of service</span>
                         </label>
                    </div>
                )}
                
                {/* Error Display */}
                {errorMsg && (
                    <div className="bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-300 flex items-center gap-2 rounded-lg animate-in fade-in slide-in-from-top-1">
                        <AlertCircle size={14} className="shrink-0" /> 
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Action Button */}
                <div className="pt-4">
                    <GradientButton 
                        text={mode === 'signin' ? 'Sign In' : 'Create Account'} 
                        isLoading={status === 'PROCESSING'}
                    />
                </div>

                {/* Social Sign-In */}
                {mode === 'signin' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                            <div className="relative flex justify-center text-[10px] uppercase text-slate-500 bg-[#0f0720]/0 px-2 tracking-widest">
                                <span className="bg-[#130926] px-2 rounded-full">Or continue with</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <SocialButton 
                                icon={<GoogleIcon />} 
                                label="Google" 
                                onClick={() => triggerFailure("Gateway Timeout")} 
                            />
                            <SocialButton 
                                icon={<Github size={18} />} 
                                label="GitHub" 
                                onClick={() => triggerFailure("Auth Rejected")} 
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
                    className="text-xs text-slate-500 hover:text-cyan-400 transition-colors"
                 >
                    {mode === 'signin' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                 </button>

                 <div className="pt-4 border-t border-white/5">
                    <button
                        type="button"
                        onClick={handleTestLogin}
                        className="text-[10px] text-slate-600 hover:text-emerald-400 uppercase tracking-wider transition-colors flex items-center gap-1.5 mx-auto opacity-60 hover:opacity-100"
                    >
                        <Shield size={10} />
                        Test Mode Access
                    </button>
                 </div>
            </div>
      </div>
    </div>
  );
};

// --- Sub-Components ---

const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M23.52 12.212c0-0.852-0.077-1.682-0.223-2.487H12v4.704h6.454c-0.279 1.504-1.122 2.778-2.396 3.633v3.02h3.88c2.271-2.089 3.58-5.164 3.58-8.87z" />
        <path d="M12 24c3.24 0 5.957-1.074 7.942-2.908l-3.88-3.02c-1.076 0.72-2.452 1.147-4.062 1.147-3.124 0-5.769-2.111-6.716-4.948H1.321v3.114C3.325 21.365 7.393 24 12 24z" />
        <path d="M5.284 14.271c-0.24-0.72-0.377-1.491-0.377-2.271s0.137-1.551 0.377-2.271V6.615H1.321C0.479 8.288 0 10.098 0 12s0.479 3.712 1.321 5.385l3.963-3.114z" />
        <path d="M12 4.777c1.763 0 3.346 0.608 4.591 1.796l3.445-3.445C17.953 1.173 15.236 0 12 0 7.393 0 3.325 2.635 1.321 6.615l3.963 3.114c0.947-2.837 3.592-4.952 6.716-4.952z" />
    </svg>
);

const SocialButton = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
    <button
        type="button"
        onClick={onClick}
        className="
            flex items-center justify-center gap-3 py-2.5 px-4 
            bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-xl
            text-slate-300 text-xs font-medium
            transition-all duration-300
            hover:scale-[1.02] active:scale-95
        "
    >
        <span className="opacity-90">{icon}</span>
        <span>{label}</span>
    </button>
);

const WaveInput = ({ label, value, onChange, type = "text", placeholder, icon }: any) => {
    const [focused, setFocused] = useState(false);

    return (
        <div className="group">
            <label className={`block text-xs font-medium mb-1.5 transition-colors duration-300 ${focused ? 'text-cyan-400' : 'text-slate-500'}`}>
                {label}
            </label>
            <div className="relative flex items-center">
                <div className={`absolute left-3 transition-colors duration-300 ${focused ? 'text-cyan-400' : 'text-slate-600'}`}>
                    {icon}
                </div>
                <input 
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    className={`
                        w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4
                        text-sm text-slate-200 placeholder-slate-600 outline-none
                        transition-all duration-300
                        ${focused ? 'border-cyan-500/50 shadow-[0_0_15px_-3px_rgba(6,182,212,0.3)]' : 'hover:border-white/20'}
                    `}
                    placeholder={placeholder}
                />
            </div>
        </div>
    )
}

const GradientButton = ({ text, isLoading }: { text: string, isLoading: boolean }) => {
    return (
        <button 
            type="submit"
            disabled={isLoading}
            className={`
                w-full h-12 relative overflow-hidden rounded-xl transition-all duration-300
                bg-gradient-to-r from-fuchsia-600 to-cyan-500 hover:from-fuchsia-500 hover:to-cyan-400
                text-white font-medium tracking-wide text-sm shadow-lg shadow-cyan-500/20
                ${isLoading ? 'opacity-80 cursor-wait' : 'hover:shadow-cyan-500/40 hover:scale-[1.01] active:scale-[0.99]'}
            `}
        >
            <div className="flex items-center justify-center gap-2">
                {isLoading ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Processing...</span>
                    </>
                ) : (
                    <>
                        <span>{text}</span>
                        <ArrowRight size={16} className="opacity-80" />
                    </>
                )}
            </div>
        </button>
    )
}

export default LoginPage;