import { GoogleGenAI, Type } from "@google/genai";

export const getGeminiApiKey = () => localStorage.getItem('geminiApiKey') || "";

export const analyzeMood = async (text: string) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Analyze the mood of this Arabic/English text: "${text}". 
      Return a JSON object with two values between -1 and 1:
      x: Happy (1) vs Sad (-1)
      y: Calm (-1) vs Excited/Anxious (1)
      Only return JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            x: { type: Type.NUMBER },
            y: { type: Type.NUMBER }
          },
          required: ["x", "y"]
        }
      }
    });

    return JSON.parse(response.text || "{\"x\": 0, \"y\": 0}");
  } catch (error) {
    console.error("Gemini Mood Analysis Error:", error);
    return { x: 0, y: 0 };
  }
};

export const detectPain = async (text: string) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return false;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Determine if this message expresses deep emotional pain, exhaustion, or a cry for help (e.g. "تعبت", "أنا منتهي", "أحتاج أحد"). 
      Text: "${text}"
      Return "true" only if it's a serious emotional distress, otherwise "false".
      Only return the boolean string.`,
    });

    return response.text?.toLowerCase().includes("true") || false;
  } catch (error) {
    console.error("Gemini Pain Detection Error:", error);
    return false;
  }
};

export const summarizeMoodWeek = async (data: { x: number, y: number }[]) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return "نحتاج لمزيد من اللحظات لنفهم شعوركم.";

  try {
    const ai = new GoogleGenAI({ apiKey });
    const avgX = data.reduce((a, b) => a + b.x, 0) / data.length;
    const avgY = data.reduce((a, b) => a + b.y, 0) / data.length;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Based on these weekly mood stats (Average Happiness: ${avgX}, Average Energy: ${avgY}), 
      write one poetic and deep Arabic sentence summarizing the couple's week. Max 20 words.`,
    });

    return response.text?.trim() || "أسبوع مليء بالنبض.";
  } catch (error) {
    return "أسبوع مليء بالنبض.";
  }
};
