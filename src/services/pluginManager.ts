import { ToolDefinition } from '../types';

export interface PluginMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  icon?: string; // Lucide icon name
  enabled: boolean;
}

export interface ZyncPlugin {
  definition: ToolDefinition;
  metadata: PluginMetadata;
}

class PluginManager {
  private static instance: PluginManager;
  private plugins: Map<string, ZyncPlugin> = new Map();

  private constructor() {}

  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  public register(plugin: ZyncPlugin) {
    if (this.plugins.has(plugin.definition.name)) {
      console.warn(`Plugin ${plugin.definition.name} is already registered. Overwriting.`);
    }
    this.plugins.set(plugin.definition.name, plugin);
  }

  public unregister(name: string) {
    this.plugins.delete(name);
  }

  public toggle(name: string, enabled: boolean) {
    const plugin = this.plugins.get(name);
    if (plugin) {
      plugin.metadata.enabled = enabled;
    }
  }

  public getPlugin(name: string): ZyncPlugin | undefined {
    return this.plugins.get(name);
  }

  public getAllPlugins(): ZyncPlugin[] {
    return Array.from(this.plugins.values());
  }

  public getActiveTools(): ToolDefinition[] {
    return Array.from(this.plugins.values())
      .filter(p => p.metadata.enabled)
      .map(p => p.definition);
  }

  public getToolDeclarations() {
    return this.getActiveTools().map(t => t.declaration);
  }
}

export const pluginManager = PluginManager.getInstance();
