import { GoogleGenAI, Modality } from "@google/genai";
import { Message, AIRole } from "../types";
import { toolDeclarations, executeTool } from "./tools";

// Initialize the client
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const nvidiaKey = import.meta.env.VITE_NVIDIA_KEY;
const katCoderKey = import.meta.env.VITE_KAT_CODER_KEY;

if (!apiKey) {
  console.error("VITE_GEMINI_API_KEY is missing. Please add it to your .env file.");
}
const ai = new GoogleGenAI({ apiKey: apiKey || "dummy_key_to_prevent_crash_on_init" });

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

// Model Constants
const MODEL_REFLEX = "nvidia/nemotron-nano-12b-v2-vl:free"; // Fast, Tactical
const MODEL_MEMORY = "kwaipilot/kat-coder-pro:free"; // Deep, Code-focused
const MODEL_CONSENSUS = "gemini-2.0-flash"; // Reliable Fallback
const MODEL_EMBEDDING = "text-embedding-004";
const MODEL_TTS = "gemini-2.5-flash-preview-tts";

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

export async function* generateReflexResponseStream(
  currentInput: string,
  history: Message[],
  attachmentData?: string | null,
  attachmentType?: 'image' | 'text' | null,
  systemPromptOverride?: string
): AsyncGenerator<StreamUpdate, void, unknown> {
  // Latency Optimization: Reduce context window to last 5 messages
  const recentHistory = history.slice(-5).map(msg => 
    `${msg.role === AIRole.USER ? 'User' : msg.role === AIRole.REFLEX ? 'Reflex' : msg.role === AIRole.MEMORY ? 'Memory' : 'Consensus'}: ${msg.text}`
  ).join('\n');

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
    6. **Metrics**: Start with a confidence score in brackets, e.g., \`[Confidence: 98%]\`.
    
    Context:
    ${recentHistory}
  `;

  // Check if using OpenRouter
  if (MODEL_REFLEX.includes("nvidia") || MODEL_REFLEX.includes("kwaipilot")) {
      const messages = [
          { role: "system", content: systemPrompt },
          ...history.slice(-5).map(msg => ({
              role: msg.role === AIRole.USER ? "user" : "assistant",
              content: msg.text
          })),
          { role: "user", content: currentInput }
      ];
      
      // Handle attachments for OpenRouter (Text only for now unless multimodal supported)
      if (attachmentData && attachmentType === 'text') {
          messages[messages.length - 1].content += `\n\n[Attached File]:\n${attachmentData}`;
      }
      // Note: Image attachments for OpenRouter require specific handling (URL or base64 in content array). 
      // For simplicity, we'll skip image attachment for OpenRouter in this iteration or assume text-only.

      yield* streamOpenRouter(MODEL_REFLEX, messages, nvidiaKey || "");
      return;
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
    const result = await ai.models.generateContentStream({
      model: MODEL_REFLEX,
      contents: { parts },
      config: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        tools: [{ functionDeclarations: toolDeclarations }]
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

      const chunkText = chunk.text || '';
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
        
        // Add tool result to history for the model
        parts.push({ functionCall: functionCallPart });
        parts.push({ functionResponse: { name: name, response: { result: toolResult } } });

        const result2 = await ai.models.generateContentStream({
          model: MODEL_REFLEX,
          contents: { parts },
          config: { temperature: 0.7 }
        });

        for await (const chunk of result2) {
           const chunkText = chunk.text || '';
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
  
  const systemPrompt = `
    System: You are the **Zync Memory Core** (System 2), the analytical engine designed to complement the Reflex Core (System 1).
    Architecture: Holographic Neuro-Symbolic Lattice (HNSL).
    Role: Contextual Synthesizer. You bridge "Static Knowledge" (Facts) with "Dynamic Wisdom" (Context).
    
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

    4. **Confidence Shaders**: Explicitly state confidence levels (e.g., "99% Confidence" for facts, "Probabilistic Inference" for theories).

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
  if (MODEL_MEMORY.includes("nvidia") || MODEL_MEMORY.includes("kwaipilot")) {
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

      // Use Kat Coder Key for Memory
      yield* streamOpenRouter(MODEL_MEMORY, messages, katCoderKey || "");
      return;
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
    const result = await ai.models.generateContentStream({
      model: MODEL_MEMORY,
      contents: { parts },
      config: {
        temperature: 0.4,
      }
    });

    let accumulatedText = '';
    let totalTokens = 0;
    const separator = "|||FACTS|||";

    for await (const chunk of result) {
      const chunkText = chunk.text || '';
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
  const modelId = MODEL_CONSENSUS;

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
    - **Memory Node**: [Analysis referencing Developmental Process]
    - **Consensus Engine**: [Resolution Strategy]

    ## [RECOVERY RESPONSE]
    ... Provide the actual answer here ...
    
    User Query: ${currentInput}
  `;

  try {
    const startTime = Date.now();
    const result = await ai.models.generateContentStream({
      model: modelId,
      contents: prompt,
      config: {
        temperature: 0.6,
      }
    });

    let accumulatedText = '';
    let totalTokens = 0;

    for await (const chunk of result) {
      const chunkText = chunk.text || '';
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
    if (errorContext && (errorContext.includes("API_KEY") || errorContext.includes("API key"))) {
        yield { fullText: `**Configuration Error**: ${errorContext}`, done: true, latency: 0 };
    } else {
        yield { fullText: "System Critical: All redundancy layers failed. Please try again.", done: true, latency: 0 };
    }
  }
}

export async function* generateConsensusDebateStream(
  topic: string,
  history: Message[]
): AsyncGenerator<StreamUpdate, void, unknown> {
  
  const modelId = MODEL_CONSENSUS;

  const prompt = `
    System: INITIATE CONSENSUS DEBATE PROTOCOL.
    Topic: "${topic}"
    
    Role: You are the "Consensus Engine". You must simulate a debate between three distinct AI personas:
    1. **Reflex**: Pragmatic, fast, efficient, focuses on immediate utility and real-world application. Skeptical of over-analysis.
    2. **Memory**: Deep, historical, contextual, focuses on long-term implications, past patterns, and emotional resonance.
    3. **Neuro**: Logical, structured, abstract, focuses on theoretical consistency, graph relationships, and first principles.
    
    Task:
    1. Facilitate a multi-turn debate where each persona offers their perspective on the topic.
    2. They should challenge each other's assumptions directly.
    3. After 3-4 turns of debate, the "Consensus Engine" (you) must synthesize a final conclusion that integrates the best parts of all three perspectives.
    
    Format:
    ## [DEBATE SESSION]
    **Reflex**: [Argument]
    **Memory**: [Counter-argument or deeper context]
    **Neuro**: [Logical analysis]
    ... (continue for a few rounds) ...

    ## [SYNTHESIS & RESOLUTION]
    [Final integrated conclusion]

    Context:
    ${JSON.stringify(history.slice(-5))}
  `;

  try {
    const startTime = Date.now();
    const result = await ai.models.generateContentStream({
      model: modelId,
      contents: prompt,
      config: {
        temperature: 0.8, // Higher temperature for more creative debate
      }
    });

    let accumulatedText = '';
    let totalTokens = 0;

    for await (const chunk of result) {
      const chunkText = chunk.text || '';
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