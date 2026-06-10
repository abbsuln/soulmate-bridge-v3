import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowLeft, Target, TrendingUp, Heart } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { summarizeMoodWeek } from '../services/geminiService';

export default function MoodMemory({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [summary, setSummary] = useState("جاري قراءة نبضات الحوار...");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(100)
    );
    return onSnapshot(q, async (snapshot) => {
      const msgs = snapshot.docs.map(doc => doc.data()).filter(d => d.mood && d.timestamp);
      setMessages(msgs);
      
      if (msgs.length > 5) {
        const moods = msgs.map(m => m.mood);
        const res = await summarizeMoodWeek(moods);
        setSummary(res);
      }
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || messages.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    // Drawing Axis
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, height / 2);
    ctx.lineTo(width - padding, height / 2);
    ctx.moveTo(width / 2, padding);
    ctx.lineTo(width / 2, height - padding);
    ctx.stroke();

    const drawLine = (userId: string, color: string) => {
      const userMsgs = messages.filter(m => m.senderId === userId);
      if (userMsgs.length < 2) return;

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.beginPath();

      userMsgs.forEach((m, i) => {
        const xPos = padding + (i / (userMsgs.length - 1)) * (width - 2 * padding);
        const yPos = (height / 2) - (m.mood.x * (height / 2 - padding));
        if (i === 0) ctx.moveTo(xPos, yPos);
        else ctx.lineTo(xPos, yPos);
      });
      ctx.stroke();
      
      // Points
      userMsgs.forEach((m, i) => {
        const xPos = padding + (i / (userMsgs.length - 1)) * (width - 2 * padding);
        const yPos = (height / 2) - (m.mood.x * (height / 2 - padding));
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(xPos, yPos, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    drawLine('abbas', '#60a5fa');
    drawLine('fatima', '#f472b6');

    // Harmony Points (Golden dots where they intersect or are close)
    messages.forEach((m, i) => {
      if (i > 0) {
        const last = messages[i-1];
        if (last.senderId !== m.senderId && Math.abs(last.mood.x - m.mood.x) < 0.1) {
           const xPos = padding + (i / (messages.length - 1)) * (width - 2 * padding);
           const yPos = (height / 2) - (m.mood.x * (height / 2 - padding));
           ctx.shadowBlur = 10;
           ctx.shadowColor = '#fbbf24';
           ctx.fillStyle = '#fbbf24';
           ctx.beginPath();
           ctx.arc(xPos, yPos, 6, 0, Math.PI * 2);
           ctx.fill();
           ctx.shadowBlur = 0;
           
           ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
           ctx.font = '10px sans-serif';
           ctx.fillText('لحظة تناغم', xPos - 25, yPos - 15);
        }
      }
    });

  }, [messages]);

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b border-white/5 bg-black/40">
        <button onClick={onBack} className="p-2 bg-white/5 rounded-full"><ArrowLeft className="text-white" /></button>
        <h2 className="text-white font-medium">ذاكرة المشاعر</h2>
        <Sparkles className="text-yellow-400 w-5 h-5" />
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col space-y-12 pb-24">
        <div className="relative bg-white/5 border border-white/10 rounded-3xl p-4 overflow-hidden">
          <div className="flex justify-between mb-4">
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-400 rounded-full" />
                <span className="text-xs text-white/60">عباس</span>
             </div>
             <div className="flex items-center gap-2">
                <span className="text-xs text-white/60">فاطمة</span>
                <div className="w-3 h-3 bg-pink-400 rounded-full" />
             </div>
          </div>
          <canvas ref={canvasRef} width={800} height={400} className="w-full h-auto" />
          <div className="flex justify-between mt-4 text-[10px] text-white/20 uppercase tracking-widest">
            <span>الماضي</span>
            <span>الآن</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/20 p-8 rounded-3xl relative overflow-hidden group">
           <Target className="absolute -right-4 -bottom-4 w-24 h-24 text-yellow-500/5 group-hover:scale-110 transition-transform duration-1000" />
           <h3 className="text-yellow-500 text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              نبض الأسبوع
           </h3>
           <p className="text-white/90 text-xl md:text-2xl font-serif leading-relaxed" dir="rtl">
             {summary}
           </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <p className="text-white/30 text-xs mb-1">لحظات التناغم</p>
              <p className="text-white text-2xl font-bold">{messages.filter((m, i) => i > 0 && messages[i-1].senderId !== m.senderId && Math.abs(messages[i-1].mood.x - m.mood.x) < 0.1).length}</p>
           </div>
           <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <p className="text-white/30 text-xs mb-1">إجمالي النبضات</p>
              <p className="text-white text-2xl font-bold">{messages.length}</p>
           </div>
        </div>
      </div>
    </div>
  );
}
