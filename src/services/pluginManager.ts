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

export interface PluginConfig {
  type: 'API_REST' | 'SCRIPT_JS';
  apiUrl?: string;
  apiMethod?: string;
  apiHeaders?: string;
  scriptBody?: string;
  params?: {name: string, type: string, description: string}[];
}

export interface ZyncPlugin {
  definition: ToolDefinition;
  metadata: PluginMetadata;
  config?: PluginConfig;
}

class PluginManager {
  private static instance: PluginManager;
  private plugins: Map<string, ZyncPlugin> = new Map();

  private constructor() {
    this.loadPlugins();
  }

  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  private loadPlugins() {
    try {
      const saved = localStorage.getItem('zync_custom_plugins');
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.forEach((p: ZyncPlugin) => {
          if (p.config) {
             // Reconstruct execute function
             let executeFunc: (args: any) => Promise<any>;

             if (p.config.type === 'API_REST') {
                executeFunc = async (args: any) => {
                  let url = p.config?.apiUrl || '';
                  Object.keys(args).forEach(key => {
                    url = url.replace(`{${key}}`, args[key]);
                  });

                  if (p.config?.apiMethod === 'GET') {
                    const query = new URLSearchParams(args).toString();
                    if (query) url += `?${query}`;
                  }

                  const headers = JSON.parse(p.config?.apiHeaders || '{}');
                  
                  const response = await fetch(url, {
                    method: p.config?.apiMethod || 'GET',
                    headers: {
                      'Content-Type': 'application/json',
                      ...headers
                    },
                    body: p.config?.apiMethod !== 'GET' ? JSON.stringify(args) : undefined
                  });

                  if (!response.ok) {
                    throw new Error(`API Error: ${response.statusText}`);
                  }
                  return await response.json();
                };
             } else {
                // SCRIPT_JS
                executeFunc = async (args: any) => {
                   const f = new Function('args', p.config?.scriptBody || '');
                   return f(args);
                };
             }

             // Re-attach execute function
             p.definition.execute = executeFunc;
             this.plugins.set(p.definition.name, p);
          }
        });
      }
    } catch (e) {
      console.error("Failed to load plugins", e);
    }
  }

  private savePlugins() {
    try {
      // Only save custom plugins
      const customPlugins = Array.from(this.plugins.values()).filter(p => p.metadata.id.startsWith('custom-'));
      // We can't stringify functions, so we need to ensure we have the config to recreate them.
      // This suggests we need to refactor ZyncPlugin to hold the 'config' used to create it.
      localStorage.setItem('zync_custom_plugins', JSON.stringify(customPlugins));
    } catch (e) {
      console.error("Failed to save plugins", e);
    }
  }

  public register(plugin: ZyncPlugin) {
    if (this.plugins.has(plugin.definition.name)) {
      console.warn(`Plugin ${plugin.definition.name} is already registered. Overwriting.`);
    }
    this.plugins.set(plugin.definition.name, plugin);
    
    if (plugin.metadata.id.startsWith('custom-')) {
        this.savePlugins();
    }
  }

  public unregister(name: string) {
    const plugin = this.plugins.get(name);
    this.plugins.delete(name);
    if (plugin && plugin.metadata.id.startsWith('custom-')) {
        this.savePlugins();
    }
  }

  public toggle(name: string, enabled: boolean) {
    const plugin = this.plugins.get(name);
    if (plugin) {
      plugin.metadata.enabled = enabled;
      if (plugin.metadata.id.startsWith('custom-')) {
          this.savePlugins();
      }
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
