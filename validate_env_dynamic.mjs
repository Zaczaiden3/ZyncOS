import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';

async function validate() {
  console.log("--- ZyncAI API Key Validator ---");
  
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
      console.error("❌ .env file not found.");
      return;
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  
  // Extract Gemini Key
  const geminiMatch = envContent.match(/VITE_GEMINI_API_KEY=(.+)/);
  const geminiKey = geminiMatch ? geminiMatch[1].trim() : '';

  if (!geminiKey) {
      console.error("❌ VITE_GEMINI_API_KEY is EMPTY in .env");
  } else {
      console.log(`🔑 Found Gemini Key: ${geminiKey.substring(0, 6)}...******`);
      await testGemini(geminiKey);
  }

  console.log("--------------------------------");
}

async function testGemini(key) {
    try {
        const ai = new GoogleGenAI({ apiKey: key });
        console.log("🔄 Testing with 'gemini-2.0-flash'...");
        const result = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{ parts: [{ text: "Ping" }] }]
        });
        
        if (result?.candidates?.length > 0) {
            console.log("✅ Gemini API Key is VALID and Active.");
        } else {
            console.log("⚠️ Validation returned no data.");
        }
    } catch (error) {
        console.error(`❌ Validation FAILED: ${error.message}`);
        if (error.message.includes("API_KEY_INVALID")) {
            console.error("   -> The key provided is incorrect or expired.");
        }
    }
}

validate();
