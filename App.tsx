import React, { useState, useEffect, useRef } from 'react';
import { AIRole, Message, SystemStats } from './types';
import { generateReflexResponseStream, generateMemoryAnalysisStream, generateConsensusRecoveryStream } from './services/gemini';
import MessageItem from './components/MessageItem';
import SystemVisualizer from './components/SystemVisualizer';
import CommandPalette, { CommandOption } from './components/CommandPalette';
import DataStreamBackground from './components/DataStreamBackground';
import LoginPage from './components/LoginPage';
import VoiceInput from './components/VoiceInput';
import { extractPdfText } from './services/pdf';
import { memoryStore } from './services/vectorDb';
import { Send, Activity, Terminal, Command, Menu, ArrowDown, Paperclip, ImageIcon, Trash2, RefreshCw, Download, Lock, Network } from 'lucide-react';
import { neuroSymbolicCore } from './cores/neuro-symbolic/NeuroSymbolicCore';
import { LatticeNode, LatticeEdge } from './cores/neuro-symbolic/types';
import { topologicalMemory } from './cores/memory/TopologicalMemory';
import { personaSimulator } from './cores/simulation/PersonaSimulator';
import { Users } from 'lucide-react';

export default function App() {
  // Authentication State
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('ZYNC_AUTH_STATE') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('ZYNC_AUTH_STATE', String(isAuthenticated));
  }, [isAuthenticated]);
  const [isSystemGlitching, setIsSystemGlitching] = useState(false);

  const [input, setInput] = useState('');
  // Image state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [attachmentType, setAttachmentType] = useState<'image' | 'text' | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Command Palette State
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Voice Input State
  const [isListening, setIsListening] = useState(false);

  // Neuro-Symbolic State
  const [neuroTrace, setNeuroTrace] = useState<string | null>(null);
  const [activeLattice, setActiveLattice] = useState<{ nodes: LatticeNode[], edges: LatticeEdge[] }>({ nodes: [], edges: [] });

  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('ZYNC_CHAT_HISTORY');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }
    return [
      {
        id: 'init-1',
        role: AIRole.REFLEX,
        text: 'Zync Reflex Core Online. Rapid data streams active.',
        timestamp: Date.now(),
        metrics: { latency: 12, tokens: 45, confidence: 99 }
      },
      {
        id: 'init-2',
        role: AIRole.MEMORY,
        text: 'Zync Memory Core Synchronized. Cognitive Core Upgrade: Contextual Synthesis Active. Developmental Process Framework loaded.',
        timestamp: Date.now(),
        metrics: { latency: 45, tokens: 120, confidence: 98 }
      }
    ];
  });

  // Persistence Effect
  useEffect(() => {
    localStorage.setItem('ZYNC_CHAT_HISTORY', JSON.stringify(messages));
  }, [messages]);

  // State for System Visualizer & Layout
  const [isReflexActive, setIsReflexActive] = useState(false);
  const [isMemoryActive, setIsMemoryActive] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  
  // Initial State with larger buffer for Node Topology
  const [systemStats, setSystemStats] = useState<SystemStats>({
    reflexLatency: Array(20).fill(20),
    memoryDepth: Array(20).fill(10), // Increased buffer size for visualization
    syncRate: 100,
    activeMemoryNodes: 128,
    lastReflexTokens: 0,
    lastMemoryTokens: 0,
    reflexConfidence: 98,
    memoryConfidence: 99,
    neuroConfidence: 95,
    currentTask: 'SYSTEM_IDLE'
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Intelligent Auto-Scroll
  useEffect(() => {
    // Only auto-scroll if the user was already at the bottom before the new message arrived
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, isAtBottom]);

  // Focus input on mount and after sending
  useEffect(() => {
    if (isAuthenticated && !mobileMenuOpen && !isPaletteOpen && !isListening) {
      inputRef.current?.focus();
    }
  }, [isAuthenticated, messages, mobileMenuOpen, isPaletteOpen, isListening]);

  // Scroll detection
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceToBottom = scrollHeight - scrollTop - clientHeight;
      
      // Determine if user is effectively at the bottom (tolerance of 50px)
      const atBottom = distanceToBottom < 50;
      setIsAtBottom(atBottom);

      // Show button if user is more than 200px from bottom
      setShowScrollButton(distanceToBottom > 200);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isAuthenticated]);

  // Keyboard shortcut for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Simulate background telemetry updates with Context-Aware Logic
  useEffect(() => {
    // Throttle updates when idle to save resources (Implementation Note: Load Optimization)
    const intervalTime = isReflexActive || isMemoryActive ? 100 : 1000;

    const interval = setInterval(() => {
      // LOW POWER MODE: If tab is hidden, pause expensive re-renders for "Human-grade" battery consideration
      if (document.hidden) return;

      setSystemStats(prev => {
        const isIdle = prev.currentTask === 'SYSTEM_IDLE';
        
        // 1. Calculate Target Memory Depth based on specific Task Phases
        let targetDepth = 10; // Base idle level
        
        if (prev.currentTask.includes('DATA_INGESTION')) targetDepth = 35;
        else if (prev.currentTask.includes('DEFINING_PURPOSE')) targetDepth = 50;
        else if (prev.currentTask.includes('DATA_ANALYSIS')) targetDepth = 75;
        else if (prev.currentTask.includes('TEMPORAL_VECTOR_GRAPHING')) targetDepth = 90;
        else if (prev.currentTask.includes('STATE_COMMUNICATION')) targetDepth = 95;
        else if (prev.currentTask.includes('SENTIMENT_STATE_TRACKING')) targetDepth = 95;
        else if (prev.currentTask.includes('VALIDATION')) targetDepth = 85;
        else if (prev.currentTask.includes('CONTEXTUAL_SYNTHESIS')) targetDepth = 98;
        else if (prev.currentTask.includes('DEPLOYMENT_OPTIMIZATION')) targetDepth = 70;
        else if (prev.currentTask.includes('MEMORY_WRITE')) targetDepth = 60;
        else if (prev.currentTask === 'SYSTEM_IDLE') targetDepth = 15; 
        else if (prev.currentTask === 'CRITICAL_FAULT_DETECTED') targetDepth = 5; 

        const currentLastDepth = prev.memoryDepth[prev.memoryDepth.length - 1];
        let newDepthVal = currentLastDepth;

        // Improved Logic: Fast surge when active, exponential decay when idle
        if (isIdle) {
           // Exponential decay towards base
           newDepthVal = Math.max(10, currentLastDepth * 0.9); 
        } else {
           // Responsive Lerp for active tasks
           const lerpFactor = targetDepth > currentLastDepth ? 0.3 : 0.15;
           newDepthVal = currentLastDepth + (targetDepth - currentLastDepth) * lerpFactor;
        }
        
        // Add subtle noise for realism
        const jitter = Math.random() * 3 - 1.5;
        const noisyDepth = Math.max(5, Math.min(100, newDepthVal + jitter));

        const newDepthArray = [...prev.memoryDepth.slice(1), noisyDepth];
        
        // 2. Reflex Latency Logic
        const targetLatency = isReflexActive ? 45 : 15;
        const currentReflexLat = prev.reflexLatency[prev.reflexLatency.length - 1];
        const newReflexLatency = currentReflexLat + (targetLatency - currentReflexLat) * 0.2 + (Math.random() * 6 - 3);

        // 3. Sync Rate Calculation
        const loadVariance = Math.abs(noisyDepth - newReflexLatency);
        let targetSync = 100 - (loadVariance * 0.12);
        if (prev.currentTask === 'CRITICAL_FAULT_DETECTED') targetSync = 45; 

        const newSyncRate = Math.min(100, Math.max(10, targetSync + (Math.random() * 1.5)));

        // 4. Active Nodes
        const targetNodes = isMemoryActive ? 1024 : 128;
        const newNodes = Math.floor(prev.activeMemoryNodes + (targetNodes - prev.activeMemoryNodes) * 0.15);

        return {
          ...prev,
          reflexLatency: [...prev.reflexLatency.slice(1), Math.max(0, newReflexLatency)],
          memoryDepth: newDepthArray,
          syncRate: newSyncRate,
          activeMemoryNodes: newNodes,
        };
      });
    }, intervalTime); 
    return () => clearInterval(interval);
  }, [isReflexActive, isMemoryActive, systemStats.currentTask]);

  // Shared File Processing Logic
  const processFile = (file: File) => {
    setUploadError(null);
    
    const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    const textTypes = ['text/plain', 'text/markdown', 'application/json', 'text/csv', 'text/javascript', 'text/typescript'];
    
    // Check for image
    if (imageTypes.includes(file.type)) {
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('Image size exceeds 5MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setSelectedImage(reader.result);
          setAttachmentType('image');
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    // Check for PDF
    if (file.type === 'application/pdf') {
        if (file.size > 10 * 1024 * 1024) { // 10MB limit for PDF
            setUploadError('PDF size exceeds 10MB limit.');
            return;
        }
        extractPdfText(file).then(text => {
            setSelectedImage(text); // Reuse state for content
            setAttachmentType('text');
        }).catch(err => {
            setUploadError('Failed to parse PDF.');
            console.error(err);
        });
        return;
    }

    // Check for text (allow common code extensions even if mime type is missing/generic)
    const isCodeFile = /\.(txt|md|json|csv|js|ts|tsx|jsx|py|html|css)$/i.test(file.name);
    
    if (textTypes.includes(file.type) || isCodeFile) {
      if (file.size > 1 * 1024 * 1024) { // 1MB limit for text
        setUploadError('Text file exceeds 1MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setSelectedImage(reader.result); // We reuse this state for content
          setAttachmentType('text');
        }
      };
      reader.readAsText(file);
      return;
    }

    setUploadError('Invalid file type. Supported: Images, Code, Text.');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          processFile(file);
          e.preventDefault(); // Prevent pasting the image binary string into text input
          return; // Process one image at a time
        }
      }
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setAttachmentType(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Voice Input Handler
  const handleVoiceTranscript = (text: string) => {
      setInput(text);
      // Optional: Auto-send on voice end? 
      // For now, we just populate the field to let user review "NLU" input before firing.
  };

  // Command Actions
  const handleClearChat = () => {
    setMessages([
      {
        id: `init-reset-${Date.now()}`,
        role: AIRole.REFLEX,
        text: 'System reset complete. Message buffer cleared.',
        timestamp: Date.now(),
        metrics: { latency: 5, tokens: 10, confidence: 100 }
      }
    ]);
    // Optional: Clear vector memory too?
    // memoryStore.clear(); 
  };

  const handleResetSystem = () => {
    setMessages([
      {
        id: 'init-1',
        role: AIRole.REFLEX,
        text: 'Zync Reflex Core Online. Rapid data streams active.',
        timestamp: Date.now(),
        metrics: { latency: 12, tokens: 45, confidence: 99 }
      },
      {
        id: 'init-2',
        role: AIRole.MEMORY,
        text: 'Zync Memory Core Synchronized. Cognitive Core Upgrade: Contextual Synthesis Active. Developmental Process Framework loaded.',
        timestamp: Date.now(),
        metrics: { latency: 45, tokens: 120, confidence: 98 }
      }
    ]);
    setSystemStats({
      reflexLatency: Array(20).fill(20),
      memoryDepth: Array(20).fill(10),
      syncRate: 100,
      activeMemoryNodes: 128,
      lastReflexTokens: 0,
      lastMemoryTokens: 0,
      reflexConfidence: 98,
      memoryConfidence: 99,
      neuroConfidence: 95,
      currentTask: 'SYSTEM_IDLE'
    });
  };

  const handleExportLogs = () => {
    const logContent = messages.map(m => 
      `[${new Date(m.timestamp).toISOString()}] [${m.role}]: ${m.text}${m.attachment ? ' [Image Attached]' : ''}`
    ).join('\n\n');
    
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zync_logs_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('ZYNC_AUTH_STATE');
  };

  const handleSimulatePersonas = async () => {
    // Find last user message
    const lastUserMsg = [...messages].reverse().find(m => m.role === AIRole.USER);
    if (!lastUserMsg) return;

    const query = lastUserMsg.text;
    const personas = personaSimulator.getPersonas();

    setMobileMenuOpen(false);
    setIsPaletteOpen(false);

    // Announce Simulation
    setMessages(prev => [...prev, {
        id: `sim-start-${Date.now()}`,
        role: AIRole.NEURO,
        text: `**Initiating Counterfactual Persona Simulation**\nQuery: "${query}"\nRunning ${personas.length} concurrent simulation threads...`,
        timestamp: Date.now(),
        metrics: { latency: 10, tokens: 15, confidence: 100 }
    }]);

    // Run simulations sequentially for visual clarity (could be parallel)
    for (const persona of personas) {
        const msgId = `sim-${persona.id}-${Date.now()}`;
        setMessages(prev => [...prev, {
            id: msgId,
            role: AIRole.REFLEX, // Use Reflex role for the output but styled differently via text
            text: `**[Persona: ${persona.name}]**\nInitializing...`,
            timestamp: Date.now(),
            metrics: { latency: 0, tokens: 0, confidence: 0 }
        }]);

        const stream = generateReflexResponseStream(query, messages, null, null, persona.systemPrompt);
        let fullText = `**[Persona: ${persona.name}]**\n`;
        
        for await (const update of stream) {
            setMessages(prev => prev.map(m => m.id === msgId ? {
                ...m,
                text: `**[Persona: ${persona.name}]**\n${update.fullText}`,
                metrics: { ...m.metrics, tokens: update.tokens, latency: 50 }
            } : m));
        }
    }
  };

  const commands: CommandOption[] = [
    {
      id: 'upload-image',
      label: 'Upload Image',
      description: 'Attach an image file to the chat context',
      icon: <ImageIcon size={18} />,
      action: () => fileInputRef.current?.click()
    },
    {
      id: 'clear-chat',
      label: 'Clear Session',
      description: 'Reset the conversation history',
      icon: <Trash2 size={18} />,
      action: handleClearChat
    },
    {
      id: 'system-reset',
      label: 'Reboot Core System',
      description: 'Fully re-initialize system stats and chat',
      icon: <RefreshCw size={18} />,
      action: handleResetSystem
    },
    {
      id: 'export-logs',
      label: 'Download Telemetry Logs',
      description: 'Export current session as text file',
      icon: <Download size={18} />,
      action: handleExportLogs
    },
    {
      id: 'simulate-personas',
      label: 'Simulate Personas',
      description: 'Run counterfactual analysis on last query',
      icon: <Users size={18} />,
      action: handleSimulatePersonas
    },
    {
      id: 'status-report',
      label: 'System Status',
      description: 'View current operational status',
      icon: <Activity size={18} />,
      action: () => setMobileMenuOpen(true) 
    },
    {
      id: 'logout',
      label: 'Terminate Session',
      description: 'Logout and return to secure gateway',
      icon: <Lock size={18} />, // Using Lock icon imported from lucide-react
      action: handleLogout
    }
  ];

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() && !selectedImage) return;

    const userText = input;
    const userImage = selectedImage;
    const userAttachmentType = attachmentType;
    
    setInput('');
    clearImage();
    // Force scroll to bottom on send
    setIsAtBottom(true);
    
    // 1. Add User Message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: AIRole.USER,
      text: userText,
      attachment: userImage || undefined,
      attachmentType: userAttachmentType || undefined,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      // --- NEURO-SYMBOLIC CORE PHASE ---
      // 0. Neuro-Symbolic Reasoning (Pre-computation)
      const reasoning = neuroSymbolicCore.reason(userText);
      setNeuroTrace(reasoning.reasoningTrace);
      setSystemStats(prev => ({ ...prev, neuroConfidence: reasoning.confidence * 100 }));
      setActiveLattice({ nodes: reasoning.graph.nodes, edges: reasoning.graph.edges });
      
      // Visualizing the "Glass Box" - showing the logic lattice activation
      if (reasoning.confidence > 0.6) {
          setMessages(prev => [...prev, {
              id: `neuro-${Date.now()}`,
              role: AIRole.NEURO,
              text: `**Neuro-Symbolic Lattice Activated**\n${reasoning.reasoningTrace}`,
              timestamp: Date.now(),
              metrics: { latency: 15, tokens: 25, confidence: reasoning.confidence * 100 }
          }]);
      }

      // --- REFLEX CORE PHASE ---
      setIsReflexActive(true);
      setSystemStats(prev => ({ ...prev, currentTask: 'DATA_INGESTION' }));
      const reflexStartTime = Date.now();

      // --- MEMORY RETRIEVAL (RAG) ---
      // Search for relevant past context before generating response
      const relevantMemories = await memoryStore.search(userText);
      const memoryContext = relevantMemories.map(m => `[Past Memory]: ${m.content}`).join('\n');
      
      // Inject memory context into history for the AI to see
      // We don't display this to the user, but we pass it to the generator
      const augmentedHistory = [...messages];
      if (memoryContext) {
          augmentedHistory.push({
              id: 'memory-context',
              role: AIRole.MEMORY,
              text: `Relevant Context from Long-Term Memory:\n${memoryContext}`,
              timestamp: Date.now()
          });
      }

      // Create placeholder for Reflex message
      const reflexMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: reflexMsgId,
        role: AIRole.REFLEX,
        text: '',
        timestamp: Date.now(),
        metrics: { latency: 0, tokens: 0, confidence: 85 }
      }]);

      let reflexFullResponse = "";
      let finalReflexTokens = 0;
      
      // Stream Reflex Response
      const reflexStream = generateReflexResponseStream(userText, augmentedHistory, userImage, userAttachmentType);
      
      for await (const update of reflexStream) {
        reflexFullResponse = update.fullText;
        
        const estimatedTokens = Math.ceil(update.fullText.length / 3);
        finalReflexTokens = update.tokens && update.tokens > 0 ? update.tokens : estimatedTokens;

        setMessages(prev => prev.map(msg => 
          msg.id === reflexMsgId 
            ? { 
                ...msg, 
                text: update.fullText,
                sources: update.sources,
                metrics: { 
                  ...msg.metrics, 
                  tokens: finalReflexTokens,
                  latency: Date.now() - reflexStartTime
                } 
              }
            : msg
        ));
        
        setSystemStats(prev => ({ 
            ...prev, 
            lastReflexTokens: finalReflexTokens,
            reflexConfidence: Math.min(99, 70 + (update.fullText.length / 10)) 
        }));
      }

      const reflexEndTime = Date.now();
      setIsReflexActive(false);

      // --- MEMORY CORE PHASE ---
      setIsMemoryActive(true);
      
      const memoryMsgId = (Date.now() + 2).toString();
      setMessages(prev => [...prev, {
        id: memoryMsgId,
        role: AIRole.MEMORY,
        text: '', 
        timestamp: Date.now(),
        metrics: { latency: 0, tokens: 0, confidence: 90 }
      }]);

      const tasks = [
        'DEFINING_PURPOSE', 
        'DATA_ANALYSIS', 
        'TEMPORAL_VECTOR_GRAPHING', 
        'STATE_COMMUNICATION_PROTOCOL', 
        'SENTIMENT_STATE_TRACKING', 
        'VALIDATION_PROTOCOLS', 
        'CONTEXTUAL_SYNTHESIS',
        'DEPLOYMENT_OPTIMIZATION',
        'MEMORY_WRITE'
      ];
      
      let taskIndex = 0;
      const taskInterval = setInterval(() => {
        if (taskIndex < tasks.length - 1) {
          setSystemStats(prev => ({ ...prev, currentTask: tasks[taskIndex] }));
          taskIndex++;
        }
      }, 1500);

      let memoryFullResponse = "";
      let finalMemoryTokens = 0;
      const memoryStartTime = Date.now();

      const memoryStream = generateMemoryAnalysisStream(userText, reflexFullResponse, augmentedHistory, userImage, userAttachmentType);

      for await (const update of memoryStream) {
        memoryFullResponse = update.fullText;

        const estimatedTokens = Math.ceil(update.fullText.length / 3);
        finalMemoryTokens = update.tokens && update.tokens > 0 ? update.tokens : estimatedTokens;
        
        setMessages(prev => prev.map(msg => 
          msg.id === memoryMsgId 
            ? { 
                ...msg, 
                text: update.fullText, 
                relatedFacts: update.facts,
                metrics: {
                  ...msg.metrics,
                  tokens: finalMemoryTokens,
                  latency: Date.now() - memoryStartTime
                }
              }
            : msg
        ));
        
         setSystemStats(prev => ({ 
            ...prev, 
            lastMemoryTokens: finalMemoryTokens,
            memoryConfidence: Math.min(99, 85 + (update.fullText.length / 50)) 
         }));
      }
      
      // --- MEMORY STORAGE ---
      // Store the interaction in vector memory
      if (userText.length > 10) {
          await memoryStore.add(`User: ${userText}\nAI: ${reflexFullResponse}`);
          
          // Topological Memory Persistence
          const memId = topologicalMemory.addMemory(userText, undefined, 1.0);
          topologicalMemory.addMemory(reflexFullResponse, memId, systemStats.reflexConfidence / 100);
      }
      
      clearInterval(taskInterval);
      setSystemStats(prev => ({ ...prev, currentTask: 'DEPLOYMENT_COMPLETE' }));
      setIsMemoryActive(false);

      setTimeout(() => {
        setSystemStats(prev => ({ ...prev, currentTask: 'SYSTEM_IDLE' }));
      }, 2000);

    } catch (error) {
      console.error("Processing Error, engaging Consensus Protocol:", error);
      setIsReflexActive(false);
      setIsMemoryActive(false);
      
      setSystemStats(prev => ({ ...prev, currentTask: 'CRITICAL_FAULT_DETECTED' }));
      await new Promise(resolve => setTimeout(resolve, 1500));

      setSystemStats(prev => ({ ...prev, currentTask: 'PROTOCOL_FAILURE_RECOVERY' }));

      const consensusMsgId = (Date.now() + 3).toString();
      setMessages(prev => [...prev, {
        id: consensusMsgId,
        role: AIRole.CONSENSUS,
        text: 'Primary cores unstable. Initiating Consensus Recovery Protocol...',
        timestamp: Date.now(),
        metrics: { latency: 0, tokens: 0 }
      }]);
      
      try {
        const consensusStream = generateConsensusRecoveryStream(userText);
        
        for await (const update of consensusStream) {
             setMessages(prev => prev.map(msg => 
              msg.id === consensusMsgId
                ? { 
                    ...msg, 
                    text: update.fullText,
                    metrics: {
                        ...msg.metrics,
                        tokens: update.tokens,
                        latency: update.latency
                    }
                  }
                : msg
            ));
        }
      } catch (recoveryError) {
         setMessages(prev => prev.map(msg => 
            msg.id === consensusMsgId ? { ...msg, text: "System Critical: Automatic recovery failed." } : msg
         ));
      }

      setSystemStats(prev => ({ ...prev, currentTask: 'RECOVERY_COMPLETE' }));
      setTimeout(() => {
        setSystemStats(prev => ({ ...prev, currentTask: 'SYSTEM_IDLE' }));
      }, 3000);
    }
  };

  // --- RENDER LOGIC ---
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#050a15] to-slate-900 animate-aurora z-0"></div>
        <DataStreamBackground variant="centered" isGlitching={isSystemGlitching} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.5),rgba(2,6,23,0.8)),url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 pointer-events-none z-0 mix-blend-overlay"></div>
        
        <LoginPage 
            onLogin={() => setIsAuthenticated(true)} 
            onGlitch={(isGlitching) => setIsSystemGlitching(isGlitching)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden relative selection:bg-cyan-500/30 selection:text-cyan-50">
      
      {/* App Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#050a15] to-slate-900 animate-aurora z-0"></div>
      <DataStreamBackground variant="sidebar" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.5),rgba(2,6,23,0.8)),url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 pointer-events-none z-0 mix-blend-overlay"></div>
      
      <CommandPalette 
        isOpen={isPaletteOpen} 
        onClose={() => setIsPaletteOpen(false)} 
        commands={commands}
      />

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-[45] bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-slate-950/95 backdrop-blur-2xl border-r border-slate-800/50 transform transition-transform duration-300 ease-in-out shadow-2xl
        md:relative md:translate-x-0 md:w-80 md:bg-slate-950/50 md:backdrop-blur-xl md:shadow-[10px_0_30px_-10px_rgba(0,0,0,0.5)]
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <SystemVisualizer 
          stats={systemStats} 
          isReflexActive={isReflexActive}
          isMemoryActive={isMemoryActive}
          onClose={() => setMobileMenuOpen(false)}
          lattice={activeLattice}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative z-10 w-full">
        
        <header className="h-16 md:h-16 border-b border-slate-800/30 bg-slate-950/30 backdrop-blur-md flex items-center justify-between px-4 md:px-8 sticky top-0 z-40 transition-all">
          <div className="flex items-center gap-4">
            <button 
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 -ml-2 text-slate-400 hover:text-cyan-400 transition-colors"
            >
                <Menu size={24} />
            </button>

             <div className="relative">
                <div className={`absolute inset-0 rounded-full blur-md transition-colors duration-500 ${isMemoryActive ? 'bg-fuchsia-500/50' : isReflexActive ? 'bg-cyan-500/50' : 'bg-cyan-500/20'}`}></div>
                <div className={`w-3 h-3 rounded-full shadow-inner relative z-10 transition-colors duration-300 ${isMemoryActive ? 'bg-fuchsia-400' : isReflexActive ? 'bg-cyan-400' : 'bg-cyan-600'}`}></div>
             </div>
            <div>
              <h1 className="font-mono font-bold text-xl md:text-2xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400">ZYNC<span className="text-cyan-500">_</span>OS</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4 md:gap-6">
             <div className="group flex flex-col items-end cursor-default hidden md:flex">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 group-hover:text-cyan-400 transition-colors">
                   <Activity size={14} />
                   <span>SYNC_RATE</span>
                </div>
                <span className="text-lg font-bold font-mono text-slate-200 tabular-nums">{systemStats.syncRate.toFixed(1)}%</span>
             </div>
             
             <div className="w-px h-6 md:h-8 bg-slate-800 hidden md:block"></div>
             
             <div className="group flex flex-col items-end cursor-default">
                <div className="flex items-center gap-2 text-[10px] md:text-xs font-mono text-slate-400 group-hover:text-emerald-400 transition-colors">
                   <Terminal size={14} className="hidden sm:block" />
                   <span className="hidden sm:inline">STATUS</span>
                </div>
                <span className="text-xs md:text-lg font-bold font-mono text-emerald-500 flex items-center gap-2">
                    ONLINE <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
                </span>
             </div>
          </div>
        </header>

        {/* Messages List */}
        <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth z-0 relative scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
        >
            <div className="fixed top-16 md:top-16 left-0 md:left-80 right-0 h-6 bg-gradient-to-b from-slate-950/80 to-transparent pointer-events-none z-10"></div>

            <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 pb-4">
                {messages.map((msg) => (
                <MessageItem key={msg.id} message={msg} />
                ))}
                <div ref={messagesEndRef} />
            </div>
            
            {showScrollButton && (
                <button 
                    onClick={scrollToBottom}
                    className="fixed bottom-24 md:bottom-32 right-4 md:right-8 p-3 rounded-full bg-slate-800/80 border border-slate-700 text-cyan-400 shadow-lg backdrop-blur hover:bg-slate-700 transition-all z-30 animate-bounce"
                >
                    <ArrowDown size={20} />
                </button>
            )}
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-8 z-40 relative">
          <div className="max-w-4xl mx-auto relative">
            {/* Glassmorphism container for input */}
            <div className={`absolute inset-0 bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl -z-10 transition-all duration-700 ${!isReflexActive && !isMemoryActive && !isListening ? 'animate-breathing-glow' : ''}`}></div>
            
            <form onSubmit={handleSendMessage} className="relative group p-2">
                
                {selectedImage && (
                  <div className="absolute bottom-full left-2 mb-2 p-2 bg-slate-900/90 border border-slate-700 rounded-lg backdrop-blur-md flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                    <div className="h-12 w-12 rounded overflow-hidden bg-black border border-slate-800 relative flex items-center justify-center">
                      {attachmentType === 'image' ? (
                        <img src={selectedImage} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <div className="text-[8px] font-mono text-slate-400 p-1 overflow-hidden break-all leading-tight">
                            {selectedImage?.slice(0, 40)}...
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[10px] font-mono text-cyan-400 uppercase">{attachmentType === 'image' ? 'Image Attached' : 'File Attached'}</span>
                       <button 
                         type="button"
                         onClick={clearImage} 
                         className="text-[10px] text-red-400 hover:text-red-300 underline text-left"
                       >
                         Remove
                       </button>
                    </div>
                  </div>
                )}

                {uploadError && (
                   <div className="absolute bottom-full right-2 mb-2 px-3 py-1 bg-red-500/10 border border-red-500/50 rounded text-[10px] text-red-400 font-mono">
                      {uploadError}
                   </div>
                )}

                {/* Hidden File Input */}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/webp, image/heic, .txt, .md, .json, .csv, .js, .ts, .tsx, .pdf"
                  className="hidden"
                />

                <div className="absolute inset-y-0 left-3 md:left-5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPaletteOpen(true)}
                      className="p-1.5 rounded-md transition-colors hover:bg-slate-800 text-slate-500 hover:text-cyan-400 group/cmd"
                      title="Command Palette (Ctrl+K)"
                    >
                      <Command size={18} className="group-hover/cmd:scale-110 transition-transform" />
                    </button>

                    <div className="w-px h-4 bg-slate-700/50"></div>
                    
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isReflexActive || isMemoryActive}
                      className={`p-1.5 rounded-md transition-colors ${selectedImage ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-slate-800 text-slate-500 hover:text-slate-300'}`}
                      title="Attach Image"
                    >
                       <Paperclip size={18} />
                    </button>

                    {/* --- VOICE INPUT --- */}
                    <VoiceInput 
                        onTranscript={handleVoiceTranscript} 
                        onStateChange={setIsListening}
                        disabled={isReflexActive || isMemoryActive}
                    />
                </div>

              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={handlePaste}
                disabled={isReflexActive || isMemoryActive || isListening}
                placeholder={isListening ? "" : (isReflexActive || isMemoryActive ? "Processing Neural Streams..." : "Input command (Voice/Image supported)...")}
                className="w-full bg-transparent border-none py-3 md:py-4 pl-32 md:pl-40 pr-12 md:pr-16 
                          text-slate-100 placeholder-slate-500 focus:ring-0
                          transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono text-base md:text-sm"
              />
              <button 
                type="submit"
                disabled={(!input.trim() && !selectedImage) || isReflexActive || isMemoryActive || isListening}
                className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-slate-800 text-slate-400 
                          hover:bg-cyan-500 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-800 disabled:hover:text-slate-400
                          transition-all duration-200 shadow-lg"
              >
                <Send size={18} />
              </button>
            </form>
            
            <div className="absolute -bottom-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
          </div>
          
          <div className="mt-2 md:mt-3 flex justify-center gap-4 md:gap-8 text-[9px] md:text-[10px] text-slate-500 font-mono uppercase tracking-widest opacity-70">
              <span className={`flex items-center gap-2 transition-colors duration-300 ${isReflexActive ? 'text-cyan-400' : ''}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isReflexActive ? 'bg-cyan-400 animate-pulse' : 'bg-slate-700'}`}></span>
                  Reflex
              </span>
              <span className={`flex items-center gap-2 transition-colors duration-300 ${isMemoryActive ? 'text-fuchsia-400' : ''}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isMemoryActive ? 'bg-fuchsia-400 animate-pulse' : 'bg-slate-700'}`}></span>
                  Memory
              </span>
          </div>
        </div>

      </div>
    </div>
  );
}