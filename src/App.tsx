import React, { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { SpeechProvider, useSpeechContext } from './contexts/SpeechContext';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import { Volume2, VolumeX, Send, Activity, Terminal, Command, Menu, ArrowDown, Paperclip, ImageIcon, Trash2, RefreshCw, Download, Lock, Network, Users, Plus, FileJson, Layers, Edit3, Settings, Moon, Sun, Code, FlaskConical } from 'lucide-react';
import { dreamService } from './services/dreamService';
import { AIRole, Message, SystemStats, WorkflowExecutionLog, Workflow } from './types';
import { getSettings } from './services/settings';
import { generateReflexResponseStream, generateMemoryAnalysisStream, generateConsensusRecoveryStream, generateConsensusDebateStream, getCoreConfig } from './services/gemini';
import { workflowEngine } from './services/workflowEngine';
import './services/tools'; // Register default tools
import MessageItem from './components/MessageItem';
import CommandPalette, { CommandOption } from './components/CommandPalette';
import WaveBackground from './components/WaveBackground';
import VoiceInput from './components/VoiceInput';
import LiveVoiceInterface from './components/LiveVoiceInterface';
import MuteToggle from './components/MuteToggle';
import CoreLoader from './components/CoreLoader';
import DreamOverlay from './components/DreamOverlay';

import { memoryStore } from './services/vectorDb';
import { neuroSymbolicCore } from './cores/neuro-symbolic/NeuroSymbolicCore';
import { LatticeNode, LatticeEdge } from './cores/neuro-symbolic/types';
import { topologicalMemory } from './cores/memory/TopologicalMemory';
import { personaSimulator } from './cores/simulation/PersonaSimulator';
import { sessionManager, ChatSession } from './services/sessionManager';
import { subscribeToAuthChanges, logoutUser } from './services/auth';
import { pluginManager } from './services/pluginManager';
import { SafetyUtils } from './utils/safety';
import ZyncLogo from './components/ZyncLogo';
// Lazy Load Heavy Components for Performance Optimization
const SystemVisualizer = React.lazy(() => import('./components/SystemVisualizer'));
const LoginPage = React.lazy(() => import('./components/LoginPage'));
const SettingsPanel = React.lazy(() => import('./components/SettingsPanel'));
const MemoryInspector = React.lazy(() => import('./components/MemoryInspector'));
const ToolCreator = React.lazy(() => import('./components/ToolCreator'));
const ExperimentLab = React.lazy(() => import('./components/ExperimentLab'));
const OnboardingTour = React.lazy(() => import('./components/OnboardingTour'));
const ExecutiveDashboard = React.lazy(() => import('./components/dashboards/ExecutiveDashboard'));



function App() {
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

  // Session Optimization on Startup
  useEffect(() => {
    sessionManager.optimizeSessions();
    setSessions(sessionManager.getSessions());
    const active = sessionManager.getActiveSession();
    setCurrentSession(active);
    setMessages(active.messages);
  }, []);

  // Settings & Role State
  const [appSettings, setAppSettings] = useState(() => getSettings());

  useEffect(() => {
    const handleSettingsChange = () => {
        setAppSettings(getSettings());
    };
    window.addEventListener('zync-settings-changed', handleSettingsChange);
    return () => window.removeEventListener('zync-settings-changed', handleSettingsChange);
  }, []);

  const [isSystemGlitching, setIsSystemGlitching] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isMemoryInspectorOpen, setIsMemoryInspectorOpen] = useState(false);
  const [isToolCreatorOpen, setIsToolCreatorOpen] = useState(false);
  const [isExperimentLabOpen, setIsExperimentLabOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // --- Initialization & Onboarding Check ---
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('zync_onboarding_complete');
    if (!hasSeenOnboarding) {
        setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem('zync_onboarding_complete', 'true');
    setShowOnboarding(false);
  };
  const [isDreaming, setIsDreaming] = useState(false);
  const [dreamStatus, setDreamStatus] = useState<string | null>(null);

  const handleDreamToggle = React.useCallback(() => {
    if (isDreaming) {
      dreamService.stopDreaming();
      setIsDreaming(false);
      setDreamStatus(null);
    } else {
      setIsDreaming(true);
      dreamService.startDreaming((status) => {
        setDreamStatus(status);
        if (status === "DREAM_COMPLETE") {
            setTimeout(() => {
                setIsDreaming(false);
                setDreamStatus(null);
            }, 2000);
        }
      });
    }
  }, [isDreaming]);

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
  const { speak, cancel: cancelTTS, isSpeaking: isTTSSpeaking, voices: ttsVoices } = useTextToSpeech();
  const { settings: voiceSettings, isMuted: isVoiceMuted } = useSpeechContext();
  const lastReadMessageId = useRef<string | null>(null);

  // Neuro-Symbolic State
  const [neuroTrace, setNeuroTrace] = useState<string | null>(null);
  const [activeLattice, setActiveLattice] = useState<{ nodes: LatticeNode[], edges: LatticeEdge[] }>({ nodes: [], edges: [] });

  // Workflow State
  const [workflowLogs, setWorkflowLogs] = useState<WorkflowExecutionLog[]>([]);

  // Subscribe to Workflow Engine Logs
  useEffect(() => {
    const unsubscribe = workflowEngine.subscribe((logs) => {
      setWorkflowLogs(logs);
    });
    return () => unsubscribe();
  }, []);

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

  const handleSwitchSession = React.useCallback((sessionId: string) => {
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
  }, []);

  const handleDeleteSession = React.useCallback((sessionId: string) => {
    sessionManager.deleteSession(sessionId);
    const active = sessionManager.getActiveSession();
    setCurrentSession(active);
    setMessages(active.messages);
    setSessions(sessionManager.getSessions());
  }, []);

  // State for System Visualizer & Layout
  const [isReflexActive, setIsReflexActive] = useState(false);
  const [isMemoryActive, setIsMemoryActive] = useState(false);
  const [isConsensusActive, setIsConsensusActive] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [offlineProgress, setOfflineProgress] = useState<string | null>(null);
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

  // Auto-Read Effect
  useEffect(() => {
    if (!voiceSettings.autoRead || isVoiceMuted) return;

    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role === AIRole.USER) return;

    // Only read if system is idle (generation complete) and we haven't read this message yet
    if (systemStats.currentTask === 'SYSTEM_IDLE' && lastMsg.id !== lastReadMessageId.current) {
        lastReadMessageId.current = lastMsg.id;
        
        const selectedVoice = ttsVoices.find(v => v.voiceURI === voiceSettings.voiceURI);
        
        speak(lastMsg.text, {
            voice: selectedVoice,
            rate: voiceSettings.rate,
            pitch: voiceSettings.pitch,
            volume: voiceSettings.volume
        });
    }
  }, [messages, systemStats.currentTask, voiceSettings, isVoiceMuted, speak, ttsVoices]);

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
        import('./services/pdf').then(({ extractPdfText }) => {
            extractPdfText(file).then(text => {
                setSelectedImage(text); // Reuse state for content
                setAttachmentType('text');
            }).catch(err => {
                setUploadError('Failed to parse PDF.');
                console.error(err);
            });
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
  const handleClearChat = React.useCallback(() => {
    setMessages([
      {
        id: `init-reset-${Date.now()}`,
        role: AIRole.REFLEX,
        text: 'System reset complete. Message buffer cleared.',
        timestamp: Date.now(),
        metrics: { latency: 5, tokens: 10, confidence: 100 }
      }
    ]);
  }, []);

  const handleNewSession = React.useCallback(() => {
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
  }, []);

  const handleResetSystem = React.useCallback(() => {
    setMessages([
      {
        id: 'init-1',
        role: AIRole.CONSENSUS,
        text: '# Welcome to Zync AI\n\nYour advanced AI workspace is ready.\n\n### Features Active:\n- **Reflex Core**: High-speed tactical response.\n- **Memory Core**: Deep contextual analysis & long-term recall.\n- **Neuro-Symbolic Lattice**: Graph-based reasoning engine.\n- **Agentic Workflows**: Autonomous multi-step task execution.\n\n*System is operating in Safe Mode (Gemini Fallback) for maximum reliability.*',
        timestamp: Date.now(),
        metrics: { latency: 12, tokens: 45, confidence: 100 }
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
  }, []);

  const handleExportLogs = React.useCallback(() => {
    const jsonContent = sessionManager.exportSessionToJson(currentSession);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zync_session_${currentSession.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [currentSession]);

  const handleSimulatePersonas = React.useCallback(async () => {
    const lastUserMsg = messages.slice().reverse().find(m => m.role === AIRole.USER);
    if (!lastUserMsg) return;

    const query = lastUserMsg.text;
    const personas = personaSimulator.getPersonas();

    setMobileMenuOpen(false);
    setIsPaletteOpen(false);

    // Neuro-Symbolic Analysis
    try {
        setSystemStats(prev => ({ ...prev, currentTask: 'NEURO_ANALYSIS' }));
        
        // Optimistic UI: Show we are thinking
        const simStartId = `sim-start-${Date.now()}`;
        setMessages(prev => [...prev, {
            id: simStartId,
            role: AIRole.NEURO,
            text: `**Neuro-Symbolic Lattice Activated (Zync_TNG: R1T Chimera)**\n*Reasoning in progress...*`,
            timestamp: Date.now(),
            metrics: { latency: 0, tokens: 0, confidence: 0 }
        }]);

        const reasoning = await neuroSymbolicCore.reason(query);
        setNeuroTrace(reasoning.reasoningTrace);
        setActiveLattice({ nodes: reasoning.graph.nodes, edges: reasoning.graph.edges });

        setMessages(prev => prev.map(m => m.id === simStartId ? {
            ...m,
            text: `**Neuro-Symbolic Lattice Activated (Zync_TNG: R1T Chimera)**\n${reasoning.reasoningTrace}\n\n**Counterfactual Simulation Protocol**\nQuery: "${query}"\nSpawning ${personas.length} divergent persona threads...`,
            metrics: { latency: 15, tokens: 30, confidence: reasoning.confidence * 100 }
        } : m));
    } catch (error) {
        console.error("Simulation Error:", error);
        return;
    }

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
  }, [messages]);

  const handleConsensusDebate = React.useCallback(async () => {
    const lastUserMsg = messages.slice().reverse().find(m => m.role === AIRole.USER);
    if (!lastUserMsg) return;

    const topic = lastUserMsg.text;
    setIsPaletteOpen(false);
    setMobileMenuOpen(false);
    setIsConsensusActive(true);

    const msgId = `consensus-${Date.now()}`;
    setMessages(prev => [...prev, {
        id: msgId,
        role: AIRole.CONSENSUS,
        text: `**Initiating Consensus Debate Protocol**\nTopic: "${topic}"\n\n*Synchronizing Reflex, Memory, and Neuro cores...*`,
        timestamp: Date.now(),
        metrics: { latency: 0, tokens: 0, confidence: 100 }
    }]);

    try {
        const stream = generateConsensusDebateStream(topic, messages);
        for await (const update of stream) {
            setMessages(prev => prev.map(m => m.id === msgId ? {
                ...m,
                text: update.fullText,
                metrics: { ...m.metrics, tokens: update.tokens, latency: update.latency || 0 }
            } : m));
        }
    } catch (error) {
        console.error("Consensus Debate Error:", error);
        setMessages(prev => prev.map(m => m.id === msgId ? {
            ...m,
            text: m.text + "\n\n**[SYSTEM ERROR]**: Debate protocol terminated unexpectedly."
        } : m));
    } finally {
        setIsConsensusActive(false);
    }
  }, [messages]);

  const handleLogout = React.useCallback(async () => {
    try {
      await logoutUser();
      setIsAuthenticated(false);
      setCurrentSession(sessionManager.createSession());
      setMessages([]);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, []);

  const handleTestWorkflow = React.useCallback(async () => {
    setIsPaletteOpen(false);
    setMobileMenuOpen(false);
    
    const testWorkflow: Workflow = {
      id: 'sys-check-1',
      name: 'System Diagnostics',
      description: 'Routine system health check workflow',
      steps: [
        { id: 'time-check', toolName: 'get_current_time' },
        { id: 'calc-load', toolName: 'calculator', argsTemplate: { expression: `${Math.floor(Math.random() * 100)} * 2` } },
        { id: 'sys-stat', toolName: 'get_system_status', dependsOn: ['time-check'] }
      ]
    };

    workflowEngine.registerWorkflow(testWorkflow);

    setMessages(prev => [...prev, {
        id: `wf-start-${Date.now()}`,
        role: AIRole.REFLEX,
        text: `**Initiating Workflow: ${testWorkflow.name}**\nExecuting ${testWorkflow.steps.length} steps...`,
        timestamp: Date.now(),
        metrics: { latency: 0, tokens: 0, confidence: 100 }
    }]);

    try {
        const results = await workflowEngine.executeWorkflow(testWorkflow.id, {});
        
        // Format results for display
        let resultText = `**Workflow Complete**\n`;
        results.forEach((val: any, stepId: string) => {
            resultText += `- **${stepId}**: \`${val}\`\n`;
        });

        setMessages(prev => [...prev, {
            id: `wf-end-${Date.now()}`,
            role: AIRole.REFLEX,
            text: resultText,
            timestamp: Date.now(),
            metrics: { latency: 100, tokens: 50, confidence: 100 }
        }]);

    } catch (e) {
        setMessages(prev => [...prev, {
            id: `wf-err-${Date.now()}`,
            role: AIRole.REFLEX,
            text: `**Workflow Failed**\nError: ${e}`,
            timestamp: Date.now(),
            metrics: { latency: 0, tokens: 0, confidence: 0 }
        }]);
    }
  }, []);



  const processUserMessage = React.useCallback(async (userText: string, userImage: string | null, userAttachmentType: 'image' | 'text' | null) => {
    
    // 1. Add User Message
    // Safety: Mask PII if enabled
    const safeText = appSettings.enablePIIMasking ? SafetyUtils.maskPII(userText) : userText;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: AIRole.USER,
      text: safeText,
      attachment: userImage || undefined,
      attachmentType: userAttachmentType || undefined,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);

    // --- OFFLINE MODE HANDLER ---
    if (isOfflineMode) {
      setSystemStats(prev => ({ ...prev, currentTask: 'OFFLINE_INFERENCE' }));
      
      const reflexMsgId = (Date.now() + 1).toString();
      
      try {
        const { initializeOfflineModel, isOfflineModelReady, generateOfflineResponseStream } = await import('./services/offlineAi');

        if (!isOfflineModelReady()) {
           setMessages(prev => [...prev, {
              id: `sys-offline-init-${Date.now()}`,
              role: AIRole.REFLEX,
              text: `**Initializing Offline Model**\nDownloading weights to browser cache... This may take a moment.`,
              timestamp: Date.now(),
              metrics: { latency: 0, tokens: 0, confidence: 100 }
           }]);
           
           await initializeOfflineModel((progress) => {
              setOfflineProgress(progress);
           });
           setOfflineProgress(null);
        }

        setMessages(prev => [...prev, {
            id: reflexMsgId,
            role: AIRole.REFLEX,
            text: '',
            timestamp: Date.now(),
            metrics: { latency: 0, tokens: 0, confidence: 100 }
        }]);

        const startTime = Date.now();
        const stream = generateOfflineResponseStream(userText, messages);
        
        let accumulatedText = '';
        let totalTokens = 0;

        for await (const update of stream) {
            accumulatedText = update.fullText;
            totalTokens = update.tokens || 0;

            setMessages(prev => prev.map(msg => 
                msg.id === reflexMsgId 
                ? { 
                    ...msg, 
                    text: accumulatedText,
                    metrics: { ...msg.metrics, tokens: totalTokens, latency: Date.now() - startTime }
                  } 
                : msg
            ));
        }

        setSystemStats(prev => ({
            ...prev,
            lastReflexTokens: totalTokens,
            reflexLatency: [...prev.reflexLatency.slice(1), Date.now() - startTime],
            currentTask: 'SYSTEM_IDLE'
        }));

      } catch (error) {
          console.error("Offline Mode Error:", error);
          setMessages(prev => prev.map(msg => 
            msg.id === reflexMsgId 
            ? { ...msg, text: "**[OFFLINE ERROR]**: Failed to generate response. Check console." } 
            : msg
          ));
      }
      return;
    }

    try {
      // --- NEURO-SYMBOLIC CORE PHASE ---
      setSystemStats(prev => ({ ...prev, currentTask: 'NEURO_REASONING' }));
      
      // Real RAG & Reasoning (Async)
      const reasoning = await neuroSymbolicCore.reason(userText);
      
      setNeuroTrace(reasoning.reasoningTrace);
      setSystemStats(prev => ({ ...prev, neuroConfidence: reasoning.confidence * 100 }));
      setActiveLattice({ nodes: reasoning.graph.nodes, edges: reasoning.graph.edges });
      
      if (reasoning.confidence > 0.6) {
          setMessages(prev => [...prev, {
              id: `neuro-${Date.now()}`,
              role: AIRole.NEURO,
              text: `**Neuro-Symbolic Lattice Activated (Zync_TNG: R1T Chimera)**\n${reasoning.reasoningTrace}`,
              timestamp: Date.now(),
              metrics: { latency: 15, tokens: 25, confidence: reasoning.confidence * 100 }
          }]);
      }

      // --- REFLEX CORE PHASE ---
      setIsReflexActive(true);
      setSystemStats(prev => ({ ...prev, currentTask: 'DATA_INGESTION' }));
      const reflexStartTime = Date.now();

      // Memory Retrieval
      const relevantMemories = await memoryStore.search(userText);
      const memoryContext = relevantMemories.map(m => `[Past Memory]: ${m.content}`).join('\n');
      
      const augmentedHistory = [...messages];
      if (memoryContext) {
          augmentedHistory.push({
              id: 'memory-context',
              role: AIRole.MEMORY,
              text: `Relevant Context from Long-Term Memory:\n${memoryContext}`,
              timestamp: Date.now()
          });
      }

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
        
        const confidenceMatch = update.fullText.match(/\[Confidence:\s*(\d+)%\]/);
        const parsedConfidence = confidenceMatch ? parseInt(confidenceMatch[1]) : Math.min(99, 70 + (update.fullText.length / 10));
        
        setSystemStats(prev => ({ 
            ...prev, 
            lastReflexTokens: finalReflexTokens,
            reflexConfidence: parsedConfidence 
        }));
      }
      
      // Get final confidence from state or heuristic
      const reflexFinalConfidence = reflexFullResponse.match(/\[Confidence:\s*(\d+)%\]/) ? parseInt(reflexFullResponse.match(/\[Confidence:\s*(\d+)%\]/)![1]) : 85;
      
      // --- AGENTIC WORKFLOW HANDLER ---
      // Check if Reflex generated a workflow JSON
      const workflowMatch = reflexFullResponse.match(/```json\s*(\{\s*"workflow":[\s\S]*?\})\s*```/);
      
      if (workflowMatch) {
          try {
              const workflowJson = JSON.parse(workflowMatch[1]);
              const workflow = workflowJson.workflow;
              
              setMessages(prev => [...prev, {
                  id: `wf-detect-${Date.now()}`,
                  role: AIRole.REFLEX,
                  text: `**Agentic Workflow Detected**: *${workflow.name}*\nInitializing execution sequence...`,
                  timestamp: Date.now(),
                  metrics: { latency: 0, tokens: 0, confidence: 100 }
              }]);

              workflowEngine.registerWorkflow(workflow);
              
              // Execute Workflow
              const results = await workflowEngine.executeWorkflow(workflow.id, {});
              
              // Format results
              let resultText = `**Workflow Execution Complete**\n`;
              results.forEach((val: any, stepId: string) => {
                  resultText += `- **${stepId}**: \`${val}\`\n`;
              });

              setMessages(prev => [...prev, {
                  id: `wf-result-${Date.now()}`,
                  role: AIRole.REFLEX,
                  text: resultText,
                  timestamp: Date.now(),
                  metrics: { latency: 0, tokens: 0, confidence: 100 }
              }]);

          } catch (e) {
              console.error("Failed to execute agentic workflow", e);
              setMessages(prev => [...prev, {
                  id: `wf-fail-${Date.now()}`,
                  role: AIRole.REFLEX,
                  text: `**Workflow Execution Failed**\nError parsing or executing workflow: ${e}`,
                  timestamp: Date.now(),
                  metrics: { latency: 0, tokens: 0, confidence: 0 }
              }]);
          }
      }

      setIsReflexActive(false);

      // --- HIGH-SPEED PASS-THROUGH ---
      // If Reflex is highly confident (>95%) and query is simple, skip Memory Core
      const isSimpleQuery = userText.length < 60 && !userText.toLowerCase().includes("analyze") && !userText.toLowerCase().includes("reason");
      if (reflexFinalConfidence > 95 && isSimpleQuery) {
          setMessages(prev => [...prev, {
              id: `sys-pass-${Date.now()}`,
              role: AIRole.SYSTEM,
              text: `⚡ **High-Speed Pass-Through**\n\n*Reflex Confidence: ${reflexFinalConfidence}%*\n> Memory Core bypassed for latency optimization.`,
              timestamp: Date.now(),
              metrics: { latency: 0, tokens: 0, confidence: 100 }
          }]);
          setIsReflexActive(false);
          setSystemStats(prev => ({ ...prev, currentTask: 'SYSTEM_IDLE' }));
          return; // EXIT EARLY
      }

      // --- MEMORY CORE PHASE ---
      try {
        setIsMemoryActive(true);
        const memoryMsgId = (Date.now() + 2).toString();
        setMessages(prev => [...prev, {
          id: memoryMsgId,
          role: AIRole.MEMORY,
          text: '', 
          timestamp: Date.now(),
          metrics: { latency: 0, tokens: 0, confidence: 90 }
        }]);

        // Simulated tasks for visualization
        const tasks = ['DEFINING_PURPOSE', 'DATA_ANALYSIS', 'CONTEXTUAL_SYNTHESIS', 'MEMORY_WRITE'];
        let taskIndex = 0;
        const taskInterval = setInterval(() => {
          if (taskIndex < tasks.length) {
            setSystemStats(prev => ({ ...prev, currentTask: tasks[taskIndex] }));
            taskIndex++;
          }
        }, 1000);

        let finalMemoryTokens = 0;
        let memoryFullResponse = "";
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
          
          const confidenceMatch = update.fullText.match(/\[Confidence:\s*(\d+)%\]/);
          if (confidenceMatch) {
             setSystemStats(prev => ({ ...prev, memoryConfidence: parseInt(confidenceMatch[1]) }));
          }
        }
        
        clearInterval(taskInterval);

        // --- NEURO-SYMBOLIC VALIDATION ---
        const validationIssues = await neuroSymbolicCore.validateConsistency(memoryFullResponse);
        if (validationIssues.length > 0) {
            const validationText = `\n\n---\n🧠 **Neuro-Symbolic Logic Gate**\n> **Inconsistency Detected**:\n${validationIssues.map(i => `> - ⚠ ${i}`).join('\n')}`;
            
            // Append to existing message
            setMessages(prev => prev.map(msg => 
                msg.id === memoryMsgId 
                  ? { ...msg, text: msg.text + validationText }
                  : msg
            ));
        }

        // --- TRI-CORE SWITCHING LOGIC ---
        // If both cores have low confidence (< 85%), trigger Consensus Protocol
        const memConfMatch = memoryFullResponse.match(/\[Confidence:\s*(\d+)%\]/);
        const memTextConfidence = memConfMatch ? parseInt(memConfMatch[1]) : 90; // Default to 90 if not found (assume high confidence if no explicit low score)

        if (reflexFinalConfidence < 85 && memTextConfidence < 85) {
             throw new Error("LOW_CONFIDENCE_TRIGGER: Reflex & Memory failed to reach 85% confidence. Engaging Consensus.");
        }
        
        // Memory Storage
        if (userText.length > 10) {
            await memoryStore.add(`User: ${userText}\nAI: ${reflexFullResponse}`);
            const memId = await topologicalMemory.addMemory(userText, undefined, 1.0);
            await topologicalMemory.addMemory(reflexFullResponse, memId, systemStats.reflexConfidence / 100);
        }
        
        setSystemStats(prev => ({ ...prev, currentTask: 'DEPLOYMENT_COMPLETE' }));
        
      } catch (memoryError) {
        console.warn("Memory Core Sync Failed:", memoryError);
        setMessages(prev => [...prev, {
            id: `mem-fail-${Date.now()}`,
            role: AIRole.MEMORY,
            text: '**[Memory Sync Interrupted]**\nDeep analysis unavailable.',
            timestamp: Date.now(),
            metrics: { latency: 0, tokens: 0, confidence: 0 }
        }]);
      } finally {
        setIsMemoryActive(false);
        setTimeout(() => setSystemStats(prev => ({ ...prev, currentTask: 'SYSTEM_IDLE' })), 2000);
      }

    } catch (error) {
      console.error("Critical Failure:", error);
      setIsReflexActive(false);
      setIsMemoryActive(false);
      setSystemStats(prev => ({ ...prev, currentTask: 'PROTOCOL_FAILURE_RECOVERY' }));
      
      setMessages(prev => prev.map(msg => 
        (msg.role === AIRole.REFLEX && (msg.text === '' || msg.text === 'INITIALIZING_STREAM...'))
        ? { ...msg, text: '**[SYSTEM FAILURE]**: Core crashed. Handing over to Consensus Protocol.' }
        : msg
      ));

      const consensusMsgId = (Date.now() + 3).toString();
      setMessages(prev => [...prev, {
        id: consensusMsgId,
        role: AIRole.CONSENSUS,
        text: 'Initiating Consensus Recovery Protocol...',
        timestamp: Date.now(),
        metrics: { latency: 0, tokens: 0 }
      }]);
      
      try {
        const consensusStream = generateConsensusRecoveryStream(userText, error instanceof Error ? error.message : String(error));
        for await (const update of consensusStream) {
             setMessages(prev => prev.map(msg => msg.id === consensusMsgId ? { ...msg, text: update.fullText } : msg));
        }
      } catch (recoveryError) {
         setMessages(prev => prev.map(msg => msg.id === consensusMsgId ? { ...msg, text: "**SYSTEM CRITICAL**: Recovery failed." } : msg));
      }
      setTimeout(() => setSystemStats(prev => ({ ...prev, currentTask: 'SYSTEM_IDLE' })), 3000);
    }
  }, [appSettings, isOfflineMode, messages]);



  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isReflexActive || isMemoryActive) return;

    const userText = input;
    const userImage = selectedImage;
    const userAttachmentType = attachmentType;
    
    setInput('');
    clearImage();
    setIsAtBottom(true);
    
    await processUserMessage(userText, userImage, userAttachmentType);
  };
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isBottom = scrollHeight - scrollTop <= clientHeight + 50;
      setIsAtBottom(isBottom);
      setShowScrollButton(!isBottom);
    }
  };

  const handleRenameSession = () => {
    const newName = prompt('Enter new session name:', currentSession.name);
    if (newName && newName.trim()) {
        sessionManager.updateSession(currentSession.id, { name: newName.trim() });
        setCurrentSession(prev => ({ ...prev, name: newName.trim() }));
        setSessions(sessionManager.getSessions());
    }
  };

  const commands: CommandOption[] = useMemo(() => [
    // --- Session Management ---
    {
      id: 'new-session',
      label: 'New Session',
      description: 'Create a fresh workspace. (Ctrl+N)',
      icon: <Plus size={18} />,
      action: handleNewSession,
      category: 'Session',
      previewVideo: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-a-circuit-board-97-large.mp4'
    },
    {
      id: 'rename-session',
      label: 'Rename Session',
      description: 'Update the identifier for this workspace.',
      icon: <Edit3 size={18} />,
      action: handleRenameSession,
      category: 'Session',
      previewVideo: 'https://assets.mixkit.co/videos/preview/mixkit-interface-of-a-futuristic-computer-program-31682-large.mp4'
    },
    ...sessions.filter(s => s.id !== currentSession.id).map(s => ({
        id: `switch-${s.id}`,
        label: `Switch: ${s.name}`,
        description: `Jump to session from ${new Date(s.lastModified).toLocaleTimeString()}`,
        icon: <Layers size={18} />,
        action: () => handleSwitchSession(s.id),
        category: 'Session'
    })),
    {
      id: 'clear-chat',
      label: 'Clear History',
      description: 'Wipe current message buffer. (Irreversible)',
      icon: <Trash2 size={18} />,
      action: handleClearChat,
      disabled: isReflexActive || isMemoryActive,
      category: 'Session'
    },
    {
      id: 'delete-session',
      label: 'Delete Session',
      description: 'Permanently destroy this workspace.',
      icon: <Trash2 size={18} className="text-red-400" />,
      action: () => {
          if (confirm('Are you sure you want to delete this session?')) {
            sessionManager.deleteSession(currentSession.id);
            const newSession = sessionManager.createSession();
            setCurrentSession(newSession);
            setMessages(newSession.messages);
            setSessions(sessionManager.getSessions());
          }
      },
      category: 'Session'
    },

    // --- AI Capabilities ---
    {
      id: 'simulate-personas',
      label: 'Simulate Personas',
      description: isOfflineMode ? 'Unavailable in Offline Mode.' : 'Run counterfactual analysis on the last query.',
      icon: <Users size={18} />,
      action: handleSimulatePersonas,
      disabled: isReflexActive || isMemoryActive || messages.length === 0 || isOfflineMode,
      category: 'AI Tools',
      previewVideo: 'https://assets.mixkit.co/videos/preview/mixkit-artificial-intelligence-brain-animation-98-large.mp4'
    },
    {
      id: 'consensus-debate',
      label: 'Consensus Debate',
      description: isOfflineMode ? 'Unavailable in Offline Mode.' : 'Trigger multi-model debate to resolve ambiguity.',
      icon: <Network size={18} />,
      action: handleConsensusDebate,
      disabled: isReflexActive || isMemoryActive || isOfflineMode,
      category: 'AI Tools',
      previewVideo: 'https://assets.mixkit.co/videos/preview/mixkit-network-connection-background-loop-31685-large.mp4'
    },

    // --- System Control ---
    {
      id: 'toggle-offline',
      label: isOfflineMode ? 'Go Online (Cloud)' : 'Go Offline (Local)',
      description: isOfflineMode ? 'Switch to Cloud AI for max intelligence.' : 'Switch to Local LLM for privacy.',
      icon: <Lock size={18} />,
      action: async () => {
        const newMode = !isOfflineMode;
        setIsOfflineMode(newMode);
        setIsPaletteOpen(false);
        
        if (newMode) {
            // Pre-initialize offline model
            try {
                const { initializeOfflineModel, isOfflineModelReady } = await import('./services/offlineAi');
                if (!isOfflineModelReady()) {
                    setOfflineProgress("Initializing...");
                    await initializeOfflineModel((progress) => {
                        setOfflineProgress(progress);
                    });
                    setOfflineProgress(null);
                }
            } catch (e) {
                console.error("Failed to init offline model", e);
                setMessages(prev => [...prev, {
                    id: `sys-err-${Date.now()}`,
                    role: AIRole.REFLEX,
                    text: `**Offline Mode Error**: ${e instanceof Error ? e.message : String(e)}`,
                    timestamp: Date.now(),
                    metrics: { latency: 0, tokens: 0, confidence: 0 }
                }]);
                setIsOfflineMode(false); // Revert
                return;
            }
        }

        setMessages(prev => [...prev, {
            id: `sys-mode-${Date.now()}`,
            role: AIRole.REFLEX,
            text: `**System Mode Switched**\nNow using: ${newMode ? 'OFFLINE (Local LLM)' : 'ONLINE (Cloud AI)'}`,
            timestamp: Date.now(),
            metrics: { latency: 0, tokens: 0, confidence: 100 }
        }]);
      },
      category: 'System',
      previewVideo: 'https://assets.mixkit.co/videos/preview/mixkit-server-room-with-blue-lights-208-large.mp4'
    },
    {
      id: 'manage-plugins',
      label: 'Manage Plugins',
      description: 'View and toggle active system plugins.',
      icon: <Layers size={18} />,
      action: () => {
        const plugins = pluginManager.getAllPlugins();
        const statusMsg = plugins.map(p => 
          `- **${p.definition.name}** (${p.metadata.version}): ${p.metadata.enabled ? '✅ Active' : '❌ Disabled'}`
        ).join('\n');
        
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: AIRole.REFLEX,
          text: `### System Plugins\n\n${statusMsg}`,
          timestamp: Date.now(),
          sentiment: 'analytical'
        }]);
        setIsPaletteOpen(false);
      },
      category: 'System'
    },
    {
      id: 'create-tool',
      label: 'Create Custom Tool',
      description: 'Define a new tool for the AI to use.',
      icon: <Code size={18} />,
      action: () => {
        setIsPaletteOpen(false);
        setIsToolCreatorOpen(true);
      },
      category: 'System'
    },
    {
      id: 'system-reset',
      label: 'Reboot Core',
      description: 'Force re-initialization of all subsystems.',
      icon: <RefreshCw size={18} />,
      action: handleResetSystem,
      category: 'System'
    },
    {
      id: 'export-logs',
      label: 'Export Data',
      description: 'Download session logs as JSON.',
      icon: <FileJson size={18} />,
      action: handleExportLogs,
      category: 'System'
    },
    {
      id: 'status-report',
      label: 'System Status',
      description: 'View current operational status',
      icon: <Activity size={18} />,
      action: () => setMobileMenuOpen(true),
      category: 'System'
    },
    {
      id: 'logout',
      label: 'Terminate Session',
      description: 'Logout and return to secure gateway',
      icon: <Lock size={18} />,
      action: handleLogout,
      category: 'System'
    },

    {
      id: 'test-workflow',
      label: 'Test Workflow Engine',
      description: 'Run a diagnostic workflow trace.',
      icon: <Network size={18} />,
      action: handleTestWorkflow,
      category: 'System'
    },
    {
      id: 'open-experiment-lab',
      label: 'Experiment Lab',
      description: 'Test personas and prompts in a controlled environment.',
      icon: <FlaskConical size={18} />,
      action: () => {
        setIsPaletteOpen(false);
        setIsExperimentLabOpen(true);
      },
      category: 'System'
    },
    {
      id: 'open-memory-inspector',
      label: 'Memory Inspector',
      description: 'Visualize and manage long-term memory nodes.',
      icon: <Layers size={18} />,
      action: () => {
        setIsPaletteOpen(false);
        setIsMemoryInspectorOpen(true);
      },
      category: 'System'
    },
    {
      id: 'toggle-dream-state',
      label: isDreaming ? 'Wake System' : 'Enter Dream State',
      description: isDreaming ? 'Exit generative idle mode.' : 'Initiate deep learning consolidation.',
      icon: <Moon size={18} />,
      action: () => {
        setIsPaletteOpen(false);
        handleDreamToggle();
      },
      category: 'System'
    }
  ], [sessions, currentSession, isOfflineMode, isReflexActive, isMemoryActive, messages.length, isDreaming]);

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<CoreLoader />}>
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0f0720] via-[#1a0b2e] to-[#0f0720] animate-aurora z-0"></div>
            <WaveBackground isActive={false} />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.5),rgba(2,6,23,0.8)),url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 pointer-events-none z-0 mix-blend-overlay"></div>
            <div className="scanline-overlay"></div>
            
            <LoginPage 
                onLogin={() => setIsAuthenticated(true)} 
                onGlitch={(isGlitching) => setIsSystemGlitching(isGlitching)}
            />
        </div>
      </Suspense>
    );
  }

  return (
    <div className={`flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden relative selection:bg-cyan-500/30 selection:text-cyan-50 transition-all duration-1000 ${isDreaming ? 'dream-active' : ''} ${isOfflineMode ? 'offline-active' : ''}`}>
      {isDreaming && <DreamOverlay />}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f0720] via-[#1a0b2e] to-[#0f0720] animate-aurora z-0"></div>
      <WaveBackground isActive={isReflexActive || isMemoryActive} />
      <div className="scanline-overlay"></div>
      {isExperimentLabOpen && <ExperimentLab onClose={() => setIsExperimentLabOpen(false)} />}
      
      {/* Onboarding Tour */}
      {showOnboarding && (
        <Suspense fallback={null}>
            <OnboardingTour onComplete={handleOnboardingComplete} />
        </Suspense>
      )}
      
      <div className={`
        fixed inset-y-0 left-0 z-50 w-80 glass-panel transform transition-transform duration-300 ease-in-out m-0 md:m-4 md:rounded-2xl
        md:relative md:translate-x-0 md:w-80 md:h-[calc(100vh-2rem)]
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Suspense fallback={<CoreLoader />}>
            <SystemVisualizer 
            stats={systemStats} 
            isReflexActive={isReflexActive}
            isMemoryActive={isMemoryActive}
            onClose={() => setMobileMenuOpen(false)}
            lattice={activeLattice}
            isDreaming={isDreaming}
            activeModels={getCoreConfig()}
            workflowLogs={workflowLogs}
            />
        </Suspense>
      </div>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        
        {/* EXECUTIVE DASHBOARD VIEW */}
        {appSettings.userRole === 'EXECUTIVE' ? (
            <Suspense fallback={<CoreLoader />}>
                <ExecutiveDashboard stats={systemStats} />
            </Suspense>
        ) : (
            /* STANDARD CHAT VIEW */
            <>
        <header className="h-16 md:h-16 bg-slate-950/30 backdrop-blur-md flex items-center justify-between px-4 md:px-8 sticky top-0 z-40 transition-all gradient-border-bottom">
          <div className="flex items-center gap-4">
            <button 
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
                className="md:hidden p-2 -ml-2 text-slate-400 hover:text-cyan-400 transition-colors"
            >
                <Menu size={24} />
            </button>

             <div className="relative">
                <div className={`absolute inset-0 rounded-full blur-md transition-colors duration-500 ${isMemoryActive ? 'bg-fuchsia-500/50' : isReflexActive ? 'bg-cyan-500/50' : 'bg-cyan-500/20'}`}></div>
                <div className={`w-3 h-3 rounded-full shadow-inner relative z-10 transition-colors duration-300 ${isMemoryActive ? 'bg-fuchsia-400' : isReflexActive ? 'bg-cyan-400' : 'bg-cyan-600'}`}></div>
             </div>
            <div>
              <ZyncLogo className="h-8 md:h-10 w-auto logo-glow" />
            </div>
          </div>
          
          <div className="flex items-center gap-4 md:gap-6">
             <MuteToggle />
             <button
               onClick={() => setIsSettingsOpen(true)}
               className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
               title="Voice Settings"
             >
               <Settings size={18} />
             </button>

             <button
                onClick={() => setIsExperimentLabOpen(true)}
                className="p-2 rounded-lg text-slate-400 hover:text-fuchsia-400 hover:bg-fuchsia-500/10 transition-all"
                title="Experiment Lab"
             >
                <FlaskConical size={18} />
             </button>

             <button
                onClick={() => setIsMemoryInspectorOpen(true)}
                className="p-2 rounded-lg text-slate-400 hover:text-fuchsia-400 hover:bg-fuchsia-500/10 transition-all"
                title="Memory Inspector"
              >
                <Layers size={18} />
              </button>

             <button
               onClick={handleDreamToggle}
               className={`p-2 rounded-lg transition-all ${isDreaming ? 'text-fuchsia-400 bg-fuchsia-500/10 animate-pulse' : 'text-slate-400 hover:text-fuchsia-400 hover:bg-fuchsia-500/10'}`}
               title={isDreaming ? "Wake System" : "Enter Dream State"}
             >
               {isDreaming ? <Moon size={18} className="fill-current" /> : <Moon size={18} />}
             </button>

             <div className="group flex flex-col items-end cursor-default hidden md:flex">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 group-hover:text-cyan-400 transition-colors">
                   {isDreaming ? (
                       <span className="text-fuchsia-400 animate-pulse">{dreamStatus || "DREAMING..."}</span>
                   ) : (
                       <>
                        <Activity size={14} />
                        <span>SYNC_RATE</span>
                       </>
                   )}
                </div>
                {!isDreaming && <span className="text-lg font-bold font-mono text-slate-200 tabular-nums">{systemStats.syncRate.toFixed(1)}%</span>}
             </div>
             
             <div className="w-px h-6 md:h-8 bg-slate-800 hidden md:block"></div>
             
             <div className="group flex flex-col items-end cursor-default">
                <div className="flex items-center gap-2 text-[10px] md:text-xs font-mono text-slate-400 group-hover:text-emerald-400 transition-colors">
                   <Terminal size={14} className="hidden sm:block" />
                   <span className="hidden sm:inline">STATUS</span>
                </div>
                <span className={`text-xs md:text-lg font-bold font-mono ${isOfflineMode ? 'text-amber-500' : 'text-emerald-500'} flex items-center gap-2`}>
                    {isOfflineMode ? 'OFFLINE' : 'ONLINE'} 
                    <span className="relative flex h-2 w-2">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isOfflineMode ? 'bg-amber-400' : 'bg-emerald-400'} opacity-75`}></span>
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${isOfflineMode ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                    </span>
                </span>
             </div>
          </div>
        </header>

        {/* Offline Progress Indicator */}
        {offlineProgress && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/80 border border-cyan-500/30 text-cyan-400 px-4 py-2 rounded-full text-xs font-mono z-50 backdrop-blur-md flex items-center gap-2">
             <RefreshCw className="animate-spin w-3 h-3" />
             {offlineProgress}
          </div>
        )}

        {/* Offline Mode Badge */}
        {isOfflineMode && !offlineProgress && (
           <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-amber-950/80 border border-amber-500/50 text-amber-400 px-4 py-1.5 rounded-full text-[10px] font-mono z-40 backdrop-blur-md flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-in fade-in slide-in-from-top-4 duration-500">
             <Lock className="w-3 h-3" />
             <span className="tracking-widest font-bold">OFFLINE MODE ACTIVE</span>
          </div>
        )}

        <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth z-0 relative scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
            onScroll={handleScroll}
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
                    aria-label="Scroll to bottom"
                    className="fixed bottom-24 md:bottom-32 right-4 md:right-8 p-3 rounded-full bg-slate-800/80 border border-slate-700 text-cyan-400 shadow-lg backdrop-blur hover:bg-slate-700 transition-all z-30 animate-bounce"
                >
                    <ArrowDown size={20} />
                </button>
            )}
        </div>

        <div className="p-4 md:p-8 z-40 relative">
          <div className="max-w-4xl mx-auto relative">
            {/* Input Island Container */}
            <div className={`input-island rounded-2xl p-2 ${!isReflexActive && !isMemoryActive && !isListening ? 'animate-breathing-glow' : ''}`}>
            
            <form onSubmit={handleSendMessage} className="relative group">
                
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

                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/webp, image/heic, .txt, .md, .json, .csv, .js, .ts, .tsx, .pdf"
                  className="hidden"
                  aria-label="Upload file"
                />

                <div className="absolute inset-y-0 left-3 md:left-5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPaletteOpen(true)}
                      className="p-1.5 rounded-md transition-colors hover:bg-slate-800 text-slate-500 hover:text-cyan-400 group/cmd interactive-hover"
                      title="Command Palette (Ctrl+K)"
                    >
                      <Command size={18} className="group-hover/cmd:scale-110 transition-transform" />
                    </button>

                    <div className="w-px h-4 bg-slate-700/50"></div>
                    
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isReflexActive || isMemoryActive}
                      className={`p-1.5 rounded-md transition-colors hover:bg-slate-800 text-slate-500 hover:text-cyan-400`}
                      title="Visual Input (Reflex Core)"
                    >
                       <ImageIcon size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isReflexActive || isMemoryActive}
                      className={`p-1.5 rounded-md transition-colors ${selectedImage ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-slate-800 text-slate-500 hover:text-slate-300'}`}
                      title="Attach File"
                    >
                       <Paperclip size={18} />
                    </button>

                    <VoiceInput 
                        onTranscript={handleVoiceTranscript} 
                        onStateChange={setIsListening}
                        disabled={isReflexActive || isMemoryActive}
                        onStartLiveMode={() => setIsLiveMode(true)}
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
                aria-label="Send message"
                disabled={(!input.trim() && !selectedImage) || isReflexActive || isMemoryActive || isListening}
                className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-slate-800 text-slate-400 
                          hover:bg-cyan-500 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-800 disabled:hover:text-slate-400
                          transition-all duration-200 shadow-lg interactive-hover"
              >
                <Send size={18} />
              </button>
            </form>
            </div>
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

      </>
        )}
      
      {/* Live Voice Interface Overlay */}
      {isLiveMode && (
        <LiveVoiceInterface onClose={() => setIsLiveMode(false)} />
      )}
      </div>
    </div>
  );
}

export default function AppWrapper() {
  return (
    <SpeechProvider>
      <App />
    </SpeechProvider>
  );
}
