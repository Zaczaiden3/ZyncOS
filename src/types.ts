export enum AIRole {
  USER = 'USER',
  REFLEX = 'REFLEX', // Fast AI
  MEMORY = 'MEMORY', // Deep/Memory AI
  CONSENSUS = 'CONSENSUS', // Failsafe/Recovery AI
  NEURO = 'NEURO', // Neuro-Symbolic Core
  SYSTEM = 'SYSTEM', // System Messages
}

export enum UserRole {
  ADMIN = 'ADMIN',
  DEVELOPER = 'DEVELOPER', // Full access, debug tools
  EXECUTIVE = 'EXECUTIVE', // High-level metrics, no debug
  USER = 'USER', // Simple chat, no system internals
}

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  preferences: {
    theme: 'dark' | 'light' | 'cyber';
    notifications: boolean;
  };
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
  sentiment?: 'positive' | 'neutral' | 'negative' | 'analytical'; // Sentiment analysis of the message
  rating?: 'up' | 'down'; // User feedback
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
  neuroConfidence: number;
  currentTask: string;
}

export interface MemoryNode {
  id: string;
  concept: string;
  strength: number; // 0-100
  lastAccessed: number;
  temporalWeight?: number; // 0-1, decays over time
  sentimentState?: 'positive' | 'neutral' | 'negative' | 'analytical';
}

import { FunctionDeclaration } from "@google/genai";

export interface ToolDefinition {
  name: string;
  declaration: FunctionDeclaration;
  execute: (args: any) => Promise<any> | any;
}

export interface WorkflowStep {
  id: string;
  toolName: string;
  argsTemplate?: Record<string, any>; // Template for args, can use {{previousStepId.output}}
  dependsOn?: string[]; // IDs of previous steps
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}

export interface WorkflowExecutionLog {
  workflowId: string;
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input: any;
  output?: any;
  error?: string;
  timestamp: number;
}