import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const polishBanglaText = async (text: string): Promise<string> => {
  if (!text || text.trim().length === 0) return "";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are an expert Bengali editor. 
      Please fix the grammar, spelling, and punctuation of the following Bengali text. 
      Ensure the tone remains natural and professional. 
      Do not add any conversational filler. 
      Return ONLY the corrected Bengali text.
      
      Input Text: "${text}"`,
    });

    return response.text || "Could not process text.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to enhance text with AI.");
  }
};

export const translateToEnglish = async (text: string): Promise<string> => {
  if (!text || text.trim().length === 0) return "";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Translate the following Bengali text into clear, professional English.
      Return ONLY the English translation.
      
      Input Text: "${text}"`,
    });

    return response.text || "Could not translate text.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to translate text.");
  }
};