import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, ChevronRight, AlertCircle, CheckCircle, FileJson, ArrowRight, Heart, Users, RefreshCw, Send, Sparkles, HelpCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface TelegramImporterProps {
  currentUser: string;
  onClose: () => void;
}

export default function TelegramImporter({ currentUser, onClose }: TelegramImporterProps) {
  const [status, setStatus] = useState<'idle' | 'reading' | 'mapping' | 'importing' | 'completed' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [totalMessages, setTotalMessages] = useState(0);
  const [detectedSenders, setDetectedSenders] = useState<string[]>([]);
  const [senderMapping, setSenderMapping] = useState<Record<string, 'abbas' | 'fatima' | 'ignore'>>({});
  const [importedCount, setImportedCount] = useState(0);
  const [parsedMessages, setParsedMessages] = useState<any[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalizes Telegram's text format which can be string or array
  const extractTelegramText = (textObj: any): string => {
    if (typeof textObj === 'string') return textObj;
    if (Array.isArray(textObj)) {
      return textObj.map(item => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && item.text) return item.text;
        return '';
      }).join('');
    }
    return '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setStatus('error');
      setErrorMsg('يرجى اختيار ملف JSON صالح ومصدر من تيليجرام (.json)');
      return;
    }

    setStatus('reading');
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        let telegramMessages = [];
        if (data.messages && Array.isArray(data.messages)) {
          telegramMessages = data.messages;
        } else if (Array.isArray(data)) {
          telegramMessages = data;
        } else {
          throw new Error('صيغة ملف تيليجرام غير مدعومة. تأكد من أنه ملف JSON سليم يحتوي على قائمة الرسائل.');
        }

        // We only care about normal text messages
        const validChatMessages = telegramMessages.filter((m: any) => m.type === 'message' && extractTelegramText(m.text).trim() !== '');

        if (validChatMessages.length === 0) {
          throw new Error('لم يتم العثور على أي رسائل نصية صالحة للاستيراد في هذا الملف.');
        }

        // Get unique senders in the exported telegram chat
        const senders = Array.from(new Set(validChatMessages.map((m: any) => m.from).filter(Boolean))) as string[];

        // Build a smart default mapping based on name keywords
        const defaultMapping: Record<string, 'abbas' | 'fatima' | 'ignore'> = {};
        senders.forEach(sender => {
          const lowerSender = sender.toLowerCase();
          if (lowerSender.includes('abbas') || lowerSender.includes('عباس') || lowerSender.includes('عبيس')) {
            defaultMapping[sender] = 'abbas';
          } else if (lowerSender.includes('fatima') || lowerSender.includes('فاطم') || lowerSender.includes('فطوم')) {
            defaultMapping[sender] = 'fatima';
          } else {
            // Unmatched
            defaultMapping[sender] = 'ignore';
          }
        });

        setParsedMessages(validChatMessages);
        setTotalMessages(validChatMessages.length);
        setDetectedSenders(senders);
        setSenderMapping(defaultMapping);
        setStatus('mapping');
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message || 'حدث خطأ أثناء قراءة وتحليل ملف JSON.');
      }
    };
    reader.readAsText(file);
  };

  const startImporting = async () => {
    setStatus('importing');
    setImportedCount(0);

    // Filter and map the messages to our internal schema
    const messagesToImport = parsedMessages
      .map((m: any) => {
        const targetUserId = senderMapping[m.from];
        if (!targetUserId || targetUserId === 'ignore') return null;

        const dateStr = m.date_unixtime ? parseInt(m.date_unixtime) * 1000 : Date.parse(m.date);
        const timestamp = isNaN(dateStr) ? new Date() : new Date(dateStr);

        return {
          senderId: targetUserId,
          text: extractTelegramText(m.text),
          timestamp: timestamp,
          status: 'read' as const,
          isImported: true
        };
      })
      .filter(Boolean) as any[];

    if (messagesToImport.length === 0) {
      setStatus('error');
      setErrorMsg('لم يتم استيراد أي رسائل لأن جميع المرسلين تم ضبطهم على "تجاهل".');
      return;
    }

    try {
      // Import messages in controlled parallel batches of 50 to avoid Firestore limits & showcase animations
      const batchSize = 30;
      for (let i = 0; i < messagesToImport.length; i += batchSize) {
        const chunk = messagesToImport.slice(i, i + batchSize);
        await Promise.all(chunk.map(async (msg) => {
          await addDoc(collection(db, 'messages'), msg);
        }));
        
        setImportedCount(prev => Math.min(prev + chunk.length, messagesToImport.length));
        // Soft pause for nice progress display and to avoid flooding the socket
        await new Promise(resolve => setTimeout(resolve, 80));
      }

      setStatus('completed');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'فشل رفع الرسائل إلى قاعدة البيانات.');
    }
  };

  return (
    <div className="absolute inset-0 z-[250] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative bg-[#151522] border border-white/10 rounded-[32px] w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden max-h-[85vh] flex flex-col font-sans"
      >
        {/* Top Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-rose-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-rose-500 flex items-center justify-center shadow-lg text-white">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">استيراد رسائل تيليجرام ✈️</h3>
              <p className="text-xs text-white/50">اجمعوا كل أرشيفكم في مكان واحد</p>
            </div>
          </div>
          <button 
            disabled={status === 'importing'}
            onClick={onClose} 
            className="p-1 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/75 transition-all outline-none"
          >
            إغلاق
          </button>
        </div>

        {/* Info Guide Toggler */}
        <div className="px-6 pt-4">
          <button 
            type="button" 
            onClick={() => setShowGuide(!showGuide)}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5 text-purple-300 hover:bg-white/10 transition-all text-xs font-semibold"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-purple-400" />
              <span>كيف يمكنني تصدير ملف الرسائل من تيليجرام؟</span>
            </div>
            <ChevronRight className={`w-4 h-4 transition-transform ${showGuide ? 'rotate-90' : ''}`} />
          </button>

          <AnimatePresence>
            {showGuide && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-2"
              >
                <div className="p-4 bg-zinc-900/60 border border-white/5 rounded-2xl text-xs text-white/70 leading-relaxed space-y-2">
                  <p className="font-bold text-purple-300">💡 خطوات استخراج الملف بسيطة:</p>
                  <ol className="list-decimal list-inside space-y-1.5 pl-1">
                    <li>افتح تطبيق <span className="text-white font-semibold">Telegram Desktop</span> على الكمبيوتر واذهب إلى محادثتكما.</li>
                    <li>اضغط على رمز <span className="text-white font-semibold">الثلاث نقاط</span> بالزاوية العلوية للمحادثة.</li>
                    <li>اختر <span className="text-white font-semibold flex-inline items-center">Export chat history</span> (تصدير أرشيف الدردشة).</li>
                    <li>تأكد من إلغاء تحديد الصور والفيديو لتقليل حجم الملف، واختيار صيغة <span className="text-yellow-400 font-bold">JSON</span> (وليس HTML).</li>
                    <li>اضغط على <span className="text-white font-semibold">Export</span> ثم قم بسحب وتنزيل ملف <span className="text-yellow-300 font-bold">result.json</span> هنا!</li>
                  </ol>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content Area with Dynamic States */}
        <div className="flex-1 p-6 overflow-y-auto min-h-[250px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {/* 1. IDLE STATE: Upload Box */}
            {status === 'idle' && (
              <motion.div 
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 border-2 border-dashed border-white/15 rounded-3xl p-8 flex flex-col items-center justify-center gap-4 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all duration-300 cursor-pointer text-center group"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept=".json" 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                <div className="w-16 h-16 rounded-full bg-white/5 text-white/40 flex items-center justify-center border border-white/5 group-hover:scale-110 group-hover:text-purple-400 group-hover:bg-purple-500/10 transition-all duration-300">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">اسحب ملف result.json أو اضغط للتصفح</h4>
                  <p className="text-xs text-white/40 mt-1">تأكد بأن الملف بصيغة JSON حقيقية ومصدرة من تيليجرام</p>
                </div>
              </motion.div>
            )}

            {/* 2. READING STATE */}
            {status === 'reading' && (
              <motion.div 
                key="reading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-10"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
                  <FileJson className="w-6 h-6 text-purple-400 absolute inset-0 m-auto" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">جاري تحليل ومعالجة ملف المحادثة...</h4>
                  <p className="text-xs text-white/40 mt-1">يستغرق هذا ثوانٍ قليلة تبعاً لحجم المحادثة</p>
                </div>
              </motion.div>
            )}

            {/* 3. MAPPING STATE */}
            {status === 'mapping' && (
              <motion.div 
                key="mapping"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-2xl flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
                  <div className="text-right">
                    <p className="text-xs text-purple-300 font-bold">تم تحليل الملف واكتشاف الأرشيف بنجاح</p>
                    <p className="text-[11px] text-white/60 mt-0.5">الملف يحتوي على <span className="text-purple-300 font-bold">{totalMessages.toLocaleString()}</span> رسائل نصية. يرجى مطابقة الأسماء أدناه لاستكمال الاستيراد.</p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <h5 className="text-xs text-white/50 font-bold flex items-center gap-1.5 px-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>تحديد مرسلي تيليجرام:</span>
                  </h5>

                  <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
                    {detectedSenders.map(sender => (
                      <div key={sender} className="flex items-center justify-between p-3.5 bg-zinc-900/80 border border-white/5 rounded-2xl">
                        <span className="text-xs font-bold text-white max-w-[120px] truncate">{sender}</span>
                        <div className="flex items-center gap-2 select-none">
                          <span className="text-[10px] text-white/40">يرسل كـ:</span>
                          <select 
                            value={senderMapping[sender] || 'ignore'}
                            onChange={(e) => {
                              const val = e.target.value as 'abbas' | 'fatima' | 'ignore';
                              setSenderMapping(prev => ({ ...prev, [sender]: val }));
                            }}
                            className="bg-zinc-800 text-xs text-white border border-white/10 rounded-xl px-2.5 py-1.5 outline-none focus:border-purple-500 transition-all font-semibold"
                          >
                            <option value="ignore">تجاهل هذه الرسائل ❌</option>
                            <option value="abbas">عباس 👦🏻</option>
                            <option value="fatima">فاطمة 👧🏻</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={startImporting}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-rose-500 hover:from-purple-500 hover:to-rose-400 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                >
                  <Heart className="w-4 h-4 text-white animate-pulse fill-current" />
                  <span>بدء استيراد الرسائل وتحويلها 💖</span>
                </button>
              </motion.div>
            )}

            {/* 4. IMPORTING STATE */}
            {status === 'importing' && (
              <motion.div 
                key="importing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center gap-5 text-center py-8"
              >
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="w-20 h-20 -rotate-90">
                    <circle cx="40" cy="40" r="34" className="stroke-white/10 fill-none stroke-[6]" />
                    <circle 
                      cx="40" 
                      cy="40" 
                      r="34" 
                      className="stroke-purple-500 fill-none stroke-[6] transition-all duration-300" 
                      style={{
                        strokeDasharray: `${2 * Math.PI * 34}`,
                        strokeDashoffset: `${2 * Math.PI * 34 * (1 - importedCount / parsedMessages.length)}`
                      }}
                    />
                  </svg>
                  <RefreshCw className="w-6 h-6 text-purple-400 absolute inset-0 m-auto animate-spin" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">جاري مزامنة الرسائل الحقيقية في قاعدة البيانات...</h4>
                  <p className="text-xs text-purple-300 font-mono mt-1 font-bold">
                    تم استيراد {importedCount.toLocaleString()} من أصل {parsedMessages.length.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-white/40 mt-1">يرجى الإبقاء على الصفحة مفتوحة لتفادي توقف العملية</p>
                </div>
              </motion.div>
            )}

            {/* 5. COMPLETED STATE */}
            {status === 'completed' && (
              <motion.div 
                key="completed"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center text-center py-10"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 mb-4 animate-bounce">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">مليون مبروك! 🎉</h4>
                  <p className="text-xs text-white/60 mt-1 max-w-xs mx-auto leading-relaxed">
                    تم استيراد وحفظ <span className="text-emerald-400 font-bold">{importedCount.toLocaleString()}</span> رسالة بالكامل بنجاح في المحادثة!
                  </p>
                  <p className="text-xs text-purple-300 font-bold mt-2">ستظهر الآن بالتدريج ضمن سجل المحادثة والكون الروحي الخاص بكم ✨</p>
                </div>
                <button 
                  onClick={onClose}
                  className="mt-8 px-8 py-3 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-xl transition-all"
                >
                  العودة للدردشة 💬
                </button>
              </motion.div>
            )}

            {/* 6. ERROR STATE */}
            {status === 'error' && (
              <motion.div 
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center text-center py-6"
              >
                <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20 mb-4">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">لم نتمكن من إتمام الاستيراد</h4>
                  <p className="text-xs text-rose-400/80 mt-1.5 p-3.5 bg-rose-500/5 rounded-2xl border border-rose-500/10 max-w-sm mx-auto font-medium">
                    {errorMsg}
                  </p>
                </div>
                <button 
                  onClick={() => setStatus('idle')}
                  className="mt-6 px-6 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>حاول مجدداً</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
