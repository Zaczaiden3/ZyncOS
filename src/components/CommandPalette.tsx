import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, CornerDownLeft, Lock } from 'lucide-react';

export interface CommandOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  disabled?: boolean;
  category?: string;
  previewVideo?: string; // URL to feature preview video
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandOption[];
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, commands = [] }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter and flatten commands
  const filteredCommands = useMemo(() => {
    return commands.filter(cmd =>
      (cmd.label.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description.toLowerCase().includes(query.toLowerCase()))
    );
  }, [commands, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredCommands[selectedIndex];
        if (selected && !selected.disabled) {
          selected.action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Auto-scroll
  useEffect(() => {
    if (listRef.current && isOpen) {
        const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
        if (selectedElement && typeof selectedElement.scrollIntoView === 'function') {
            try {
                selectedElement.scrollIntoView({ block: 'nearest' });
            } catch (error) {
                console.warn('Failed to scroll to element:', error);
            }
        }
    }
  }, [selectedIndex, isOpen]);

  if (!isOpen) return null;

  const selectedCommand = filteredCommands[selectedIndex];

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300" 
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div className="relative w-full max-w-3xl bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col shadow-cyan-500/10">
        
        {/* Search Header */}
        <div className="flex items-center px-6 py-5 border-b border-white/5 shrink-0 relative overflow-hidden">
            {/* Ambient Glow */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-emerald-500 opacity-50"></div>
            
            <Search className="w-5 h-5 text-slate-400 mr-4" />
            <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                }}
                placeholder="What would you like to do?"
                className="flex-1 bg-transparent border-none outline-none text-lg text-slate-100 placeholder-slate-500 font-sans font-medium h-8"
            />
            <div className="flex items-center gap-2">
                <div className="text-[10px] font-mono bg-white/5 text-slate-400 px-2 py-1 rounded border border-white/10 hidden sm:block">
                    ESC
                </div>
            </div>
        </div>

        {/* Main Content Area */}
        <div className="flex h-[50vh]">
            {/* Command List */}
            <div ref={listRef} className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {filteredCommands.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                            <Search className="w-6 h-6 opacity-50" />
                        </div>
                        <p className="font-mono text-sm">No commands found</p>
                    </div>
                ) : (
                    filteredCommands.map((cmd, index) => {
                        const prevCmd = filteredCommands[index - 1];
                        const showHeader = !prevCmd || prevCmd.category !== cmd.category;
                        const isSelected = index === selectedIndex;

                        return (
                            <React.Fragment key={cmd.id}>
                                {showHeader && cmd.category && (
                                    <div className="px-6 py-2 mt-2 text-[10px] font-mono font-bold text-cyan-500/70 uppercase tracking-widest sticky top-0 bg-slate-900/95 backdrop-blur-xl z-10">
                                        {cmd.category}
                                    </div>
                                )}
                                <div
                                    onClick={() => {
                                        if (!cmd.disabled) {
                                            cmd.action();
                                            onClose();
                                        }
                                    }}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    className={`
                                        px-6 py-3 mx-2 rounded-xl flex items-center justify-between transition-all duration-150 group cursor-pointer border border-transparent
                                        ${cmd.disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}
                                        ${isSelected ? 'bg-white/5 border-white/10 shadow-lg shadow-black/20' : 'hover:bg-white/[0.02]'}
                                    `}
                                >
                                    <div className="flex items-center gap-4 overflow-hidden">
                                        <div className={`
                                            p-2 rounded-lg shrink-0 transition-all duration-300
                                            ${isSelected ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-cyan-400'}
                                        `}>
                                            {cmd.icon}
                                        </div>
                                        <div className="flex flex-col truncate">
                                            <span className={`text-sm font-medium truncate transition-colors ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                                {cmd.label}
                                            </span>
                                            <span className="text-xs text-slate-500 truncate group-hover:text-slate-400">
                                                {cmd.description}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0">
                                        {cmd.disabled && <Lock size={14} className="text-slate-600" />}
                                        {cmd.shortcut && (
                                            <div className="text-[10px] font-mono text-slate-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/10 hidden sm:block">
                                                {cmd.shortcut}
                                            </div>
                                        )}
                                        {isSelected && !cmd.disabled && (
                                            <CornerDownLeft size={16} className="text-cyan-500 animate-pulse" />
                                        )}
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    })
                )}
            </div>

            {/* Right Preview Panel (Simplified & Integrated) */}
            <div className="w-[280px] bg-black/20 border-l border-white/5 hidden md:flex flex-col p-6 relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>

                {selectedCommand ? (
                    <div className="flex flex-col h-full relative z-10">
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                             <div className={`
                                w-20 h-20 rounded-2xl mb-6 flex items-center justify-center
                                bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 shadow-2xl
                                ${selectedCommand.disabled ? 'grayscale opacity-50' : 'shadow-cyan-500/20'}
                            `}>
                                {React.isValidElement(selectedCommand.icon) && React.cloneElement(selectedCommand.icon as React.ReactElement<any>, { 
                                    size: 40, 
                                    className: selectedCommand.disabled ? 'text-slate-500' : 'text-cyan-400' 
                                })}
                            </div>
                            
                            <h3 className="text-xl font-bold text-slate-100 mb-3">{selectedCommand.label}</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                {selectedCommand.description}
                            </p>

                            {selectedCommand.disabled && (
                                <div className="mt-6 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                                    <Lock size={12} />
                                    <span>Locked</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-auto pt-6 border-t border-white/5">
                            <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                                <span>Category</span>
                                <span className="text-cyan-500">{selectedCommand.category || 'General'}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-600 text-sm font-mono">
                        Select a command
                    </div>
                )}
            </div>
        </div>
        
        {/* Footer */}
        <div className="bg-slate-950/50 px-6 py-3 border-t border-white/5 text-[10px] text-slate-500 font-mono flex justify-between shrink-0 backdrop-blur-md">
            <div className="flex gap-4">
                <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                    Reflex Core
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500"></span>
                    Memory Core
                </span>
            </div>
            <div className="flex gap-3">
                <span className="hidden sm:inline">Navigate: <span className="text-slate-300">↑↓</span></span>
                <span className="hidden sm:inline">Select: <span className="text-slate-300">Enter</span></span>
            </div>
        </div>

      </div>
    </div>
  );
};

export default React.memo(CommandPalette);
