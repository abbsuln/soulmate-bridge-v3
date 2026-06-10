import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Heart, Image as ImageIcon, CheckCheck, Check, Smile, Reply, BellRing, Bell, Mic, Square, Trash2, FileText, Gamepad2, X, Sparkles, Gavel, Phone, MoreVertical, Paperclip, ChevronRight, ChevronDown, PenSquare, ArrowLeft, Video, PhoneOff, MicOff, Camera, Clock, Link2, Copy, Play, Pause, Moon, Star, TrendingUp, MapPin, Gift, Zap, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { db, storage, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, setDoc, deleteDoc, where, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../lib/firebase';
import DailySpark from './DailySpark';
import PeaceMaker from './PeaceMaker';
import VoiceCall, { VoiceCallHandle } from './VoiceCall';
import NightModeSky from './NightModeSky';
import LoveWill from './LoveWill';
import HeartVoice from './HeartVoice';
import MoodMemory from './MoodMemory';
import OurStory from './OurStory';
import SecretBox from './SecretBox';
import MemoryMap from './MemoryMap';
import RelationshipUniverse from './RelationshipUniverse';
import TelegramImporter from './TelegramImporter';
import AnimatedBackground from './AnimatedBackground';
import { analyzeMood, detectPain } from '../services/geminiService';
import { heartbeat } from '../lib/audioUtils';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';

type User = 'abbas' | 'fatima' | null;

interface Message {
  id: string;
  senderId: 'abbas' | 'fatima';
  text: string;
  imageUrl?: string;
  imageUrls?: string[];
  audioUrl?: string;
  timestamp: Date | any;
  status: 'sent' | 'delivered' | 'read';
  reactions?: { emoji: string; user: 'abbas' | 'fatima' }[];
  replyTo?: { id: string; text: string; senderId: string };
  isNudge?: boolean;
  isSurprise?: boolean;
  deleted?: boolean;
  expiresAt?: Date | any;
  mood?: string | null;
}

interface Mood {
  user: 'abbas' | 'fatima';
  status: string;
  updatedAt: Date;
}

interface NightModeState {
  isActive: boolean;
  requestedBy: string | null;
  acceptedBy: string | null;
  startedAt: any | null;
  starClickAbbas: number | null;
  starClickFatima: number | null;
  weather: 'rain' | 'clear' | 'clouds';
  exiting: string | null;
}

const EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🔥'];
const STICKERS = [
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqMnJqMnJqMnJqMnJqMnJqMnJqMnJqMnJqMnJqMnJqMnJqJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKVun7iM8FMEU24/giphy.gif', // love
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqMnJqMnJqMnJqMnJqMnJqMnJqMnJqMnJqMnJqMnJqMnJqJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/26BRv0ThflsHCqTCU/giphy.gif', // balloons
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqMnJqMnJqMnJqMnJqMnJqMnJqMnJqMnJqMnJqMnJqMnJqJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/l41lTfuxV5nS89E3e/giphy.gif', // happy
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqMnJqMnJqMnJqMnJqMnJqMnJqMnJqMnJqMnJqMnJqMnJqJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3oriO0OEd9QIDdllqo/giphy.gif'  // gift
];

const InlineAudioPlayer = ({ src }: { src: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [bars] = useState(() => Array.from({ length: 25 }, () => Math.random() * 60 + 30));

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateProgress = () => setProgress(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const onEnded = () => { setIsPlaying(false); setProgress(0); };
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };
  
  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex items-center gap-3 w-[220px] mb-2 p-1">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="w-10 h-10 shrink-0 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors">
        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
      </button>
      <div className="flex-1 flex flex-col gap-1.5 justify-center">
        <div className="flex items-center gap-[2px] h-6">
           {bars.map((height, i) => {
             const isPlayed = duration > 0 && (i / bars.length) <= (progress / duration);
             return (
               <div key={i} className={cn("w-[3px] rounded-full transition-all duration-100", isPlayed ? "bg-white" : "bg-white/30")} style={{ height: `${height}%` }} />
             );
           })}
        </div>
        <div className="text-[10px] font-mono opacity-80 mt-1" dir="ltr">{formatTime(progress)} / {formatTime(duration)}</div>
      </div>
    </div>
  );
};

const MessageBubble = React.memo(function MessageBubble({ 
  message, 
  isMine, 
  onReply, 
  currentUser,
  activeReactionMenu,
  setActiveReactionMenu,
  handleReact,
  EMOJIS,
  theme,
  onDelete,
  onImageClick,
  nightMode
}: {
  message: Message;
  isMine: boolean;
  onReply: (msg: Message) => void;
  currentUser: User;
  activeReactionMenu: string | null;
  setActiveReactionMenu: (id: string | null) => void;
  handleReact: (msgId: string, emoji: string) => Promise<void> | void;
  EMOJIS: string[];
  key?: string | number;
  theme: { chatText: string, bubble: string };
  onDelete?: (msg: Message) => void;
  onImageClick: (url: string) => void;
  nightMode?: boolean;
}) {
  const [swipeX, setSwipeX] = useState(0);
  const [lastTap, setLastTap] = useState(0);

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      handleReact(message.id, '❤️');
      if (window.navigator.vibrate) window.navigator.vibrate(20);
    }
    setLastTap(now);
  };

  return (
    <div
      className={cn(
        "msg-enter flex flex-col group relative w-full mb-6 px-4 md:px-6",
        isMine ? "items-start" : "items-end"
      )}
    >
      <motion.div 
        drag="x"
        dragConstraints={{ left: 0, right: 100 }}
        dragElastic={0.2}
        onDragStart={() => isMine && window.navigator.vibrate?.(5)}
        onDrag={(e, info) => {
           if (info.offset.x > 50) setSwipeX(info.offset.x);
        }}
        onDragEnd={(e, info) => {
           if (info.offset.x > 80) onReply(message);
           setSwipeX(0);
        }}
        onClick={handleDoubleTap}
        className={cn(
          "flex items-end gap-3 max-w-[85%] md:max-w-[70%] relative transition-transform",
          isMine ? "flex-row" : "flex-row-reverse"
        )}
        style={{ x: swipeX }}
      >
        <AnimatePresence>
          {swipeX > 30 && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute -left-12 top-1/2 -translate-y-1/2 text-white/30"
            >
              <Reply className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="flex flex-col">
          <motion.div 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onContextMenu={(e) => {
              e.preventDefault();
              setActiveReactionMenu(message.id);
            }}
            className={cn(
              "px-3 py-2 rounded-2xl shadow-sm relative text-[15px] leading-relaxed break-words select-none z-10 transition-all duration-200",
              nightMode && "font-serif tracking-wide backdrop-blur-md",
              isMine 
                ? (nightMode ? "bg-[#8774e1]/70 border border-[#8774e1]/30 text-white rounded-br-sm shadow-[0_0_15px_rgba(135,116,225,0.2)]" : "bg-[#8774e1] text-white rounded-br-sm") 
                : (nightMode ? "bg-[#212121]/70 border border-white/10 text-white rounded-bl-sm shadow-[0_0_15px_rgba(0,0,0,0.5)]" : "bg-[#212121] text-white rounded-bl-sm"),
              message.isNudge && "ring-4 ring-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.6)] bg-gradient-to-r from-amber-500 to-orange-600 font-bold text-lg animate-pulse"
            )}
          >
            {/* Tidy tail for bubbles */}
            <svg viewBox="0 0 11 20" width="11" height="20" className={cn("absolute bottom-0 w-[11px] h-[20px]", nightMode && "opacity-70", isMine ? (message.isNudge ? "fill-orange-500 -right-[9px]" : "fill-[#8774e1] -right-[9px]") : (message.isNudge ? "fill-amber-500 -left-[9px] scale-x-[-1]" : "fill-[#212121] -left-[9px] scale-x-[-1]"))}>
              <path d="M0 20C0 20 2 20 5.5 20C9 20 11 15 11 15C11 15 9.5 18 5 18C1.5 18 0 14 0 14V20Z" />
            </svg>

            {message.replyTo && (
              <div className="bg-black/10 border-l-[3px] border-white mb-2 p-1.5 px-3 rounded-md text-sm">
                <span className="font-medium block text-white/90">
                  {message.replyTo.senderId === currentUser ? 'أنت' : (message.replyTo.senderId === 'abbas' ? 'عباس' : 'فاطمة')}
                </span>
                <span className="line-clamp-1 italic text-white/70 text-[13px]">
                  {message.replyTo.text}
                </span>
              </div>
            )}
            
            {message.imageUrl && !message.imageUrls && (
              <div 
                className="relative mb-3 rounded-xl overflow-hidden border border-white/10 shadow-lg group/img cursor-pointer"
                onClick={() => onImageClick(message.imageUrl!)}
              >
                <img 
                  src={message.imageUrl} 
                  alt="Shared" 
                  className="w-full max-h-80 object-cover hover:scale-105 transition-transform duration-700" 
                  referrerPolicy="no-referrer" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity" />
              </div>
            )}

            {message.imageUrls && message.imageUrls.length > 0 && (
              <div className={cn("gap-1 mb-3", message.imageUrls.length === 1 ? "flex flex-col" : "grid grid-cols-2")}>
                 {message.imageUrls.map((img, idx) => (
                    <div 
                      key={idx}
                      className={cn("relative overflow-hidden border border-white/10 shadow-lg group/img cursor-pointer", message.imageUrls!.length === 1 ? "rounded-xl" : "rounded-lg aspect-square")}
                      onClick={() => onImageClick(img)}
                    >
                      <img 
                        src={img} 
                        alt="Shared" 
                        className={cn("w-full object-cover hover:scale-105 transition-transform duration-700", message.imageUrls!.length === 1 ? "max-h-80" : "h-full")} 
                        referrerPolicy="no-referrer" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity" />
                    </div>
                 ))}
              </div>
            )}
            
            {message.audioUrl && (
              <InlineAudioPlayer src={message.audioUrl} />
            )}

              {message.deleted ? (
                <div className="italic text-white/50 text-[13px] flex items-center gap-1.5 flex-row-reverse">
                  <Trash2 className="w-[14px] h-[14px] opacity-50" />
                  <span>تم حذف هذه الرسالة</span>
                </div>
              ) : message.text && (
                <div dir="auto" className="whitespace-pre-wrap">
                {(() => {
                  const urlRegex = /(https?:\/\/[^\s]+)/g;
                  if (!message.text || !message.text.match(urlRegex)) {
                     return <p>{message.text}</p>;
                  }
                  const parts = message.text.split(urlRegex);
                  const matches = message.text.match(urlRegex);
                  return (
                    <div className="flex flex-col gap-2">
                      <p>
                        {parts.map((p, i) => {
                          if (p.match(urlRegex)) return <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="underline text-blue-300">{p}</a>;
                          return p;
                        })}
                      </p>
                      {matches && matches.map((url, i) => {
                        try {
                          const domain = new URL(url).hostname;
                          return (
                            <div key={`preview-${i}`} className="bg-black/20 rounded-lg p-3 mt-1 border border-white/10 flex flex-col gap-1 w-full min-w-[200px]">
                              <span className="text-xs opacity-60 flex items-center gap-1"><Link2 className="w-3 h-3"/> {domain}</span>
                              <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline line-clamp-2" style={{ wordBreak: 'break-all' }}>{url}</a>
                            </div>
                          );
                        } catch { return null; }
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            <div className={cn(
              "flex items-center gap-1 mt-1 opacity-60 text-[11px] font-medium float-left ml-3",
              isMine ? "text-white" : "text-white/60"
            )}>
              {message.expiresAt && <Clock size={10} className="mr-1 animate-pulse" />}
              <span>{format(message.timestamp, 'HH:mm')}</span>
              {isMine && (
                <div className="flex gap-0.5 ml-1">
                  {message.status === 'sent' && <Check className="w-[14px] h-[14px]" />}
                  {message.status === 'delivered' && <CheckCheck className="w-[14px] h-[14px]" />}
                  {message.status === 'read' && <CheckCheck className="w-[14px] h-[14px] text-[#4db2f6]" />}
                </div>
              )}
            </div>
            <div className="clear-both" />
          </motion.div>

          {message.reactions && message.reactions.length > 0 && (
            <div className={cn(
              "flex flex-wrap gap-1.5 mt-1.5 px-1",
              isMine ? "justify-end" : "justify-start"
            )}>
              <AnimatePresence>
                {message.reactions.map((r, i) => (
                  <motion.span 
                    initial={{ scale: 0, rotate: -20 }} 
                    animate={{ scale: 1, rotate: 0 }}
                    key={i} 
                    className="bg-white/10 backdrop-blur-2xl border border-white/10 rounded-full px-2 py-0.5 text-xs shadow-xl ring-1 ring-white/5"
                  >
                    {r.emoji}
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {!isMine && (
          <button 
            onClick={(e) => { e.stopPropagation(); onReply(message); }}
            className="opacity-0 group-hover:opacity-100 p-2.5 rounded-full hover:bg-white/10 text-white/30 transition-all active:scale-90 shrink-0 scale-90 group-hover:scale-100"
          >
            <Reply className="w-4 h-4" />
          </button>
        )}

        <AnimatePresence>
          {activeReactionMenu === message.id && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              className={cn(
                "absolute top-full mt-2 z-[100] flex flex-col w-56 rounded-xl bg-[#212121] shadow-2xl border border-white/5 overflow-hidden",
                isMine ? "right-0" : "left-0"
              )}
            >
              <div className="flex gap-2 p-2 border-b border-white/5 bg-[#2c2c2c]">
                {EMOJIS.map(emoji => (
                  <motion.button
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    key={emoji}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReact(message.id, emoji);
                      setActiveReactionMenu(null);
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-all text-xl"
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
              <button onClick={(e) => { e.stopPropagation(); onReply(message); setActiveReactionMenu(null); }} className="flex items-center justify-between w-full px-4 py-3 text-[15px] hover:bg-white/5 transition-colors">
                <span>رد</span>
                <Reply className="w-[18px] h-[18px] opacity-70" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(message.text || ''); setActiveReactionMenu(null); }} className="flex items-center justify-between w-full px-4 py-3 text-[15px] hover:bg-white/5 transition-colors border-t border-white/5">
                <span>نسخ النص</span>
                <Copy className="w-[18px] h-[18px] opacity-70" />
              </button>
              {isMine && !message.deleted && (
                <button onClick={(e) => { e.stopPropagation(); onDelete?.(message); setActiveReactionMenu(null); }} className="flex items-center justify-between w-full px-4 py-3 text-[15px] text-red-500 hover:bg-white/5 transition-colors border-t border-white/5">
                  <span>حذف</span>
                  <Trash2 className="w-[18px] h-[18px] opacity-70" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}, (prev, next) =>
  prev.message.status === next.message.status &&
  prev.message.reactions === next.message.reactions &&
  prev.message.deleted === next.message.deleted &&
  prev.nightMode === next.nightMode &&
  (prev.activeReactionMenu === prev.message.id) === (next.activeReactionMenu === next.message.id)
);

const THEMES: Record<string, { bg: string, panel: string, input: string, name: string, chatText: string, bubble: string }> = {
  rose: { bg: 'bg-[#2a131b]', panel: 'bg-[#3b1c27]', input: 'bg-[#4a2231]', name: 'وردي ليلي', chatText: 'text-white', bubble: 'bg-[#7a3453]' },
  purple: { bg: 'bg-[#1e132a]', panel: 'bg-[#2b1c3b]', input: 'bg-[#39244a]', name: 'بنفسجي', chatText: 'text-white', bubble: 'bg-[#6a348a]' },
  ocean: { bg: 'bg-[#0b1a2a]', panel: 'bg-[#132b42]', input: 'bg-[#1b3b5a]', name: 'محيط', chatText: 'text-white', bubble: 'bg-[#2e699e]' },
  forest: { bg: 'bg-[#132a18]', panel: 'bg-[#1e3b24]', input: 'bg-[#2a4a31]', name: 'غابة', chatText: 'text-white', bubble: 'bg-[#3b7a4c]' },
  sunset: { bg: 'bg-[#2a1b11]', panel: 'bg-[#3b2719]', input: 'bg-[#4a3423]', name: 'غروب', chatText: 'text-white', bubble: 'bg-[#a35c24]' }
};

export default function ChatApp(props: { currentUser: 'abbas' | 'fatima', onLogout: () => void, otherUser: 'abbas' | 'fatima' }) {
  return (
    <HashRouter>
      <ChatInner {...props} />
    </HashRouter>
  );
}

function ChatInner({ currentUser, onLogout, otherUser }: { currentUser: 'abbas' | 'fatima', onLogout: () => void, otherUser: 'abbas' | 'fatima' }) {
  const partner = otherUser;
  const currentUserTyped = currentUser as User;
  const navigate = useNavigate();
  const location = useLocation();
  const isChatView = location.pathname === '/chat';
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const voiceCallRef = useRef<VoiceCallHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const typingTimeoutRef = useRef<any>(null);
  const initialLoadDone = useRef(false);
  const markedReadRef = useRef<Set<string>>(new Set());
  const messagesRef = useRef<Message[]>([]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [currentTheme, setCurrentTheme] = useState('default');
  const [nightMode, setNightMode] = useState<NightModeState>({ isActive: false, requestedBy: null, acceptedBy: null, startedAt: null, starClickAbbas: null, starClickFatima: null, weather: 'clear', exiting: null });
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number, emoji: string, left: number }[]>([]);
  const [showMemories, setShowMemories] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);

  const triggerFloatingEmoji = (emoji = '❤️') => {
    const id = Date.now();
    const left = Math.random() * 80 + 10;
    setFloatingEmojis(prev => [...prev, { id, emoji, left }]);
    setTimeout(() => setFloatingEmojis(prev => prev.filter(e => e.id !== id)), 4000);
  };
  const [unreadCount, setUnreadCount] = useState(0);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [soundSettings, setSoundSettings] = useState({ message: 'msg_1', nudge: 'nudge_1' });
  const [showSettings, setShowSettings] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [inAppNotification, setInAppNotification] = useState<{ id: string, name: string, text: string, isNudge: boolean, isFatima: boolean } | null>(null);
  const [moods, setMoods] = useState<Mood[]>([{ user: 'abbas', status: 'مشتاق', updatedAt: new Date() }, { user: 'fatima', status: 'تدرس', updatedAt: new Date() }]);
  const [isUpdatingMood, setIsUpdatingMood] = useState(false);
  const [newMood, setNewMood] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [partnerStatus, setPartnerStatus] = useState({ isOnline: false, lastSeen: new Date(), isTyping: false });
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [partnerAvatar, setPartnerAvatar] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [showDailySpark, setShowDailySpark] = useState(false);
  // Evaluate real-time online status visually
  const isPartnerNowOnline = partnerStatus.isOnline && (Date.now() - (partnerStatus.lastSeen?.getTime() || 0) < 60000);
  const [showPeaceMaker, setShowPeaceMaker] = useState(false);
  const [peaceMakerKey, setPeaceMakerKey] = useState<string>('');
  const [activeCall, setActiveCall] = useState<{ status: string, caller: string, callType: 'video' | 'audio', roomId: string } | null>(null);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [scheduledDelay, setScheduledDelay] = useState<number | null>(null);

  const [isSentFeedback, setIsSentFeedback] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isDisappearing, setIsDisappearing] = useState(false);
  const [gameState, setGameState] = useState<any>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const [showLoveWill, setShowLoveWill] = useState(false);
  const [showHeartVoice, setShowHeartVoice] = useState(false);
  const [showMoodMemory, setShowMoodMemory] = useState(false);
  const [showOurStory, setShowOurStory] = useState(false);
  const [showSecretBox, setShowSecretBox] = useState(false);
  const [showMemoryMap, setShowMemoryMap] = useState(false);
  const [showRelationshipUniverse, setShowRelationshipUniverse] = useState(false);
  const [showTelegramImporter, setShowTelegramImporter] = useState(false);
  const [showInputMenu, setShowInputMenu] = useState(false);
  const [anniversary, setAnniversary] = useState<Date | null>(null);
  const [incomingPulse, setIncomingPulse] = useState<any>(null);
  const [incomingEmergency, setIncomingEmergency] = useState<any>(null);
  const [painProcessing, setPainProcessing] = useState(false);
  const [painMessages, setPainMessages] = useState<any[]>([]);
  const [currentPainMsgIndex, setCurrentPainMsgIndex] = useState(-1);
  const [showNeedsYou, setShowNeedsYou] = useState(false);

  // Night mode effects
  useEffect(() => {
    if (nightMode.requestedBy && nightMode.requestedBy !== currentUser && !nightMode.isActive && !nightMode.exiting) {
      if (window.navigator.vibrate) window.navigator.vibrate([200, 100, 200]);
    }
    
    if (nightMode.exiting) {
      const exitTimeout = setTimeout(async () => {
        if (nightMode.exiting === currentUser) {
          const diffStr = nightMode.startedAt ? Math.floor((Date.now() - nightMode.startedAt.getTime()) / 60000) : 0;
          await setDoc(doc(db, 'settings', 'nightMode'), { isActive: false, requestedBy: null, acceptedBy: null, startedAt: null, starClickAbbas: null, starClickFatima: null, weather: 'clear', exiting: null });
          const dateStr = new Date().toLocaleDateString('ar-EG');
          await addDoc(collection(db, 'messages'), { senderId: currentUser, text: `ليلتنا: ${dateStr} — ${diffStr} دقيقة تحت النجوم ✨`, timestamp: serverTimestamp(), status: 'sent', isNudge: false });
        }
      }, 5000);
      return () => clearTimeout(exitTimeout);
    }
  }, [nightMode.requestedBy, nightMode.exiting, nightMode.startedAt, nightMode.isActive, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'pulses'), orderBy('timestamp', 'desc'), limit(1));
    return onSnapshot(q, (snapshot) => {
      const pulse = snapshot.docs[0]?.data();
      if (pulse && pulse.senderId !== currentUser) {
        setIncomingPulse(pulse);
        if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 200]);
        setTimeout(() => setIncomingPulse(null), 4000);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'pulses'));
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'emergencyAlerts'), where('isActive', '==', true), limit(1));
    return onSnapshot(q, (snapshot) => {
      const alert = snapshot.docs[0]?.data();
      if (alert && alert.senderId !== currentUser) {
        setShowNeedsYou(true);
      } else {
        setShowNeedsYou(false);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'emergencyAlerts'));
  }, [currentUser]);

  // Sync messagesRef on every messages change
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const handleInputChange = (val: string) => {
    setNewMessage(val);
    const userRef = doc(db, 'users', currentUser);
    setDoc(userRef, { isTyping: true }, { merge: true });
    
    if (val.trim() === 'دايماً') {
        triggerFloatingEmoji();
        // Play melody
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const playNote = (freq: number, time: number) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.connect(g); g.connect(ctx.destination);
            osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
            g.gain.setValueAtTime(0.1, ctx.currentTime + time);
            g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + 0.5);
            osc.start(ctx.currentTime + time); osc.stop(ctx.currentTime + time + 0.5);
        };
        [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => playNote(f, i * 0.2));
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setDoc(userRef, { isTyping: false }, { merge: true });
    }, 2000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUnreadCount(0);
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isBottom = scrollHeight - scrollTop - clientHeight < 300;
    if (isBottom) {
      setShowScrollButton(false);
      setUnreadCount(0);
    } else {
      setShowScrollButton(true);
    }
  };

  const acceptNightMode = async () => {
    playSound('send');
    if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100]);
    await updateDoc(doc(db, 'settings', 'nightMode'), {
      isActive: true,
      acceptedBy: currentUser,
      startedAt: serverTimestamp()
    });
  };

  const endNightMode = async () => {
    await updateDoc(doc(db, 'settings', 'nightMode'), { exiting: currentUser });
  };

  const playSound = (type: string) => {
    try {
       const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
       if (!AudioContext) return;
       const ctx = new AudioContext();
       const osc = ctx.createOscillator();
       const gain = ctx.createGain();
       osc.connect(gain);
       gain.connect(ctx.destination);
       if (type === 'nudge_1') { 
         osc.type = 'square'; 
         osc.frequency.setValueAtTime(150, ctx.currentTime); 
         osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.8);
         gain.gain.setValueAtTime(1, ctx.currentTime);
         gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
         osc.start(); osc.stop(ctx.currentTime + 0.8); 
       }
       else if (type === 'send') {
         osc.type = 'sine';
         osc.frequency.setValueAtTime(800, ctx.currentTime);
         osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
         gain.gain.setValueAtTime(0, ctx.currentTime);
         gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
         gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
         osc.start(); osc.stop(ctx.currentTime + 0.2);
       }
       else if (type === 'msg_1') { osc.type = 'sine'; osc.frequency.setValueAtTime(600, ctx.currentTime); gain.gain.setValueAtTime(0.2, ctx.currentTime); osc.start(); osc.stop(ctx.currentTime + 0.1); }
    } catch (e) { }
  };

  const triggerNudge = () => {
    playSound('nudge_1');
    setTimeout(() => playSound('nudge_1'), 400); 
  };

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'), limit(150));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate() || new Date() } as Message));
      messagesRef.current = msgs;

      // Only mark truly new unread messages — never re-mark already handled ones
      if (document.visibilityState === 'visible') {
        msgs.forEach(msg => {
          if (msg.senderId !== currentUser && msg.status !== 'read' && !markedReadRef.current.has(msg.id)) {
            markedReadRef.current.add(msg.id);
            updateDoc(doc(db, 'messages', msg.id), { status: 'read' }).catch(e => console.error(e));
          }
        });
      }

      if (initialLoadDone.current) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added' && change.doc.data().senderId !== currentUser) {
             const data = change.doc.data();
             const isFatima = data.senderId === 'fatima';
             const title = isFatima ? 'فاطمة' : 'عباس';
             const bodyTxt = data.isNudge ? '✨ تنبيه!' : data.text || 'رسالة جديدة';

             setInAppNotification({ id: change.doc.id, name: title, text: bodyTxt, isNudge: data.isNudge, isFatima: isFatima });
             playSound(data.isNudge ? soundSettings.nudge : soundSettings.message);
             if (data.isNudge) triggerNudge();
             if (window.navigator.vibrate) window.navigator.vibrate(100);
             if (data.isSurprise) { /* Should trigger confetti visually */ }
             
             if (scrollContainerRef.current) {
               const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
               if (scrollHeight - scrollTop - clientHeight > 300) {
                 setUnreadCount(prev => prev + 1);
               } else {
                 setTimeout(scrollToBottom, 50);
               }
             }
             
             if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.ready.then(reg => {
                    reg.showNotification(title, {
                      body: bodyTxt,
                      icon: '/icon.svg',
                      badge: '/icon.svg',
                      tag: 'chat-message',
                      requireInteraction: data.isNudge,
                      silent: false
                    });
                  });
                }
             }
          }
        });
      }
      setMessages(msgs);
      setIsLoading(false);
      if (!initialLoadDone.current) { setTimeout(scrollToBottom, 50); initialLoadDone.current = true; }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'messages'));
    return () => unsubscribe();
  }, [currentUser, soundSettings]);

  useEffect(() => {
    if (!currentUser) return;
    const userRef = doc(db, 'users', currentUser);
    
    const updateOnlineStatus = (isOnline: boolean) => {
      setDoc(userRef, { isOnline, lastSeen: serverTimestamp() }, { merge: true });
    };

    updateOnlineStatus(true);
    
    // Heartbeat every 30 seconds to keep online status active
    const heartbeatInterval = setInterval(() => {
        if (document.visibilityState !== 'hidden') {
            updateOnlineStatus(true);
        }
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        updateOnlineStatus(false);
      } else {
        updateOnlineStatus(true);
        messages.forEach(msg => {
          if (msg.senderId !== currentUser && msg.status !== 'read') {
            updateDoc(doc(db, 'messages', msg.id), { status: 'read' }).catch(console.error);
          }
        });
      }
    };
    
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', () => updateOnlineStatus(false));

    const unsubUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.avatar) setUserAvatar(data.avatar);
        if (data.mood) {
          setMoods(prev => prev.map(m => m.user === currentUser ? { ...m, status: data.mood, updatedAt: data.moodUpdatedAt?.toDate() || new Date() } : m));
        }
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users/' + currentUser));

    const abbasRef = doc(db, 'users', 'abbas');
    const unsubAbbas = onSnapshot(abbasRef, (docSnap) => {
      if (docSnap.exists()) {
         const data = docSnap.data();
         if (data.peaceMakerKey) setPeaceMakerKey(data.peaceMakerKey);
      }
    });

    const partnerRef = doc(db, 'users', partner);
    const unsubPartner = onSnapshot(partnerRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const lastSeenDate = data.lastSeen?.toDate() || new Date();
        const isActuallyOnline = data.isOnline && (Date.now() - lastSeenDate.getTime() < 60000);
        setPartnerStatus({ isOnline: isActuallyOnline, lastSeen: lastSeenDate, isTyping: data.isTyping });
        setIsPartnerTyping(data.isTyping);
        if (data.avatar) setPartnerAvatar(data.avatar);
        if (data.mood) {
          setMoods(prev => prev.map(m => m.user === partner ? { ...m, status: data.mood, updatedAt: data.moodUpdatedAt?.toDate() || new Date() } : m));
        }
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users/' + partner));

    const settingsRef = doc(db, 'settings', 'chatConfig');
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().theme) {
        setCurrentTheme(docSnap.data().theme);
      }
    });

    const nightModeRef = doc(db, 'settings', 'nightMode');
    const unsubNightMode = onSnapshot(nightModeRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setNightMode({ ...data, startedAt: data.startedAt?.toDate() || null } as NightModeState);
      } else {
        setNightMode({ isActive: false, requestedBy: null, acceptedBy: null, startedAt: null, starClickAbbas: null, starClickFatima: null, weather: 'clear', exiting: null });
      }
    });

    const unsubAnniv = onSnapshot(doc(db, 'settings', 'anniversary'), (snap) => {
      if (snap.exists()) setAnniversary(snap.data().date?.toDate() || null);
    });

    const checkInterval = setInterval(() => {
        const now = new Date();
        setMessages(prev => prev.filter(m => !m.expiresAt || m.expiresAt > now));
    }, 5000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(checkInterval);
      updateOnlineStatus(false);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', () => updateOnlineStatus(false));
      unsubPartner(); unsubUser(); unsubSettings(); unsubAbbas(); unsubNightMode(); unsubAnniv();
    };
  }, [currentUser, partner]);

  useEffect(() => {
    if (showNotes) {
      const q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
      return onSnapshot(q, snap => setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (error) => handleFirestoreError(error, OperationType.GET, 'notes'));
    }
  }, [showNotes]);

  useEffect(() => {
    if (showGame) {
      return onSnapshot(doc(db, 'games', 'tictactoe'), snap => {
        if (snap.exists()) setGameState(snap.data());
        else setDoc(doc(db, 'games', 'tictactoe'), { board: Array(9).fill(''), xIsNext: true });
      }, (error) => handleFirestoreError(error, OperationType.GET, 'games/tictactoe'));
    }
  }, [showGame]);

  useEffect(() => {
    const unsubCall = onSnapshot(doc(db, 'settings', 'activeCall'), (snap) => {
      if (snap.exists()) {
        setActiveCall(snap.data() as any);
      } else {
        setActiveCall(null);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/activeCall'));
    return () => unsubCall();
  }, []);

  const handleStartCall = async (type: 'video' | 'audio') => {
    if (type === 'audio') {
      voiceCallRef.current?.startCall();
      return;
    }
    const roomId = `room_${Math.random().toString(36).substring(2, 15)}`;
    await setDoc(doc(db, 'settings', 'activeCall'), { status: 'ringing', caller: currentUser, callType: type, roomId });
  };

  const handleAcceptCall = async () => {
    await updateDoc(doc(db, 'settings', 'activeCall'), { status: 'connected' });
  };

  const handleEndCall = async () => {
    await deleteDoc(doc(db, 'settings', 'activeCall'));
  };

  const handleSendNudge = async () => {
    await addDoc(collection(db, 'messages'), { senderId: currentUser, text: '✨ تنبيه!', isNudge: true, timestamp: serverTimestamp(), status: 'sent' });
    setToastMessage('تم إرسال التنبيه!');
    setTimeout(() => setToastMessage(null), 2000);
  };
   
  const handleSurprise = async () => {
    const messagesList = [
        "إنتِي النعمة اللي أدعي الله يديمها لي دايماً 🤍",
        "يا بعد كل ناسي وأهلي، يا ضحكتي وعافيتي 😍",
        "كوني بخير، لأن دايماً خيرك هو خيري 🔥",
        "احبج بگد رحمة الله.. وبگد الهوة اللي يتنفسه العراقيين 🇮🇶❤️",
        "إنتِ السند، وإنتِ الورد، وإنتِ روحي 🌹"
    ];
    const text = messagesList[Math.floor(Math.random() * messagesList.length)];
    await addDoc(collection(db, 'messages'), { senderId: currentUser, text, isSurprise: true, timestamp: serverTimestamp(), status: 'sent' });
    triggerFloatingEmoji('🎉');
    if (window.navigator.vibrate) window.navigator.vibrate([50, 100, 50]);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() && !replyTo) return;
    
    // Emergency Pain Detection
    if (newMessage.trim() && !painProcessing) {
      const pain = await detectPain(newMessage);
      if (pain) {
        setPainProcessing(true);
        heartbeat.play();
        const interval = setInterval(() => heartbeat.play(), 1200);
        
        // Simulating writing from partner
        const partnerMsgs = messages.filter(m => m.senderId === partner).slice(-5);
        setPainMessages(partnerMsgs);
        setCurrentPainMsgIndex(-1);
        
        let idx = 0;
        const msgInterval = setInterval(() => {
          if (idx < partnerMsgs.length) {
            setCurrentPainMsgIndex(idx);
            idx++;
          } else {
            clearInterval(msgInterval);
          }
        }, 3000);

        return () => { clearInterval(interval); clearInterval(msgInterval); };
      }
    }

    const mood = newMessage.trim() ? await analyzeMood(newMessage) : null;
    const msg = { 
      senderId: currentUser, 
      text: newMessage, 
      timestamp: serverTimestamp(), 
      status: 'sent', 
      replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, senderId: replyTo.senderId } : null,
      mood: mood
    };
    setNewMessage(''); setReplyTo(null);
    setPainProcessing(false);
    setDoc(doc(db, 'users', currentUser), { isTyping: false }, { merge: true });
    playSound('send');
    triggerFloatingEmoji();
    if (newMessage.toLowerCase().includes('always') || newMessage.includes('دايماً')) {
      for(let i=0; i<10; i++) setTimeout(() => triggerFloatingEmoji(), i * 150);
    }

    if (scheduledDelay) {
      const delay = scheduledDelay;
      setScheduledDelay(null);
      setToastMessage(delay < 60000 ? `تم جدولة الرسالة بعد ${delay / 1000} ثانية` : `تم جدولة الرسالة بعد ${delay / 60000} دقيقة`);
      setTimeout(() => setToastMessage(null), 3000);
      setTimeout(async () => {
        await addDoc(collection(db, 'messages'), { ...msg, timestamp: serverTimestamp() });
        playSound('msg_1');
      }, delay);
      return;
    }

    await addDoc(collection(db, 'messages'), msg);
    setIsSentFeedback(true);
    playSound('msg_1');
    setTimeout(() => setIsSentFeedback(false), 2000);
  };

  const handleUpdateMood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMood.trim()) return;
    try {
      await updateDoc(doc(db, 'users', currentUser), { mood: newMood, moodUpdatedAt: serverTimestamp() });
    } catch (e) {
      console.error(e);
      // Fallback if doc doesn't exist yet
      await setDoc(doc(db, 'users', currentUser), { mood: newMood, moodUpdatedAt: serverTimestamp() }, { merge: true });
    }
    setIsUpdatingMood(false); setNewMood('');
  };

  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    const msg = messagesRef.current.find(m => m.id === messageId);
    if (!msg) return;
    let newReactions = [...(msg.reactions || [])];
    const userReactionIndex = newReactions.findIndex(r => r.user === currentUser);
    if (userReactionIndex !== -1) {
      if (newReactions[userReactionIndex].emoji === emoji) newReactions.splice(userReactionIndex, 1);
      else newReactions[userReactionIndex] = { emoji, user: currentUser as any };
    } else newReactions.push({ emoji, user: currentUser as any });
    await updateDoc(doc(db, 'messages', messageId), { reactions: newReactions });
  }, [currentUser]);

  const handleDeleteMessage = useCallback(async (msg: Message) => {
    if (msg.senderId !== currentUser) return;
    try {
      await updateDoc(doc(db, 'messages', msg.id), { text: null, deleted: true, imageUrl: null, imageUrls: null, audioUrl: null });
    } catch(e) {
      console.error(e);
    }
  }, [currentUser]);

  const handleReply = useCallback((m: Message) => setReplyTo(m), []);
  const handleImageClick = useCallback((url: string) => setFullscreenImage(url), []);

  const theme = THEMES[currentTheme] || THEMES.rose;

  if (!isChatView) {
    return (
      <div className={cn("flex h-[100dvh] w-full relative overflow-hidden font-sans text-white", theme.bg)} dir="rtl">
        {nightMode.isActive && <div className="absolute inset-0 bg-[#0A0A1A] z-[5]" />}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`}} />
        <div className={cn("flex-1 flex flex-col h-full relative z-10 w-full max-w-2xl mx-auto border-x border-white/5 shadow-2xl overflow-hidden transition-colors duration-1000", nightMode.isActive ? "bg-black/40 backdrop-blur-md border-white/10" : theme.panel)}>
          <AnimatedBackground theme={currentTheme} />

          {/* Home Header */}
          <header className={cn("shrink-0 z-40 relative px-4 pt-safe flex items-center justify-between shadow-sm", theme.input)} style={{ height: 60 }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#8774e1] to-pink-400 flex items-center justify-center shadow-md">
                <Heart className="w-[14px] h-[14px] text-white fill-white" />
              </div>
              <div>
                <h1 className="text-[16px] font-bold text-white leading-tight">SoulMate Bridge</h1>
                <p className="text-[10px] text-white/35 leading-tight">
                  {currentUser === 'abbas' ? 'عباس 💙' : 'فاطمة 🌸'}
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="text-[13px] bg-white/8 px-3.5 py-1.5 rounded-full hover:bg-white/15 active:scale-95 transition-all text-white/55 font-medium border border-white/8"
            >
              خروج
            </button>
          </header>

          {/* Anniversary Banner */}
          {anniversary && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="shrink-0 mx-3 mt-3"
            >
              <div className="relative overflow-hidden rounded-[18px] px-4 py-3 bg-gradient-to-l from-[#8774e1]/20 to-pink-500/15 border border-white/8 flex items-center gap-3">
                <div className="text-[26px]">💑</div>
                <div className="flex-1">
                  <p className="text-white/45 text-[11px] font-medium">معاً منذ</p>
                  <p className="text-white font-bold text-[15px] leading-tight">
                    {Math.floor((Date.now() - anniversary.getTime()) / (1000*60*60*24))} يوم متواصل
                  </p>
                </div>
                <Heart className="w-5 h-5 text-pink-400 fill-pink-400 opacity-60 animate-pulse" />
              </div>
            </motion.div>
          )}
          
          <div className="flex-1 overflow-y-auto px-3 pt-3 flex flex-col gap-3 pb-4">
            {/* Chat Entry Card */}
            <motion.div
              whileTap={{ scale: 0.982 }}
              onClick={() => navigate('/chat')}
              className="flex items-center gap-3.5 px-3.5 py-3.5 bg-white/5 hover:bg-white/7 rounded-[20px] cursor-pointer transition-all border border-white/5 active:border-white/10"
            >
              <div className="relative shrink-0">
                <div className={cn(
                  "w-[56px] h-[56px] rounded-full bg-gradient-to-tr overflow-hidden flex items-center justify-center ring-[2.5px] ring-offset-[2px]",
                  partner === 'abbas' ? "from-blue-600 to-blue-400" : "from-pink-500 to-rose-400",
                  isPartnerNowOnline ? "ring-green-400 ring-offset-[#1c1c1d]" : "ring-white/10 ring-offset-[#1c1c1d]"
                )}>
                  {partnerAvatar
                    ? <img src={partnerAvatar} alt={partner} className="w-full h-full object-cover" />
                    : <span className="text-[22px]">{partner === 'abbas' ? '💙' : '🌸'}</span>
                  }
                </div>
                {isPartnerNowOnline && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full ring-2 ring-[#1c1c1d]" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-bold text-[16px] text-white">
                    {partner === 'abbas' ? 'عباس' : 'فاطمة'}
                  </h2>
                  {messages.length > 0 && messages[messages.length-1]?.timestamp && (
                    <span className="text-white/35 text-[12px] shrink-0 font-medium">
                      {format(messages[messages.length-1].timestamp, 'HH:mm')}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-white/45 text-[13.5px] truncate leading-snug">
                    {isPartnerTyping ? (
                      <span className="flex items-center gap-1.5 text-[#8774e1]">
                        <span className="w-[4px] h-[4px] bg-[#8774e1] rounded-full" style={{animation:'typing-dot 1s ease-in-out infinite',animationDelay:'0ms'}}/>
                        <span className="w-[4px] h-[4px] bg-[#8774e1] rounded-full" style={{animation:'typing-dot 1s ease-in-out infinite',animationDelay:'200ms'}}/>
                        <span className="w-[4px] h-[4px] bg-[#8774e1] rounded-full" style={{animation:'typing-dot 1s ease-in-out infinite',animationDelay:'400ms'}}/>
                      </span>
                    ) : messages.length > 0 ? (
                      messages[messages.length-1]?.text ||
                      (messages[messages.length-1]?.imageUrls ? '📷 صورة' :
                       messages[messages.length-1]?.audioUrl ? '🎤 رسالة صوتية' : '')
                    ) : (
                      <span className="text-white/25">ابدأ المحادثة...</span>
                    )}
                  </p>
                  {unreadCount > 0 && (
                    <div className="bg-[#8774e1] text-white text-[11px] font-bold h-[20px] min-w-[20px] px-1.5 rounded-full flex items-center justify-center shadow-md shrink-0">
                      {unreadCount}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Moods Section */}
            {moods.length > 0 && (
              <div className={cn("rounded-[20px] px-4 py-3.5 border border-white/5", theme.input)}>
                <p className="text-white/35 text-[11px] mb-3 font-semibold tracking-wide">المزاج الآن ✨</p>
                <div className="flex gap-3">
                  {moods.map(m => (
                    <div key={m.user} className="flex-1 flex items-center gap-2.5 bg-white/4 rounded-[14px] px-3 py-2.5 border border-white/5">
                      <div className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center text-[18px] shrink-0">
                        {m.status?.split(' ')[1] || '🤍'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white/70 text-[12px] font-bold leading-tight">
                          {m.user === 'abbas' ? 'عباس' : 'فاطمة'}
                        </p>
                        <p className="text-white/40 text-[11px] truncate leading-tight mt-0.5">
                          {m.status?.split(' ').slice(0, 2).join(' ') || m.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <VoiceCall ref={voiceCallRef} currentUser={currentUser} otherUser={otherUser} />
      </div>
    );
  }

  return (
    <div className={cn("flex h-[100dvh] w-full relative overflow-hidden font-sans text-white", theme.bg)} dir="rtl">
      {/* Pattern Overlay */}
      {nightMode.isActive && (
        <NightModeSky
          weather={nightMode.weather}
          startedAt={nightMode.startedAt}
          currentUser={currentUser}
          starClickAbbas={nightMode.starClickAbbas}
          starClickFatima={nightMode.starClickFatima}
          onOurStarClick={() => {
            const field = currentUser === 'abbas' ? 'starClickAbbas' : 'starClickFatima';
            updateDoc(doc(db, 'settings', 'nightMode'), { [field]: Date.now() });
          }}
        />
      )}
      
      {/* Darkening / Exiting Overlay over the whole background */}
      <AnimatePresence>
        {(nightMode.isActive || nightMode.exiting || (nightMode.requestedBy === currentUser && !nightMode.isActive && !nightMode.exiting)) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: nightMode.exiting ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: nightMode.exiting ? 5 : 3, ease: 'easeInOut' }}
            className={cn("absolute inset-0 z-[5] pointer-events-none", nightMode.exiting ? "bg-black" : "bg-black/60")}
          />
        )}
      </AnimatePresence>

      <div className={cn("flex-1 flex flex-col h-full relative z-10 w-full max-w-2xl mx-auto border-x border-white/5 shadow-2xl overflow-hidden transition-colors duration-1000", nightMode.isActive ? "bg-transparent border-white/10" : theme.panel)}>
        {!nightMode.isActive && <AnimatedBackground theme={currentTheme} />}
        
        {/* Removed redundant iframe modal, now handled by NightModeSky */}
        
        {/* Invitation Modal — cinematic night invite */}
        <AnimatePresence>
          {nightMode.requestedBy && nightMode.requestedBy !== currentUser && !nightMode.isActive && !nightMode.exiting && (
            <div className="absolute inset-0 z-[200] flex items-end justify-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
                style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(30,10,60,0.95) 0%, rgba(2,2,15,0.98) 100%)' }}
              />
              {/* Floating stars in bg */}
              {[...Array(18)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full bg-white pointer-events-none"
                  style={{
                    width: Math.random() * 2 + 1,
                    height: Math.random() * 2 + 1,
                    left: `${5 + i * 5.2}%`,
                    top: `${8 + (i % 5) * 12}%`,
                  }}
                  animate={{ opacity: [0.2, 0.9, 0.2], scale: [1, 1.3, 1] }}
                  transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}

              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 26, delay: 0.15 }}
                className="relative z-10 w-full max-w-sm mx-4 mb-12 text-center"
              >
                {/* Moon icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
                  className="mx-auto mb-6"
                >
                  <div className="relative w-24 h-24 mx-auto">
                    {/* rings */}
                    {[1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="absolute rounded-full border border-yellow-300/10"
                        style={{ inset: -(i * 12) }}
                        animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.05, 0.3] }}
                        transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.7 }}
                      />
                    ))}
                    <div
                      className="w-24 h-24 rounded-full flex items-center justify-center relative overflow-hidden"
                      style={{
                        background: 'radial-gradient(circle at 35% 35%, rgba(255,253,200,0.18), rgba(255,220,80,0.06))',
                        border: '1px solid rgba(253,224,71,0.2)',
                        boxShadow: '0 0 40px rgba(253,224,71,0.12), inset 0 0 30px rgba(253,224,71,0.05)',
                      }}
                    >
                      <motion.span
                        className="text-[46px]"
                        animate={{ rotate: [0, 8, -8, 0] }}
                        transition={{ duration: 4, repeat: Infinity }}
                      >🌙</motion.span>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <p className="text-yellow-100/50 text-[11px] tracking-[0.25em] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                    دعوة خاصة
                  </p>
                  <h3
                    className="text-[22px] font-bold text-white leading-[1.5] mb-1"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    يدعوك للجلوس معه
                  </h3>
                  <p className="text-white/50 text-[15px] italic mb-8" style={{ fontFamily: 'Georgia, serif' }}>
                    تحت النجوم ✨
                  </p>

                  <div className="flex gap-3">
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={acceptNightMode}
                      className="flex-1 py-4 rounded-[18px] font-bold text-[15px] text-black relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, #fde047, #f59e0b)',
                        boxShadow: '0 0 30px rgba(253,224,71,0.35), 0 8px 24px rgba(0,0,0,0.5)',
                      }}
                    >
                      إي، مستعد ✨
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => updateDoc(doc(db, 'settings', 'nightMode'), { requestedBy: null })}
                      className="flex-1 py-4 rounded-[18px] font-bold text-[15px] text-white/60"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      بعدين
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Exiting message — goodnight */}
        <AnimatePresence>
          {nightMode.exiting && nightMode.exiting !== currentUser && (
            <div className="absolute inset-0 z-[200] flex items-center justify-center p-6 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                className="text-center max-w-[280px]"
              >
                <motion.div
                  animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="text-[52px] mb-4"
                >🌙</motion.div>
                <p className="text-white/75 text-[18px] font-medium leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
                  تصبح على خير
                </p>
                <p className="text-white/35 text-[13px] mt-2 italic" style={{ fontFamily: 'Georgia, serif' }}>
                  حتى نجتمع تحت نجوم أخرى ✨
                </p>
                <div className="flex justify-center gap-2 mt-5">
                  {['⭐','🌙','✨','🌙','⭐'].map((e, i) => (
                    <motion.span
                      key={i}
                      className="text-sm opacity-50"
                      animate={{ opacity: [0.2, 0.7, 0.2] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                    >{e}</motion.span>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {floatingEmojis.map(emoji => (
            <motion.div
              key={emoji.id}
              initial={{ y: 50, opacity: 0, scale: 0.5 }}
              animate={{ y: -500, opacity: [0, 1, 1, 0], scale: 1.5 }}
              transition={{ duration: 3, ease: 'easeOut' }}
              className="absolute bottom-20 z-[60] text-4xl pointer-events-none"
              style={{ left: `${emoji.left}%` }}
            >
              {emoji.emoji}
            </motion.div>
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {inAppNotification && (
            <motion.div
              initial={{ opacity: 0, y: -28, scale: 0.93 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="fixed top-4 left-3 right-3 z-[100] flex items-center gap-3 px-3.5 py-3 rounded-[20px] bg-[#1c1c1e]/95 backdrop-blur-2xl border border-white/8 shadow-2xl shadow-black/70"
            >
              <div className={cn(
                "w-[42px] h-[42px] shrink-0 rounded-[13px] flex items-center justify-center font-bold text-xl shadow-md",
                inAppNotification.isFatima
                  ? "bg-gradient-to-br from-pink-500 to-rose-400"
                  : "bg-gradient-to-br from-blue-600 to-blue-400"
              )}>
                {inAppNotification.isFatima ? '🌸' : '💙'}
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-[12px] text-white/40 font-semibold leading-tight mb-0.5">{inAppNotification.name}</p>
                <p className="text-[14px] text-white/90 font-medium leading-snug line-clamp-1">{inAppNotification.text}</p>
              </div>
              <button
                onClick={() => setInAppNotification(null)}
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-white/8 text-white/40 hover:text-white/70 transition-colors"
              >
                <X className="w-[13px] h-[13px]" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              className="absolute bottom-[160px] left-1/2 -translate-x-1/2 z-[90] px-5 py-2.5 rounded-full bg-[#1c1c1e]/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/60 whitespace-nowrap"
            >
              <p className="text-[14px] text-white/90 font-medium">{toastMessage}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <header className={cn("shrink-0 z-40 relative px-3 h-[56px] flex items-center justify-between shadow-sm cursor-pointer", theme.input)}>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-2 -ml-2 text-white/70 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft className="w-[22px] h-[22px] rotate-180" />
            </button>
            <div className={cn("w-[42px] h-[42px] rounded-full bg-gradient-to-tr from-blue-500 to-emerald-400 flex items-center justify-center overflow-hidden ring-2 ring-offset-[2.5px]", isPartnerNowOnline ? "ring-green-400" : "ring-white/10", "ring-offset-[#1c1c1d]")}>
              {partnerAvatar ? <img src={partnerAvatar} alt={partner} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <span className="text-lg font-bold text-white capitalize">{partner[0]}</span>}
            </div>
            <div className="flex flex-col text-right -mt-0.5 relative group">
              <div className="flex items-center gap-2">
                <h1 className="text-[17px] font-medium text-white">{partner === 'abbas' ? 'عباس' : 'فاطمة'}</h1>
                <span className="text-xl">{moods.find(m => m.user === partner)?.status.split(' ')[1] || '🤍'}</span>
              </div>
              <p className="text-[13px] text-[#8774e1] flex items-center gap-1.5 font-medium -mt-1 h-[18px]">
                {isPartnerTyping ? (
                  <span className="flex items-center gap-[3px] mt-1">
                    <span className="w-[5px] h-[5px] bg-[#8774e1] rounded-full" style={{animation:'typing-dot 1s ease-in-out infinite',animationDelay:'0ms'}}/>
                    <span className="w-[5px] h-[5px] bg-[#8774e1] rounded-full" style={{animation:'typing-dot 1s ease-in-out infinite',animationDelay:'200ms'}}/>
                    <span className="w-[5px] h-[5px] bg-[#8774e1] rounded-full" style={{animation:'typing-dot 1s ease-in-out infinite',animationDelay:'400ms'}}/>
                  </span>
                ) : isPartnerNowOnline ? 'متصل الآن' : `آخر ظهور ${format(partnerStatus.lastSeen, 'HH:mm')}`}
              </p>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center pointer-events-none">
            {anniversary && (
              <div className="bg-white/10 px-3 py-1 rounded-full backdrop-blur-md border border-white/10 flex items-center gap-2">
                <Heart size={10} className="text-rose-500 fill-current animate-pulse" />
                <span className="text-[10px] font-bold text-white/70">
                  {Math.floor((Date.now() - anniversary.getTime()) / (1000 * 60 * 60 * 24))} يوم
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
             <div className="relative">
                <button 
                  onClick={() => setShowMoreMenu(!showMoreMenu)} 
                  className="w-10 h-10 flex items-center justify-center rounded-full text-white/70 hover:bg-white/10 transition-colors"
                >
                  <MoreVertical size={20} />
                </button>
                
                <AnimatePresence>
                  {showMoreMenu && (
                    <>
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        onClick={() => setShowMoreMenu(false)} 
                        className="fixed inset-0 z-[100]" 
                      />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute left-0 mt-2 w-48 bg-[#1c1c1d] border border-white/10 rounded-2xl shadow-2xl z-[101] py-1.5 overflow-hidden backdrop-blur-xl"
                      >
                        <button onClick={() => { setShowMoreMenu(false); handleStartCall('audio'); }} className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors text-right" dir="rtl">
                          <Phone size={18} className="text-green-400" />
                          <span className="text-sm font-medium">مكالمة صوتية</span>
                        </button>
                        
                        <button onClick={() => { setShowMoreMenu(false); handleStartCall('video'); }} className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors text-right" dir="rtl">
                          <Video size={18} className="text-blue-400" />
                          <span className="text-sm font-medium">مكالمة فيديو</span>
                        </button>

                        <button onClick={async () => {
                            setShowMoreMenu(false);
                            await addDoc(collection(db, 'pulses'), { senderId: currentUser, timestamp: serverTimestamp() });
                            if (window.navigator.vibrate) window.navigator.vibrate(50);
                        }} className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors text-right border-t border-white/5" dir="rtl">
                          <Heart size={18} className="text-rose-500 fill-rose-500" />
                          <span className="text-sm font-medium">إرسال نبضة</span>
                        </button>

                        <button onClick={async () => {
                            setShowMoreMenu(false);
                            if (currentUser !== 'abbas') return;
                            if (nightMode.isActive) {
                               await setDoc(doc(db, 'settings', 'nightMode'), { exiting: currentUser }, { merge: true });
                            } else if (nightMode.requestedBy === null) {
                               const weathers = ['clear', 'clear', 'clouds', 'rain'];
                               const weather = weathers[Math.floor(Math.random() * weathers.length)];
                               await setDoc(doc(db, 'settings', 'nightMode'), { isActive: false, requestedBy: currentUser, acceptedBy: null, startedAt: null, starClickAbbas: null, starClickFatima: null, weather, exiting: null });
                            }
                        }} className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors text-right border-t border-white/5" dir="rtl">
                          <Moon size={18} className={nightMode.isActive ? "text-yellow-400 fill-current" : "text-white/40"} />
                          <span className="text-sm font-medium">{nightMode.isActive ? 'إنهاء وضع الليل' : 'بدء وضع الليل'}</span>
                        </button>

                        <button onClick={() => { setShowMoreMenu(false); setIsUpdatingMood(true); }} className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors text-right border-t border-white/5" dir="rtl">
                          <Smile size={18} className="text-amber-400" />
                          <span className="text-sm font-medium">تحديث المزاج</span>
                        </button>

                        <button onClick={() => { setShowMoreMenu(false); setShowSettings(true); }} className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors text-right border-t border-white/5" dir="rtl">
                          <MoreVertical size={18} className="text-white/40" />
                          <span className="text-sm font-medium">الإعدادات</span>
                        </button>

                        <button onClick={() => { setShowMoreMenu(false); onLogout(); }} className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors text-rose-500 text-right border-t border-white/5" dir="rtl">
                          <X size={18} />
                          <span className="text-sm font-medium">تسجيل الخروج</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
             </div>
          </div>
        </header>

        {showSettings && (
           <div className="absolute inset-0 z-[200] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettings(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-zinc-900 border border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-2xl">
               <h3 className="text-xl font-bold text-white mb-6">إعدادات المحادثة</h3>
               
               <div className="mb-6">
                 <h4 className="text-sm text-white/50 mb-3">تخصيص الثيم (يتغير لدى الطرفين)</h4>
                 <div className="grid grid-cols-2 gap-3">
                   {Object.entries(THEMES).map(([key, t]) => (
                     <button key={key} onClick={() => { if (currentUser === 'abbas') setDoc(doc(db, 'settings', 'chatConfig'), { theme: key }, { merge: true }); }} 
                       className={cn("p-4 rounded-2xl border transition-all", currentTheme === key ? "border-white/40 bg-white/10" : "border-white/5 bg-white/5 hover:border-white/20")}>
                       {t.name}
                     </button>
                   ))}
                 </div>
               </div>

               {currentUser === 'abbas' && (
                 <div className="mb-6">
                   <h4 className="text-sm text-white/50 mb-3">مفتاح صانع السلام (Gemini Key)</h4>
                   <input type="password" value={peaceMakerKey} onChange={(e) => setPeaceMakerKey(e.target.value)} placeholder="أدخل مفتاح API..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-2" />
                   <button onClick={() => updateDoc(doc(db, 'users', currentUser), { peaceMakerKey })} className="w-full py-2 bg-purple-600 rounded-xl font-bold">حفظ المفتاح</button>
                 </div>
               )}

               <div className="mb-6">
                 <h4 className="text-sm text-white/50 mb-3">الصورة الشخصية</h4>
                 <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                   const file = e.target.files?.[0];
                   if(!file) return;
                   const reader = new FileReader();
                   reader.readAsDataURL(file);
                   reader.onload = (event) => {
                     const img = new Image();
                     img.src = event.target?.result as string;
                     img.onload = async () => {
                       const canvas = document.createElement('canvas');
                       const MAX_SIZE = 256;
                       let width = img.width;
                       let height = img.height;
                       if (width > height) {
                         if (width > MAX_SIZE) {
                           height *= MAX_SIZE / width;
                           width = MAX_SIZE;
                         }
                       } else {
                         if (height > MAX_SIZE) {
                           width *= MAX_SIZE / height;
                           height = MAX_SIZE;
                         }
                       }
                       canvas.width = width;
                       canvas.height = height;
                       const ctx = canvas.getContext('2d');
                       ctx?.drawImage(img, 0, 0, width, height);
                       const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
                       await updateDoc(doc(db, 'users', currentUser), { avatar: compressedBase64 });
                       if (avatarInputRef.current) avatarInputRef.current.value = "";
                     };
                   };
                 }} />
                 <button onClick={() => avatarInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10">
                   <ImageIcon className="w-5 h-5" />
                   تغيير الصورة
                 </button>
               </div>

               <div className="mb-6">
                 <h4 className="text-sm text-white/50 mb-3">إشعارات النظام (PWA)</h4>
                 <button onClick={() => {
                   if ('Notification' in window) {
                      Notification.requestPermission().then(perm => {
                         if (perm === 'granted') {
                           if ('serviceWorker' in navigator) {
                              navigator.serviceWorker.ready.then(reg => {
                                 reg.showNotification('تم تفعيل الإشعارات بنجاح!', {
                                   body: 'مرحباً بك! ستصلك التنبيهات حتى وإن كان التطبيق في الخلفية.',
                                   icon: '/icon.svg',
                                   badge: '/icon.svg',
                                   silent: false
                                 });
                              });
                           } else {
                              new Notification('تم تفعيل الإشعارات بنجاح!');
                           }
                         } else {
                           alert('لم توافق على تلقي الإشعارات.');
                         }
                      });
                   } else {
                     alert('متصفحك لا يدعم الإشعارات');
                   }
                 }} className="w-full flex items-center justify-center gap-2 py-3 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/30 hover:bg-sky-500/20 font-bold">
                   <Bell className="w-5 h-5" />
                   تفعيل إشعارات الدفع
                 </button>
               </div>

               <button onClick={() => setShowSettings(false)} className="w-full mt-2 py-3 bg-white/10 rounded-xl font-bold">إغلاق</button>
             </motion.div>
           </div>
        )}

        <AnimatePresence>
          {activeCall && (
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="absolute inset-0 z-[300] bg-zinc-900 flex flex-col justify-between p-8 pb-16">
              <div className="absolute inset-0 z-0">
                <img src={partnerAvatar || "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop"} alt="Bg" className="w-full h-full object-cover opacity-20 blur-2xl" />
                <div className="absolute inset-0 bg-black/60" />
              </div>

              {activeCall.status === 'ringing' ? (
                <div className="relative z-10 flex flex-col items-center mt-32 gap-6">
                 <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl animate-pulse">
                   {partnerAvatar ? <img src={partnerAvatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-4xl font-bold">{partner[0]}</div>}
                 </div>
                 <div className="text-center">
                   <h2 className="text-3xl font-medium text-white mb-2">{partner === 'abbas' ? 'عباس' : 'فاطمة'}</h2>
                   <p className="text-white/60 text-lg">
                     {activeCall.caller === currentUser ? 'جاري الاتصال...' : 'يتصل بك...'}
                     {' '}
                     ({activeCall.callType === 'audio' ? 'اتصال صوتي' : 'اتصال فيديو'})
                   </p>
                 </div>
                 <div className="flex gap-8 mt-12">
                   {activeCall.caller !== currentUser && (
                     <button onClick={handleAcceptCall} className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(34,197,94,0.5)] hover:scale-110 active:scale-95 transition-all">
                       {activeCall.callType === 'audio' ? <Phone className="w-7 h-7" /> : <Video className="w-7 h-7" />}
                     </button>
                   )}
                   <button onClick={handleEndCall} className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:scale-110 active:scale-95 transition-all">
                     <PhoneOff className="w-7 h-7" />
                   </button>
                 </div>
                </div>
              ) : (
                <>
                  <div className="relative z-10 w-full h-full flex items-center justify-center -mx-8 -mt-8 pt-8">
                    <iframe
                      allow="camera; microphone; fullscreen; display-capture; autoplay"
                      src={`https://meet.jit.si/${activeCall.roomId}?config.prejoinPageEnabled=false&config.startAudioOnly=${activeCall.callType === 'audio'}&config.p2p.enabled=true&config.disableDeepLinking=true&userInfo.displayName=${currentUser}`}
                      className="w-full h-full border-none"
                    />
                  </div>
                  <button onClick={handleEndCall} className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] active:scale-95 transition-transform z-20">
                    <PhoneOff className="w-7 h-7" />
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>


        {isUpdatingMood && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-b border-white/5 bg-black/40 p-3">
            <form onSubmit={handleUpdateMood} className="flex flex-col gap-3 max-w-sm mx-auto">
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar justify-center">
                {['مشتاق 🥺', 'زعلان 💔', 'نعسان 😴', 'جوعان 🤤', 'سعيد ✨', 'تعبان 😫', 'فرحان 😍', 'محتاجك 🤍'].map(m => (
                  <button type="button" key={m} onClick={() => { setNewMood(m); }} className="text-xs px-3 py-1.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 whitespace-nowrap">{m}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newMood} onChange={e => setNewMood(e.target.value)} placeholder="حالة أخرى..." className="flex-1 bg-black/60 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none" />
                <button type="submit" className="px-5 py-2 bg-[#8774e1] rounded-full text-sm font-bold shadow-lg">تحديث</button>
              </div>
            </form>
          </motion.div>
        )}

        {showDailySpark && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDailySpark(false)} className="absolute inset-0 bg-black backdrop-blur-sm" />
             <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md">
                <DailySpark currentUser={currentUser} apiKey={peaceMakerKey} />
             </motion.div>
          </div>
        )}

        <AnimatePresence>
          {showLoveWill && <LoveWill currentUser={currentUser} onBack={() => setShowLoveWill(false)} />}
          {showHeartVoice && <HeartVoice currentUser={currentUser} onBack={() => setShowHeartVoice(false)} />}
          {showMoodMemory && <MoodMemory onBack={() => setShowMoodMemory(false)} />}
          {showOurStory && <OurStory currentUser={currentUser} partner={partner} onBack={() => setShowOurStory(false)} />}
          {showSecretBox && <SecretBox currentUser={currentUser} onBack={() => setShowSecretBox(false)} />}
          {showMemoryMap && <MemoryMap onBack={() => setShowMemoryMap(false)} />}
          {showRelationshipUniverse && <RelationshipUniverse currentUser={currentUser} onClose={() => setShowRelationshipUniverse(false)} />}
          <AnimatePresence>{showTelegramImporter && <TelegramImporter currentUser={currentUser} onClose={() => setShowTelegramImporter(false)} />}</AnimatePresence>

          {incomingPulse && (
            <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: [1, 2, 1], opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="fixed inset-0 pointer-events-none z-[400] flex items-center justify-center">
              <Heart className="w-32 h-32 text-red-500 fill-current opacity-40 blur-sm" />
            </motion.div>
          )}

          {painProcessing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] bg-black/90 flex flex-col items-center justify-center p-8 text-center">
               <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white/40 mb-12">لحظة...</motion.p>
               
               <div className="space-y-4 w-full max-w-md">
                 {currentPainMsgIndex >= 0 && painMessages.slice(0, currentPainMsgIndex + 1).map((m, i) => (
                   <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-white/5 rounded-2xl text-white/80" dir="rtl">
                     {m.text}
                   </motion.div>
                 ))}
               </div>

               <button 
                 onClick={async () => {
                   await addDoc(collection(db, 'emergencyAlerts'), { type: 'needs_you', senderId: currentUser, timestamp: serverTimestamp(), isActive: true });
                   setPainProcessing(false);
                 }}
                 className="mt-12 px-8 py-3 bg-red-600 text-white rounded-full font-bold shadow-[0_0_30px_rgba(220,38,38,0.4)]"
               >
                 أرسله أعرف إني تعبت
               </button>
            </motion.div>
          )}

          {showNeedsYou && (
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed inset-0 z-[600] bg-[#1a0505] flex flex-col items-center justify-center p-12 text-center">
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity }} className="mb-12">
                <Heart className="w-24 h-24 text-red-500 fill-current" />
              </motion.div>
              <h2 className="text-3xl font-bold text-white mb-4">يحتاجك الآن ❤️</h2>
              <button 
                onClick={async () => {
                   const q = query(collection(db, 'emergencyAlerts'), where('isActive', '==', true), limit(1));
                   // Simplified: just update any active one
                   await addDoc(collection(db, 'emergencyAlerts'), { type: 'coming', senderId: currentUser, timestamp: serverTimestamp(), isActive: false });
                   // Also clear old alerts
                   if (window.navigator.vibrate) window.navigator.vibrate(200);
                   setShowNeedsYou(false);
                }}
                className="px-12 py-4 bg-white text-black rounded-full font-black text-xl"
              >
                أنا جاي
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {showPeaceMaker && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPeaceMaker(false)} className="absolute inset-0 bg-black backdrop-blur-sm" />
             <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md">
                <PeaceMaker apiKey={peaceMakerKey} />
             </motion.div>
          </div>
        )}

        <div ref={scrollContainerRef} onScroll={() => handleScroll()} className="flex-1 flex flex-col overflow-y-auto p-3 space-y-2 scrollbar-none pb-4" style={{backgroundImage:`url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.025'%3E%3Ccircle cx='20' cy='20' r='1.5'/%3E%3C/g%3E%3C/svg%3E")`}}>
          <AnimatePresence initial={false}>
            {messages.map((msg: Message) => (
              <MessageBubble 
                key={msg.id} 
                message={msg} 
                isMine={msg.senderId === currentUser} 
                onReply={handleReply}
                currentUser={currentUserTyped} 
                activeReactionMenu={activeReactionMenu} 
                setActiveReactionMenu={setActiveReactionMenu}
                handleReact={handleReact} 
                EMOJIS={EMOJIS} 
                theme={theme}
                onDelete={handleDeleteMessage}
                onImageClick={handleImageClick}
                nightMode={nightMode.isActive}
              />
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} className="h-2" />
        </div>

        <AnimatePresence>
          {showScrollButton && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 20 }}
              onClick={scrollToBottom}
              className="absolute bottom-[90px] left-4 w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center shadow-2xl z-50 text-white active:scale-90 transition-transform"
            >
              <ChevronDown className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full ring-2 ring-[#0f0f0f]">
                  {unreadCount}
                </span>
              )}
            </motion.button>
          )}
        </AnimatePresence>

        {/* Feature Quick-Access Strip */}
        <div className={cn("shrink-0 z-40 border-t border-white/5 overflow-x-auto flex items-center gap-2.5 px-3 py-2", theme.bg)} style={{scrollbarWidth:'none'}}>
          {[
            { icon: Sparkles, label: 'شرارة',   color: 'text-yellow-400', bg: 'bg-yellow-400/10', onClick: () => setShowDailySpark(true) },
            { icon: ImageIcon, label: 'ذكريات', color: 'text-blue-400',   bg: 'bg-blue-400/10',   onClick: () => setShowMemories(true) },
            { icon: FileText,  label: 'ملاحظات',color: 'text-emerald-400',bg: 'bg-emerald-400/10',onClick: () => setShowNotes(true) },
            { icon: Gamepad2,  label: 'XO',      color: 'text-purple-400', bg: 'bg-purple-400/10', onClick: () => setShowGame(true) },
            { icon: MapPin,    label: 'خريطة',  color: 'text-rose-400',   bg: 'bg-rose-400/10',   onClick: () => setShowMemoryMap(true) },
            { icon: TrendingUp,label: 'مشاعر',  color: 'text-pink-400',   bg: 'bg-pink-400/10',   onClick: () => setShowMoodMemory(true) },
            { icon: PenSquare, label: 'وصية',   color: 'text-amber-400',  bg: 'bg-amber-400/10',  onClick: () => setShowLoveWill(true) },
            { icon: Gavel,     label: 'سلام',   color: 'text-cyan-400',   bg: 'bg-cyan-400/10',   onClick: () => setShowPeaceMaker(true) },
            { icon: Mic,       label: 'قلبي',   color: 'text-red-400',    bg: 'bg-red-400/10',    onClick: () => setShowHeartVoice(true) },
            { icon: Star,      label: 'قصتنا',  color: 'text-indigo-400', bg: 'bg-indigo-400/10', onClick: () => setShowOurStory(true) },
            { icon: Lock,      label: 'سري',    color: 'text-violet-400', bg: 'bg-violet-400/10', onClick: () => setShowSecretBox(true) },
            { icon: Gift,      label: 'مفاجأة', color: 'text-orange-400', bg: 'bg-orange-400/10', onClick: handleSurprise },
            { icon: Sparkles,  label: 'كوننا',  color: 'text-rose-400',   bg: 'bg-rose-400/10',   onClick: () => setShowRelationshipUniverse(true) },
            { icon: Send,      label: 'تيليجرام', color: 'text-sky-400',  bg: 'bg-sky-400/10',    onClick: () => setShowTelegramImporter(true) },
          ].map(({ icon: Icon, label, color, bg, onClick }) => (
            <motion.button
              key={label}
              whileTap={{ scale: 0.86 }}
              onClick={onClick}
              className="flex flex-col items-center gap-1 shrink-0"
            >
              <div className={cn("w-[42px] h-[42px] rounded-[14px] flex items-center justify-center", bg)}>
                <Icon className={cn("w-[18px] h-[18px]", color)} />
              </div>
              <span className="text-[10px] text-white/35 font-medium">{label}</span>
            </motion.button>
          ))}
        </div>

        <footer className={cn("shrink-0 z-50 p-2 pb-safe", theme.bg)}>
          <div className="w-full mx-auto flex flex-col">
            <AnimatePresence>
              {replyTo && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }} 
                  className={cn("flex items-center justify-between mb-2 shadow-sm rounded-t-xl overflow-hidden px-3 pt-2", theme.input)}
                >
                  <div className="flex items-center gap-2">
                    <Reply className="w-5 h-5 text-[#8774e1] mb-1" />
                    <div className="flex flex-col border-r-2 border-[#8774e1] px-2 mb-2">
                      <span className="text-[13px] text-[#8774e1] font-medium tracking-wide">الرد على {replyTo.senderId === 'abbas' ? 'عباس' : 'فاطمة'}</span>
                      <p className="text-sm text-white/70 truncate max-w-[200px] leading-tight">{replyTo.text}</p>
                    </div>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="p-2 rounded-full hover:bg-white/5 text-white/50 active:scale-95 transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-end gap-2 relative pointer-events-auto">

              {/* Main Input Container */}
              <div className={cn("flex-1 min-h-[52px] rounded-[18px] flex flex-col justify-center relative transition-all duration-300", nightMode.isActive ? "bg-black/40 border backdrop-blur-md" : theme.input, nightMode.isActive && newMessage.length > 0 ? "border-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.3)]" : "border-transparent")}>
                <div className="flex items-end px-1 pt-1 pb-1">
                  
                  {/* Emoji Button */}
                  <button type="button" onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowSchedulePicker(false); }} className={cn("w-[44px] h-[44px] flex items-center justify-center shrink-0 transition-colors", nightMode.isActive ? "text-yellow-100 hover:text-yellow-300" : "text-white/60 hover:text-white")}>
                    <Smile className="w-6 h-6" />
                  </button>
                  
                  {/* Schedule Button */}
                  <button type="button" onClick={() => { setShowSchedulePicker(!showSchedulePicker); setShowEmojiPicker(false); }} className={cn("w-[44px] h-[44px] flex items-center justify-center shrink-0 transition-colors relative", scheduledDelay ? "text-purple-400" : (nightMode.isActive ? "text-yellow-100 hover:text-yellow-300" : "text-white/60 hover:text-white"))}>
                    <Clock className="w-5 h-5" />
                    {scheduledDelay && <div className="absolute top-[10px] right-[10px] w-2 h-2 bg-purple-500 rounded-full" />}
                  </button>

                  {/* Text Input */}
                  <div className="flex-1 py-3 px-1 min-h-[44px] flex items-center">
                    <input 
                      type="text"
                      value={newMessage} 
                      onChange={e => handleInputChange(e.target.value)} 
                      placeholder={isRecording ? "جاري التسجيل..." : (nightMode.isActive ? "اكتب رسالة ليلية..." : "رسالة")} 
                      disabled={isRecording}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className={cn("w-full bg-transparent text-[16px] focus:outline-none placeholder:text-white/40", nightMode.isActive && "font-serif text-yellow-50")} 
                    />
                  </div>

                  {/* ··· menu + Attachment */}
                  <div className="relative flex items-center">
                    {/* Expanded extras: Bell + Zap */}
                    <AnimatePresence>
                      {showInputMenu && (
                        <motion.div
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: 'auto', opacity: 1 }}
                          exit={{ width: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() => { handleSendNudge(); setShowInputMenu(false); }}
                            className="w-[44px] h-[44px] flex items-center justify-center shrink-0 text-amber-500 hover:text-amber-400 transition-colors active:scale-95"
                            title="إرسال تنبيه هزاز"
                          >
                            <BellRing className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => { setIsDisappearing(!isDisappearing); setShowInputMenu(false); }}
                            className={cn("w-[44px] h-[44px] flex items-center justify-center shrink-0 transition-colors active:scale-95", isDisappearing ? "text-rose-500" : "text-white/60 hover:text-white")}
                            title="رسائل مختفية (٥ دقائق)"
                          >
                            <Zap className={cn("w-5 h-5", isDisappearing && "fill-current")} />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* ··· toggle */}
                    <button
                      type="button"
                      onClick={() => setShowInputMenu(v => !v)}
                      className={cn("w-[44px] h-[44px] flex items-center justify-center shrink-0 transition-colors text-lg font-bold leading-none tracking-tight", showInputMenu ? "text-white" : "text-white/50 hover:text-white")}
                      title="المزيد"
                    >
                      {showInputMenu ? <X className="w-4 h-4" /> : <span className="mb-1">···</span>}
                    </button>

                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-[44px] h-[44px] flex items-center justify-center shrink-0 text-white/60 hover:text-white transition-colors"
                    >
                      <Paperclip className="w-6 h-6 -rotate-45" />
                    </button>
                    <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (fileInputRef.current) fileInputRef.current.value = "";

                      const toDataUrl = (f: File): Promise<string> => new Promise((resolve, reject) => {
                        const img = new Image();
                        const objectUrl = URL.createObjectURL(f);
                        img.onload = () => {
                          URL.revokeObjectURL(objectUrl);
                          const MAX = 900;
                          let { width, height } = img;
                          if (width > MAX || height > MAX) {
                            if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
                            else { width = Math.round(width * MAX / height); height = MAX; }
                          }
                          const canvas = document.createElement('canvas');
                          canvas.width = width; canvas.height = height;
                          canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
                          resolve(canvas.toDataURL('image/jpeg', 0.75));
                        };
                        img.onerror = reject;
                        img.src = objectUrl;
                      });

                      let loadingMsgId: string | null = null;
                      try {
                        const loadingRef = await addDoc(collection(db, 'messages'), {
                          senderId: currentUser,
                          text: 'جاري معالجة الصورة...',
                          timestamp: serverTimestamp(),
                          status: 'sent'
                        });
                        loadingMsgId = loadingRef.id;

                        const dataUrl = await toDataUrl(file);
                        await updateDoc(doc(db, 'messages', loadingMsgId), {
                          text: '',
                          imageUrls: [dataUrl]
                        });
                      } catch(err) {
                        console.error("Image processing failed:", err);
                        if (loadingMsgId) {
                          await updateDoc(doc(db, 'messages', loadingMsgId), { text: '❌ فشل إرسال الصورة' }).catch(() => {});
                        }
                        setToastMessage("فشل إرسال الصورة، حاول مرة ثانية.");
                        setTimeout(() => setToastMessage(null), 4000);
                      }
                    }} />
                  </div>
                  
                </div>

                {/* Inline Emoji Picker */}
                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 100 }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-2 px-4 overflow-hidden items-center border-t border-white/5 pt-2 pb-2 overflow-y-auto">
                      <div className="flex flex-wrap gap-4 items-center justify-center mb-2">
                        {EMOJIS.map(e => <button type="button" key={e} onClick={() => { setNewMessage(prev => prev + e); }} className="text-2xl hover:scale-125 transition-transform">{e}</button>)}
                      </div>
                      <div className="flex gap-4 items-center justify-center py-2 border-t border-white/5 w-full">
                        {STICKERS.map((s, i) => (
                          <button type="button" key={i} onClick={async () => {
                            await addDoc(collection(db, 'messages'), { senderId: currentUser, imageUrl: s, timestamp: serverTimestamp(), status: 'sent' });
                            setShowEmojiPicker(false);
                          }} className="w-12 h-12 hover:scale-110 transition-transform"><img src={s} alt="sticker" className="w-full h-full object-contain" /></button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Inline Schedule Picker */}
                <AnimatePresence>
                  {showSchedulePicker && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 60 }} exit={{ opacity: 0, height: 0 }} className="flex gap-2 px-4 overflow-hidden items-center border-t border-white/5 pt-2 pb-2 overflow-x-auto justify-center">
                      <button type="button" onClick={() => { setScheduledDelay(null); setShowSchedulePicker(false); }} className={cn("px-4 py-1.5 rounded-full text-sm shrink-0 transition-colors", !scheduledDelay ? "bg-white/20 text-white" : "bg-white/5 text-white/60 hover:bg-white/10")}>الآن</button>
                      <button type="button" onClick={() => { setScheduledDelay(10000); setShowSchedulePicker(false); }} className={cn("px-4 py-1.5 rounded-full text-sm shrink-0 transition-colors", scheduledDelay === 10000 ? "bg-purple-500 text-white" : "bg-white/5 text-white/60 hover:bg-white/10")}>١٠ ثواني</button>
                      <button type="button" onClick={() => { setScheduledDelay(60000); setShowSchedulePicker(false); }} className={cn("px-4 py-1.5 rounded-full text-sm shrink-0 transition-colors", scheduledDelay === 60000 ? "bg-purple-500 text-white" : "bg-white/5 text-white/60 hover:bg-white/10")}>١ دقيقة</button>
                      <button type="button" onClick={() => { setScheduledDelay(300000); setShowSchedulePicker(false); }} className={cn("px-4 py-1.5 rounded-full text-sm shrink-0 transition-colors", scheduledDelay === 300000 ? "bg-purple-500 text-white" : "bg-white/5 text-white/60 hover:bg-white/10")}>٥ دقائق</button>
                    </motion.div>
                  )}
                </AnimatePresence>
                
              </div>

              {/* Mic / Send Button */}
              <div className="flex flex-col items-center justify-end shrink-0 pointer-events-auto h-[52px]">
                <button
                  onMouseDown={(e) => {
                    if (newMessage.trim() || replyTo) return; // Ignore mic if sending text
                    e.preventDefault();
                    // Audio recording logic
                    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                      const mediaRecorder = new MediaRecorder(stream);
                      mediaRecorderRef.current = mediaRecorder;
                      audioChunksRef.current = [];
                      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
                      mediaRecorder.onstop = async () => {
                        try {
                          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                          const storageRef = ref(storage, `audio/${currentUser}_${Date.now()}.webm`);
                          await uploadBytes(storageRef, audioBlob);
                          const url = await getDownloadURL(storageRef);
                          await addDoc(collection(db, 'messages'), { senderId: currentUser, audioUrl: url, timestamp: serverTimestamp(), status: 'sent' });
                        } catch (error) {
                          console.error("Audio save failed:", error);
                          setToastMessage("فشل حفظ الصوت");
                          setTimeout(() => setToastMessage(null), 2000);
                        }
                      };
                      mediaRecorder.start();
                      setIsRecording(true);
                      if (window.navigator.vibrate) window.navigator.vibrate(50);
                    }).catch(() => { });
                  }}
                  onMouseUp={() => {
                    if (isRecording) {
                      mediaRecorderRef.current?.stop();
                      setIsRecording(false);
                    }
                  }}
                  onClick={(e) => {
                    if (newMessage.trim() || replyTo) {
                      handleSendMessage(e);
                    }
                  }}
                  className={cn(
                    "w-[50px] h-[50px] flex items-center justify-center rounded-full transition-all text-white shadow-sm",
                    (newMessage.trim() || replyTo) || isSentFeedback
                      ? "bg-[#8774e1] active:scale-90"
                      : isRecording ? "bg-red-500 scale-125 shadow-red-500/40" : "bg-[#8774e1] active:scale-90"
                  )}
                >
                  {isSentFeedback ? <Check className="w-[22px] h-[22px]" /> : (newMessage.trim() || replyTo) ? <Send className="w-[22px] h-[22px] ml-1" /> : isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-[22px] h-[22px]" />}
                </button>
              </div>

            </div>
          </div>
        </footer>

        <AnimatePresence>
          {showMemories && (
            <div className="fixed inset-0 z-[100] flex flex-col justify-end">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowMemories(false)} className="absolute inset-0 bg-black backdrop-blur-sm" />
               <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative bg-zinc-900/90 backdrop-blur-3xl border-t border-white/10 rounded-t-[40px] px-6 pb-12 pt-4 shadow-2xl flex flex-col max-h-[85dvh]">
                  <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8" />
                  <h3 className="text-2xl font-bold text-white mb-6">صندوق الذكريات</h3>
                  <div className="overflow-y-auto grid grid-cols-2 gap-3 pr-1">
                      {messages.flatMap(m => {
                          const imgs = [];
                          if (m.imageUrl) imgs.push(m.imageUrl);
                          if (m.imageUrls) imgs.push(...m.imageUrls);
                          return imgs;
                      }).map((imgStr, i) => (
                          <div key={i} className="aspect-square rounded-3xl overflow-hidden shadow-xl" onClick={() => setFullscreenImage(imgStr)}>
                              <img src={imgStr} className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-500" />
                          </div>
                      ))}
                  </div>
               </motion.div>
            </div>
          )}
          {showNotes && (
            <div className="fixed inset-0 z-[100] flex flex-col justify-end">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNotes(false)} className="absolute inset-0 bg-black backdrop-blur-sm" />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative bg-stone-900/90 backdrop-blur-3xl border-t border-white/10 rounded-t-[40px] px-6 pb-12 pt-4 shadow-2xl flex flex-col max-h-[85dvh]">
                 <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8" />
                  <h3 className="text-2xl font-bold text-white mb-4">ملاحظاتنا</h3>
                 <form onSubmit={async (e) => {
                   e.preventDefault();
                   if(!newNote.trim()) return;
                   await addDoc(collection(db, 'notes'), { text: newNote, completed: false, createdAt: serverTimestamp(), author: currentUser });
                   setNewNote('');
                 }} className="flex gap-2 mb-6">
                   <input type="text" value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="أضف هدفاً أو ملاحظة..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none" />
                   <button type="submit" className="bg-[#8774e1] px-6 rounded-xl font-bold">إضافة</button>
                 </form>
                 <div className="overflow-y-auto space-y-3 pr-1">
                    {notes.map(note => (
                      <div key={note.id} className={cn("bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between shadow-sm transition-all", note.completed && "opacity-50")}>
                        <div className="flex items-center gap-3">
                          <button onClick={() => updateDoc(doc(db, 'notes', note.id), { completed: !note.completed })} className={cn("w-6 h-6 rounded-md border flex items-center justify-center transition-colors", note.completed ? "bg-emerald-500 border-emerald-500" : "border-white/20")}>
                            {note.completed && <Check className="w-4 h-4 text-white" />}
                          </button>
                          <p className={cn("text-base leading-relaxed", note.completed ? "line-through text-white/50" : "text-white/90")}>{note.text}</p>
                        </div>
                        <button onClick={() => deleteDoc(doc(db, 'notes', note.id))} className="text-rose-500 p-2 hover:bg-white/10 rounded-full"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                 </div>
              </motion.div>
            </div>
          )}
          {showGame && (
            <div className="fixed inset-0 z-[100] flex flex-col justify-end">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowGame(false)} className="absolute inset-0 bg-black backdrop-blur-sm" />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative bg-indigo-950/90 backdrop-blur-3xl border-t border-white/10 rounded-t-[40px] px-6 pb-12 pt-4 shadow-2xl flex flex-col max-h-[85dvh]">
                 <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8" />
                 <h3 className="text-2xl font-bold text-white mb-8">XO</h3>
                 {gameState && (
                    <div className="flex-1 flex flex-col items-center justify-center p-4">
                      <div className="grid grid-cols-3 gap-3 bg-white/5 p-4 rounded-[40px] border border-white/5 shadow-2xl">
                        {gameState.board.map((cell: string, i: number) => (
                          <button key={i} onClick={() => { if (cell) return; const newBoard = [...gameState.board]; newBoard[i] = currentUser === 'abbas' ? 'X' : 'O'; setDoc(doc(db, 'games', 'tictactoe'), { ...gameState, board: newBoard, xIsNext: !gameState.xIsNext }); }}
                            className={cn("w-20 h-20 sm:w-24 sm:h-24 aspect-square flex items-center justify-center text-5xl font-bold rounded-[24px] transition-all border", cell === 'X' ? "text-blue-400 bg-blue-500/10 border-blue-500/20" : cell === 'O' ? "text-pink-400 bg-pink-500/10 border-pink-500/20" : "bg-white/5 border-white/5 disabled:opacity-50")} disabled={!cell && ((gameState.xIsNext && currentUser !== 'abbas') || (!gameState.xIsNext && currentUser !== 'fatima'))}>{cell}</button>
                        ))}
                      </div>
                      <div className="mt-8 text-white/70 text-center font-bold">
                        {(() => {
                           const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
                           for (let i = 0; i < lines.length; i++) {
                             const [a,b,c] = lines[i];
                             if (gameState.board[a] && gameState.board[a] === gameState.board[b] && gameState.board[a] === gameState.board[c]) {
                               return `الفائز: ${gameState.board[a] === 'X' ? 'عباس' : 'فاطمة'} 🎉`;
                             }
                           }
                           if (gameState.board.every((c: string) => c)) return "تعادل!";
                           return `دور: ${gameState.xIsNext ? 'عباس (X)' : 'فاطمة (O)'}`;
                        })()}
                      </div>
                      <button onClick={() => setDoc(doc(db, 'games', 'tictactoe'), { board: Array(9).fill(''), xIsNext: true })} className="w-full mt-10 py-5 bg-white text-black font-bold rounded-3xl shadow-xl">إعادة اللعبة</button>
                    </div>
                  )}
              </motion.div>
            </div>
          )}
          {fullscreenImage && (
             <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md">
                <button 
                  onClick={() => setFullscreenImage(null)} 
                  className="absolute top-6 right-6 z-[210] p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-lg"
                >
                  <X className="w-6 h-6" />
                </button>
                <TransformWrapper>
                  <TransformComponent wrapperClass="w-full h-full flex items-center justify-center">
                    <motion.img 
                      initial={{ opacity: 0, scale: 0.9 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      className="max-w-full max-h-[100dvh] object-contain drop-shadow-2xl" 
                      src={fullscreenImage} 
                      alt="Fullscreen" 
                    />
                  </TransformComponent>
                </TransformWrapper>
             </div>
          )}
        </AnimatePresence>
        <VoiceCall ref={voiceCallRef} currentUser={currentUser} otherUser={otherUser} />
        <style>{`
/* Hide scrollbar but keep functionality */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

@keyframes confetti-fall {
  0% { transform: translateY(-100%) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
}

.confetti-particle {
  position: fixed;
  width: 10px;
  height: 10px;
  top: -10px;
  animation: confetti-fall 4s linear forwards;
}

.fog-entry {
  filter: blur(20px);
  opacity: 0;
  animation: fog-fade-in 2s forwards;
}

@keyframes fog-fade-in {
  to { filter: blur(0); opacity: 1; }
}

@keyframes typing-dot {
  0%, 60%, 100% { transform: translateY(0px); opacity: 0.4; }
  30% { transform: translateY(-4px); opacity: 1; }
}

.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
`}</style>
      </div>
    </div>
  );
}
