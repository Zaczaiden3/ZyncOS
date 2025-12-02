import { Message, AIRole } from '../types';

export interface ChatSession {
  id: string;
  name: string;
  messages: Message[];
  createdAt: number;
  lastModified: number;
}

class SessionManager {
  private readonly STORAGE_KEY = 'ZYNC_SESSIONS';
  private readonly ACTIVE_SESSION_KEY = 'ZYNC_ACTIVE_SESSION_ID';
  private readonly LEGACY_HISTORY_KEY = 'ZYNC_CHAT_HISTORY';

  constructor() {
    this.migrateLegacyHistory();
  }

  private migrateLegacyHistory() {
    const sessions = this.getSessions();
    const legacyHistory = localStorage.getItem(this.LEGACY_HISTORY_KEY);

    if (sessions.length === 0 && legacyHistory) {
      try {
        const messages: Message[] = JSON.parse(legacyHistory);
        if (messages.length > 0) {
          this.createSession('Legacy Session', messages);
          // Optional: localStorage.removeItem(this.LEGACY_HISTORY_KEY); 
          // Keeping it for safety for now, or we can clear it to avoid confusion.
        }
      } catch (e) {
        console.error('Failed to migrate legacy history', e);
      }
    }
    
    // Ensure at least one session exists
    if (this.getSessions().length === 0) {
        this.createSession('New Session');
    }
  }

  getSessions(): ChatSession[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse sessions', e);
      return [];
    }
  }

  getSession(id: string): ChatSession | undefined {
    return this.getSessions().find(s => s.id === id);
  }

  getActiveSession(): ChatSession {
    const activeId = localStorage.getItem(this.ACTIVE_SESSION_KEY);
    const sessions = this.getSessions();
    
    if (activeId) {
      const session = sessions.find(s => s.id === activeId);
      if (session) return session;
    }

    // Fallback to first session or create new
    if (sessions.length > 0) {
        this.setActiveSession(sessions[0].id);
        return sessions[0];
    }

    return this.createSession('New Session');
  }

  createSession(name?: string, initialMessages?: Message[]): ChatSession {
    const sessions = this.getSessions();
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      name: name || `Session ${new Date().toLocaleDateString()}`,
      messages: initialMessages || this.getInitialMessages(),
      createdAt: Date.now(),
      lastModified: Date.now(),
    };

    sessions.push(newSession);
    this.saveSessions(sessions);
    this.setActiveSession(newSession.id);
    return newSession;
  }

  updateSession(id: string, updates: Partial<ChatSession>): void {
    const sessions = this.getSessions();
    const index = sessions.findIndex(s => s.id === id);
    if (index !== -1) {
      sessions[index] = { ...sessions[index], ...updates, lastModified: Date.now() };
      this.saveSessions(sessions);
    }
  }

  saveSessionMessages(id: string, messages: Message[]): void {
      this.updateSession(id, { messages });
  }

  deleteSession(id: string): void {
    let sessions = this.getSessions();
    sessions = sessions.filter(s => s.id !== id);
    this.saveSessions(sessions);

    // If we deleted the active session, switch to another one
    if (this.getActiveSessionId() === id) {
        if (sessions.length > 0) {
            this.setActiveSession(sessions[0].id);
        } else {
            this.createSession();
        }
    }
  }

  setActiveSession(id: string): void {
    localStorage.setItem(this.ACTIVE_SESSION_KEY, id);
  }

  getActiveSessionId(): string | null {
      return localStorage.getItem(this.ACTIVE_SESSION_KEY);
  }

  private saveSessions(sessions: ChatSession[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
  }

  private getInitialMessages(): Message[] {
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
  }
  
  exportSessionToJson(session: ChatSession): string {
      return JSON.stringify(session, null, 2);
  }

  optimizeSessions(): void {
    let sessions = this.getSessions();
    const initialCount = sessions.length;

    // Filter out invalid sessions or sessions with no messages (unless it's the only one created just now)
    // We keep sessions that have messages OR are the active one (to prevent deleting a just-created session)
    const activeId = this.getActiveSessionId();
    
    sessions = sessions.filter(s => {
        const isValid = s.messages && Array.isArray(s.messages);
        const hasMessages = s.messages.length > 0;
        const isActive = s.id === activeId;
        return isValid && (hasMessages || isActive);
    });
    
    // Ensure we still have at least one session
    if (sessions.length === 0) {
        this.createSession('New Session');
        return;
    }

    if (sessions.length !== initialCount) {
        this.saveSessions(sessions);
        console.log(`[SessionManager] Optimized: Pruned ${initialCount - sessions.length} empty/invalid sessions.`);
    }
    
    // Verify active session still exists
    if (activeId && !sessions.find(s => s.id === activeId)) {
        this.setActiveSession(sessions[0].id);
    }
  }
}

export const sessionManager = new SessionManager();
