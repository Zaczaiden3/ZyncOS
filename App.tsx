import React, { useState, useEffect, useRef, Suspense } from 'react';
import { AIRole, Message, SystemStats } from './types';
import { generateReflexResponseStream, generateMemoryAnalysisStream, generateConsensusRecoveryStream } from './services/gemini';
import MessageItem from './components/MessageItem';
import CommandPalette, { CommandOption } from './components/CommandPalette';
import DataStreamBackground from './components/DataStreamBackground';
import VoiceInput from './components/VoiceInput';
import { extractPdfText } from './services/pdf';
import { memoryStore } from './services/vectorDb';
import { Send, Activity, Terminal, Command, Menu, ArrowDown, Paperclip, ImageIcon, Trash2, RefreshCw, Download, Lock, Network, Users, Plus, FileJson, Layers } from 'lucide-react';
import { neuroSymbolicCore } from './cores/neuro-symbolic/NeuroSymbolicCore';
import { LatticeNode, LatticeEdge } from './cores/neuro-symbolic/types';
import { topologicalMemory } from './cores/memory/TopologicalMemory';
import { personaSimulator } from './cores/simulation/PersonaSimulator';
import { sessionManager, ChatSession } from './services/sessionManager';
import { subscribeToAuthChanges, logoutUser } from './services/auth';

// Lazy Load Heavy Components for Performance Optimization
const SystemVisualizer = React.lazy(() => import('./components/SystemVisualizer'));
const LoginPage = React.lazy(() => import('./components/LoginPage'));

// Loading Fallback Component
const CoreLoader = () => (
  <div className="flex items-center justify-center h-full w-full text-cyan-500 font-mono text-xs animate-pulse">
    [INITIALIZING_MODULE...]
  </div>
);

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('ZYNC_AUTH_STATE') === 'true';
  });

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((user) => {
      const isAuth = !!user;
      setIsAuthenticated(isAuth);
      localStorage.setItem('ZYNC_AUTH_STATE', String(isAuth));
    });
    return () => unsubscribe();
  }, []);
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

  // Session State
  const [currentSession, setCurrentSession] = useState<ChatSession>(() => sessionManager.getActiveSession());
  const [sessions, setSessions] = useState<ChatSession[]>(() => sessionManager.getSessions());
  
  // Sync messages with current session
  const [messages, setMessages] = useState<Message[]>(currentSession.messages);

  // Update session when messages change
  useEffect(() => {
    sessionManager.saveSessionMessages(currentSession.id, messages);
    // Update local session state to reflect changes (avoid full re-render of sessions list if possible, but keeping it simple)
    setCurrentSession(prev => ({ ...prev, messages }));
  }, [messages, currentSession.id]);

  // Refresh sessions list when palette opens (to ensure we have latest if modified elsewhere)
  useEffect(() => {
    if (isPaletteOpen) {
      setSessions(sessionManager.getSessions());
    }
  }, [isPaletteOpen]);

  const handleSwitchSession = (sessionId: string) => {
    const session = sessionManager.getSession(sessionId);
    if (session) {
      sessionManager.setActiveSession(sessionId);
      setCurrentSession(session);
      setMessages(session.messages);
      setSessions(sessionManager.getSessions());
      
      // Add system message to indicate switch
      setMessages(prev => [...prev, {
          id: `sys-switch-${Date.now()}`,
          role: AIRole.REFLEX,
          text: `**Session Switched**\nActive Session: ${session.name}`,
          timestamp: Date.now(),
          metrics: { latency: 0, tokens: 0, confidence: 100 }
      }]);
    }
  };

  const handleNewSession = () => {
    const newSession = sessionManager.createSession();
    setCurrentSession(newSession);
    setMessages(newSession.messages);
    setSessions(sessionManager.getSessions());
  };

  const handleDeleteSession = (sessionId: string) => {
    sessionManager.deleteSession(sessionId);
    const active = sessionManager.getActiveSession();
    setCurrentSession(active);
    setMessages(active.messages);
    setSessions(sessionManager.getSessions());
  };

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
  };

  // Command Actions
  const handleClearChat = () => {
    setMessages([
      {
        id: `init-reset-${Date.now()}`,
        role: AIRole.REFLEX,
        text: 'System reset complete. Message buffer cleared.',
        timestamp: Date.now(),
```javascript
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
  };

  const handleNewSession = () => {
    const newSession = sessionManager.createSession();
    setCurrentSession(newSession);
    setMessages(newSession.messages);
    setSessions(sessionManager.getSessions());
    
    setMessages(prev => [...prev, {
        id: `sys-new-${Date.now()}`,
        role: AIRole.REFLEX,
        text: '**New Session Initialized**\nReady for input.',
        timestamp: Date.now(),
        metrics: { latency: 0, tokens: 0, confidence: 100 }
    }]);
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
    const jsonContent = sessionManager.exportSessionToJson(currentSession);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zync_session_${currentSession.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSimulatePersonas = async () => {
    const lastUserMsg = messages.slice().reverse().find(m => m.role === AIRole.USER);
    if (!lastUserMsg) return;

    const query = lastUserMsg.text;
    const personas = personaSimulator.getPersonas();

    setMobileMenuOpen(false);
    setIsPaletteOpen(false);

    setMessages(prev => [...prev, {
        id: `sim-start-${Date.now()}`,
        role: AIRole.NEURO,
        text: `**Initiating Counterfactual Persona Simulation**\nQuery: "${query}"\nRunning ${personas.length} concurrent simulation threads...`,
        timestamp: Date.now(),
        metrics: { latency: 10, tokens: 15, confidence: 100 }
    }]);

    for (const persona of personas) {
        const msgId = `sim-${persona.id}-${Date.now()}`;
        setMessages(prev => [...prev, {
            id: msgId,
            role: AIRole.REFLEX,
            text: `**[Persona: ${persona.name}]**\nInitializing...`,
            timestamp: Date.now(),
            metrics: { latency: 0, tokens: 0, confidence: 0 }
        }]);

        const stream = generateReflexResponseStream(query, messages, null, null, persona.systemPrompt);
        
        for await (const update of stream) {
            setMessages(prev => prev.map(m => m.id === msgId ? {
                ...m,
                text: `**[Persona: ${persona.name}]**\n${update.fullText}`,
                metrics: { ...m.metrics, tokens: update.tokens, latency: 50 }
            } : m));
        }
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setIsAuthenticated(false);
      setCurrentSession(sessionManager.createSession());
      setMessages([]);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const commands: CommandOption[] = [
    {
      id: 'new-session',
      label: 'New Session',
      description: 'Create a fresh chat session',
      icon: <Plus size={18} />,
      action: handleNewSession
    },
    ...sessions.filter(s => s.id !== currentSession.id).map(s => ({
        id: `switch-${s.id}`,
        label: `Switch to: ${s.name}`,
        description: `Last active: ${new Date(s.lastModified).toLocaleTimeString()}`,
        icon: <Layers size={18} />,
        action: () => handleSwitchSession(s.id)
    })),
    {
      id: 'upload-image',
      label: 'Upload Image',
      description: 'Attach an image file to the chat context',
      icon: <ImageIcon size={18} />,
      action: () => fileInputRef.current?.click()
    },
    {
      id: 'clear-chat',
      label: 'Clear Current Session',
      description: 'Reset the conversation history',
      icon: <Trash2 size={18} />,
      action: handleClearChat
    },
    {
      id: 'delete-session',
      label: 'Delete Current Session',
      description: 'Permanently remove this session',
      icon: <Trash2 size={18} className="text-red-400" />,
      action: () => {
          sessionManager.deleteSession(currentSession.id);
          const newSession = sessionManager.createSession();
          setCurrentSession(newSession);
          setMessages(newSession.messages);
          setSessions(sessionManager.getSessions());
      }
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
      label: 'Export Session (JSON)',
      description: 'Download current session data',
      icon: <FileJson size={18} />,
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
      icon: <Lock size={18} />,
      action: handleLogout
    }
  ];

  // Placeholder for next steps
  const handleSendMessage = async (e: React.FormEvent) => { e.preventDefault(); };
  return <div>Loading...</div>;
}
```