import React, { useState } from 'react';
import { pluginManager, ZyncPlugin } from '../services/pluginManager';
import { ToolDefinition } from '../types';
import { FunctionDeclaration } from "@google/genai";
import { Save, Plus, Trash2, Code, Globe } from 'lucide-react';

interface ToolCreatorProps {
  onClose: () => void;
}

type ToolType = 'API_REST' | 'SCRIPT_JS';

const ToolCreator: React.FC<ToolCreatorProps> = ({ onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [toolType, setToolType] = useState<ToolType>('API_REST');
  
  // API Config
  const [apiUrl, setApiUrl] = useState('');
  const [apiMethod, setApiMethod] = useState('GET');
  const [apiHeaders, setApiHeaders] = useState('{}');
  
  // Script Config (Future)
  const [scriptBody, setScriptBody] = useState('return "Hello World";');

  // Parameters
  const [params, setParams] = useState<{name: string, type: string, description: string}[]>([]);

  const addParam = () => {
    setParams([...params, { name: '', type: 'STRING', description: '' }]);
  };

  const updateParam = (index: number, field: string, value: string) => {
    const newParams = [...params];
    // @ts-ignore
    newParams[index][field] = value;
    setParams(newParams);
  };

  const removeParam = (index: number) => {
    setParams(params.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    try {
      // 1. Construct Function Declaration
      const parameters: any = {
        type: 'OBJECT',
        properties: {},
        required: []
      };

      params.forEach(p => {
        parameters.properties[p.name] = {
          type: p.type,
          description: p.description
        };
        parameters.required.push(p.name);
      });

      const declaration: FunctionDeclaration = {
        name: name.toLowerCase().replace(/\s+/g, '_'),
        description: description,
        parameters: parameters
      };

      // 2. Construct Execution Logic
      let executeFunc: (args: any) => Promise<any>;

      if (toolType === 'API_REST') {
        executeFunc = async (args: any) => {
          let url = apiUrl;
          // Replace URL params
          Object.keys(args).forEach(key => {
            url = url.replace(`{${key}}`, args[key]);
          });

          // Append query params for GET
          if (apiMethod === 'GET') {
            const query = new URLSearchParams(args).toString();
            if (query) url += `?${query}`;
          }

          const headers = JSON.parse(apiHeaders);
          
          const response = await fetch(url, {
            method: apiMethod,
            headers: {
              'Content-Type': 'application/json',
              ...headers
            },
            body: apiMethod !== 'GET' ? JSON.stringify(args) : undefined
          });

          if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
          }

          return await response.json();
        };
      } else {
        // SCRIPT_JS (Sandbox warning)
        executeFunc = async (args: any) => {
           // Simple Function constructor (User beware)
           const f = new Function('args', scriptBody);
           return f(args);
        };
      }

      // 3. Register Plugin
      const newTool: ToolDefinition = {
        name: declaration.name || 'custom_tool',
        declaration: declaration,
        execute: executeFunc
      };

      const plugin: ZyncPlugin = {
        definition: newTool,
        metadata: {
          id: `custom-${Date.now()}`,
          name: name,
          description: description,
          version: '1.0.0',
          author: 'User',
          enabled: true,
          icon: toolType === 'API_REST' ? 'Globe' : 'Code'
        },
        config: {
            type: toolType,
            apiUrl,
            apiMethod,
            apiHeaders,
            scriptBody,
            params
        }
      };

      pluginManager.register(plugin);
      onClose();

    } catch (e) {
      alert(`Error creating tool: ${e}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <h2 className="text-lg font-mono font-bold text-slate-200">CREATE_CUSTOM_TOOL</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-red-400" aria-label="Close">
            <Trash2 size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">TOOL_NAME</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. get_weather"
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-cyan-500 outline-none"
                aria-label="Tool Name"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">TYPE</label>
              <select 
                value={toolType}
                onChange={e => setToolType(e.target.value as ToolType)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-cyan-500 outline-none"
                aria-label="Tool Type"
              >
                <option value="API_REST">REST API</option>
                <option value="SCRIPT_JS">JavaScript (Advanced)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-500 mb-1">DESCRIPTION</label>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What does this tool do?"
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-cyan-500 outline-none h-20"
              aria-label="Description"
            />
          </div>

          {/* Configuration */}
          <div className="border-t border-slate-800 pt-4">
            <h3 className="text-sm font-mono text-cyan-400 mb-4 flex items-center gap-2">
              {toolType === 'API_REST' ? <Globe size={16} /> : <Code size={16} />}
              CONFIGURATION
            </h3>

            {toolType === 'API_REST' ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <select 
                    value={apiMethod}
                    onChange={e => setApiMethod(e.target.value)}
                    className="w-24 bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200"
                    aria-label="HTTP Method"
                  >
                    <option>GET</option>
                    <option>POST</option>
                    <option>PUT</option>
                    <option>DELETE</option>
                  </select>
                  <input 
                    type="text" 
                    value={apiUrl}
                    onChange={e => setApiUrl(e.target.value)}
                    placeholder="https://api.example.com/v1/resource"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200"
                    aria-label="API URL"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-500 mb-1">HEADERS (JSON)</label>
                  <textarea 
                    value={apiHeaders}
                    onChange={e => setApiHeaders(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs font-mono text-slate-400 h-20"
                    aria-label="Headers"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-mono text-slate-500 mb-1">JAVASCRIPT BODY</label>
                <textarea 
                  value={scriptBody}
                  onChange={e => setScriptBody(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs font-mono text-emerald-400 h-40"
                  aria-label="Script Body"
                />
                <p className="text-[10px] text-amber-500 mt-1">Warning: Scripts run in the browser context. Use with caution.</p>
              </div>
            )}
          </div>

          {/* Parameters */}
          <div className="border-t border-slate-800 pt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-mono text-fuchsia-400">PARAMETERS</h3>
              <button onClick={addParam} className="text-xs flex items-center gap-1 text-slate-400 hover:text-fuchsia-400" aria-label="Add Parameter">
                <Plus size={14} /> ADD_PARAM
              </button>
            </div>

            <div className="space-y-2">
              {params.map((p, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input 
                    type="text" 
                    value={p.name}
                    onChange={e => updateParam(i, 'name', e.target.value)}
                    placeholder="name"
                    className="w-1/4 bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-slate-200"
                    aria-label={`Parameter Name ${i + 1}`}
                  />
                  <select 
                    value={p.type}
                    onChange={e => updateParam(i, 'type', e.target.value)}
                    className="w-1/4 bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-slate-200"
                    aria-label={`Parameter Type ${i + 1}`}
                  >
                    <option value="STRING">String</option>
                    <option value="NUMBER">Number</option>
                    <option value="BOOLEAN">Boolean</option>
                  </select>
                  <input 
                    type="text" 
                    value={p.description}
                    onChange={e => updateParam(i, 'description', e.target.value)}
                    placeholder="description"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-slate-200"
                    aria-label={`Parameter Description ${i + 1}`}
                  />
                  <button onClick={() => removeParam(i)} className="text-slate-600 hover:text-red-400" aria-label={`Remove Parameter ${i + 1}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {params.length === 0 && (
                <p className="text-xs text-slate-600 italic text-center py-2">No parameters defined.</p>
              )}
            </div>
          </div>

        </div>

        <div className="p-4 border-t border-slate-700 bg-slate-800/30 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded text-xs font-mono text-slate-400 hover:text-slate-200" aria-label="Cancel">
            CANCEL
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            aria-label="Save Tool"
          >
            <Save size={14} /> SAVE_TOOL
          </button>
        </div>

      </div>
    </div>
  );
};

export default ToolCreator;
