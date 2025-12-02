import { CreateMLCEngine, MLCEngine, InitProgressCallback } from "@mlc-ai/web-llm";
import { Message, AIRole } from "../types";
import { StreamUpdate } from "./gemini";

// Use a lightweight model for offline usage
// Llama-3.2-1B is extremely efficient for browser usage
const SELECTED_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

let engine: MLCEngine | null = null;
let isInitializing = false;

export const initializeOfflineModel = async (
  onProgress: (progress: string) => void
): Promise<void> => {
  if (engine) return;
  if (isInitializing) return;

  // Check for WebGPU support
  if (!(navigator as any).gpu) {
    throw new Error("WebGPU is not supported in this browser. Offline mode requires a WebGPU-compatible browser (e.g., Chrome, Edge).");
  }

  isInitializing = true;
  try {
    const initProgressCallback: InitProgressCallback = (report) => {
      onProgress(report.text);
    };

    engine = await CreateMLCEngine(
      SELECTED_MODEL,
      { initProgressCallback }
    );
    console.log("Offline Model Initialized");
  } catch (error) {
    console.error("Failed to initialize offline model:", error);
    throw new Error(`Failed to load offline model: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    isInitializing = false;
  }
};

export const isOfflineModelReady = () => !!engine;

export async function* generateOfflineResponseStream(
  currentInput: string,
  history: Message[]
): AsyncGenerator<StreamUpdate, void, unknown> {
  if (!engine) {
    throw new Error("Offline model not initialized");
  }

  // Format messages for WebLLM (OpenAI-compatible format)
  const messages = [
    { role: "system", content: "You are Zync Offline, a helpful local AI assistant. You are running completely in the user's browser. Be concise and helpful." },
    ...history.slice(-10).map(msg => ({
      role: msg.role === AIRole.USER ? "user" : "assistant",
      content: msg.text
    })),
    { role: "user", content: currentInput }
  ];

  try {
    const chunks = await engine.chat.completions.create({
      messages: messages as any,
      stream: true,
      temperature: 0.7,
    });

    let accumulatedText = '';
    let totalTokens = 0;

    for await (const chunk of chunks) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        accumulatedText += content;
        totalTokens += 1; // Rough estimation
        
        yield {
          text: content,
          fullText: accumulatedText,
          done: false,
          tokens: totalTokens
        };
      }
    }

    yield {
      fullText: accumulatedText,
      done: true,
      tokens: totalTokens
    };

  } catch (error) {
    console.error("Offline Generation Error:", error);
    yield { fullText: "Error generating offline response. The model might have crashed.", done: true };
  }
}
