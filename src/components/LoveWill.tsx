import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PenSquare, Save, Heart, Sparkles, Clock } from 'lucide-react';
import PageHeader from './ui/PageHeader';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { mapDocs } from '../lib/firestore-helpers';
import { pen } from '../lib/audioUtils';
import { format, differenceInDays } from 'date-fns';
import { cn } from '../lib/utils';

export default function LoveWill({ currentUser, onBack }: { currentUser: string; onBack: () => void }) {
  const [content, setContent] = useState("");
  const [wills, setWills] = useState<any[]>([]);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [viewingWill, setViewingWill] = useState<any>(null);
  const [readingMode, setReadingMode] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);

  useEffect(() => {
    const q = query(
      collection(db, 'loveWills'),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      setWills(mapDocs(snapshot));
    });
  }, []);

  const handleType = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length > content.length) {
      pen.scratch();
    }
    setContent(val);
  };

  const saveWill = async () => {
    if (!content.trim()) return;
    setIsFinalizing(true);
    try {
      await addDoc(collection(db, 'loveWills'), {
        content,
        author: currentUser,
        createdAt: serverTimestamp(),
        isFinalized: true
      });
      setContent("");
      setIsFinalizing(false);
    } catch (error) {
      console.error(error);
      setIsFinalizing(false);
    }
  };

  const startReading = (will: any) => {
    setViewingWill(will);
    setReadingMode(true);
    setCurrentLineIndex(-1);
    
    // Web Speech API
    const lines = will.content.split('\n').filter((l: string) => l.trim());
    setTimeout(() => {
      let index = 0;
      const readNext = () => {
        if (index < lines.length) {
          setCurrentLineIndex(index);
          const utterance = new SpeechSynthesisUtterance(lines[index]);
          utterance.lang = 'ar-SA';
          utterance.rate = 0.8;
          utterance.onend = () => {
            setTimeout(readNext, 1000);
          };
          window.speechSynthesis.speak(utterance);
          index++;
        } else {
          setTimeout(() => setCurrentLineIndex(lines.length), 1000);
        }
      };
      readNext();
    }, 3000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#121212] flex flex-col overflow-hidden"
    >
      <PageHeader title="وصية الحب" onBack={onBack} className="bg-black/20" />

      <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-24">
        {/* Editor Area */}
        <div className="relative max-w-2xl mx-auto">
          <div className="relative bg-[#f4f1ea] min-h-[400px] p-8 md:p-12 shadow-2xl rounded-sm transform -rotate-1 origin-top-left border border-[#e0ddd5]">
            {/* Paper Texture/Lines */}
            <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(#000 0 1px, transparent 1px 32px)' }} />
            
            <textarea
              value={content}
              onChange={handleType}
              placeholder="اكتب وصيتك له/لها هنا..."
              className="w-full h-full bg-transparent border-none focus:ring-0 text-[#2c2c2c] font-serif text-lg leading-[32px] resize-none relative z-10"
              dir="rtl"
            />

            <AnimatePresence>
              {isFinalizing && (
                <motion.div 
                  initial={{ scale: 2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute bottom-12 left-12 z-20"
                >
                  <div className="w-16 h-16 bg-[#b91c1c] rounded-full border-4 border-[#991b1b] flex items-center justify-center shadow-lg transform rotate-12">
                    <span className="text-white text-[10px] font-bold uppercase tracking-widest">FINAL</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-8 flex justify-center">
            <button 
              onClick={saveWill}
              disabled={!content.trim() || isFinalizing}
              className="px-8 py-3 bg-[#b91c1c] hover:bg-[#991b1b] disabled:opacity-50 text-white rounded-full flex items-center gap-2 shadow-lg transition-all"
            >
              <Save className="w-5 h-5" />
              <span>تخليد الوصية</span>
            </button>
          </div>
        </div>

        {/* Previous Wills */}
        <div className="max-w-2xl mx-auto space-y-4">
          <h3 className="text-white/40 flex items-center gap-2 text-sm uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            الوصايا السابقة
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {wills.map(will => (
              <motion.div 
                key={will.id} 
                whileHover={{ y: -5 }}
                onClick={() => startReading(will)}
                className="bg-white/5 border border-white/10 p-5 rounded-2xl cursor-pointer hover:bg-white/10 transition-colors group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", will.author === 'abbas' ? "bg-blue-400" : "bg-pink-400")} />
                    <span className="text-xs text-white/50">{will.author === 'abbas' ? 'عباس' : 'فاطمة'}</span>
                  </div>
                  <span className="text-[10px] text-white/30">{will.createdAt ? format(will.createdAt.toDate(), 'yyyy/MM/dd') : ''}</span>
                </div>
                <p className="text-white/80 line-clamp-2 text-sm leading-relaxed mb-4" dir="rtl">{will.content}</p>
                <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <Heart className="w-4 h-4 text-white/40" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {readingMode && viewingWill && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-center"
        >
          <AnimatePresence mode="wait">
            {currentLineIndex === -1 ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 3 }}
                className="w-1 h-16 bg-orange-400 rounded-full blur-sm"
              />
            ) : currentLineIndex < viewingWill.content.split('\n').filter((l:any)=>l.trim()).length ? (
              <motion.p 
                key={currentLineIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-2xl md:text-4xl text-white/90 font-serif leading-relaxed max-w-2xl px-4"
                dir="rtl"
              >
                {viewingWill.content.split('\n').filter((l:any)=>l.trim())[currentLineIndex]}
              </motion.p>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <p className="text-white/40 text-sm">
                  كتبها لك في {format(viewingWill.createdAt.toDate(), 'yyyy/MM/dd')}
                  <br />
                  قبل {differenceInDays(new Date(), viewingWill.createdAt.toDate())} يوم
                </p>
                <div className="pt-8">
                  <Heart className="w-8 h-8 text-red-500 animate-pulse mx-auto" strokeWidth={1} />
                </div>
                <button 
                  onClick={() => setReadingMode(false)}
                  className="mt-12 text-white/20 hover:text-white/60 transition-colors underline underline-offset-8"
                >
                  العودة للواقع
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}
