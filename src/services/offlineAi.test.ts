import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initializeOfflineModel, generateOfflineResponseStream, isOfflineModelReady } from './offlineAi';
import { AIRole } from '../types';

// Mock WebLLM
const mockCreate = vi.fn();
const mockEngine = {
  chat: {
    completions: {
      create: mockCreate
    }
  }
};

vi.mock('@mlc-ai/web-llm', () => ({
  CreateMLCEngine: vi.fn().mockImplementation(async (model, opts) => {
    if (opts && opts.initProgressCallback) {
      opts.initProgressCallback({ text: 'Loading...' });
    }
    return mockEngine;
  })
}));

describe('Offline AI Service', () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock navigator.gpu
    Object.defineProperty(global, 'navigator', {
      value: {
        gpu: {}
      },
      writable: true
    });
  });

  afterEach(() => {
    global.navigator = originalNavigator;
  });

  it('should initialize the model', async () => {
    const onProgress = vi.fn();
    await initializeOfflineModel(onProgress);
    
    expect(isOfflineModelReady()).toBe(true);
    expect(onProgress).toHaveBeenCalledWith('Loading...');
  });

  it('should generate offline response stream', async () => {
    // Ensure initialized
    await initializeOfflineModel(() => {});

    // Mock stream
    const mockStream = {
      [Symbol.asyncIterator]: async function* () {
        yield { choices: [{ delta: { content: 'Offline' } }] };
        yield { choices: [{ delta: { content: ' Response' } }] };
      }
    };
    mockCreate.mockResolvedValue(mockStream);

    const history = [{ role: AIRole.USER, text: 'Hi', id: '1', timestamp: 0 }];
    const generator = generateOfflineResponseStream('Hi', history);

    const chunks = [];
    for await (const chunk of generator) {
      chunks.push(chunk);
    }

    expect(mockCreate).toHaveBeenCalled();
    expect(chunks.length).toBe(3);
    expect(chunks[0].text).toBe('Offline');
    expect(chunks[1].text).toBe(' Response');
    expect(chunks[2].done).toBe(true);
  });
});
