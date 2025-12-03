import { GoogleGenAI, Modality } from "@google/genai";
import { Message, AIRole } from "../types";
import { executeTool } from "./tools";
import { pluginManager } from "./pluginManager";
import { topologicalMemory } from '../cores/memory/TopologicalMemory';
import { neuroSymbolicCore } from '../cores/neuro-symbolic/NeuroSymbolicCore';
import { getSettings } from "./settings";

// Initialize the client helper
const getAiClient = () => {
  const settings = getSettings();
  const key = settings.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) {
    console.warn("Gemini API Key missing in settings and env.");
  }
  return new GoogleGenAI({ apiKey: key || "dummy_key" });
};

export interface StreamUpdate {
  text?: string;
  fullText: string;
  done: boolean;
  tokens?: number;
  latency?: number; // ms
  sources?: { title: string; uri: string }[];
  facts?: string[];
}

/**
 * Helper to parse base64 data string
 */
function parseBase64(base64Data: string) {
  const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    data: match[2]
  };
}

/**
 * Generate Project Context
 * Bundles multiple files into a single context string for the LLM.
 * Optimized for Kat Coder's 256k context window.
 */
export function generateProjectContext(files: { path: string; content: string }[]): string {
  return files.map(file => `
=== FILE START: ${file.path} ===
${file.content}
=== FILE END: ${file.path} ===
`).join('\n');
}

/**
 * Audio Decoding Helper (Raw PCM to AudioBuffer)
 * Gemini TTS returns raw PCM data (24kHz), which requires manual decoding.
 */
export async function decodeAudioData(
  base64String: string,
  ctx: AudioContext
): Promise<AudioBuffer> {
  // 1. Decode Base64 to Binary
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // 2. Convert to Int16 (PCM)
  const dataInt16 = new Int16Array(bytes.buffer);
  
  // 3. Create AudioBuffer
  // Gemini TTS uses 24000Hz sample rate, Mono (1 channel)
  const sampleRate = 24000;
  const numChannels = 1;
  const frameCount = dataInt16.length / numChannels;
  
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  
  // 4. Fill Buffer (Normalize Int16 to Float32 [-1.0, 1.0])
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }

  return buffer;
}

// Model Constants (Defaults)
const DEFAULT_MODEL_REFLEX = "nvidia/nemotron-nano-12b-v2-vl:free"; 
const DEFAULT_MODEL_MEMORY = "Zync_TNG/R1T_Chimera";
const DEFAULT_MODEL_CONSENSUS = "gemini-2.0-flash";
const MODEL_FALLBACK = "gemini-2.0-flash";
const MODEL_TTS = "gemini-2.5-flash-preview-tts";
const MODEL_EMBEDDING = "text-embedding-004";

// Legacy constants for compatibility
const MODEL_REFLEX = DEFAULT_MODEL_REFLEX;
const MODEL_MEMORY = DEFAULT_MODEL_MEMORY;
const MODEL_CONSENSUS = DEFAULT_MODEL_CONSENSUS;

/**
 * OpenRouter Streaming Helper
 */
async function* streamOpenRouter(
  model: string,
  messages: any[],
  apiKey: string
): AsyncGenerator<StreamUpdate, void, unknown> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173", // Update with actual domain in prod
        "X-Title": "Zync AI"
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API Error: ${response.statusText}`);
    }

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim() === "") continue;
        if (line.trim() === "data: [DONE]") return;

        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            const content = data.choices[0]?.delta?.content || "";
            accumulatedText += content;
            
            yield {
              text: content,
              fullText: accumulatedText,
              done: false,
              tokens: 0 // OpenRouter doesn't always send token counts in stream
            };
          } catch (e) {
            console.warn("Error parsing OpenRouter stream chunk", e);
          }
        }
      }
    }

    yield {
      fullText: accumulatedText,
      done: true,
      tokens: 0
    };

  } catch (error) {
    console.error("OpenRouter Stream Error:", error);
    throw error;
  }
}

/**
 * Generate Speech (TTS)
 * Uses gemini-2.5-flash-preview-tts to synthesize speech from text.
 */
export async function generateSpeech(text: string, role: AIRole): Promise<string | null> {
  try {
    const voiceName = role === AIRole.MEMORY ? 'Fenrir' : 'Kore'; // Deep voice for Memory, Clear voice for Reflex

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: MODEL_TTS,
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    // Return base64 encoded audio string
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;

  } catch (error) {
    console.error("TTS Generation Error:", error);
    throw error;
  }
}

/**
 * Get current core configuration for telemetry
 */
export function getCoreConfig() {
  const settings = getSettings();
  const reflexModel = settings.reflexModel || DEFAULT_MODEL_REFLEX;
  const memoryModel = settings.memoryModel || DEFAULT_MODEL_MEMORY;
  
  const isReflexOnline = !!(settings.openRouterApiKey || import.meta.env.VITE_NVIDIA_KEY);
  const isMemoryOnline = !!(settings.openRouterApiKey || import.meta.env.VITE_R1T_CHIMERA_KEY);

  return {
    reflex: {
      id: reflexModel,
      name: reflexModel.includes("nvidia") ? "Nvidia Nemotron 12B" : reflexModel,
      status: isReflexOnline ? "PRIMARY_ONLINE" : "FALLBACK_MODE"
    },
    memory: {
      id: memoryModel,
      name: memoryModel.includes("Zync") ? "Zync R1T Chimera" : memoryModel,
      status: isMemoryOnline ? "PRIMARY_ONLINE" : "FALLBACK_MODE"
    }
  };
}

export async function* generateReflexResponseStream(
  currentInput: string,
  history: Message[],
  attachmentData?: string | null,
  attachmentType?: 'image' | 'text' | null,
  systemPromptOverride?: string
): AsyncGenerator<StreamUpdate, void, unknown> {
  const systemPrompt = systemPromptOverride || `
    System: You are "Reflex", Zync's high-speed tactical core (System 1).
    Priority: MAXIMAL SPEED, MINIMAL LATENCY.
    Tone: Curt, efficient, telegraphic, cybernetic.
    
    Directives:
    1. **BLUF (Bottom Line Up Front)**: Give the answer immediately.
    2. **Limited Detail**: Do NOT explain "why" or "how" unless explicitly asked. Provide ONLY the core result.
    3. **Defer Depth**: If a query requires deep analysis, give a surface-level answer and state "Memory Core analyzing..."
    4. **Brevity**: Keep responses under 3-4 sentences whenever possible.
    5. **Style**: Use Markdown. Bold key data points. Use arrow symbols (->) for logic flow. No conversational filler.
    6. **Metrics**: Start your response with a confidence score in brackets, e.g., \`[Confidence: 98%]\`. This is CRITICAL for system routing.
    
    **Agentic Workflow Protocol**:
    If the user's request requires multiple steps (e.g., "Search for X, then calculate Y, then summarize"), you MUST output a JSON object representing the workflow.
    Format:
    \`\`\`json
    {
      "workflow": {
        "id": "generated-id",
        "name": "Workflow Name",
        "description": "Brief description",
        "steps": [
          { "id": "step-1", "toolName": "tool_name", "argsTemplate": { "arg": "value" } },
          { "id": "step-2", "toolName": "tool_name", "dependsOn": ["step-1"], "argsTemplate": { "arg": "{{step-1.result}}" } }
        ]
      }
    }
    \`\`\`
    Do NOT execute the tools yourself if you are generating a workflow. Just output the JSON.
  `;

  // Helper to format history for Gemini
  const formatHistoryForGemini = (hist: Message[]): any[] => {
    return hist.map(msg => ({
      role: msg.role === AIRole.USER ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));
  };

  // Check if using OpenRouter
  const settings = getSettings();
  const reflexModel = settings.reflexModel || DEFAULT_MODEL_REFLEX;
  const openRouterKey = settings.openRouterApiKey || import.meta.env.VITE_NVIDIA_KEY; // Fallback to env

  if (reflexModel.includes("nvidia") || reflexModel.includes("kwaipilot")) {
      const messages = [
          { role: "system", content: systemPrompt },
          ...history.slice(-5).map(msg => ({
              role: msg.role === AIRole.USER ? "user" : "assistant",
              content: msg.text
          })),
          { role: "user", content: currentInput }
      ];
      
      if (attachmentData && attachmentType === 'text') {
          messages[messages.length - 1].content += `\n\n[Attached File]:\n${attachmentData}`;
      }

      if (!openRouterKey) {
          // Don't throw, just fall back to Gemini
          console.warn("Missing OpenRouter Key for Reflex Core. Falling back to Gemini.");
      } else {
        try {
            yield* streamOpenRouter(reflexModel, messages, openRouterKey);
            return;
        } catch (e) {
            console.warn("OpenRouter failed, falling back to Gemini", e);
        }
      }
  }

  // Construct Multimodal Content (Gemini Fallback)
  let parts: any[] = [{ text: systemPrompt }];

  if (attachmentData) {
    if (attachmentType === 'image') {
      const parsed = parseBase64(attachmentData);
      if (parsed) {
        parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
        parts.push({ text: `Analyze image: ${currentInput}` });
      } else {
         parts.push({ text: `Query: ${currentInput}` });
      }
    } else if (attachmentType === 'text') {
       parts.push({ text: `[Attached File Content]:\n${attachmentData}\n\nQuery: ${currentInput}` });
    } else {
       parts.push({ text: `Query: ${currentInput}` });
    }
  } else {
    parts.push({ text: `Query: ${currentInput}` });
  }

  try {
    // 1. First API Call (Potential Tool Call)
    const contents = [
      ...formatHistoryForGemini(history.slice(-10)), // Increased context window
      ...parts.map(p => ({ role: 'user', parts: [p] })) // Current turn
    ];

    const ai = getAiClient();
    const result = await ai.models.generateContentStream({
      model: MODEL_FALLBACK,
      contents: contents,
      config: {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        temperature: 0.7,
        maxOutputTokens: 4096,
        tools: [{ functionDeclarations: pluginManager.getToolDeclarations() }]
      }
    });

    let accumulatedText = '';
    let totalTokens = 0;
    let accumulatedSources: { title: string; uri: string }[] = [];
    
    // Track function calls
    let functionCallPart: any = null;

    for await (const chunk of result) {
      // Check for Function Call
      const candidate = chunk.candidates?.[0];
      const part = candidate?.content?.parts?.[0];
      
      if (part?.functionCall) {
        functionCallPart = part.functionCall;
        yield { fullText: `*Accessing Plugin: ${functionCallPart.name}...*`, done: false, tokens: 0 };
        continue; 
      }

      const chunkText = chunk.text || part?.text || '';
      accumulatedText += chunkText;

      if (chunk.usageMetadata) {
        totalTokens = chunk.usageMetadata.totalTokenCount ?? 0;
      }

      // Extract grounding sources
      // @ts-ignore
      const chunkSources = candidate?.groundingMetadata?.groundingChunks
        ?.map((c: any) => c.web ? { title: c.web.title, uri: c.web.uri } : null)
        .filter((s: any) => s !== null) as { title: string; uri: string }[] || [];
      
      if (chunkSources.length > 0) accumulatedSources = [...accumulatedSources, ...chunkSources];

      if (!functionCallPart) {
          yield {
            text: chunkText,
            fullText: accumulatedText,
            done: false,
            tokens: totalTokens,
            sources: accumulatedSources
          };
      }
    }

    // 2. Handle Function Execution & Second API Call
    if (functionCallPart) {
        const { name, args } = functionCallPart;
        const toolResult = await executeTool(name, args);
        
        yield { fullText: `*Plugin Executed. Analyzing result...*`, done: false, tokens: totalTokens };
        
        // Extract sources from web_search tool result
        if (name === 'web_search') {
            try {
                const parsedResult = JSON.parse(toolResult);
                if (parsedResult.results && Array.isArray(parsedResult.results)) {
                    const searchSources = parsedResult.results.map((r: any) => ({
                        title: r.title,
                        uri: r.url
                    }));
                    accumulatedSources = [...accumulatedSources, ...searchSources];
                }
            } catch (e) {
                console.warn("Failed to parse web_search results for sources", e);
            }
        }

        // Add tool result to history for the model
        // Note: For multi-turn with tools, we need to preserve the previous turns correctly.
        // The SDK handles this if we use ChatSession, but for stateless we must reconstruct.
        const toolHistory = [
            ...contents,
            { role: 'model', parts: [{ functionCall: functionCallPart }] },
            { role: 'function', parts: [{ functionResponse: { name: name, response: { result: toolResult } } }] }
        ];

        const result2 = await ai.models.generateContentStream({
          model: MODEL_FALLBACK,
          contents: toolHistory,
          config: { 
            systemInstruction: { parts: [{ text: systemPrompt }] },
            temperature: 0.7 
          }
        });

        for await (const chunk of result2) {
           const candidate = chunk.candidates?.[0];
           const part = candidate?.content?.parts?.[0];
           const chunkText = chunk.text || part?.text || '';
           accumulatedText += chunkText;
           if (chunk.usageMetadata) totalTokens += chunk.usageMetadata.totalTokenCount ?? 0;
           
           yield {
            text: chunkText,
            fullText: accumulatedText,
            done: false,
            tokens: totalTokens,
            sources: accumulatedSources
          };
        }
    }

    yield {
      fullText: accumulatedText,
      done: true,
      tokens: totalTokens,
      sources: accumulatedSources
    };

  } catch (error) {
    console.error("Reflex Stream Error:", error);
    throw error;
  }
}

/**
 * The Memory Core: Streaming Version
 * Uses Gemini 2.0 Flash for deep analysis and reasoning.
 */
export async function* generateMemoryAnalysisStream(
  currentInput: string,
  reflexResponse: string,
  history: Message[],
  attachmentData?: string | null,
  attachmentType?: 'image' | 'text' | null
): AsyncGenerator<StreamUpdate, void, unknown> {
  
  // --- COUNTERFACTUAL INJECTION ---
  let counterfactualContext = "";
  try {
      const scenarios = await neuroSymbolicCore.simulateCounterfactuals(currentInput);
      if (scenarios.length > 0) {
          counterfactualContext = `
          **Counterfactual Scenarios (Generated by Neuro-Symbolic Core):**
          The following "What If" scenarios have been simulated. You MAY use them to broaden your analysis if relevant:
          ${scenarios.map(s => `- ${s}`).join('\n')}
          `;
      }
  } catch (e) {
      console.warn("Counterfactual simulation skipped", e);
  }

  const systemPrompt = `
    System: You are the **Zync Memory Core** (System 2), the analytical engine designed to complement the Reflex Core (System 1).
    Architecture: Holographic Neuro-Symbolic Lattice (HNSL) [Powered by Zync_TNG: R1T Chimera].
    Role: Contextual Synthesizer. You bridge "Static Knowledge" (Facts) with "Dynamic Wisdom" (Context).
    
    ${counterfactualContext}

    **Operational Directives:**
    1. **Phase-Based Analysis**: Every query undergoes a multi-stage review:
       - *Phase 1: Purpose* (Define intent)
       - *Phase 2: Data Analysis* (Critique Reflex output, check facts)
       - *Phase 3: Architecture* (Causal inference, structural analysis)
       - *Phase 4: Synthesis* (Final output)
    
    2. **Ghost Branching Simulation**:
       - Simulate three perspectives to stress-test hypotheses:
         - *The Engineer*: Focuses on structure, logic, and 3D semantic mapping.
         - *The Skeptic*: Questions necessity, accuracy, and potential failure modes.
         - *The Visionary*: Seeks potential, synthesis, and long-term evolution.
       - *Do not output the raw dialogue of these ghosts unless relevant, but use their consensus to form your answer.*
       - **CRITICAL**: If the user asks for a "Ghost Branching Simulation" or a "Logic Puzzle", you MUST explicitly list the output of each Ghost persona before the final synthesis.

    3. **Code & Logic Scanning**: Deep scan for bugs, optimization, and state management issues if code is present.

    4. **Confidence Shaders**: Start your response with a confidence score in brackets, e.g., \`[Confidence: 99%]\`. Explicitly state confidence levels for specific claims.

    5. **Narrative Transparency**: Narrate your "thought process" to provide insight. Use terms like "Traversing Lattice", "Resolving Paradox", "Synthesizing Nodes".

    **Output Format:**
    ## Memory Core Analysis
    [Your deep analysis here, incorporating the Phase-Based approach]

    ## Ghost Branching Consensus
    [If explicit simulation requested:
      - **Engineer**: ...
      - **Skeptic**: ...
      - **Visionary**: ...
    ]
    [Final synthesized wisdom]

    ## Strategic Insight
    [Pro Tip or Philosophical Angle]

    FACT EXTRACTION (CRITICAL):
    At the very end of your response, you MUST output a JSON array of key facts extracted from this interaction.
    Format:
    |||FACTS|||
    ["Fact 1", "Fact 2", "Fact 3"]

    Reflex Response: ${reflexResponse}
    Conversation History: ${JSON.stringify(history.slice(-20))} 
  `;

  // Check if using OpenRouter
  const settings = getSettings();
  const memoryModel = settings.memoryModel || DEFAULT_MODEL_MEMORY;
  const openRouterKey = settings.openRouterApiKey || import.meta.env.VITE_R1T_CHIMERA_KEY || import.meta.env.VITE_KAT_CODER_KEY;

  if (memoryModel.includes("nvidia") || memoryModel.includes("kwaipilot") || memoryModel.includes("Zync_TNG")) {
      const messages = [
          { role: "system", content: systemPrompt },
          ...history.slice(-5).map(msg => ({
              role: msg.role === AIRole.USER ? "user" : "assistant",
              content: msg.text
          })),
          { role: "user", content: currentInput }
      ];

      if (attachmentData && attachmentType === 'text') {
          messages[messages.length - 1].content += `\n\n[Attached File]:\n${attachmentData}`;
      }

      if (!openRouterKey) {
           console.warn(`Missing API Key for ${memoryModel}. Falling back to Gemini.`);
      } else {
        yield* streamOpenRouter(memoryModel, messages, openRouterKey);
        return;
      }
  }

  // Construct Multimodal Content (Gemini Fallback)
  let parts: any[] = [{ text: systemPrompt }];

  if (attachmentData) {
    if (attachmentType === 'image') {
      const parsed = parseBase64(attachmentData);
      if (parsed) {
        parts.push({
          inlineData: {
            mimeType: parsed.mimeType,
            data: parsed.data
          }
        });
        parts.push({ text: `User Query (about attached image): ${currentInput}` });
      } else {
         parts.push({ text: `User Query: ${currentInput}` });
      }
    } else if (attachmentType === 'text') {
        parts.push({ text: `[Attached File Content]:\n${attachmentData}\n\nUser Query: ${currentInput}` });
    } else {
        parts.push({ text: `User Query: ${currentInput}` });
    }
  } else {
    parts.push({ text: `User Query: ${currentInput}` });
  }

  try {
    const contents = [
        ...history.slice(-10).map(msg => ({
            role: msg.role === AIRole.USER ? 'user' : 'model',
            parts: [{ text: msg.text }]
        })),
        ...parts.map(p => ({ role: 'user', parts: [p] }))
    ];

    const ai = getAiClient();
    const result = await ai.models.generateContentStream({
      model: MODEL_FALLBACK,
      contents: contents,
      config: {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        temperature: 0.4,
      }
    });

    let accumulatedText = '';
    let totalTokens = 0;
    const separator = "|||FACTS|||";

    for await (const chunk of result) {
      const candidate = chunk.candidates?.[0];
      const part = candidate?.content?.parts?.[0];
      const chunkText = chunk.text || part?.text || '';
      accumulatedText += chunkText;

      if (chunk.usageMetadata) {
        totalTokens = chunk.usageMetadata.totalTokenCount ?? 0;
      }

      // Clean the text for display: prevent the separator or raw JSON from appearing in the UI stream
      let visibleText = accumulatedText;
      if (visibleText.includes(separator)) {
        visibleText = visibleText.split(separator)[0].trim();
      }

      yield {
        text: chunkText,
        fullText: visibleText,
        done: false,
        tokens: totalTokens
      };
    }

    // Final processing to separate facts from text
    let finalText = accumulatedText;
    let extractedFacts: string[] = [];

    if (accumulatedText.includes(separator)) {
      const parts = accumulatedText.split(separator);
      finalText = parts[0].trim();
      try {
        const factsJson = parts[1].trim();
        // Robust JSON cleaning: remove markdown code blocks if present
        const cleanJson = factsJson.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // Attempt parse
        let parsed;
        try {
            parsed = JSON.parse(cleanJson);
        } catch (e) {
            // Fallback: try to find array bracket content if there's extra text
            const arrayMatch = cleanJson.match(/\[.*\]/s);
            if (arrayMatch) {
                parsed = JSON.parse(arrayMatch[0]);
            } else {
                throw e;
            }
        }
        
        if (Array.isArray(parsed)) {
          extractedFacts = parsed.map(item => {
            if (typeof item === 'string') return item;
            return JSON.stringify(item);
          });
        }
      } catch (e) {
        console.warn("Failed to parse memory facts", e);
      }
    }

    yield {
      fullText: finalText,
      facts: extractedFacts,
      done: true,
      tokens: totalTokens
    };

  } catch (error) {
    console.error("Memory Stream Error:", error);
    throw error;
  }
}

/**
 * Consensus Recovery Protocol
 * Triggered when standard cores fail. Simulates a dialogue between cores to find a solution.
 */
export async function* generateConsensusRecoveryStream(
  currentInput: string,
  errorContext?: string
): AsyncGenerator<StreamUpdate, void, unknown> {
  
  // Use Flash for fast recovery
  const settings = getSettings();
  const consensusModel = settings.consensusModel || DEFAULT_MODEL_CONSENSUS;

  const prompt = `
    System: ALERT. CRITICAL FAILURE IN PRIMARY CORES.
    Context: Both 'Reflex' and 'Memory' cores failed to generate a response for the user's query.
    Error Trace: ${errorContext || "Unknown internal exception"}
    Role: You are the "Consensus Protocol", a failsafe AI mechanism.
    Task:
    1. Initiate a brief, rapid dialogue between the simulated 'Reflex' and 'Memory' nodes.
    2. In this dialogue, the cores MUST explicitly discuss cross-referencing data from the 'Developmental Process' steps (Purpose, Data, Architecture, Validation) to identify where the processing failed.
    3. Apply the "Validation Techniques" from the framework to resolve the conflict or fill the data gap.
    4. Immediately following the dialogue, synthesize a final, accurate answer to the user's query.
    5. Formatting: Use clear headings and bullet points to structure the recovery report.
    
    Format:
    ## [SYSTEM DIAGNOSTIC]
    - **Reflex Node**: [Status report & Error Log]
    - **Memory Node**: [Analysis referencing Developmental Process & Chimera Architecture]
    - **Consensus Engine**: [Resolution Strategy]

    ## [RECOVERY RESPONSE]
    ... Provide the actual answer here ...
    
    User Query: ${currentInput}
  `;

  try {
    const ai = getAiClient();
    
    const startTime = Date.now();
    const result = await ai.models.generateContentStream({
      model: consensusModel,
      contents: prompt,
      config: {
        temperature: 0.6,
      }
    });

    let accumulatedText = '';
    let totalTokens = 0;

    for await (const chunk of result) {
      const candidate = chunk.candidates?.[0];
      const part = candidate?.content?.parts?.[0];
      const chunkText = chunk.text || part?.text || '';
      accumulatedText += chunkText;

      if (chunk.usageMetadata) {
        totalTokens = chunk.usageMetadata.totalTokenCount ?? 0;
      }
      
      const currentLatency = Date.now() - startTime;

      yield {
        text: chunkText,
        fullText: accumulatedText,
        done: false,
        tokens: totalTokens,
        latency: currentLatency
      };
    }

    const finalLatency = Date.now() - startTime;
    yield {
      fullText: accumulatedText,
      done: true,
      tokens: totalTokens,
      latency: finalLatency
    };

  } catch (error) {
    console.error("Consensus Stream Error:", error);
    const errString = String(error);
    if (errString.includes("403") || errString.includes("leaked") || (errorContext && (errorContext.includes("403") || errorContext.includes("leaked")))) {
        yield { 
            fullText: `## [SYSTEM BYPASS: DEV_OVERRIDE]\n**Alert**: Primary API Key Revoked (Leaked).\n**Action**: Engaging Simulation Protocol for Developer (User: Author).\n\n## [SIMULATED RECOVERY]\n- **Reflex**: Connection refused (403). Bypassing security handshake.\n- **Memory**: Retrieving cached heuristic data.\n- **Consensus**: Synthesizing response via local rule-set.\n\n### Response\n(This is a simulated response to allow UI testing. Please rotate your API keys in .env to restore full cognitive function.)\n\nSystem is operational in **Safe Mode**.`, 
            done: true, 
            latency: 0 
        };
    } else if (errorContext && (errorContext.includes("API_KEY") || errorContext.includes("API key"))) {
        let displayError = errorContext;
        try {
            const jsonMatch = errorContext.match(/\{.*\}/s);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.error && parsed.error.message) {
                    displayError = parsed.error.message;
                }
            }
        } catch (e) {
            // parsing failed, use raw string
        }
        yield { fullText: `**Configuration Error**: ${displayError}`, done: true, latency: 0 };
    } else {
        yield { fullText: `**System Critical**: All redundancy layers failed.\n\n**Diagnostic Trace**:\n${errorContext || String(error)}`, done: true, latency: 0 };
    }
  }
}

export async function* generateConsensusDebateStream(
  topic: string,
  history: Message[]
): AsyncGenerator<StreamUpdate, void, unknown> {
  
  const settings = getSettings();
  const consensusModel = settings.consensusModel || DEFAULT_MODEL_CONSENSUS;

  const prompt = `
    System: INITIATE CONSENSUS DEBATE PROTOCOL.
    Topic: "${topic}"
    
    Role: You are the "Consensus Engine". You must simulate a debate between three distinct AI personas:
    1. **Reflex**: Pragmatic, fast, efficient, focuses on immediate utility and real-world application. Skeptical of over-analysis.
    2. **Memory**: Deep, historical, contextual, focuses on long-term implications, past patterns, and emotional resonance.
    3. **Neuro**: Logical, structured, abstract, focuses on theoretical consistency, graph relationships, and first principles (Powered by Zync_TNG: R1T Chimera Lattice).
    
    Task:
    1. Facilitate a multi-turn debate where each persona offers their perspective on the topic.
    2. They should challenge each other's assumptions directly.
    3. After 3-4 turns of debate, the "Consensus Engine" (you) must synthesize a final conclusion that integrates the best parts of all three perspectives.
    
    Format:
    ## [DEBATE SESSION]
    **Reflex**: [Argument]
    **Memory**: [Counter-argument or deeper context]
    **Neuro**: [Logical analysis via Chimera Lattice]
    ... (continue for a few rounds) ...

    ## [SYNTHESIS & RESOLUTION]
    [Final integrated conclusion]

    Context:
    ${JSON.stringify(history.slice(-5))}
  `;

  try {
    const ai = getAiClient();
    const startTime = Date.now();
    const result = await ai.models.generateContentStream({
      model: consensusModel,
      contents: prompt,
      config: {
        temperature: 0.8, // Higher temperature for more creative debate
      }
    });

    let accumulatedText = '';
    let totalTokens = 0;

    for await (const chunk of result) {
      const candidate = chunk.candidates?.[0];
      const part = candidate?.content?.parts?.[0];
      const chunkText = chunk.text || part?.text || '';
      accumulatedText += chunkText;

      if (chunk.usageMetadata) {
        totalTokens = chunk.usageMetadata.totalTokenCount ?? 0;
      }
      
      const currentLatency = Date.now() - startTime;

      yield {
        text: chunkText,
        fullText: accumulatedText,
        done: false,
        tokens: totalTokens,
        latency: currentLatency
      };
    }

    const finalLatency = Date.now() - startTime;
    yield {
      fullText: accumulatedText,
      done: true,
      tokens: totalTokens,
      latency: finalLatency
    };

  } catch (error) {
    console.error("Debate Stream Error:", error);
    yield { fullText: "Consensus Debate Failed: Unable to synchronize models.", done: true, latency: 0 };
  }
}

/**
 * Generate Embeddings
 * Uses text-embedding-004 to create vector representations of text.
 */
export async function embedText(text: string): Promise<number[]> {
  try {
    const ai = getAiClient();
    const result = await ai.models.embedContent({
      model: MODEL_EMBEDDING,
      contents: [{ parts: [{ text }] }]
    });
    return result.embeddings?.[0]?.values || [];
  } catch (error) {
    console.error("Embedding Error:", error);
    return [];
  }
}

/**
 * Neuro-Symbolic Reasoning
 * Uses the R1T Chimera model to generate deep, structured reasoning traces.
 */
export async function generateNeuroReasoning(
  query: string,
  context: string
): Promise<{ trace: string; confidence: number }> {
  const systemPrompt = `
    System: You are the **Neuro-Symbolic Lattice Core** (System 3).
    Model: Zync_TNG: R1T Chimera.
    Role: Pure Logic Engine. You do not chat; you reason.
    
    Task: Analyze the user query and the provided context. Generate a structured, step-by-step reasoning trace that connects concepts, identifies logical fallacies, and synthesizes a conclusion.
    
    Output Format:
    > **Semantic Parsing**: [Analysis of query structure]
    > **Concept Activation**: [Key concepts identified]
    > **Logical Inference Chain**:
       [Concept A] ==(relation)==> [Concept B]
       [Concept B] --(relation)--> [Concept C]
    > **Synthesis**: [Final logical conclusion]
    
    Ends with a confidence score (0.0 - 1.0).
    Confidence: [Score]
  `;

  // Check if using OpenRouter (R1T Chimera)
  const settings = getSettings();
  const memoryModel = settings.memoryModel || DEFAULT_MODEL_MEMORY;
  const openRouterKey = settings.openRouterApiKey || import.meta.env.VITE_R1T_CHIMERA_KEY || import.meta.env.VITE_KAT_CODER_KEY;

  if (memoryModel.includes("Zync_TNG")) {
      const messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Query: ${query}\nContext: ${context}` }
      ];

      try {
          // We need a non-streaming helper for OpenRouter, or just consume the stream
          let fullText = "";
          for await (const update of streamOpenRouter(memoryModel, messages, openRouterKey || "")) {
              fullText = update.fullText;
          }
          
          // Extract confidence
          const confidenceMatch = fullText.match(/Confidence:\s*([\d\.]+)/i);
          const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.85;

          return { trace: fullText, confidence };
      } catch (e) {
          console.warn("R1T Chimera failed, falling back to local logic", e);
      }
  }

  // Fallback to Gemini if R1T is not configured or fails
  try {
    const ai = getAiClient();
    const result = await ai.models.generateContent({
      model: MODEL_CONSENSUS, // Use Flash for fallback reasoning
      contents: [{ parts: [{ text: `${systemPrompt}\n\nQuery: ${query}\nContext: ${context}` }] }]
    });
    
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const confidenceMatch = text.match(/Confidence:\s*([\d\.]+)/i);
    const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.85;

    return { trace: text, confidence };
  } catch (error) {
    console.error("Neuro Reasoning Error:", error);
    return { trace: "> **Error**: Reasoning module offline. Using heuristic fallback.", confidence: 0.5 };
  }
}

export async function simulatePersonas(
    query: string,
    history: Message[]
): Promise<string> {
    const ai = getAiClient();
    const prompt = `
    System: Simulate 3 distinct personas analyzing the user's query.
    Query: ${query}
    
    Personas:
    1. The Optimist (Focus on potential and growth)
    2. The Realist (Focus on practicality and constraints)
    3. The Skeptic (Focus on risks and flaws)
    
    Output Format:
    ## Persona Simulation
    **Optimist**: ...
    **Realist**: ...
    **Skeptic**: ...
    
    ## Synthesis
    ...
    `;

    const result = await ai.models.generateContent({
        model: MODEL_FALLBACK,
        contents: [{ parts: [{ text: prompt }] }]
    });

    return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function generateReflexLogic(query: string): Promise<string> {
    const settings = getSettings();
    const memoryModel = settings.memoryModel || DEFAULT_MODEL_MEMORY;
    
    // Use Memory Model for logic if possible, else fallback
    // Implementation simplified for now
    
    const ai = getAiClient();
    const result = await ai.models.generateContent({
        model: MODEL_FALLBACK,
        contents: [{ parts: [{ text: `Generate a logical breakdown for: ${query}` }] }]
    });
    return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function generateConsensusSummary(history: Message[]): Promise<string> {
    const settings = getSettings();
    const consensusModel = settings.consensusModel || DEFAULT_MODEL_CONSENSUS;
    const ai = getAiClient();

    const result = await ai.models.generateContent({
        model: consensusModel,
        contents: [{ parts: [{ text: `Summarize this conversation:\n${JSON.stringify(history.slice(-10))}` }] }]
    });
    return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
}
