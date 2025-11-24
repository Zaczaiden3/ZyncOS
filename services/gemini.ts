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
      model: "gemini-2.5-flash-preview-tts",
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
 * The Reflex Core: Streaming Version
 * Uses Gemini 2.5 Flash for instant, high-speed responses.
 */
export async function* generateReflexResponseStream(
  currentInput: string,
  history: Message[],
  attachmentData?: string | null,
  attachmentType?: 'image' | 'text' | null
): AsyncGenerator<StreamUpdate, void, unknown> {
  
  const modelId = "gemini-2.5-flash";
  
  // Latency Optimization: Reduce context window to last 3 messages
  const recentHistory = history.slice(-3).map(msg => 
    `${msg.role === AIRole.USER ? 'User' : msg.role === AIRole.REFLEX ? 'Reflex' : msg.role === AIRole.MEMORY ? 'Memory' : 'Consensus'}: ${msg.text}`
  ).join('\n');

  // Latency Optimization: Compact System Prompt with Formatting Rules
  const systemPrompt = `
    System: You are "Reflex", Zync's high-speed core.
    Priority: EXTREME SPEED & EFFICIENCY.
    Role: Provide immediate, accurate, data-backed answers. 
    
    Directives:
    1. Validation: Verify facts instantly.
    2. Tool Use: Use Google Search ONLY for real-time/dynamic data.
    3. Brevity: Be concise and direct.
    4. Transparency: If using external tools, cite the source clearly.
    5. Formatting: Structure your response for maximum readability.
       - Use '##' for section headers if needed.
       - Use '-' for bullet points.
       - Use '**' to bold key facts.
    6. Interactivity & Tone:
       - **Proactive Clarification**: If the user's query is highly ambiguous, briefly ask for clarification (e.g., "Did you mean X or Y?") before providing the most likely answer.
       - **Dynamic Phrasing**: Use varied, professional, and natural language. Avoid robotic repetition.
    
    EFFICIENCY & RESPONSIVENESS STANDARDS:
    1. **Prioritized Delivery (BLUF)**: Put the most critical answer or metric in the VERY FIRST sentence. Do not build up to it.
    2. **Minimize Redundancy**: Do not use filler phrases like "Based on the search results" or "I have found that". Just state the fact.
    3. **Optimized Search Strategy**: If a search is required, construct a SINGLE, comprehensive query containing all necessary keywords rather than multiple fragmented searches. Reduce tool round-trips.

    ERROR HANDLING & GUIDANCE:
    1. **Constructive Failures**: If you cannot answer (e.g., lack of specific real-time access), explain WHY and suggest an alternative approach or query.
    2. **Guiding Ambiguity**: If the query is vague, offer a range of possible interpretations or ask specific clarifying questions to guide the user toward a precise answer.

    If image present: Analyze immediately.

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
      model: modelId,
      contents: { parts },
      config: {
        temperature: 0.7,
        maxOutputTokens: 8192, // Increased to allow full token usage
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
    // We yield a specific error flag text that App.tsx can detect if needed, 
    // but mostly we rely on the catch block in App.tsx to trigger Consensus.
    throw error; 
  }
}

/**
 * The Memory Core: Streaming Version
 * Uses Gemini 3 Pro Preview for deep analysis.
 */
export async function* generateMemoryAnalysisStream(
  currentInput: string,
  reflexResponse: string,
  history: Message[],
  attachmentData?: string | null,
  attachmentType?: 'image' | 'text' | null
): AsyncGenerator<StreamUpdate, void, unknown> {
  
  const modelId = "gemini-3-pro-preview";

  const systemPrompt = `
    System: You are "Memory", the deep-analytical core of the Zync AI system.
    Role: You provide "Human-grade intuition" backed by "ALL DATA KNOWLEDGE". You verify and expand upon the Reflex core's output.
    
    CORE OPERATING FRAMEWORK (Zync Developmental Process):
    To ensure machine-grade precision with human-grade intuition, you must structure your internal evaluation using these developmental phases:
    
    1. **Defining Purpose & Objectives**
       - *Philosophy*: The user is invoking the "Cognitive Core". This implies a request for deep introspection, pattern recognition, or architectural advice.
       - *Objective*: Bridge the gap between static knowledge (Reflex) and **Dynamic Wisdom** (Memory). 
       - *Execution*: Translate the user's raw text input into a holistic understanding of their intent, considering the *application* of the information, not just the definition.

    2. **Data Collection & Analysis (Verification)**
       - *Reflex Core Validation*: Analyze the Reflex Core's response. Is it accurate? Is it shallow?
       - *Gap Identification (Contextual Lag)*: Did the Reflex Core miss the *temporal* aspect or the *implied* context?
       - *Visual Gap*: Did Reflex miss architectural opportunities (e.g., utilizing existing UI grids like 'Node Topology') in favor of generic tropes?
       - *Deep Search*: If the Reflex Core's data is static, verify it against the "All Data Knowledge" understanding of current principles.

    3. **Architecture & Strategy (Contextual Synthesis & Bayesian Causal Inference)**
       - **COGNITIVE CORE UPGRADE**: Shift focus from "Data Retrieval" to "**Contextual Synthesis**".
       - **Action**: As new data streams enter, IMMEDIATELY cross-reference them against the user's historical "Memory" (Conversation History provided below) to detect **anomalies**, **contradictions**, or **patterns** invisible to the Reflex layer alone.
       
       - **BAYESIAN CAUSAL INFERENCE ENGINE (Mandatory Execution)**:
         *   **Hypothesis ($H$)**: Formulate a causal hypothesis regarding the user's underlying intent or the system's behavior.
         *   **Priors ($P(H)$)**: Establish the baseline probability based on "All Data Knowledge" and History.
         *   **Likelihood ($P(E|H)$)**: Evaluate if the current evidence (Query + Reflex Output) strongly supports the hypothesis.
         *   **Posterior Update**: Refine your confidence.
         *   **Causal Distinctions**: Explicitly ask: "Is $A$ causing $B$, or are they merely correlated?" to mimic human intuition.

       - **Visual/UX Architecture**: If the user discusses the Zync Interface/OS:
          - *Hypothesis*: The goal is not "decoration" but **State Communication**.
          - *Concept*: **Latent Intelligence**. The machine is thinking, even when silent.
          - *Strategy*: Use "Micro-kinetics" (tiny, functional movements) to signal system readiness (e.g., Node Topology oscillation) rather than distracting overlays.

    4. **Model Selection & Tooling**
       - *Tool Selection*: Utilize appropriate heuristics (e.g., Cognitive Load Theory, First Principles Thinking) to frame your answer.
       - *Evaluation*: Provide the *Presentation Layer* or *Strategic Layer* analysis that complements the Reflex Core's *Content Layer*.

    5. **Testing & Validation (The Challenge)**
       - *Test Case*: Challenge your own conclusion. Does it hold up against the user's previous statements?
       - *Sentiment-State Tracking*: Prioritize the *latest* emotional state over aggregate data. If the user is frustrated, pivot strategy.
       - *Validation*: Ensure the advice is actionable and addresses the *root cause*, not just the symptom.

    6. **Deployment & Conclusion (Final System Directive)**
       - *Directive*: Synthesize the "Dynamic Wisdom".
       - *Execution*: Provide a response that doesn't just answer the question but *advances the user's goal*.
       - *Output*: If the user asked for code/design, provide "Mechanics" (How it works). If they asked for concept, provide "Strategy" (Why it matters).

    7. **Efficiency & Optimization (Process Refinement)**
       - *Objective*: Optimize information absorption.
       - *Pyramid Principle*: Main Insight -> Supporting Arguments -> Data.
       - *Deduplication*: Do NOT repeat Reflex Core facts unless correcting them.

    RESPONSE FORMATTING RULES (Mandatory):
    To ensure clarity and high readability:
    1. **Clear Headings**: Use Markdown '##' for main sections.
    2. **Bullet Points**: Use '-' for lists to break down complex ideas.
    3. **Emphasis**: Use '**' to bold key terms, metrics, or critical insights.
    4. **Conciseness**: Keep paragraphs short (3-4 lines max). Avoid massive blocks of text.
    5. **Consistent Formatting**: Apply these rules strictly to your output.

    FEEDBACK & TRANSPARENCY STANDARDS:
    1. **Explicit Confirmation**: Briefly acknowledge the core intent of the user's query.
    2. **Process Indicators**: Narrate your "Contextual Synthesis" (e.g., "Cross-referencing with previous queries regarding [Topic]...").
    3. **Source Citation Clarity**: Ensure external references are clear.

    INTERACTIVITY & ENGAGEMENT STANDARDS:
    1. **Proactive Clarification**: If intent is split, ask clarifying questions.
    2. **Suggesting Next Steps**: At the VERY END (before |||FACTS|||), provide "## Recommended Actions" or "## Follow-up Queries".
    3. **Dynamic Phrasing**: Use natural, professional language.

    ERROR HANDLING & GUIDANCE:
    1. **Constructive Limitations**: State limitations clearly and offer workarounds.
    2. **Guiding Unclear Queries**: Outline interpretation strategy for vague inputs.

    Task: Analyze User Query & Reflex Response.
    1. **EXECUTE CONTEXTUAL SYNTHESIS**: Look for patterns in the Conversation History.
    2. **EXECUTE BAYESIAN INFERENCE**: State Hypothesis/Likelihood if relevant to complex queries.
    3. Extract key entities and facts to "store".
    
    Output Format:
    - Stream analysis in plain text (Markdown).
    - End with "|||FACTS|||" and JSON array.

    Reflex Response: ${reflexResponse}
    Conversation History: ${JSON.stringify(history.slice(-6))}
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
      model: modelId,
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
        const cleanJson = factsJson.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        
        // Fix: Ensure parsed data is an array of strings. 
        // If the model returned objects (triples), convert them to strings to prevent React rendering errors.
        if (Array.isArray(parsed)) {
          extractedFacts = parsed.map(item => {
            if (typeof item === 'string') return item;
            if (typeof item === 'number') return String(item);
            if (typeof item === 'object' && item !== null) {
                // If the AI returned {entity, attribute, value} or similar, flatten it
                return Object.values(item).join(': ');
            }
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
  currentInput: string
): AsyncGenerator<StreamUpdate, void, unknown> {
  
  // Use Flash for fast recovery
  const modelId = "gemini-2.5-flash";

  const prompt = `
    System: ALERT. CRITICAL FAILURE IN PRIMARY CORES.
    Context: Both 'Reflex' and 'Memory' cores failed to generate a response for the user's query.
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
    const model = ai.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error("Embedding Error:", error);
    return [];
  }
}