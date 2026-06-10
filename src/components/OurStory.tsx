import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Heart, MessageSquare, Calendar, Star, BarChart3, ArrowLeft } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { format, differenceInDays } from 'date-fns';

export default function OurStory({ currentUser, partner, onBack }: { currentUser: string; partner: string; onBack: () => void }) {
  const [stats, setStats] = useState({
    totalMessages: 0,
    firstDate: null as Date | null,
    mostUsedEmoji: '❤️',
    busiestDay: '',
    messageRatio: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));
      const snapshot = await getDocs(q);
      const msgs = snapshot.docs.map(doc => doc.data());
      
      if (msgs.length === 0) return;

      const firstMsg = msgs[0];
      const counts = msgs.reduce((acc: any, m) => {
        acc[m.senderId] = (acc[m.senderId] || 0) + 1;
        return acc;
      }, {});

      // Find busiest day
      const days = msgs.reduce((acc: any, m) => {
        if (!m.timestamp) return acc;
        const day = format(m.timestamp.toDate(), 'yyyy-MM-dd');
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      }, {});
      const busiest = Object.entries(days).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || '';

      setStats({
        totalMessages: msgs.length,
        firstDate: firstMsg.timestamp?.toDate() || new Date(),
        mostUsedEmoji: '❤️', // This would need actual emoji parsing
        busiestDay: busiest,
        messageRatio: (counts[currentUser] || 0) / msgs.length
      });
    };
    fetchStats();
  }, [currentUser]);

  const daysSinceStart = stats.firstDate ? differenceInDays(new Date(), stats.firstDate) : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col font-sans"
    >
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <button onClick={onBack} className="p-2 bg-white/5 rounded-full"><ArrowLeft /></button>
        <h2 className="text-xl font-bold">قصتنا المشتركة 🤍</h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 p-6 rounded-3xl border border-white/10 text-center">
            <MessageSquare className="w-8 h-8 text-blue-400 mx-auto mb-3" />
            <p className="text-white/40 text-xs mb-1">إجمالي الرسائل</p>
            <p className="text-2xl font-bold">{stats.totalMessages}</p>
          </div>
          <div className="bg-white/5 p-6 rounded-3xl border border-white/10 text-center">
            <Calendar className="w-8 h-8 text-pink-400 mx-auto mb-3" />
            <p className="text-white/40 text-xs mb-1">أول رسالة</p>
            <p className="text-lg font-bold">{stats.firstDate ? format(stats.firstDate, 'yyyy/MM/dd') : '...'}</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-500/20 to-transparent p-8 rounded-3xl border border-rose-500/20">
          <Heart className="w-12 h-12 text-rose-500 mb-4 animate-pulse" />
          <h3 className="text-2xl font-bold mb-2">{daysSinceStart} يوم من النبض</h3>
          <p className="text-white/60 leading-relaxed">منذ تلك الرسالة الأولى التي بدأت كل شيء، ونحن نكتب قصة لا تنتهي.</p>
        </div>

        <div className="space-y-4">
          <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium">ميزان التواصل</span>
              <BarChart3 className="w-4 h-4 text-white/30" />
            </div>
            <div className="h-4 bg-white/5 rounded-full overflow-hidden flex">
              <div className="bg-blue-400" style={{ width: `${stats.messageRatio * 100}%` }} />
              <div className="bg-pink-400" style={{ width: `${(1 - stats.messageRatio) * 100}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-white/40">
              <span>أنت ({Math.round(stats.messageRatio * 100)}%)</span>
              <span>{partner === 'abbas' ? 'عباس' : 'فاطمة'} ({Math.round((1 - stats.messageRatio) * 100)}%)</span>
            </div>
          </div>

          <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
            <p className="text-white/40 text-xs mb-2 italic">أكثر يوم تحدثنا فيه</p>
            <p className="text-xl font-bold">{stats.busiestDay || 'سيظهر قريباً'}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
