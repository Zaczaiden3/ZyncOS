import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateReflexResponseStream } from './gemini';
import { AIRole } from '../types';

// Mock GoogleGenAI
const mockGenerateContentStream = vi.fn();
const mockGetAiClient = vi.fn(() => ({
  models: {
    generateContentStream: mockGenerateContentStream
  }
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(function() {
    return {
      models: {
        generateContentStream: mockGenerateContentStream
      }
    };
  }),
  Modality: { AUDIO: 'AUDIO' }
}));

// Mock settings
vi.mock('./settings', () => ({
  getSettings: vi.fn().mockReturnValue({
    geminiApiKey: 'test-key',
    reflexModel: 'gemini-2.0-flash' // Force Gemini path
  })
}));

// Mock pluginManager
vi.mock('./pluginManager', () => ({
  pluginManager: {
    getToolDeclarations: vi.fn().mockReturnValue([]),
    register: vi.fn(),
    getActiveTools: vi.fn().mockReturnValue([])
  }
}));

// Mock cores to prevent side effects
vi.mock('../cores/memory/TopologicalMemory', () => ({
  topologicalMemory: {}
}));
vi.mock('../cores/neuro-symbolic/NeuroSymbolicCore', () => ({
  neuroSymbolicCore: {}
}));

describe('Gemini Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate reflex response stream', async () => {
    // Setup mock stream
    const mockStream = {
      [Symbol.asyncIterator]: async function* () {
        yield { text: 'Hello', usageMetadata: { totalTokenCount: 10 } };
        yield { text: ' World', usageMetadata: { totalTokenCount: 20 } };
      }
    };
    mockGenerateContentStream.mockResolvedValue(mockStream);

    const history = [{ role: AIRole.USER, text: 'Hi', id: '1', timestamp: 0 }];
    const generator = generateReflexResponseStream('Hi', history);

    const chunks = [];
    for await (const chunk of generator) {
      chunks.push(chunk);
    }

    expect(mockGenerateContentStream).toHaveBeenCalled();
    expect(chunks.length).toBe(3); // 2 chunks + 1 final done chunk
    expect(chunks[0].text).toBe('Hello');
    expect(chunks[1].text).toBe(' World');
    expect(chunks[2].done).toBe(true);
    expect(chunks[2].fullText).toBe('Hello World');
  });
});
