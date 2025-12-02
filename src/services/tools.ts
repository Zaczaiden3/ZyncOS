import { FunctionDeclaration } from "@google/genai";
import { ToolDefinition } from "../types";
import { pluginManager } from "./pluginManager";
import { autonomicSystem } from "./autonomicSystem";

// Define SchemaType locally as a helper object
const SchemaType = {
  STRING: "STRING",
  NUMBER: "NUMBER",
  INTEGER: "INTEGER",
  BOOLEAN: "BOOLEAN",
  ARRAY: "ARRAY",
  OBJECT: "OBJECT"
};

// --- Tool Implementations ---

// 1. Calculator
const calculate = ({ expression }: { expression: string }) => {
  try {
    // Safety: Only allow basic math characters
    if (!/^[\d\s+\-*/().]+$/.test(expression)) {
      return "Error: Invalid characters in expression.";
    }
    // eslint-disable-next-line no-new-func
    const result = new Function(`return ${expression}`)();
    return JSON.stringify({ result });
  } catch (error) {
    return JSON.stringify({ error: "Failed to calculate expression" });
  }
};

export const calculatorTool: ToolDefinition = {
  name: "calculator",
  declaration: {
    name: "calculator",
    description: "Perform mathematical calculations. Use this for any math questions.",
    parameters: {
      type: SchemaType.OBJECT as any,
      properties: {
        expression: {
          type: SchemaType.STRING as any,
          description: "The mathematical expression to evaluate (e.g., '2 + 2 * 5').",
        },
      },
      required: ["expression"],
    },
  },
  execute: calculate,
};

// 2. Current Time & Date
const getCurrentTime = () => {
  const now = new Date();
  return JSON.stringify({
    current_time: now.toLocaleTimeString(),
    current_date: now.toLocaleDateString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
};

export const timeTool: ToolDefinition = {
  name: "get_current_time",
  declaration: {
    name: "get_current_time",
    description: "Get the current local time and date.",
    parameters: {
      type: SchemaType.OBJECT as any,
      properties: {},
    },
  },
  execute: getCurrentTime,
};

// 3. System Status (Mock)
const getSystemStatus = () => {
  return JSON.stringify({
    cpu_load: "12%",
    memory_usage: "45%",
    active_cores: ["Reflex", "Memory", "Neuro"],
    network_latency: "24ms",
  });
};

export const systemStatusTool: ToolDefinition = {
  name: "get_system_status",
  declaration: {
    name: "get_system_status",
    description: "Get the current status of the Zync OS system.",
    parameters: {
      type: SchemaType.OBJECT as any,
      properties: {},
    },
  },
  execute: getSystemStatus,
};

// 4. Web Search (Simulated)
const searchWeb = async ({ query }: { query: string }) => {
  const apiKey = import.meta.env.VITE_SERPER_API_KEY;

  if (!apiKey) {
    console.warn("VITE_SERPER_API_KEY not found. Falling back to simulated search.");
    // Fallback to simulation if no key is provided
    await new Promise(resolve => setTimeout(resolve, 800));
    return JSON.stringify({
      results: [
        {
          title: `[SIMULATED] ${query} - Wikipedia`,
          snippet: `This is a simulated search result because VITE_SERPER_API_KEY is missing. To enable real search, add your Serper.dev API key to .env file.`,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`
        },
        {
          title: `[SIMULATED] Latest News: ${query}`,
          snippet: `Real web search requires an API key. Please configure the application settings.`,
          url: `https://news.example.com/${encodeURIComponent(query)}`
        }
      ]
    });
  }

  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query }),
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform Serper format to our tool format
    const results = data.organic?.map((item: any) => ({
      title: item.title,
      snippet: item.snippet,
      url: item.link
    })) || [];

    return JSON.stringify({ results: results.slice(0, 5) });
  } catch (error) {
    console.error("Web search failed:", error);
    return JSON.stringify({ error: "Failed to perform web search. Please check your API key and network connection." });
  }
};

export const webSearchTool: ToolDefinition = {
  name: "web_search",
  declaration: {
    name: "web_search",
    description: "Search the web for information. Use this when you need current events, facts, or external knowledge.",
    parameters: {
      type: SchemaType.OBJECT as any,
      properties: {
        query: {
          type: SchemaType.STRING as any,
          description: "The search query.",
        },
      },
      required: ["query"],
    },
  },
  execute: searchWeb,
};

// --- Registry ---

const defaultTools: ToolDefinition[] = [
  calculatorTool,
  timeTool,
  systemStatusTool,
  webSearchTool,
];

// Register default tools
defaultTools.forEach(tool => {
  pluginManager.register({
    definition: tool,
    metadata: {
      id: tool.name,
      name: tool.name,
      description: tool.declaration.description || "",
      version: "1.0.0",
      author: "System",
      enabled: true
    }
  });
});

export const executeTool = async (name: string, args: any) => {
  // Self-Protection: Check Policy
  if (!autonomicSystem.checkPolicy(name, 'execute', args)) {
    return JSON.stringify({ error: `Policy Violation: Execution of tool '${name}' is blocked by the Autonomic Nervous System.` });
  }

  const tool = pluginManager.getActiveTools().find(t => t.name === name);
  if (!tool) {
    return JSON.stringify({ error: `Tool ${name} not found or disabled.` });
  }
  try {
    const result = await tool.execute(args);
    return result;
  } catch (e) {
    // Self-Healing: Report Error
    autonomicSystem.reportError(`Tool:${name}`, e);
    return JSON.stringify({ error: `Tool execution failed: ${e}` });
  }
};
