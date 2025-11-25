import React from 'react';
import { Message, AIRole } from '../types';
import { User, Zap, BrainCircuit, Clock, CheckCircle2, Globe, ExternalLink, ShieldAlert, ImageIcon, FileText, Network } from 'lucide-react';
import TTSPlayer from './TTSPlayer';
import './MessageItem.css';

interface MessageItemProps {
  message: Message;
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === AIRole.USER;
  const isReflex = message.role === AIRole.REFLEX;
  const isMemory = message.role === AIRole.MEMORY;
  const isConsensus = message.role === AIRole.CONSENSUS;
  const isNeuro = message.role === AIRole.NEURO;

  // Simple Markdown-like parser for formatting
  const parseBold = (text: string) => {
    // Split by **text**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className={`font-bold ${isReflex ? 'text-cyan-200' : isMemory ? 'text-fuchsia-200' : isNeuro ? 'text-emerald-200' : 'text-slate-200'}`}>{part.slice(2, -2)}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  const FormattedText = ({ text }: { text: string }) => {
    if (!text) return null;
    const lines = text.split('\n');
    return (
      <div className="space-y-1">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          
          // Headers
          if (line.startsWith('### ')) {
            return <h3 key={i} className={`text-sm font-bold mt-3 mb-1 uppercase tracking-wide opacity-90 ${isReflex ? 'text-cyan-300' : isMemory ? 'text-fuchsia-300' : isNeuro ? 'text-emerald-300' : 'text-amber-300'}`}>{parseBold(line.replace('### ', ''))}</h3>
          }
          if (line.startsWith('## ')) {
             return <h2 key={i} className={`text-base font-bold mt-4 mb-2 ${isReflex ? 'text-cyan-100' : isMemory ? 'text-fuchsia-100' : isNeuro ? 'text-emerald-100' : 'text-amber-100'}`}>{parseBold(line.replace('## ', ''))}</h2>
          }
          
          // List Items
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
             const content = trimmed.substring(2);
             return (
                 <div key={i} className="flex gap-2 ml-1">
                     <span className={`mt-1.5 w-1 h-1 rounded-full shrink-0 ${isReflex ? 'bg-cyan-500' : isMemory ? 'bg-fuchsia-500' : isNeuro ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                     <div className="leading-relaxed">{parseBold(content)}</div>
                 </div>
             )
          }

          // Numbered Lists (Simple detection)
          if (/^\d+\.\s/.test(trimmed)) {
             const content = trimmed.replace(/^\d+\.\s/, '');
             const number = trimmed.match(/^\d+/)?.[0];
             return (
                 <div key={i} className="flex gap-2 ml-1">
                     <span className="font-mono opacity-70 shrink-0">{number}.</span>
                     <div className="leading-relaxed">{parseBold(content)}</div>
                 </div>
             )
          }

          // Empty lines
          if (!trimmed) return <div key={i} className="h-2"></div>;

          // Standard paragraph
          return <div key={i} className="leading-relaxed">{parseBold(line)}</div>
        })}
      </div>
    );
  };

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`flex max-w-[95%] md:max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-3 md:gap-4`}>
        
        {/* Avatar / Icon */}
        <div className={`
          w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center shrink-0 shadow-lg transition-all duration-500 mt-1
          ${isUser ? 'bg-slate-700 text-slate-300' : ''}
          ${isReflex ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/30' : ''}
          ${isMemory ? 'bg-fuchsia-950 text-fuchsia-400 border border-fuchsia-500/30' : ''}
          ${isNeuro ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : ''}
          ${isConsensus ? 'bg-amber-950 text-amber-400 border border-amber-500/30 animate-pulse' : ''}
        `}>
          {isUser && <User size={16} className="md:w-5 md:h-5" />}
          {isReflex && <Zap size={16} className="md:w-5 md:h-5" />}
          {isMemory && <BrainCircuit size={16} className="md:w-5 md:h-5" />}
          {isNeuro && <Network size={16} className="md:w-5 md:h-5" />}
          {isConsensus && <ShieldAlert size={16} className="md:w-5 md:h-5" />}
        </div>

        {/* Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full min-w-0`}>
          
          {/* Header info */}
          <div className="flex items-center flex-wrap gap-x-2 mb-1 text-[10px] md:text-xs font-mono opacity-70">
            <span className={`font-bold ${
              isReflex ? 'text-cyan-400' : isMemory ? 'text-fuchsia-400' : isNeuro ? 'text-emerald-400' : isConsensus ? 'text-amber-400' : 'text-slate-400'
            }`}>
              {isReflex ? 'REFLEX CORE' : isMemory ? 'MEMORY CORE' : isNeuro ? 'NEURO-SYMBOLIC CORE' : isConsensus ? 'CONSENSUS PROTOCOL' : 'USER_CMD'}
            </span>
            {message.metrics && (
              <>
                <span className="text-slate-600">|</span>
                {message.metrics.latency && (
                    <span className="flex items-center gap-1 text-slate-500">
                    <Clock size={10} />
                    {message.metrics.latency}ms
                    </span>
                )}
                {message.metrics.tokens && (
                    <span className="hidden sm:flex items-center gap-1 text-slate-500">
                        <span className="text-[10px]">TOK:</span> {message.metrics.tokens}
                    </span>
                )}
              </>
            )}
          </div>

          {/* Message Bubble */}
          <div className={`
            p-3 md:p-4 rounded-xl text-sm shadow-md backdrop-blur-sm border w-full
            ${isUser ? 'bg-slate-800/80 text-slate-100 border-slate-700 rounded-tr-none' : ''}
            ${isReflex ? 'bg-cyan-950/20 text-cyan-50 border-cyan-500/20 rounded-tl-none' : ''}
            ${isMemory ? 'bg-fuchsia-950/20 text-fuchsia-50 border-fuchsia-500/20 rounded-tl-none' : ''}
            ${isNeuro ? 'bg-emerald-950/20 text-emerald-50 border-emerald-500/20 rounded-tl-none' : ''}
            ${isConsensus ? 'bg-amber-950/20 text-amber-50 border-amber-500/20 rounded-tl-none' : ''}
            message-bubble
          `}
          style={{
             '--dynamic-border-color': message.metrics?.confidence ? `rgba(${isNeuro ? '16, 185, 129' : isReflex ? '6, 182, 212' : isMemory ? '217, 70, 239' : '255, 255, 255'}, ${message.metrics.confidence / 100})` : undefined,
          } as React.CSSProperties}>
            {/* Attachment Display */}
            {message.attachment && (
              <div className="mb-3 rounded-lg overflow-hidden border border-slate-700/50 bg-black/30 relative group">
                {message.attachmentType === 'text' ? (
                   <div className="p-3 font-mono text-xs text-slate-300 bg-slate-900/50 max-h-60 overflow-y-auto whitespace-pre-wrap scrollbar-thin scrollbar-thumb-slate-700">
                      <div className="flex items-center gap-2 mb-2 text-cyan-400 border-b border-slate-700 pb-1 sticky top-0 bg-slate-900/90 backdrop-blur-sm">
                          <FileText size={12} />
                          <span className="uppercase">Attached File Content</span>
                      </div>
                      {message.attachment}
                   </div>
                ) : (
                    <>
                        <img 
                          src={message.attachment} 
                          alt="User attachment" 
                          className="max-h-60 w-auto object-contain opacity-90 transition-opacity group-hover:opacity-100" 
                        />
                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur text-xs px-2 py-1 rounded text-slate-300 flex items-center gap-1">
                            <ImageIcon size={10} />
                            IMG_DATA
                        </div>
                    </>
                )}
              </div>
            )}

            {/* Content or Loading State */}
            {message.text ? (
                <div className="selection:bg-cyan-500/30">
                    <FormattedText text={message.text} />
                </div>
            ) : (
                <div className="flex items-center gap-3 py-2 pl-1 select-none">
                     <div className="flex gap-1 h-4 items-end">
                        <div className={`w-1 h-full rounded-sm animate-[pulse_0.8s_ease-in-out_infinite] ${isReflex ? 'bg-cyan-400/80' : isMemory ? 'bg-fuchsia-400/80' : 'bg-amber-400/80'}`}></div>
                        <div className={`w-1 h-2/3 rounded-sm animate-[pulse_0.8s_ease-in-out_0.2s_infinite] ${isReflex ? 'bg-cyan-400/80' : isMemory ? 'bg-fuchsia-400/80' : 'bg-amber-400/80'}`}></div>
                        <div className={`w-1 h-full rounded-sm animate-[pulse_0.8s_ease-in-out_0.4s_infinite] ${isReflex ? 'bg-cyan-400/80' : isMemory ? 'bg-fuchsia-400/80' : 'bg-amber-400/80'}`}></div>
                    </div>
                    <span className={`text-xs font-mono tracking-widest animate-pulse ${isReflex ? 'text-cyan-300' : isMemory ? 'text-fuchsia-300' : 'text-amber-300'}`}>
                        {isReflex ? 'INITIALIZING_STREAM...' : isMemory ? 'PROCESSING_FRAMEWORK...' : 'RECOVERING...'}
                    </span>
                </div>
            )}

            {/* Live Data Sources / Grounding */}
            {message.sources && message.sources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-cyan-500/10">
                <div className="flex items-center gap-2 mb-2 text-[10px] font-mono text-cyan-500/70 uppercase tracking-wider">
                  <Globe size={10} />
                  <span>Live Data Sources</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {message.sources.map((source, idx) => (
                    <a 
                      key={idx} 
                      href={source.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1.5 bg-black/20 hover:bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/40 rounded transition-colors text-[10px] text-cyan-300 no-underline active:scale-95 transform duration-100"
                    >
                      <span className="truncate max-w-[120px] md:max-w-[150px]">{source.title}</span>
                      <ExternalLink size={8} className="opacity-50" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* --- Text-to-Speech Player Integration --- */}
            {message.text && !isUser && (
                <TTSPlayer text={message.text} role={message.role} />
            )}

          </div>

          {/* Memory Facts / Context Chips */}
          {message.relatedFacts && message.relatedFacts.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2 animate-pulse-fast">
              {message.relatedFacts.map((fact, idx) => (
                <span key={idx} className="
                  px-2 py-1 rounded-md bg-fuchsia-500/10 border border-fuchsia-500/20 
                  text-[10px] text-fuchsia-300 font-mono flex items-center gap-1
                ">
                  <CheckCircle2 size={10} />
                  {typeof fact === 'object' ? JSON.stringify(fact).replace(/[{"}]/g, '') : fact}
                </span>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default MessageItem;