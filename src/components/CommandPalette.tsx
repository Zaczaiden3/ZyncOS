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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

      {/* Modal */}
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex h-[60vh]">
        
        {/* Left Column: Command List */}
        <div className="flex-1 flex flex-col border-r border-slate-800 min-w-[300px]">
            {/* Header / Input */}
            <div className="flex items-center px-4 py-4 border-b border-slate-800 shrink-0">
            <Search className="w-5 h-5 text-slate-500 mr-3" />
            <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                }}
                placeholder="Type a command..."
                className="flex-1 bg-transparent border-none outline-none text-slate-200 placeholder-slate-600 font-mono text-sm h-6"
            />
            <div className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700 hidden sm:block">
                ESC
            </div>
            </div>

            {/* List */}
            <div ref={listRef} className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {filteredCommands.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-500 font-mono text-xs">
                No matching commands found.
                </div>
            ) : (
                filteredCommands.map((cmd, index) => {
                const prevCmd = filteredCommands[index - 1];
                const showHeader = !prevCmd || prevCmd.category !== cmd.category;

                return (
                    <React.Fragment key={cmd.id}>
                    {showHeader && cmd.category && (
                        <div className="px-4 py-1.5 mt-2 mb-1 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider bg-slate-950/30 border-y border-slate-800/50 backdrop-blur-sm sticky top-0 z-10">
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
                        px-4 py-3 flex items-center justify-between transition-all duration-150 group
                        ${cmd.disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'}
                        ${index === selectedIndex ? 'bg-cyan-950/30 border-l-2 border-cyan-400 pl-[14px]' : 'border-l-2 border-transparent hover:bg-slate-800/50'}
                        `}
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`p-2 rounded-md shrink-0 transition-colors ${index === selectedIndex ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-400 bg-slate-800 group-hover:text-cyan-400/70 group-hover:bg-slate-800/80'}`}>
                            {cmd.icon}
                        </div>
                        <div className="flex flex-col truncate">
                            <span className={`text-sm font-mono font-bold truncate transition-colors ${index === selectedIndex ? 'text-cyan-100' : 'text-slate-300 group-hover:text-cyan-50'}`}>
                            {cmd.label}
                            </span>
                            <span className="text-[10px] text-slate-500 truncate group-hover:text-slate-400">
                            {cmd.description}
                            </span>
                        </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            {cmd.disabled && <Lock size={12} className="text-slate-600" />}
                            {cmd.shortcut && (
                            <div className="text-[10px] font-mono text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-700/50 hidden sm:block">
                                {cmd.shortcut}
                            </div>
                            )}
                            
                            {index === selectedIndex && !cmd.shortcut && !cmd.disabled && (
                                <CornerDownLeft size={14} className="text-cyan-500/50" />
                            )}
                        </div>
                    </div>
                    </React.Fragment>
                );
                })
            )}
            </div>
            
            {/* Footer */}
            <div className="bg-slate-950/50 px-4 py-2 border-t border-slate-800 text-[10px] text-slate-600 font-mono flex justify-between shrink-0">
                <span>Reflex/Memory Core Commands</span>
                <div className="flex gap-2">
                    <span className="hidden sm:inline">Navigate: ↑↓</span>
                    <span className="hidden sm:inline">Select: Enter</span>
                </div>
            </div>
        </div>

        {/* Right Column: Preview Panel */}
        <div className="w-[350px] bg-slate-950/50 flex flex-col p-6 hidden md:flex">
            <div className="flex-1 flex flex-col items-center justify-center text-center">
                {selectedCommand ? (
                    <>
                        <div className="w-full aspect-video bg-slate-900 rounded-lg border border-slate-800 mb-6 overflow-hidden relative group">
                            {selectedCommand.previewVideo ? (
                                <video 
                                    src={selectedCommand.previewVideo} 
                                    autoPlay 
                                    loop 
                                    muted 
                                    playsInline
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-slate-700">
                                    <div className="flex flex-col items-center gap-2">
                                        {selectedCommand.icon}
                                        <span className="text-[10px] font-mono uppercase">No Preview</span>
                                    </div>
                                </div>
                            )}
                            {/* Scanline Overlay */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 pointer-events-none bg-[length:100%_4px,3px_100%]"></div>
                        </div>
                        
                        <h3 className="text-lg font-bold text-cyan-400 mb-2">{selectedCommand.label}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed max-w-[250px]">
                            {selectedCommand.description}
                        </p>
                        
                        {selectedCommand.disabled && (
                            <div className="mt-4 px-3 py-1 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-[10px] font-mono uppercase tracking-wider">
                                Command Unavailable
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-slate-600 text-sm font-mono">Select a command to preview</div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};

export default React.memo(CommandPalette);
