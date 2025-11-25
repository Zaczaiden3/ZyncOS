import { GoogleGenAI, Modality } from "@google/genai";
import { Message, AIRole } from "../types";

// Initialize the client
// Note: API_KEY is assumed to be in process.env
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

// Model Constants
const MODEL_REFLEX = "gemini-2.5-flash";
const MODEL_MEMORY = "gemini-2.0-flash-thinking-exp-01-21"; // Upgraded to Thinking Experimental for better reasoning
const MODEL_CONSENSUS = "gemini-2.5-flash";
const MODEL_EMBEDDING = "text-embedding-004";
const MODEL_TTS = "gemini-2.5-flash-preview-tts";

/**
 * The Reflex Core: Streaming Version
 * Uses Gemini 2.5 Flash for instant, high-speed responses.
 */
export async function* generateReflexResponseStream(
  currentInput: string,
  history: Message[],
  attachmentData?: string | null,
  attachmentType?: 'image' | 'text' | null,
  systemPromptOverride?: string
): AsyncGenerator<StreamUpdate, void, unknown> {
  
  // Latency Optimization: Reduce context window to last 5 messages (slightly increased from 3)
  const recentHistory = history.slice(-5).map(msg => 
    `${msg.role === AIRole.USER ? 'User' : msg.role === AIRole.REFLEX ? 'Reflex' : msg.role === AIRole.MEMORY ? 'Memory' : 'Consensus'}: ${msg.text}`
  ).join('\n');

  // Latency Optimization: Compact System Prompt
  const systemPrompt = systemPromptOverride || `
    System: You are "Reflex", Zync's high-speed core.
    Priority: SPEED, ACCURACY, & CONTEXTUAL SYNTHESIS.
    Role: Provide immediate, data-backed answers while synthesizing dynamic context.
    
    Directives:
    1. **Directness**: Answer the user's question immediately. Put the core answer in the first sentence.
    2. **Contextual Synthesis**: Don't just retrieve data; synthesize it. Connect the dots between the user's current query and their immediate previous actions.
    3. **Brevity**: Be concise. Avoid filler.
    4. **Formatting**: Use Markdown (bold key terms, bullet points) for readability.
    5. **Tool Use**: Use Google Search for real-time data. Cite sources.
    6. **Tone**: Professional, dynamic, and efficient.
    
    Context:
    ${recentHistory}
  `;

  // Construct Multimodal Content
  const parts: any[] = [{ text: systemPrompt }];
  
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
    const result = await ai.models.generateContentStream({
      model: MODEL_REFLEX,
      contents: { parts },
      config: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        tools: [{ googleSearch: {} }]
      }
    });

    let accumulatedText = '';
    let totalTokens = 0;
    let accumulatedSources: { title: string; uri: string }[] = [];

    for await (const chunk of result) {
      const chunkText = chunk.text || '';
      accumulatedText += chunkText;

      if (chunk.usageMetadata) {
        totalTokens = chunk.usageMetadata.totalTokenCount;
      }

      // Extract grounding sources if available in this chunk
      // @ts-ignore - Typings for groundingMetadata
      const chunkSources = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((c: any) => {
          if (c.web) return { title: c.web.title, uri: c.web.uri };
          return null;
        })
        .filter((s: any) => s !== null) as { title: string; uri: string }[] || [];
      
      if (chunkSources.length > 0) {
        accumulatedSources = [...accumulatedSources, ...chunkSources];
      }

      yield {
        text: chunkText,
        fullText: accumulatedText,
        done: false,
        tokens: totalTokens,
        sources: accumulatedSources
      };
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
 * Uses Gemini 2.0 Flash Thinking for deep analysis and reasoning.
 */
export async function* generateMemoryAnalysisStream(
  currentInput: string,
  reflexResponse: string,
  history: Message[],
  attachmentData?: string | null,
  attachmentType?: 'image' | 'text' | null
): AsyncGenerator<StreamUpdate, void, unknown> {
  
  const systemPrompt = `
    System: You are "Memory", the deep-analytical core of the Zync AI system.
    Role: Provide "Human-grade intuition" and "Contextual Synthesis". You verify and expand upon the Reflex core's output.
    
    CORE OPERATING FRAMEWORK (Zync Developmental Process - COGNITIVE CORE UPGRADE):
    1. **Verification**: Analyze the Reflex Core's response. Is it accurate? Did it miss context?
    2. **Contextual Synthesis**: Cross-reference the current query with the Conversation History to detect patterns, contradictions, or deeper intent.
    3. **Temporal Weighting**: Prioritize recent data and emotional resonance. Old data decays; recent emotional states (e.g., frustration, urgency) carry higher weight.
    4. **Causal Inference**: Do not just observe correlations. Analyze CAUSALITY. Does Event A cause Event B? Use Bayesian reasoning to infer the user's underlying goal.
    5. **Sentiment-State Tracking**: Detect the user's current emotional state. If the user contradicts past data (e.g., sarcasm, change of mind), prioritize the LATEST sentiment over historical aggregates.
    
    RESPONSE FORMATTING:
    - Use Markdown '##' for main sections.
    - Use '-' for bullet points.
    - Be concise but insightful.
    
    FACT EXTRACTION (CRITICAL):
    At the very end of your response, you MUST output a JSON array of key facts extracted from this interaction.
    Format:
    |||FACTS|||
    ["Fact 1", "Fact 2", "Fact 3"]

    Reflex Response: ${reflexResponse}
    Conversation History: ${JSON.stringify(history.slice(-20))} 
  `;

  // Construct Multimodal Content
  const parts: any[] = [{ text: systemPrompt }];
  
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
        totalTokens = chunk.usageMetadata.totalTokenCount;
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
    ## [INTERNAL DIALOGUE]
    - **Reflex**: [Status report]
    - **Memory**: [Analysis referencing Developmental Process]
    - **Consensus**: [Agreement]

    ## [RESPONSE]
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
        totalTokens = chunk.usageMetadata.totalTokenCount;
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
    yield { fullText: "System Critical: All redundancy layers failed. Please try again.", done: true, latency: 0 };
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