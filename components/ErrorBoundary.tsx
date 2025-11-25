import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Terminal, ShieldAlert, Bug, ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, showDetails: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Zync System Critical Error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  toggleDetails = () => {
    this.setState(prevState => ({ showDetails: !prevState.showDetails }));
  };

  handleReport = () => {
    // Mock report functionality
    alert("Diagnostic report sent to Zync Central Command.");
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-mono flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-red-500/30">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.5),rgba(2,6,23,0.8)),url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-red-950/20 via-slate-950 to-slate-900 pointer-events-none"></div>
          
          {/* Scanline Effect */}
          <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[size:100%_4px] pointer-events-none opacity-20 z-10"></div>

          <div className="relative z-20 max-w-lg w-full bg-slate-900/80 backdrop-blur-xl border border-red-500/30 p-8 rounded-sm shadow-[0_0_50px_-10px_rgba(220,38,38,0.2)]">
            
            {/* Header */}
            <div className="flex items-center gap-4 mb-8 text-red-500 border-b border-red-500/20 pb-6">
              <div className="p-3 bg-red-500/10 rounded border border-red-500/20">
                 <ShieldAlert size={32} className="animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-[0.2em] uppercase text-red-100">Critical Kernel Panic</h1>
                <div className="text-[10px] opacity-70 font-mono mt-1 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                    ERROR_CODE: 0xCRASH_DUMP
                </div>
              </div>
            </div>

            {/* Error Message */}
            <div className="mb-8 space-y-3">
              <div className="flex items-center justify-between text-xs text-red-400 uppercase tracking-wider opacity-80">
                <div className="flex items-center gap-2">
                    <Terminal size={12} />
                    <span>System Exception Log</span>
                </div>
                <span className="text-[9px] opacity-50">{new Date().toISOString()}</span>
              </div>
              
              <div className="bg-black/60 border border-red-900/50 rounded p-4 font-mono text-xs text-red-300 overflow-hidden relative group">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-600/50"></div>
                <div className="overflow-auto max-h-32 whitespace-pre-wrap scrollbar-thin scrollbar-thumb-red-900 pr-2">
                    {this.state.error?.toString() || "Unknown system failure occurred."}
                </div>
              </div>

              {/* Stack Trace Toggle */}
              <button 
                onClick={this.toggleDetails}
                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-wider"
              >
                {this.state.showDetails ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                {this.state.showDetails ? 'Hide Stack Trace' : 'View Stack Trace'}
              </button>
              
              {this.state.showDetails && this.state.error?.stack && (
                  <div className="mt-2 p-3 bg-black/40 border border-slate-800 rounded text-[10px] text-slate-400 font-mono overflow-auto max-h-40 whitespace-pre scrollbar-thin scrollbar-thumb-slate-700">
                      {this.state.error.stack}
                  </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-4">
              <p className="text-xs text-slate-500 text-center leading-relaxed px-4">
                The Reflex/Memory synchronization encountered a fatal exception. <br/>
                A manual system reboot is required to restore cognitive functions.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={this.handleReport}
                    className="py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded text-slate-400 hover:text-slate-200 font-mono text-[10px] tracking-widest transition-all duration-300 flex items-center justify-center gap-2 uppercase"
                  >
                    <Bug size={12} />
                    Report Issue
                  </button>
                  <button 
                    onClick={this.handleReload}
                    className="group py-3 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/50 rounded text-red-500 font-bold tracking-widest transition-all duration-300 flex items-center justify-center gap-2 uppercase text-[10px]"
                  >
                    <RefreshCw size={12} className="group-hover:animate-spin" />
                    System Reboot
                  </button>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="mt-8 text-[10px] text-slate-600 font-mono flex items-center gap-2 uppercase tracking-widest opacity-50">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            System Offline | Safe Mode Active
          </div>

        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
