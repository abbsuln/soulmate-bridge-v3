import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Square, Heart, ArrowLeft, Play } from 'lucide-react';
import { db, storage } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { heartbeat } from '../lib/audioUtils';
import { cn } from '../lib/utils';

export default function HeartVoice({ currentUser, onBack }: { currentUser: string; onBack: () => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const animationFrame = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let pulse = 0;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      pulse += 0.05;
      const scale = 1 + Math.sin(pulse * 2) * 0.1;
      
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);
      
      // Draw Heart
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-40, -40, -80, 20, 0, 80);
      ctx.bezierCurveTo(80, 20, 40, -40, 0, 0);
      ctx.fillStyle = '#b91c1c';
      ctx.shadowBlur = 40;
      ctx.shadowColor = '#b91c1c';
      ctx.fill();
      
      // Waves
      if (isRecording) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const r = 100 + ((pulse * 20 + i * 40) % 120);
          const opacity = 1 - (r - 100) / 120;
          ctx.beginPath();
          ctx.arc(0, 40, r, 0, Math.PI * 2);
          ctx.globalAlpha = opacity;
          ctx.stroke();
        }
      }
      
      ctx.restore();
      animationFrame.current = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationFrame.current);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      setAudioChunks([]);
      
      recorder.ondataavailable = (e) => setAudioChunks(prev => [...prev, e.data]);
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      };
      
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access failed:', err);
      setError('تعذّر الوصول للميكروفون — يرجى السماح به من إعدادات المتصفح.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
  };

  const sendHeartVoice = async () => {
    if (audioChunks.length === 0) return;
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    
    try {
      const storageRef = ref(storage, `heartVoices/${Date.now()}.webm`);
      await uploadBytes(storageRef, audioBlob);
      const url = await getDownloadURL(storageRef);
      
      await addDoc(collection(db, 'messages'), {
        senderId: currentUser,
        text: "أحتاجك",
        audioUrl: url,
        timestamp: serverTimestamp(),
        status: 'sent',
        isHeartVoice: true
      });
      
      onBack();
    } catch (err) {
      console.error('Failed to send heart voice:', err);
      setError('فشل إرسال صوت القلب، حاول مرة ثانية.');
      setTimeout(() => setError(null), 5000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2d0a0a] flex flex-col items-center justify-center">
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center bg-black/20">
        <button onClick={onBack} className="p-2 bg-white/5 rounded-full"><ArrowLeft className="text-white" /></button>
        <span className="text-white/60 font-medium">صوت القلب</span>
        <div className="w-10" />
      </div>

      <canvas ref={canvasRef} width={400} height={400} className="mb-12" />

      <div className="space-y-8 flex flex-col items-center">
        {!audioUrl ? (
          <button 
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
              isRecording ? "bg-red-500 scale-125 shadow-[0_0_50px_rgba(239,68,68,0.5)]" : "bg-white/10 hover:bg-white/20"
            )}
          >
            <Mic className={cn("w-8 h-8", isRecording ? "text-white" : "text-red-500")} />
          </button>
        ) : (
          <div className="flex gap-4">
            <button onClick={() => setAudioUrl(null)} className="px-6 py-2 bg-white/5 text-white/50 rounded-full">إعادة</button>
            <button onClick={sendHeartVoice} className="px-8 py-2 bg-red-600 text-white rounded-full font-bold">إرسال النبض</button>
          </div>
        )}
        
        <p className="text-white/40 text-center max-w-xs leading-relaxed">
          {isRecording ? "دعه يسمع نبضاتك..." : "اضغط مطولاً لتسجيل صوتك في لحظة الاحتياج"}
        </p>
        {error && (
          <p className="text-red-400 text-sm text-center max-w-xs">{error}</p>
        )}
      </div>
    </div>
  );
}
