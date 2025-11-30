import { GoogleGenAI, Modality } from "@google/genai";
import { Message, AIRole } from "../types";
import { toolDeclarations, executeTool } from "./tools";
import { autonomicSystem } from "./autonomicSystem";

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
const MODEL_FALLBACK = "gemini-2.0-flash"; // Universal Fallback
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
    if (errorContext && (errorContext.includes("API_KEY") || errorContext.includes("API key") || errorContext.includes("401"))) {
        yield { fullText: `**[SYSTEM ALERT] Configuration Error**\n\nPrimary neural pathways are blocked. Please verify your API keys in the .env file.\n\nError Trace: ${errorContext}`, done: true, latency: 0 };
    } else {
        yield { fullText: `**[SYSTEM CRITICAL] Redundancy Failure**\n\nAll primary and secondary cores have failed to respond. This may be due to high network latency or model unavailability.\n\n**Recommendation**: \n1. Check your internet connection.\n2. Verify API Quotas.\n3. Try a simpler query.\n\nError Trace: ${errorContext}`, done: true, latency: 0 };
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