import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Gavel, Sparkles } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

export default function PeaceMaker({ apiKey }: { apiKey?: string }) {
  const [prompt, setPrompt] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);

  async function askPeaceMaker() {
    if (!prompt.trim()) return;
    setLoading(true);
    
    try {
      const activeKey = apiKey || (import.meta as any).env.VITE_GEMINI_API_KEY || '';
      if (!activeKey) {
         setSuggestion("يرجى إدخال مفتاح صانع السلام في الإعدادات أولاً!");
         setLoading(false);
         return;
      }
      const ai = new GoogleGenAI({ apiKey: activeKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `أنت صانع سلام وتعمل حكم بين حبيبين (عباس وفاطمة). اقرأ هذه المشكلة وقدم حلاً كوميدياً ولطيفاً يرضي الطرفين ويصلح الموقف بلكنة عراقية خفيفة: ${prompt}`,
      });
      setSuggestion(response.text || "خالة الأمور بينكم، حاولوا تتفقون على شي بسيط! ❤️");
    } catch (e) {
      console.error('PeaceMaker request failed:', e);
      setSuggestion("صار خلل بذكائي، جرب مرة ثانية! وتأكد من المفتاح.");
    }
    setLoading(false);
  }

  return (
    <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-xl mb-4">
      <div className="flex items-center gap-2 mb-4 text-purple-400">
        <Gavel className="w-5 h-5" />
        <h2 className="font-bold">صانع السلام (The Peace Maker)</h2>
      </div>
      
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white mb-4 placeholder:text-white/20"
        placeholder="محتارين بشنو؟ (مثلاً: وين نتعشى؟ فيلـم رعب لو رومانسي؟)"
      />
      
      <button 
        onClick={askPeaceMaker}
        disabled={loading}
        className="w-full bg-purple-600 text-white py-2 rounded-xl font-bold mb-4"
      >
        {loading ? "جاري التفكير..." : "اسأل صانع السلام"}
      </button>

      {suggestion && (
        <div className="bg-white/5 p-4 rounded-xl text-sm italic text-white/80">
          <Sparkles className="w-4 h-4 text-purple-400 mb-2" />
          {suggestion}
        </div>
      )}
    </div>
  );
}
