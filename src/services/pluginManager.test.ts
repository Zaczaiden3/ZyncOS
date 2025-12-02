import { describe, it, expect, beforeEach } from 'vitest';
import { pluginManager } from './pluginManager';
import { ToolDefinition } from '../types';

describe('PluginManager', () => {
  const mockTool: ToolDefinition = {
    name: 'test_tool',
    declaration: {
      name: 'test_tool',
      description: 'A test tool',
    },
    execute: async () => 'success',
  };

  beforeEach(() => {
    // Reset plugins if possible, or just register new ones
    // Since it's a singleton, we might need to be careful
  });

  it('should register a plugin', () => {
    pluginManager.register({
      definition: mockTool,
      metadata: {
        id: 'test_tool',
        name: 'test_tool',
        description: 'A test tool',
        version: '1.0.0',
        author: 'Test',
        enabled: true,
      },
    });

    const tool = pluginManager.getPlugin('test_tool');
    expect(tool).toBeDefined();
    expect(tool?.definition.name).toBe('test_tool');
  });

  it('should return active tool declarations', () => {
    const declarations = pluginManager.getToolDeclarations();
    const testToolDecl = declarations.find(d => d.name === 'test_tool');
    expect(testToolDecl).toBeDefined();
  });

  it('should disable a plugin', () => {
    pluginManager.toggle('test_tool', false);
    const declarations = pluginManager.getToolDeclarations();
    const testToolDecl = declarations.find(d => d.name === 'test_tool');
    expect(testToolDecl).toBeUndefined();
  });
});
