import React, { useState, useEffect, useRef } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';

export interface CommandOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandOption[];
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, commands }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter commands
  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.description.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Small timeout to allow render before focus
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
        // Scroll into view logic could be added here
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
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

  // Auto-scroll to selected item
  useEffect(() => {
    if (listRef.current && isOpen) {
        const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
        if (selectedElement) {
            selectedElement.scrollIntoView({ block: 'nearest' });
        }
    }
  }, [selectedIndex, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[20vh] px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        {/* Header / Input */}
        <div className="flex items-center px-4 py-3 border-b border-slate-800 shrink-0">
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
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-500 font-mono text-xs">
              No matching commands found.
            </div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <div
                key={cmd.id}
                onClick={() => {
                  cmd.action();
                  onClose();
                }}
                className={`
                  px-4 py-3 flex items-center justify-between cursor-pointer transition-all duration-150
                  ${index === selectedIndex ? 'bg-cyan-950/30 border-l-2 border-cyan-400 pl-[14px]' : 'border-l-2 border-transparent hover:bg-slate-800/50'}
                `}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`p-2 rounded-md shrink-0 ${index === selectedIndex ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-400 bg-slate-800'}`}>
                    {cmd.icon}
                  </div>
                  <div className="flex flex-col truncate">
                    <span className={`text-sm font-mono font-bold truncate ${index === selectedIndex ? 'text-cyan-100' : 'text-slate-300'}`}>
                      {cmd.label}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate">
                      {cmd.description}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {cmd.shortcut && (
                    <div className="text-[10px] font-mono text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-700/50 hidden sm:block">
                        {cmd.shortcut}
                    </div>
                    )}
                    
                    {index === selectedIndex && !cmd.shortcut && (
                        <CornerDownLeft size={14} className="text-cyan-500/50" />
                    )}
                </div>
              </div>
            ))
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
    </div>
  );
};

export default CommandPalette;
