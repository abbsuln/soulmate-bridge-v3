import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, query, orderBy, limit, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { Sparkles, Send } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface DailyQuestion {
  id: string;
  question: string;
  date: string;
  answers: { abbas?: string; fatima?: string };
}

export default function DailySpark({ currentUser, apiKey }: { currentUser: 'abbas' | 'fatima', apiKey?: string }) {
  const [question, setQuestion] = useState<DailyQuestion | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDailyQuestion();
  }, []);

  async function fetchDailyQuestion() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const q = query(collection(db, 'dailyQuestions'), orderBy('date', 'desc'), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data() as DailyQuestion;
        if (data.date === today) {
          setQuestion({ ...data, id: docSnap.id });
          setLoading(false);
          return;
        }
      }
      
      // Generate new question
      generateNewQuestion(today);
    } catch (err) {
      console.error('Failed to fetch daily question:', err);
      setLoading(false);
    }
  }

  async function generateNewQuestion(today: string) {
    try {
      const activeKey = apiKey || (import.meta as any).env.VITE_GEMINI_API_KEY || '';
      let questionText = "شنو أكثر شي تتذكره من أول لقاء بيناتنا؟"; // Fallback static question
      
      if (activeKey) {
          const ai = new GoogleGenAI({ apiKey: activeKey });
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "قم بإنشاء سؤال رومانسي واحد أو سؤال ممتع أو عميق ومثير للتفكير ليجيب عليه شريكان (عراقيان، عباس وفاطمة) معاً. اجعل السؤال بلهجة عراقية خفيفة ولطيفة، واكتب السؤال فقط بدون أي إضافات.",
          });
          if (response.text) {
             questionText = response.text.trim().replace(/^['"]|['"]$/g, '');
          }
      }

      const docRef = await addDoc(collection(db, 'dailyQuestions'), {
        question: questionText,
        date: today,
        answers: {}
      });
      setQuestion({ id: docRef.id, question: questionText, date: today, answers: {} });
    } catch (e) {
      console.error('Failed to generate new question:', e);
      // Fallback
      try {
        const docRef = await addDoc(collection(db, 'dailyQuestions'), {
          question: "شنو أكثر شي تتذكره من أول لقاء بيناتنا؟",
          date: today,
          answers: {}
        });
        setQuestion({ id: docRef.id, question: "شنو أكثر شي تتذكره من أول لقاء بيناتنا؟", date: today, answers: {} });
      } catch (fallbackErr) {
        console.error('Fallback question save also failed:', fallbackErr);
      }
    }
    setLoading(false);
  }

  async function submitAnswer() {
    if (!question || !answer.trim()) return;
    
    try {
      const docRef = doc(db, 'dailyQuestions', question.id);
      await updateDoc(docRef, {
        [`answers.${currentUser}`]: answer
      });
      setQuestion({ ...question, answers: { ...question.answers, [currentUser]: answer } });
      setAnswer('');
    } catch (err) {
      console.error('Failed to submit daily question answer:', err);
    }
  }

  if (loading) return <div className="text-white/50 p-4">جاري تحميل سؤال اليوم...</div>;
  
  const isAnswered = question?.answers[currentUser];
  const bothAnswered = question?.answers.abbas && question?.answers.fatima;

  return (
    <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-xl mb-4">
      <div className="flex items-center gap-2 mb-4 text-yellow-400">
        <Sparkles className="w-5 h-5" />
        <h2 className="font-bold">سؤال اليوم</h2>
      </div>
      
      <p className="text-lg font-medium text-white mb-6">{question?.question}</p>

      {isAnswered ? (
        bothAnswered ? (
          <div className="space-y-4">
            <div className="bg-white/5 p-3 rounded-xl">
              <span className="text-blue-400 text-xs font-bold">عباس:</span>
              <p className="text-sm text-white">{question.answers.abbas}</p>
            </div>
            <div className="bg-white/5 p-3 rounded-xl">
              <span className="text-pink-400 text-xs font-bold">فاطمة:</span>
              <p className="text-sm text-white">{question.answers.fatima}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-white/50 italic">بانتظار الطرف الآخر للاجابة...</p>
        )
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder:text-white/20 focus:outline-none"
            placeholder="اكتب إجابتك هنا..."
          />
          <button onClick={submitAnswer} className="bg-white text-black p-2 rounded-xl">
            <Send className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
