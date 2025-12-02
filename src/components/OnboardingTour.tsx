import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Zap, Brain, FlaskConical, Settings } from 'lucide-react';

interface OnboardingTourProps {
  onComplete: () => void;
}

const STEPS = [
  {
    title: "Welcome to Zync AI",
    description: "Your advanced AI workspace for research, coding, and creative exploration. Zync combines multiple AI models into a single, cohesive interface.",
    icon: <Zap size={48} className="text-cyan-400" />,
    image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1000&auto=format&fit=crop"
  },
  {
    title: "Dual Core Intelligence",
    description: "Zync operates with two primary cores: Reflex (Fast, Chat) and Memory (Deep Reasoning). Switch between them based on your task complexity.",
    icon: <Brain size={48} className="text-fuchsia-400" />,
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1000&auto=format&fit=crop"
  },
  {
    title: "Experiment Lab",
    description: "Test different personas and prompts in parallel. Use the Flask icon in the header to access the Experiment Lab for rigorous testing.",
    icon: <FlaskConical size={48} className="text-emerald-400" />,
    image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=1000&auto=format&fit=crop"
  },
  {
    title: "Customizable Settings",
    description: "Configure your API keys, choose your preferred models, and tweak the voice output settings in the new Settings Panel.",
    icon: <Settings size={48} className="text-amber-400" />,
    image: "https://images.unsplash.com/photo-1555421689-491a97ff2040?q=80&w=1000&auto=format&fit=crop"
  }
];

const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay for animation
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(onComplete, 300); // Wait for animation
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[500px] relative">
        
        <button 
            onClick={handleComplete}
            className="absolute top-4 right-4 text-slate-500 hover:text-white z-10"
            title="Skip Tour"
        >
            <X size={24} />
        </button>

        {/* Image Section */}
        <div className="w-full md:w-1/2 relative overflow-hidden bg-slate-950">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10"></div>
            <img 
                src={STEPS[currentStep].image} 
                alt={STEPS[currentStep].title}
                className="w-full h-full object-cover opacity-60 transition-all duration-500 transform hover:scale-105"
            />
            <div className="absolute bottom-8 left-8 z-20">
                <div className="mb-4 p-3 bg-slate-900/50 backdrop-blur-md rounded-xl inline-block border border-slate-700/50">
                    {STEPS[currentStep].icon}
                </div>
            </div>
        </div>

        {/* Content Section */}
        <div className="w-full md:w-1/2 p-8 flex flex-col justify-between bg-slate-900 relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
                <div 
                    className={`h-full bg-cyan-500 transition-all duration-300 ease-out ${
                        currentStep === 0 ? 'w-1/4' :
                        currentStep === 1 ? 'w-1/2' :
                        currentStep === 2 ? 'w-3/4' : 'w-full'
                    }`}
                ></div>
            </div>

            <div className="mt-8">
                <h2 className="text-2xl font-bold text-white mb-4 font-mono">{STEPS[currentStep].title}</h2>
                <p className="text-slate-400 leading-relaxed">
                    {STEPS[currentStep].description}
                </p>
            </div>

            <div className="flex items-center justify-between mt-8">
                <div className="flex gap-2">
                    {STEPS.map((_, idx) => (
                        <div 
                            key={idx}
                            className={`w-2 h-2 rounded-full transition-colors ${idx === currentStep ? 'bg-cyan-500' : 'bg-slate-700'}`}
                        ></div>
                    ))}
                </div>

                <div className="flex gap-3">
                    {currentStep > 0 && (
                        <button 
                            onClick={handlePrev}
                            className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors font-mono text-sm"
                        >
                            Back
                        </button>
                    )}
                    <button 
                        onClick={handleNext}
                        className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors font-mono text-sm flex items-center gap-2"
                    >
                        {currentStep === STEPS.length - 1 ? 'Get Started' : 'Next'}
                        {currentStep < STEPS.length - 1 && <ChevronRight size={16} />}
                    </button>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default OnboardingTour;
