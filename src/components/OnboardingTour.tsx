import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Zap, Brain, FlaskConical, Settings, Sparkles } from 'lucide-react';
import './OnboardingTour.css';
import onboardingHero from '../assets/onboarding-hero.png';

interface OnboardingTourProps {
  onComplete: () => void;
}

const STEPS = [
  {
    title: "Welcome to Zync AI",
    description: "Your advanced AI workspace for research, coding, and creative exploration. Zync combines multiple AI models into a single, cohesive interface.",
    icon: <Zap size={32} className="text-cyan-400" />,
    image: onboardingHero
  },
  {
    title: "Dual Core Intelligence",
    description: "Zync operates with two primary cores: Reflex (Fast, Chat) and Memory (Deep Reasoning). Switch between them based on your task complexity.",
    icon: <Brain size={32} className="text-fuchsia-400" />,
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1000&auto=format&fit=crop"
  },
  {
    title: "Experiment Lab",
    description: "Test different personas and prompts in parallel. Use the Flask icon in the header to access the Experiment Lab for rigorous testing.",
    icon: <FlaskConical size={32} className="text-emerald-400" />,
    image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=1000&auto=format&fit=crop"
  },
  {
    title: "Customizable Settings",
    description: "Configure your API keys, choose your preferred models, and tweak the voice output settings in the new Settings Panel.",
    icon: <Settings size={32} className="text-amber-400" />,
    image: "https://images.unsplash.com/photo-1555421689-491a97ff2040?q=80&w=1000&auto=format&fit=crop"
  }
];

const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [animatingStep, setAnimatingStep] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setAnimatingStep(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setAnimatingStep(false);
      }, 300);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setAnimatingStep(true);
      setTimeout(() => {
        setCurrentStep(prev => prev - 1);
        setAnimatingStep(false);
      }, 300);
    }
  };

  const handleComplete = () => {
    setIsExiting(true);
    setTimeout(onComplete, 500);
  };

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-500 ${isVisible && !isExiting ? 'opacity-100 backdrop-blur-md bg-black/70' : 'opacity-0 pointer-events-none'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      <div 
        className={`w-full max-w-5xl h-[600px] flex rounded-3xl overflow-hidden shadow-2xl relative transition-all duration-700 transform onboarding-modal ${isVisible && !isExiting ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`}
      >
        
        <button 
            onClick={handleComplete}
            className="absolute top-6 right-6 text-slate-400 hover:text-white z-20 transition-colors p-2 hover:bg-white/10 rounded-full"
            title="Skip Tour"
            aria-label="Close tour"
        >
            <X size={24} />
        </button>

        {/* Left Side - Image & Visuals */}
        <div className="w-1/2 relative overflow-hidden bg-slate-900 hidden md:block group">
            {/* Background Image with Transition */}
            <div className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${animatingStep ? 'opacity-50' : 'opacity-100'}`}>
               <img 
                src={STEPS[currentStep].image} 
                alt={STEPS[currentStep].title}
                className="w-full h-full object-cover opacity-90 transition-transform duration-[3000ms] ease-out transform group-hover:scale-105"
               />
            </div>
            
            {/* Gradient Overlay - Enhanced for text readability and mood */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/20 to-transparent opacity-80"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/10 to-slate-900/60"></div>

            {/* Floating Icon */}
            <div className="absolute bottom-12 left-12 z-20">
                <div className={`p-5 bg-slate-900/60 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl transition-all duration-500 transform ${animatingStep ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'}`}>
                    {STEPS[currentStep].icon}
                </div>
            </div>
            
            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-cyan-500/10 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] animate-pulse onboarding-decoration-delay"></div>
            </div>
        </div>

        {/* Right Side - Content */}
        <div className="w-full md:w-1/2 p-12 flex flex-col justify-between relative bg-slate-950/80 backdrop-blur-xl border-l border-white/5">
            
            {/* Progress Bar Top */}
            <div className="w-full h-1.5 bg-slate-800/50 rounded-full mb-10 overflow-hidden">
                <div 
                    className={`h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 transition-all duration-700 ease-out rounded-full onboarding-progress-${Math.round(((currentStep + 1) / STEPS.length) * 100)}`}
                ></div>
            </div>

            <div className="flex-1 flex flex-col justify-center">
                <div className={`transition-all duration-500 transform ${animatingStep ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'}`}>
                    <div className="flex items-center gap-3 mb-6">
                        <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                            Step {currentStep + 1} of {STEPS.length}
                        </span>
                        {currentStep === 0 && (
                            <span className="flex items-center gap-1 text-amber-400 text-xs font-medium animate-pulse">
                                <Sparkles size={14} /> <span className="tracking-wide">NEW</span>
                            </span>
                        )}
                    </div>
                    
                    <h2 id="tour-title" className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 mb-6 leading-[1.1] tracking-tight">
                        {STEPS[currentStep].title}
                    </h2>
                    
                    <p className="text-lg text-slate-400 leading-relaxed font-light">
                        {STEPS[currentStep].description}
                    </p>
                </div>
            </div>

            {/* Footer Controls */}
            <div className="flex items-center justify-between mt-10 pt-8 border-t border-white/5">
                {/* Dots */}
                <div className="flex gap-3">
                    {STEPS.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                setAnimatingStep(true);
                                setTimeout(() => {
                                    setCurrentStep(idx);
                                    setAnimatingStep(false);
                                }, 300);
                            }}
                            className={`h-2 rounded-full transition-all duration-500 ${
                                idx === currentStep ? 'w-10 bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'w-2 bg-slate-800 hover:bg-slate-700'
                            }`}
                            aria-label={`Go to step ${idx + 1}`}
                        />
                    ))}
                </div>

                <div className="flex gap-4">
                    {currentStep > 0 && (
                        <button 
                            onClick={handlePrev}
                            className="px-6 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all font-medium text-sm"
                        >
                            Back
                        </button>
                    )}
                    <button 
                        onClick={handleNext}
                        className="group relative px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold transition-all shadow-lg shadow-cyan-900/20 hover:shadow-cyan-500/40 flex items-center gap-2 overflow-hidden"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            {currentStep === STEPS.length - 1 ? 'Get Started' : 'Next'}
                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer-slide"></div>
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
