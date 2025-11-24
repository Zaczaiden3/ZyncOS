export enum AIRole {
  USER = 'USER',
  REFLEX = 'REFLEX', // Fast AI
  MEMORY = 'MEMORY', // Deep/Memory AI
  CONSENSUS = 'CONSENSUS', // Failsafe/Recovery AI
}

export interface Message {
  id: string;
  role: AIRole;
  text: string;
  timestamp: number;
  attachment?: string; // Base64 string of the image or text content
  attachmentType?: 'image' | 'text'; // Type of the attachment
  metrics?: {
    latency?: number; // ms
    confidence?: number; // 0-100
    tokens?: number;
  };
  relatedFacts?: string[]; // For Memory AI to display extracted context
  sources?: { title: string; uri: string }[]; // Grounding sources (Real-time data)
}

export interface SystemStats {
  reflexLatency: number[];
  memoryDepth: number[];
  syncRate: number;
  activeMemoryNodes: number;
  // New detailed metrics
  lastReflexTokens: number;
  lastMemoryTokens: number;
  reflexConfidence: number;
  memoryConfidence: number;
  currentTask: string;
}

export interface MemoryNode {
  id: string;
  concept: string;
  strength: number; // 0-100
  lastAccessed: number;
}