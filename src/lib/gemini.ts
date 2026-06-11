import { GoogleGenAI } from "@google/genai";

const DEFAULT_MODEL = "gemini-2.5-flash";

export function getGeminiApiKey(override?: string): string {
  return override || localStorage.getItem('geminiApiKey') || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
}

export function createGeminiClient(apiKeyOverride?: string): GoogleGenAI | null {
  const apiKey = getGeminiApiKey(apiKeyOverride);
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

export async function generateContent(
  prompt: string,
  options?: { model?: string; apiKey?: string; config?: Record<string, unknown> }
): Promise<string | null> {
  const client = createGeminiClient(options?.apiKey);
  if (!client) return null;
  const response = await client.models.generateContent({
    model: options?.model || DEFAULT_MODEL,
    contents: prompt,
    ...(options?.config ? { config: options.config } : {}),
  });
  return response.text?.trim() || null;
}
