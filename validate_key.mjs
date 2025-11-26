import { GoogleGenAI } from "@google/genai";

const apiKey = "AIzaSyDyfbZdrEES_M2hMdoZG3sCtzWE-OllScw";
const ai = new GoogleGenAI({ apiKey });

async function validate() {
  try {
    console.log("Attempting to generate content with gemini-1.5-flash...");
    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ parts: [{ text: "Reply with 'Valid'" }] }]
    });
    
    if (result && result.candidates && result.candidates.length > 0) {
        console.log("Validation Successful: API Key is working.");
        console.log("Response:", result.candidates[0].content.parts[0].text);
    } else {
        console.log("Validation Failed: No candidates returned.");
        console.log(JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error("Validation Failed:", error);
  }
}

validate();
