import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Terminal, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Zync System Critical Error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-mono flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-red-500/30">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.5),rgba(2,6,23,0.8)),url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-red-950/20 via-slate-950 to-slate-900 pointer-events-none"></div>
          
          <div className="relative z-10 max-w-lg w-full bg-slate-900/50 backdrop-blur-xl border border-red-500/30 p-8 rounded-2xl shadow-[0_0_50px_-10px_rgba(220,38,38,0.2)]">
            
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 text-red-500 border-b border-red-500/20 pb-4">
              <ShieldAlert size={32} className="animate-pulse" />
              <div>
                <h1 className="text-xl font-bold tracking-widest uppercase">Critical Kernel Panic</h1>
                <div className="text-[10px] opacity-70">ERROR_CODE: 0xCRASH_DUMP</div>
              </div>
            </div>

            {/* Error Message */}
            <div className="mb-6 space-y-2">
              <div className="flex items-center gap-2 text-xs text-red-400 uppercase tracking-wider opacity-80">
                <Terminal size={12} />
                <span>System Exception Log</span>
              </div>
              <div className="bg-black/40 border border-red-900/50 rounded-lg p-4 font-mono text-xs text-red-300 overflow-auto max-h-40 whitespace-pre-wrap scrollbar-thin scrollbar-thumb-red-900">
                {this.state.error?.toString() || "Unknown system failure occurred."}
              </div>
            </div>

            {/* Action */}
            <div className="flex flex-col gap-3">
              <p className="text-xs text-slate-500 text-center">
                The Reflex/Memory synchronization encountered a fatal exception. <br/>
                A manual system reboot is required to restore cognitive functions.
              </p>
              
              <button 
                onClick={this.handleReload}
                className="group w-full py-3 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/50 rounded-lg text-red-500 font-bold tracking-widest transition-all duration-300 flex items-center justify-center gap-2 uppercase text-xs"
              >
                <RefreshCw size={14} className="group-hover:animate-spin" />
                Initiate System Reboot
              </button>
            </div>

          </div>

          {/* Footer */}
          <div className="mt-8 text-[10px] text-slate-600 font-mono flex items-center gap-2 uppercase">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            System Offline
          </div>

        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
