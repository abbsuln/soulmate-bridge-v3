import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Send, Lock, ArrowLeft, Sparkles } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '../lib/utils';

export default function SecretBox({ currentUser, onBack }: { currentUser: string; onBack: () => void }) {
  const [text, setText] = useState('');
  const [delayDays, setDelayDays] = useState(1);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendSecret = async () => {
    if (!text.trim()) return;
    setIsSending(true);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + delayDays);

    try {
      await addDoc(collection(db, 'messages'), {
        senderId: currentUser,
        text,
        timestamp: serverTimestamp(),
        expiresAt: expiresAt, // This could be used by a cloud function or logic to reveal
        isSecret: true,
        status: 'sent'
      });
      onBack();
    } catch (err) {
      console.error('Failed to send secret message:', err);
      setError('فشل إرسال الرسالة السرية، حاول مرة ثانية.');
      setTimeout(() => setError(null), 5000);
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0c0c0c] flex flex-col font-sans">
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/40">
        <button onClick={onBack} className="p-2 bg-white/5 rounded-full"><ArrowLeft /></button>
        <h2 className="text-lg font-bold flex items-center gap-2">صندوق الأسرار ⏰</h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 p-8 flex flex-col items-center justify-center space-y-12">
        <motion.div 
          animate={{ rotate: [0, -5, 5, 0] }}
          transition={{ repeat: Infinity, duration: 4 }}
          className="w-32 h-32 bg-gradient-to-br from-purple-600 to-indigo-800 rounded-[2rem] flex items-center justify-center shadow-[0_20px_50px_rgba(79,70,229,0.3)] ring-4 ring-white/5"
        >
          <Lock className="w-12 h-12 text-white" />
        </motion.div>

        <div className="w-full max-w-md space-y-8">
          <div className="space-y-4">
            <p className="text-white/40 text-center text-sm">متى تريد أن تصله هذه الرسالة؟</p>
            <div className="flex justify-center gap-4">
              {[1, 3, 7, 30].map(d => (
                <button 
                  key={d}
                  onClick={() => setDelayDays(d)}
                  className={cn(
                    "w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all border",
                    delayDays === d ? "bg-purple-600 border-purple-500 scale-110 shadow-lg" : "bg-white/5 border-white/10 opacity-50"
                  )}
                >
                  <span className="text-lg font-bold">{d}</span>
                  <span className="text-[8px] uppercase">{d === 1 ? 'يوم' : (d < 10 ? 'أيام' : 'يوم')}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <textarea 
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="اكتب شيئاً سيقرأه لاحقاً..."
              className="w-full h-48 bg-white/5 border border-white/10 rounded-3xl p-6 text-white placeholder:text-white/20 resize-none focus:ring-2 focus:ring-purple-500 transition-all text-lg leading-relaxed"
              dir="auto"
            />
            <Sparkles className="absolute bottom-4 right-4 text-purple-500/30" />
          </div>

          <button 
            onClick={sendSecret}
            disabled={!text.trim() || isSending}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-full font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-3"
          >
            {isSending ? "جاري القفل..." : <><Send className="w-5 h-5" /> تجميد الرسالة</>}
          </button>
          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
