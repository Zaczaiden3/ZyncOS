import { GoogleGenAI } from "@google/genai";

const apiKey = "AIzaSyDyfbZdrEES_M2hMdoZG3sCtzWE-OllScw";
const ai = new GoogleGenAI({ apiKey });

async function listModels() {
  try {
    console.log("Listing available models...");
    const result = await ai.models.list();
    // The result might be an async generator or a list
    for await (const model of result) {
        console.log(model.name);
    }
  } catch (error) {
    console.error("List Models Failed:", error);
  }
}

listModels();
