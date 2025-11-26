import { GoogleGenAI } from "@google/genai";

const apiKey = "AIzaSyDyfbZdrEES_M2hMdoZG3sCtzWE-OllScw";
const ai = new GoogleGenAI({ apiKey });

const MODEL_MEMORY = "gemini-2.0-flash-thinking-exp-01-21";

async function testMemory() {
  console.log(`Testing Memory Core with ${MODEL_MEMORY}...`);
  
  const systemPrompt = "You are Memory Core.";
  const parts = [
      { text: systemPrompt }, 
      { text: "Reflex Response: Hello" },
      { text: "User Query: Hello" }
  ];

  try {
    const result = await ai.models.generateContentStream({
      model: MODEL_MEMORY,
      contents: { parts },
      config: {
        temperature: 0.4,
      }
    });

    console.log("Stream started...");
    for await (const chunk of result) {
      process.stdout.write(chunk.text || ".");
    }
    console.log("\nStream complete.");

  } catch (error) {
    console.error("\nMemory Test Failed:", error);
    if (error.response) {
        console.error("Response:", JSON.stringify(error.response, null, 2));
    }
  }
}

testMemory();
