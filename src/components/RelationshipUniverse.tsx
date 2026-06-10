import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useAnimationFrame } from 'motion/react';
import {
  Heart, Globe, Shrub, Calendar, Home, BookOpen, Star, Sparkles,
  Play, Image as ImageIcon, Clock, Save, ArrowLeft, RefreshCw,
  Layers, Volume2, Zap, Wind, Cpu
} from 'lucide-react';
import {
  doc, getDoc, setDoc, onSnapshot, collection, query, orderBy, updateDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GoogleGenAI } from '@google/genai';
import { computeEmotionalState, type EmotionalState } from '../lib/emotionalEngine';
import { computeSeasonalState, type SeasonalState } from '../lib/seasonalEngine';

/* ─────────────────────────────── TYPES ─────────────────────────────── */
interface RelationshipUniverseProps {
  currentUser: 'abbas' | 'fatima';
  onClose: () => void;
}
interface Message {
  id: string; senderId: 'abbas' | 'fatima'; text: string; timestamp: Date;
  imageUrls?: string[]; voiceUrl?: string;
}
interface Milestone {
  id: string; title: string; date: string; description: string;
  type: 'first_message' | 'photo' | 'voice' | 'special' | 'achieve';
}
interface PinnedStory { id: string; title: string; period: string; content: string; timestamp: number; }
type TabId = 'overview'|'heart'|'planet'|'garden'|'tree'|'home'|'palace'|'galaxy'|'lifebook'|'timetravel'|'ai-story';

/* ─────────────────────────────── CSS KEYFRAMES ─────────────────────── */
const CSS_ANIMATIONS = `
  @keyframes sway1 { from { transform: rotate(-3deg); } to { transform: rotate(3deg); } }
  @keyframes sway2 { from { transform: rotate(-5deg); } to { transform: rotate(4deg); } }
  @keyframes sway3 { from { transform: rotate(-2deg); } to { transform: rotate(2.5deg); } }
  @keyframes twinkle { 0%,100% { opacity: 0.2; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.1); } }
  @keyframes petalFall { 0% { transform: translateY(-30px) rotate(0deg); opacity:0; } 15%{opacity:1;} 100% { transform: translateY(420px) rotate(720deg); opacity:0; } }
  @keyframes snowFall  { 0% { transform: translateY(-10px) translateX(0); opacity:0; } 20%{opacity:0.85;} 100% { transform: translateY(420px) translateX(25px); opacity:0; } }
  @keyframes leafFall  { 0% { transform: translateY(-10px) rotate(0deg); opacity:0; } 100% { transform: translateY(420px) rotate(540deg); opacity:0; } }
  @keyframes orbFloat  { 0%,100% { transform: translate(0,0) scale(1); opacity: 0.75; } 33% { transform: translate(8px,-12px) scale(1.05); opacity: 1; } 66% { transform: translate(-6px,8px) scale(0.95); opacity: 0.6; } }
  @keyframes heartbeat { 0%,100% { transform: scale(1); } 14% { transform: scale(1.08); } 28% { transform: scale(1); } 42% { transform: scale(1.05); } }
  @keyframes ekg { from { stroke-dashoffset: 600; } to { stroke-dashoffset: -600; } }
  @keyframes ringDraw { from { stroke-dashoffset: 283; } to { stroke-dashoffset: 0; } }
  @keyframes ambientPulse { 0%,100%{opacity:0.12;} 50%{opacity:0.22;} }
  @keyframes shimmer { 0%{background-position:-200% 0;} 100%{background-position:200% 0;} }
`;

/* ═══════════════════════════ SVG COMPONENTS ═══════════════════════════ */

function SVGRose({ color='#e11d48', size=36, delay=0 }: { color?: string; size?: number; delay?: number }) {
  const outer = [0,40,80,120,160,200,240,280,320];
  const inner = [20,60,100,140,180,220,260,300,340];
  return (
    <svg width={size} height={size*1.65} viewBox="0 0 40 66" fill="none"
      style={{ transformOrigin:'bottom center', animation:`sway1 ${2.8+delay*0.4}s ease-in-out ${delay*0.3}s infinite alternate` }}>
      <path d="M20 66 C18 52 22 44 20 33" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M20 51 C11 45 7 38 13 35 C17 33 20 44 20 51Z" fill="#166534"/>
      <path d="M20 51 C29 45 33 38 27 35 C23 33 20 44 20 51Z" fill="#15803d" opacity="0.7"/>
      {outer.map((r,i) => <path key={i} d="M20,20 C13,11 9,5 20,1 C31,5 27,11 20,20Z" fill={color} fillOpacity="0.78" transform={`rotate(${r},20,20)`}/>)}
      {inner.map((r,i) => <path key={i} d="M20,19 C15,13 13,9 20,6 C27,9 25,13 20,19Z" fill={color} fillOpacity="0.96" transform={`rotate(${r},20,20)`}/>)}
      <circle cx="20" cy="20" r="5" fill={color} opacity="0.7"/>
      <circle cx="18.5" cy="18.5" r="2" fill="white" opacity="0.25"/>
    </svg>
  );
}

function SVGTulip({ color='#a855f7', size=30, delay=0 }: { color?: string; size?: number; delay?: number }) {
  return (
    <svg width={size} height={size*1.9} viewBox="0 0 30 57" fill="none"
      style={{ transformOrigin:'bottom center', animation:`sway2 ${3+delay*0.5}s ease-in-out ${delay*0.2}s infinite alternate` }}>
      <path d="M15 57 C14 46 16 38 15 28" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M15 44 C8 40 5 33 11 31 C14 30 15 40 15 44Z" fill="#16a34a"/>
      <path d="M15 44 C22 40 25 33 19 31 C16 30 15 40 15 44Z" fill="#15803d" opacity="0.7"/>
      <path d="M15 28 C8 23 6 12 15 6 C24 12 22 23 15 28Z" fill={color} opacity="0.9"/>
      <path d="M15 28 C7 21 6 11 15 5" stroke={color} strokeWidth="3.5" strokeLinecap="round" opacity="0.65"/>
      <path d="M15 28 C23 21 24 11 15 5" stroke={color} strokeWidth="3.5" strokeLinecap="round" opacity="0.65"/>
      <ellipse cx="15" cy="10" rx="5.5" ry="6.5" fill={color} opacity="0.85"/>
      <ellipse cx="13" cy="8" rx="2" ry="3" fill="white" opacity="0.18"/>
    </svg>
  );
}

function SVGSunflower({ size=38, delay=0 }: { size?: number; delay?: number }) {
  const rays = Array.from({length:16},(_,i)=>i*(360/16));
  return (
    <svg width={size} height={size*1.75} viewBox="0 0 38 66" fill="none"
      style={{ transformOrigin:'bottom center', animation:`sway3 ${3.5+delay*0.3}s ease-in-out ${delay*0.25}s infinite alternate` }}>
      <path d="M19 66 C17 52 21 44 19 30" stroke="#854d0e" strokeWidth="3" strokeLinecap="round"/>
      <path d="M19 50 C10 44 6 37 12 34 C16 32 19 44 19 50Z" fill="#166534"/>
      {rays.map((r,i) => <ellipse key={i} cx="19" cy="13" rx="3" ry="8.5" fill="#fbbf24" opacity="0.88" transform={`rotate(${r},19,20)`}/>)}
      <circle cx="19" cy="20" r="7.5" fill="#92400e"/>
      <circle cx="19" cy="20" r="5.5" fill="#78350f"/>
      {Array.from({length:20},(_,i)=>(
        <circle key={i} cx={19+4.2*Math.cos(i*(Math.PI*2/20))} cy={20+4.2*Math.sin(i*(Math.PI*2/20))} r="0.8" fill="#fbbf24"/>
      ))}
      <circle cx="17" cy="18" r="1.5" fill="white" opacity="0.12"/>
    </svg>
  );
}

function SVGTree({ season, memories }: { season: string; memories: Milestone[] }) {
  const lc = season==='spring'?'#86efac':season==='summer'?'#16a34a':season==='autumn'?'#d97706':'#94a3b8';
  const fc = season==='spring'?'#f9a8d4':'none';
  const Blossom = ({cx,cy}:{cx:number;cy:number}) => season==='spring'?(
    <g filter="url(#treeGlow)">
      {[0,72,144,216,288].map((r,i)=>(
        <ellipse key={i} cx={cx+4.5*Math.cos(r*Math.PI/180)} cy={cy+4.5*Math.sin(r*Math.PI/180)} rx="3.5" ry="5" fill={fc} opacity="0.9" transform={`rotate(${r},${cx+4.5*Math.cos(r*Math.PI/180)},${cy+4.5*Math.sin(r*Math.PI/180)})`}/>
      ))}
      <circle cx={cx} cy={cy} r="3" fill="#fef08a"/>
    </g>
  ):null;
  const Snow = ({x,y,w}:{x:number;y:number;w:number}) => season==='winter'?(
    <ellipse cx={x} cy={y} rx={w/2+5} ry={4.5} fill="white" opacity="0.82"/>
  ):null;
  return (
    <svg viewBox="0 0 280 340" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="trunk" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#3b1f15"/><stop offset="40%" stopColor="#6b3a2a"/><stop offset="100%" stopColor="#3b1f15"/></linearGradient>
        <radialGradient id="leafR" cx="50%" cy="50%"><stop offset="0%" stopColor={lc} stopOpacity="1"/><stop offset="100%" stopColor={lc} stopOpacity="0.45"/></radialGradient>
        <filter id="treeGlow"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {/* ground */}
      <ellipse cx="140" cy="336" rx="95" ry="10" fill="#16a34a" opacity="0.3"/>
      {Array.from({length:24},(_,i)=>(
        <path key={i} d={`M${98+i*8} 336 Q${96+i*8} ${320+(i%4)*4} ${100+i*8} 308`} stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" opacity="0.45"/>
      ))}
      {/* trunk */}
      <path d="M140 336 C136 298 128 260 134 225 C137 205 146 180 140 155" stroke="url(#trunk)" strokeWidth="24" strokeLinecap="round" fill="none"/>
      <path d="M140 336 C144 298 152 260 146 225 C143 205 134 180 140 155" stroke="#3b1f15" strokeWidth="10" strokeLinecap="round" fill="none" opacity="0.45"/>
      {[278,252,224,198,172].map((y,i)=>(
        <path key={i} d={`M${134-i} ${y} Q140 ${y-4} ${146+i} ${y}`} stroke="#3b1f15" strokeWidth="1.2" opacity="0.3" fill="none"/>
      ))}
      {/* branches */}
      <path d="M140 160 C156 140 178 118 204 98" stroke="url(#trunk)" strokeWidth="12" strokeLinecap="round" fill="none"/>
      <path d="M204 98 C215 85 228 76 240 62" stroke="url(#trunk)" strokeWidth="8" strokeLinecap="round" fill="none"/>
      <path d="M204 98 C217 94 230 102 242 110" stroke="url(#trunk)" strokeWidth="6" strokeLinecap="round" fill="none"/>
      <path d="M140 160 C124 140 102 118 76 100" stroke="url(#trunk)" strokeWidth="12" strokeLinecap="round" fill="none"/>
      <path d="M76 100 C62 88 48 80 36 70" stroke="url(#trunk)" strokeWidth="8" strokeLinecap="round" fill="none"/>
      <path d="M76 100 C63 107 52 118 46 124" stroke="url(#trunk)" strokeWidth="6" strokeLinecap="round" fill="none"/>
      <path d="M140 155 C140 132 138 110 140 85" stroke="url(#trunk)" strokeWidth="10" strokeLinecap="round" fill="none"/>
      <path d="M140 85 C134 70 126 56 120 42" stroke="url(#trunk)" strokeWidth="6" strokeLinecap="round" fill="none"/>
      <path d="M140 85 C146 70 154 56 160 42" stroke="url(#trunk)" strokeWidth="6" strokeLinecap="round" fill="none"/>
      <path d="M140 198 C160 186 178 175 195 164" stroke="url(#trunk)" strokeWidth="9" strokeLinecap="round" fill="none"/>
      <path d="M195 164 C208 157 222 163 234 168" stroke="url(#trunk)" strokeWidth="6" strokeLinecap="round" fill="none"/>
      <path d="M140 198 C120 186 102 175 85 164" stroke="url(#trunk)" strokeWidth="9" strokeLinecap="round" fill="none"/>
      <path d="M85 164 C72 157 58 163 46 168" stroke="url(#trunk)" strokeWidth="6" strokeLinecap="round" fill="none"/>
      {/* leaf clusters */}
      {season!=='winter'&&<>
        <ellipse cx="238" cy="62" rx="30" ry="23" fill="url(#leafR)" opacity="0.92"/>
        <ellipse cx="37" cy="70" rx="30" ry="23" fill="url(#leafR)" opacity="0.92"/>
        <ellipse cx="140" cy="44" rx="34" ry="27" fill="url(#leafR)" opacity="0.95"/>
        <ellipse cx="120" cy="42" rx="20" ry="16" fill="url(#leafR)" opacity="0.8"/>
        <ellipse cx="160" cy="42" rx="20" ry="16" fill="url(#leafR)" opacity="0.8"/>
        <ellipse cx="224" cy="168" rx="27" ry="20" fill="url(#leafR)" opacity="0.85"/>
        <ellipse cx="52" cy="168" rx="27" ry="20" fill="url(#leafR)" opacity="0.85"/>
        <ellipse cx="46" cy="124" rx="22" ry="17" fill="url(#leafR)" opacity="0.78"/>
        <ellipse cx="244" cy="110" rx="22" ry="17" fill="url(#leafR)" opacity="0.78"/>
        <Blossom cx={238} cy={62}/>
        <Blossom cx={37} cy={70}/>
        <Blossom cx={140} cy={44}/>
        <Snow x={238} y={54} w={60}/><Snow x={37} y={62} w={60}/><Snow x={140} y={36} w={68}/>
      </>}
      {season==='winter'&&<>
        <Snow x={140} y={86} w={22}/><Snow x={204} y={98} w={18}/><Snow x={76} y={100} w={18}/>
      </>}
      {/* memory fruits */}
      {memories.slice(0,7).map((m,i)=>{
        const pts=[[238,62],[37,70],[140,44],[224,168],[52,168],[120,42],[160,42]];
        const [fx,fy]=pts[i%pts.length];
        return (
          <g key={m.id} filter="url(#treeGlow)" className="cursor-pointer">
            <circle cx={fx} cy={fy} r="8" fill="#e11d48" opacity="0.92"/>
            <circle cx={fx-1.5} cy={fy-2.5} r="2.5" fill="white" opacity="0.45"/>
            <text x={fx} y={fy+4} textAnchor="middle" fontSize="6.5" fill="white" fontWeight="bold">
              {m.type==='voice'?'🎵':m.type==='photo'?'📸':m.type==='achieve'?'⭐':'💖'}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function RealisticPlanet({ level, glowColor }: { level: number; glowColor: string }) {
  return (
    <div className="relative flex items-center justify-center select-none" style={{width:280,height:280}}>
      {Array.from({length:55},(_,i)=>(
        <div key={i} className="absolute rounded-full bg-white"
          style={{width:Math.random()*2+0.5,height:Math.random()*2+0.5,top:`${Math.random()*100}%`,left:`${Math.random()*100}%`,opacity:Math.random()*0.65+0.15,animation:`twinkle ${2+Math.random()*3}s ${Math.random()*2}s ease-in-out infinite`}}/>
      ))}
      <div className="absolute rounded-full border border-purple-400/15" style={{width:310,height:95,borderRadius:'50%',transform:'rotateX(70deg)'}}/>
      <motion.div className="absolute" style={{width:280,height:280}} animate={{rotate:360}} transition={{repeat:Infinity,duration:22,ease:'linear'}}>
        <div className="absolute w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-300 shadow-lg"
          style={{top:0,left:'50%',transform:'translate(-50%,-50%)',boxShadow:'0 0 14px rgba(255,255,255,0.3)'}}>
          <div className="absolute rounded-full bg-slate-500/35" style={{width:6,height:6,top:4,left:5}}/>
          <div className="absolute rounded-full bg-slate-500/25" style={{width:4,height:4,top:13,left:14}}/>
        </div>
      </motion.div>
      <div className="absolute rounded-full" style={{width:240,height:240,background:`radial-gradient(circle at 50% 50%, transparent 48%, ${glowColor}40 52%, ${glowColor}20 58%, transparent 65%)`}}/>
      <div className="relative rounded-full overflow-hidden" style={{width:200,height:200,boxShadow:`0 0 70px ${glowColor}50, inset -30px -20px 60px rgba(0,0,0,0.72), inset 15px 10px 40px rgba(255,255,255,0.07)`}}>
        <div className="absolute inset-0" style={{background:'linear-gradient(135deg,#1e3a5f 0%,#1e40af 30%,#1d4ed8 50%,#2563eb 70%,#1e40af 100%)'}}/>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
          <defs>
            <filter id="cblur"><feGaussianBlur stdDeviation="1.2"/></filter>
          </defs>
          <path d="M52 58 C74 42 108 48 124 64 C140 80 134 102 120 117 C104 132 78 134 62 120 C44 106 38 76 52 58Z" fill="#2d6a27" opacity="0.88"/>
          <path d="M52 58 C74 42 108 48 124 64 C140 80 134 102 120 117 C104 132 78 134 62 120 C44 106 38 76 52 58Z" fill="#16a34a" opacity="0.35" filter="url(#cblur)"/>
          <path d="M78 60 C95 55 110 64 107 78 C102 92 82 90 75 77 C69 66 72 63 78 60Z" fill="#d97706" opacity="0.62"/>
          <path d="M68 63 C71 57 77 55 82 60 C79 61 73 65 68 63Z" fill="white" opacity="0.72"/>
          <path d="M128 118 C146 107 168 116 172 134 C176 151 161 164 146 160 C127 154 118 134 128 118Z" fill="#15803d" opacity="0.82"/>
          <path d="M135 126 C147 121 159 128 156 142 C151 153 136 149 132 138 C130 130 133 128 135 126Z" fill="#d97706" opacity="0.52"/>
          <ellipse cx="100" cy="9" rx="42" ry="13" fill="white" opacity="0.72"/>
          <ellipse cx="100" cy="193" rx="32" ry="9" fill="white" opacity="0.55"/>
          {level>=3&&[{x:65,y:86},{x:92,y:100},{x:147,y:128},{x:162,y:138},{x:80,y:110}].map((c,i)=>(
            <circle key={i} cx={c.x} cy={c.y} r="1.5" fill="#fef08a" opacity="0.85" style={{animation:`twinkle ${0.8+i*0.3}s ease-in-out infinite alternate`}}/>
          ))}
          {level>=5&&[{x:55,y:70},{x:100,y:78},{x:155,y:120}].map((c,i)=>(
            <g key={i}><circle cx={c.x} cy={c.y} r="3" fill="#fef08a" opacity="0.6"/><circle cx={c.x} cy={c.y} r="6" fill="#fef08a" opacity="0.15"/></g>
          ))}
        </svg>
        <motion.div className="absolute inset-0 rounded-full overflow-hidden" animate={{rotate:360}} transition={{repeat:Infinity,duration:38,ease:'linear'}}>
          <svg className="w-full h-full" viewBox="0 0 200 200">
            <ellipse cx="68" cy="48" rx="40" ry="10" fill="white" opacity="0.33"/>
            <ellipse cx="142" cy="78" rx="32" ry="8" fill="white" opacity="0.26"/>
            <ellipse cx="100" cy="148" rx="46" ry="9" fill="white" opacity="0.3"/>
            <ellipse cx="38" cy="130" rx="24" ry="7" fill="white" opacity="0.2"/>
            <ellipse cx="162" cy="52" rx="20" ry="6" fill="white" opacity="0.18"/>
          </svg>
        </motion.div>
        <div className="absolute inset-0 rounded-full" style={{background:'radial-gradient(circle at 32% 28%, rgba(147,197,253,0.2) 0%, transparent 52%), radial-gradient(circle at 80% 80%, rgba(0,0,0,0.5) 0%, transparent 48%)'}}/>
      </div>
      <div className="absolute" style={{top:'20%',left:'20%'}}>
        <div className="group relative cursor-pointer">
          <div className="w-6 h-6 rounded-full bg-rose-500 border-2 border-white text-xs flex items-center justify-center shadow-lg" style={{animation:'orbFloat 3s ease-in-out infinite'}}>🏛</div>
          <div className="absolute bottom-8 right-0 hidden group-hover:block w-36 bg-black/90 p-2 rounded-xl text-center text-[10px] text-rose-300 border border-rose-500/20 z-20">قلب البداية — هنا بدأت المحادثة الأولى</div>
        </div>
      </div>
      {level>=3&&<div className="absolute" style={{bottom:'20%',right:'16%'}}>
        <div className="group relative cursor-pointer">
          <div className="w-6 h-6 rounded-full bg-purple-500 border-2 border-white text-xs flex items-center justify-center shadow-lg" style={{animation:'orbFloat 4s 1s ease-in-out infinite'}}>🏰</div>
          <div className="absolute bottom-8 left-0 hidden group-hover:block w-36 bg-black/90 p-2 rounded-xl text-center text-[10px] text-purple-300 border border-purple-500/20 z-20">قصر التوافق — مائة وثيقة حب</div>
        </div>
      </div>}
      {level>=5&&<div className="absolute" style={{top:'48%',right:'8%'}}>
        <div className="group relative cursor-pointer">
          <div className="w-6 h-6 rounded-full bg-amber-400 border-2 border-white text-xs flex items-center justify-center shadow-lg" style={{animation:'orbFloat 3.5s 0.5s ease-in-out infinite'}}>✨</div>
          <div className="absolute bottom-8 left-0 hidden group-hover:block w-36 bg-black/90 p-2 rounded-xl text-center text-[10px] text-amber-300 border border-amber-500/20 z-20">أفق النور — التكامل الروحي</div>
        </div>
      </div>}
    </div>
  );
}

function GalaxyCanvas({ totalMessages, glowColor }: { totalMessages: number; glowColor: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if(!canvas) return;
    const ctx = canvas.getContext('2d'); if(!ctx) return;
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle='#020208'; ctx.fillRect(0,0,W,H);
    const band = ctx.createLinearGradient(0,H*0.15,W,H*0.85);
    band.addColorStop(0,'rgba(139,92,246,0)');
    band.addColorStop(0.3,'rgba(99,102,241,0.07)');
    band.addColorStop(0.5,'rgba(167,139,250,0.14)');
    band.addColorStop(0.7,'rgba(99,102,241,0.07)');
    band.addColorStop(1,'rgba(139,92,246,0)');
    ctx.fillStyle=band; ctx.fillRect(0,0,W,H);
    const neb=ctx.createRadialGradient(W*0.55,H*0.45,0,W*0.55,H*0.45,W*0.32);
    neb.addColorStop(0,glowColor+'28'); neb.addColorStop(0.5,glowColor+'12'); neb.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=neb; ctx.fillRect(0,0,W,H);
    const cnt=Math.min(900,250+totalMessages*3);
    for(let i=0;i<cnt;i++){
      const x=Math.random()*W, y=Math.random()*H, r=Math.random()*1.6+0.2, a=Math.random()*0.65+0.2;
      const hue=Math.random()<0.12?`rgba(244,200,180,${a})`:Math.random()<0.08?`rgba(180,200,255,${a})`:`rgba(255,255,255,${a})`;
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle=hue; ctx.fill();
      if(r>1.1){ctx.beginPath();ctx.arc(x,y,r*3.5,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,0.03)';ctx.fill();}
    }
    const s26=[{x:W*.5,y:H*.32},{x:W*.33,y:H*.52},{x:W*.67,y:H*.52},{x:W*.4,y:H*.7},{x:W*.6,y:H*.7},{x:W*.5,y:H*.18}];
    ctx.strokeStyle='rgba(244,114,182,0.38)'; ctx.lineWidth=0.9;
    [[0,1],[0,2],[1,3],[2,4],[3,4],[0,5]].forEach(([a,b])=>{
      ctx.beginPath();ctx.moveTo(s26[a].x,s26[a].y);ctx.lineTo(s26[b].x,s26[b].y);ctx.stroke();
    });
    s26.forEach((s,i)=>{
      ctx.beginPath();ctx.arc(s.x,s.y,i===0||i===5?4.5:2.8,0,Math.PI*2);
      ctx.fillStyle=i===0?'#fde68a':i===5?'#c4b5fd':'#f9a8d4';ctx.fill();
      const grd=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,i===0?14:9);
      grd.addColorStop(0,i===0?'rgba(253,230,138,0.35)':'rgba(249,168,212,0.2)'); grd.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=grd;ctx.beginPath();ctx.arc(s.x,s.y,i===0?14:9,0,Math.PI*2);ctx.fill();
    });
    ctx.fillStyle='rgba(253,230,138,0.75)'; ctx.font='9px sans-serif'; ctx.textAlign='center';
    ctx.fillText('عباس ❤ فاطمة',s26[0].x,s26[0].y-18);
  },[totalMessages,glowColor]);
  return <canvas ref={canvasRef} className="w-full h-full rounded-2xl" style={{minHeight:320}}/>;
}

function CozyHome({level,voiceCount,photoCount,streakDays}:{level:number;voiceCount:number;photoCount:number;streakDays:number}) {
  return (
    <svg viewBox="0 0 390 268" className="w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hfloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3f1e"/><stop offset="100%" stopColor="#5c2d12"/></linearGradient>
        <linearGradient id="hwall" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1e1b2e"/><stop offset="100%" stopColor="#16142a"/></linearGradient>
        <radialGradient id="hfire" cx="50%" cy="80%"><stop offset="0%" stopColor="#f97316" stopOpacity="0.42"/><stop offset="100%" stopColor="#f97316" stopOpacity="0"/></radialGradient>
        <filter id="hglow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect x="0" y="0" width="390" height="268" fill="url(#hwall)"/>
      <path d="M0 196 L390 196 L390 268 L0 268Z" fill="url(#hfloor)"/>
      {[200,213,226,239,252].map(y=><line key={y} x1="0" y1={y} x2="390" y2={y} stroke="#6b3a2a" strokeWidth="1" opacity="0.38"/>)}
      {[85,185,285].map(x=><line key={x} x1={x} y1="196" x2={x} y2="268" stroke="#6b3a2a" strokeWidth="0.8" opacity="0.28"/>)}
      {/* Window */}
      <rect x="276" y="18" width="96" height="116" rx="7" fill="#0f172a" stroke="#334155" strokeWidth="2.2"/>
      <line x1="324" y1="20" x2="324" y2="132" stroke="#334155" strokeWidth="2"/>
      <line x1="278" y1="75" x2="370" y2="75" stroke="#334155" strokeWidth="2"/>
      <circle cx="348" cy="46" r="15" fill="#e0f2fe" opacity="0.92"/>
      <circle cx="353" cy="42" r="13" fill="#0f172a" opacity="0.88"/>
      {[[287,33],[298,26],[308,53],[293,58]].map(([sx,sy],i)=><circle key={i} cx={sx} cy={sy} r="1" fill="white" opacity="0.7"/>)}
      <path d="M272 16 C279 40 275 95 274 132 L287 132 C287 95 283 40 287 16Z" fill="#7c3aed" opacity="0.58"/>
      <path d="M370 16 C366 40 370 95 370 132 L380 132 C380 90 376 40 376 16Z" fill="#7c3aed" opacity="0.58"/>
      {/* Fireplace */}
      <rect x="18" y="112" width="108" height="84" rx="5" fill="#1c1917"/>
      <rect x="28" y="122" width="88" height="64" rx="4" fill="#0c0a09"/>
      <rect x="8" y="106" width="128" height="13" rx="5" fill="#3b1f15"/>
      <ellipse cx="72" cy="180" rx="48" ry="22" fill="url(#hfire)"/>
      <motion.g animate={{scaleY:[1,1.12,0.93,1.09,1]}} transition={{repeat:Infinity,duration:0.75,ease:'easeInOut'}} style={{transformOrigin:'72px 180px'}}>
        <path d="M72 180 C63 164 59 150 66 142 C69 137 73 147 71 157 C76 144 82 133 88 139 C94 146 87 160 80 167 C84 152 90 141 96 147 C100 152 94 164 86 172Z" fill="#f97316"/>
        <path d="M72 180 C66 166 63 156 68 149 C70 145 73 151 71 162 C74 150 79 143 83 148 C87 152 81 164 76 170Z" fill="#fbbf24"/>
        <path d="M72 180 C69 170 67 162 70 157 C71 154 73 159 71 165 C73 158 76 153 79 157 C81 160 78 168 74 172Z" fill="#fef08a" opacity="0.85"/>
      </motion.g>
      {level>=2&&<>
        <rect x="143" y="72" width="96" height="124" rx="4" fill="#3b1f15"/>
        {[82,102,122,142].map((y,i)=><rect key={i} x="147" y={y} width="88" height="2.5" fill="#2d1810"/>)}
        {[[148,84,'#e11d48'],[157,84,'#7c3aed'],[168,84,'#0891b2'],[178,84,'#059669'],[188,84,'#d97706']]
          .map(([bx,by,bc],i)=><rect key={i} x={bx as number} y={(by as number)-18} width="8" height="20" rx="1.5" fill={bc as string} opacity="0.92"/>)}
        {[[150,104,'#3b82f6'],[160,104,'#ef4444'],[170,104,'#22c55e'],[180,104,'#a855f7'],[190,104,'#f97316']]
          .map(([bx,by,bc],i)=><rect key={i} x={bx as number} y={(by as number)-15} width="8" height="17" rx="1.5" fill={bc as string} opacity="0.88"/>)}
      </>}
      {level>=2&&<>
        <rect x="158" y="174" width="210" height="22" rx="9" fill="#7c3aed" opacity="0.92"/>
        <rect x="150" y="162" width="20" height="34" rx="7" fill="#6d28d9"/>
        <rect x="358" y="162" width="20" height="34" rx="7" fill="#6d28d9"/>
        <rect x="161" y="152" width="208" height="24" rx="7" fill="#8b5cf6"/>
        <ellipse cx="224" cy="156" rx="30" ry="9" fill="#a78bfa" opacity="0.65"/>
        <ellipse cx="302" cy="156" rx="30" ry="9" fill="#a78bfa" opacity="0.65"/>
      </>}
      {voiceCount>=1&&<>
        <rect x="246" y="186" width="60" height="10" rx="3" fill="#1c1917"/>
        <motion.g animate={{rotate:360}} transition={{repeat:Infinity,duration:4,ease:'linear'}} style={{transformOrigin:'276px 182px'}}>
          <circle cx="276" cy="182" r="15" fill="#1a1a1a"/>
          <circle cx="276" cy="182" r="11" fill="#262626"/>
          <circle cx="276" cy="182" r="6.5" fill="#171717"/>
          {[0,45,90,135,180,225,270,315].map((a,i)=><circle key={i} cx={276+12*Math.cos(a*Math.PI/180)} cy={182+12*Math.sin(a*Math.PI/180)} r="0.7" fill="#ef4444"/>)}
          <circle cx="276" cy="182" r="2.5" fill="#ef4444"/>
        </motion.g>
        <line x1="291" y1="170" x2="284" y2="177" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
      </>}
      {photoCount>=1&&<>
        <rect x="16" y="18" width="54" height="70" rx="4" fill="#1e1b2e" stroke="#7c3aed" strokeWidth="2"/>
        <rect x="20" y="22" width="46" height="62" rx="3" fill="#2e1065"/>
        <circle cx="43" cy="42" r="11" fill="#f9a8d4" opacity="0.55"/>
        <circle cx="43" cy="42" r="7" fill="#f472b6" opacity="0.82"/>
        <path d="M26 70 Q43 58 60 70" fill="#7c3aed" opacity="0.38"/>
        <text x="43" y="78" textAnchor="middle" fontSize="8" fill="#f9a8d4" opacity="0.65">ع ❤ ف</text>
      </>}
      {streakDays>=5&&<>
        <ellipse cx="340" cy="196" rx="20" ry="13" fill="#d4a373"/>
        <circle cx="340" cy="185" r="11" fill="#d4a373"/>
        <path d="M333 179 L330 172 L337 177Z" fill="#d4a373"/>
        <path d="M347 179 L350 172 L343 177Z" fill="#d4a373"/>
        <circle cx="337" cy="185" r="2.5" fill="#1a1a1a"/><circle cx="343" cy="185" r="2.5" fill="#1a1a1a"/>
        <line x1="332" y1="189" x2="320" y2="187" stroke="#9ca3af" strokeWidth="0.8"/>
        <line x1="332" y1="191" x2="319" y2="192" stroke="#9ca3af" strokeWidth="0.8"/>
        <line x1="348" y1="189" x2="360" y2="187" stroke="#9ca3af" strokeWidth="0.8"/>
        <path d="M338 191 Q340 193 342 191" stroke="#be185d" strokeWidth="1.2" fill="none"/>
        <text x="354" y="178" fontSize="9" fill="#94a3b8" opacity="0.65">zzz</text>
      </>}
      <ellipse cx="72" cy="196" rx="85" ry="44" fill="#f97316" opacity="0.04"/>
    </svg>
  );
}

/* ─── Activity Rings (Apple Watch style) ─── */
function ActivityRings({ progress, colors, size=160 }: { progress:[number,number,number]; colors:string[]; size?:number }) {
  const r = [62, 48, 34];
  const circ = r.map(ri => 2*Math.PI*ri);
  return (
    <svg width={size} height={size} viewBox="0 0 140 140">
      {r.map((ri,i)=>(
        <g key={i}>
          <circle cx="70" cy="70" r={ri} fill="none" stroke={colors[i]||'#e11d48'} strokeWidth="9" opacity="0.12"/>
          <circle cx="70" cy="70" r={ri} fill="none" stroke={colors[i]||'#e11d48'} strokeWidth="9"
            strokeDasharray={`${circ[i]*progress[i]} ${circ[i]*(1-progress[i])}`}
            strokeDashoffset={circ[i]*0.25} strokeLinecap="round"
            style={{filter:`drop-shadow(0 0 4px ${colors[i]||'#e11d48'}80)`, transition:'stroke-dasharray 1.5s ease'}}/>
        </g>
      ))}
      <text x="70" y="64" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.4)">النشاط</text>
      <text x="70" y="82" textAnchor="middle" fontSize="14" fontWeight="bold" fill="white">{Math.round(progress[0]*100)}٪</text>
    </svg>
  );
}

/* ─── Floating Memory Orbs ─── */
function MemoryOrbs({ colors, count=8 }: { colors:string[]; count?:number }) {
  const orbs = useMemo(()=>Array.from({length:count},(_,i)=>({
    id:i, color:colors[i%colors.length],
    r: 55+Math.sin(i)*28, angle: (i/count)*Math.PI*2,
    speed: 0.0004+Math.random()*0.0003, size: 6+Math.random()*6,
    delay: Math.random()*3
  })),[colors,count]);
  return (
    <div className="absolute inset-0 pointer-events-none">
      {orbs.map(o=>(
        <motion.div key={o.id} className="absolute rounded-full"
          style={{width:o.size,height:o.size,background:`radial-gradient(circle, ${o.color} 0%, ${o.color}60 50%, transparent 100%)`,
            boxShadow:`0 0 ${o.size}px ${o.color}80`, left:'50%', top:'50%'}}
          animate={{
            x:[
              o.r*Math.cos(o.angle)-o.size/2,
              o.r*Math.cos(o.angle+Math.PI*0.5)-o.size/2,
              o.r*Math.cos(o.angle+Math.PI)-o.size/2,
              o.r*Math.cos(o.angle+Math.PI*1.5)-o.size/2,
              o.r*Math.cos(o.angle+Math.PI*2)-o.size/2,
            ],
            y:[
              o.r*Math.sin(o.angle)-o.size/2,
              o.r*Math.sin(o.angle+Math.PI*0.5)-o.size/2,
              o.r*Math.sin(o.angle+Math.PI)-o.size/2,
              o.r*Math.sin(o.angle+Math.PI*1.5)-o.size/2,
              o.r*Math.sin(o.angle+Math.PI*2)-o.size/2,
            ],
            opacity:[0.5,0.9,0.5,0.8,0.5],
            scale:[1,1.3,0.9,1.2,1]
          }}
          transition={{repeat:Infinity,duration:8+o.delay*2,ease:'linear',delay:o.delay}}/>
      ))}
    </div>
  );
}

/* ─── Special Day Banner ─── */
function SpecialDayBanner({label,emoji}:{label:string;emoji:string}) {
  return (
    <motion.div initial={{y:-40,opacity:0}} animate={{y:0,opacity:1}} exit={{y:-40,opacity:0}}
      className="mx-4 mb-2 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/60 to-yellow-950/60 backdrop-blur-md px-4 py-2.5 flex items-center gap-3 shadow-lg">
      <span className="text-2xl">{emoji}</span>
      <div>
        <p className="font-bold text-amber-200 text-sm">{label}</p>
        <p className="text-[11px] text-amber-400/70">عالمكما يحتفل معكما اليوم 💛</p>
      </div>
      <div className="mr-auto text-amber-400/50 text-xs">✨</div>
    </motion.div>
  );
}

/* ════════════════════════════ UNIVERSE OVERVIEW ═══════════════════════ */
function UniverseOverview({stats,emotion,seasonal,onTabChange}:{
  stats:{totalMessages:number;voiceCount:number;photoCount:number;daysCount:number;streakDays:number;level:number;exp:number};
  emotion:EmotionalState; seasonal:SeasonalState;
  onTabChange:(t:TabId)=>void;
}) {
  const nodes: {tab:TabId;label:string;emoji:string;desc:string;color:string}[] = [
    {tab:'heart',    label:'القلب الحيّ',   emoji:'❤️', desc:`${emotion.label} · نبض ${emotion.heartRate}`, color:'#f43f5e'},
    {tab:'planet',   label:'الكوكب',        emoji:'🪐', desc:`المستوى ${stats.level} · ${stats.daysCount} يوم`,  color:'#6366f1'},
    {tab:'garden',   label:'البستان',       emoji:'🌹', desc:`${Math.ceil(stats.totalMessages/8)} وردة`, color:'#22c55e'},
    {tab:'tree',     label:'الشجرة',        emoji:'🌳', desc:seasonal.season==='spring'?'الربيع يزهر':'تغيّر الفصل', color:'#84cc16'},
    {tab:'home',     label:'البيت',         emoji:'🏠', desc:`${stats.level>=5?'قصر':'بيت دافئ'}`,       color:'#f97316'},
    {tab:'palace',   label:'القصر',         emoji:'🏰', desc:`${stats.totalMessages} رسالة محفوظة`,     color:'#a855f7'},
    {tab:'galaxy',   label:'المجرة',        emoji:'🌌', desc:`${stats.totalMessages} نجمة`,            color:'#818cf8'},
    {tab:'lifebook', label:'كتاب السيرة',   emoji:'📖', desc:`${stats.level>=3?'فصل جديد':'البداية'}`, color:'#f59e0b'},
    {tab:'timetravel',label:'الزمن',        emoji:'🛸', desc:'سافر إلى أي يوم',                        color:'#38bdf8'},
    {tab:'ai-story', label:'المؤرخ',        emoji:'✨', desc:'Gemini ينسج حكايتكما',                   color:'#e879f9'},
  ];
  return (
    <div className="flex flex-col gap-4">
      {/* Hero stats bar */}
      <div className="rounded-3xl border border-white/8 overflow-hidden relative" style={{background:`linear-gradient(135deg, #0f0a1e, #150a20)`}}>
        <div className="absolute inset-0 pointer-events-none" style={{background:emotion.bgGradient}}/>
        <div className="relative p-5 flex flex-col items-center text-center gap-2">
          <motion.div animate={{scale:[1,1.06,1]}} transition={{repeat:Infinity,duration:2,ease:'easeInOut'}}
            className="text-5xl mb-1" style={{filter:`drop-shadow(0 0 20px ${emotion.glowColor})`}}>❤️</motion.div>
          <h2 className="text-xl font-bold bg-clip-text text-transparent"
            style={{backgroundImage:`linear-gradient(90deg, #fde68a, ${emotion.glowColor}, #fde68a)`}}>عالم عباس ❤️ فاطمة</h2>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border" style={{borderColor:`${emotion.glowColor}40`,background:`${emotion.glowColor}15`}}>
            <span className="text-xs font-bold" style={{color:emotion.glowColor}}>{emotion.label}</span>
            <span className="text-white/30 text-xs">•</span>
            <span className="text-xs text-white/50">{emotion.heartRate} نبضة / دقيقة</span>
          </div>
          <div className="grid grid-cols-4 gap-2 w-full mt-2">
            {[
              {v:stats.totalMessages, l:'رسالة', c:'#f43f5e'},
              {v:stats.daysCount,     l:'يوم',   c:'#818cf8'},
              {v:stats.voiceCount,    l:'صوتية', c:'#a855f7'},
              {v:stats.photoCount,    l:'صورة',  c:'#f59e0b'},
            ].map(s=>(
              <div key={s.l} className="bg-white/5 border border-white/5 rounded-2xl p-2.5 text-center">
                <span className="text-[10px] text-white/40 block">{s.l}</span>
                <strong className="text-lg font-bold font-mono" style={{color:s.c}}>{s.v}</strong>
              </div>
            ))}
          </div>
          <div className="w-full bg-white/5 rounded-full h-1.5 mt-1 overflow-hidden">
            <motion.div className="h-full rounded-full"
              style={{background:`linear-gradient(90deg,${emotion.glowColor},${emotion.orbColors[1]})`}}
              initial={{width:0}} animate={{width:`${Math.min(100,(stats.exp/10000)*100)}%`}} transition={{duration:1.5,ease:'easeOut'}}/>
          </div>
          <span className="text-[10px] text-white/30">{stats.exp.toLocaleString()} نقطة خبرة · المستوى {stats.level}</span>
        </div>
      </div>
      {/* System grid */}
      <div className="grid grid-cols-2 gap-2">
        {nodes.map(n=>(
          <motion.button key={n.tab} whileTap={{scale:0.96}} whileHover={{scale:1.02}}
            onClick={()=>onTabChange(n.tab)}
            className="bg-white/4 border border-white/6 rounded-2xl p-3.5 text-right flex flex-col gap-1.5 cursor-pointer transition-all hover:bg-white/8 hover:border-white/15 active:scale-95">
            <span className="text-xl">{n.emoji}</span>
            <span className="text-xs font-bold text-white/90">{n.label}</span>
            <span className="text-[10px]" style={{color:n.color}}>{n.desc}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════ MAIN COMPONENT ═══════════════════════════ */
export default function RelationshipUniverse({currentUser,onClose}:RelationshipUniverseProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [universeStats, setUniverseStats] = useState({totalMessages:0,voiceCount:0,photoCount:0,daysCount:150,streakDays:12,exp:1500,level:3});
  const [pinnedMemories, setPinnedMemories] = useState<Milestone[]>([]);
  const [stories, setStories] = useState<PinnedStory[]>([]);
  const [activeSeason, setActiveSeason] = useState<'spring'|'summer'|'autumn'|'winter'>('spring');
  const [storyPeriod, setStoryPeriod] = useState('all-time');
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [generatedStory, setGeneratedStory] = useState('');
  const [timeTravelDate, setTimeTravelDate] = useState(()=>new Date().toISOString().split('T')[0]);
  const [isTravelling, setIsTravelling] = useState(false);
  const [travelResults, setTravelResults] = useState<Message[]>([]);
  const [heartTaps, setHeartTaps] = useState<{id:number;x:number;y:number}[]>([]);
  const [showPulse, setShowPulse] = useState(false);
  const [anniversaryDate, setAnniversaryDate] = useState<Date|undefined>();

  /* ── Engines ── */
  const emotion: EmotionalState = useMemo(()=>computeEmotionalState({messages,...universeStats}),[messages,universeStats]);
  const seasonal: SeasonalState = useMemo(()=>computeSeasonalState(new Date(),anniversaryDate),[anniversaryDate]);
  // Sync activeSeason with auto-detected season
  useEffect(()=>{ setActiveSeason(seasonal.season); },[seasonal.season]);

  /* ── Firebase listeners ── */
  useEffect(()=>{
    const q=query(collection(db,'messages'),orderBy('timestamp','asc'));
    const unsubMsgs=onSnapshot(q,snap=>{
      const msgs=snap.docs.map(d=>{
        const x=d.data();
        return {id:d.id,senderId:x.senderId,text:x.text||'',timestamp:x.timestamp?.toDate()||new Date(),imageUrls:x.imageUrls||[],voiceUrl:x.voiceUrl||''} as Message;
      });
      setMessages(msgs);
      const total=msgs.length, voices=msgs.filter(m=>m.voiceUrl).length;
      const photos=msgs.reduce((a,m)=>a+(m.imageUrls?.length||0),0);
      getDoc(doc(db,'settings','anniversary')).then(snap=>{
        let days=150;
        if(snap.exists()&&snap.data().date){
          const d=new Date(snap.data().date);
          setAnniversaryDate(d);
          days=Math.max(1,Math.ceil(Math.abs(Date.now()-d.getTime())/86400000));
        }
        const exp=(total*3)+(voices*15)+(photos*10)+(days*5);
        setUniverseStats({totalMessages:total,voiceCount:voices,photoCount:photos,daysCount:days,streakDays:Math.min(30,Math.floor(total/18)+3),exp,level:Math.min(10,Math.floor(Math.sqrt(exp/100))+1)});
      });
      setLoading(false);
    });
    const unsubSettings=onSnapshot(doc(db,'settings','shared_universe'),snap=>{
      if(snap.exists()){
        const d=snap.data();
        if(d.pinnedMemories) setPinnedMemories(d.pinnedMemories);
        if(d.stories) setStories(d.stories);
      } else {
        const def:Milestone[]=[
          {id:'1',title:'أول حرف بيننا',date:'2026-02-14',description:'الرسالة الأولى',type:'first_message'},
          {id:'2',title:'صدى صوتك',date:'2026-03-01',description:'أول صوتية',type:'voice'},
          {id:'3',title:'صورة للذكرى',date:'2026-04-10',description:'أول صورة',type:'photo'},
        ];
        setDoc(doc(db,'settings','shared_universe'),{pinnedMemories:def,stories:[]});
      }
    });
    return ()=>{unsubMsgs();unsubSettings();};
  },[]);

  const updateShared=async(fields:Record<string,unknown>)=>{
    try{await updateDoc(doc(db,'settings','shared_universe'),fields);}catch{}
  };

  const handleHeartTap=useCallback((e:React.MouseEvent<HTMLDivElement>)=>{
    setShowPulse(true); setTimeout(()=>setShowPulse(false),900);
    const rect=e.currentTarget.getBoundingClientRect();
    const spark={id:Date.now(),x:e.clientX-rect.left,y:e.clientY-rect.top};
    setHeartTaps(prev=>[...prev.slice(-14),spark]);
  },[]);

  const handleTimeTravel=useCallback(()=>{
    if(!timeTravelDate) return;
    setIsTravelling(true);
    setTimeout(()=>{
      const t=new Date(timeTravelDate);
      setTravelResults(messages.filter(m=>{const d=new Date(m.timestamp);return d.getUTCFullYear()===t.getUTCFullYear()&&d.getUTCMonth()===t.getUTCMonth()&&d.getUTCDate()===t.getUTCDate();}));
      setIsTravelling(false);
    },1400);
  },[timeTravelDate,messages]);

  const generateAIStory=useCallback(async()=>{
    const apiKey=localStorage.getItem('geminiApiKey');
    if(!apiKey){alert('الرجاء إضافة مفتاح Gemini API.');return;}
    setIsGeneratingStory(true);setGeneratedStory('');
    const ctx=messages.slice(-40).map(m=>`${m.senderId==='abbas'?'عباس':'فاطمة'}: ${m.text}`).join('\n');
    try{
      const ai=new GoogleGenAI({apiKey});
      const res=await ai.models.generateContent({model:'gemini-2.0-flash',contents:`اكتب بالعربية الفصحى الراقية قصة شعرية ملحمية عن حب عباس وفاطمة. السياق:\n${ctx}\n\nعدد الرسائل: ${universeStats.totalMessages}، الأيام: ${universeStats.daysCount}، المزاج الحالي: ${emotion.label}.`,config:{temperature:0.88}});
      setGeneratedStory(res.text||'لم نتمكن من نسج الحكاية.');
    }catch{setGeneratedStory('خطأ في الاتصال بـ Gemini.');}
    finally{setIsGeneratingStory(false);}
  },[messages,universeStats,emotion]);

  const pinStory=useCallback(async()=>{
    if(!generatedStory) return;
    const s:PinnedStory={id:Date.now().toString(),title:storyPeriod==='all-time'?'ملحمة الأكوان الخالدة':'ترنيمة الشوق',period:storyPeriod,content:generatedStory,timestamp:Date.now()};
    const upd=[...stories,s];setStories(upd);await updateShared({stories:upd});
    alert('تم تخليد الحكاية ✨');
  },[generatedStory,storyPeriod,stories]);

  const addMilestone=useCallback(async(title:string,desc:string,type:Milestone['type'])=>{
    if(!title||!desc)return;
    const m:Milestone={id:Date.now().toString(),title,description:desc,date:new Date().toISOString().split('T')[0],type};
    const upd=[...pinnedMemories,m];setPinnedMemories(upd);await updateShared({pinnedMemories:upd});
  },[pinnedMemories]);

  const getLevelName=(l:number)=>['النبض الصامت','المدار الوليد','القلب المتوهج','الحضارة المشتركة','المجرة الزاهرة','تكامل الأكوان','الخلود المطلق'][Math.min(l-1,6)]||'التناغم الإلهي';

  const TABS=[
    {id:'overview' as TabId,label:'الكون',icon:Layers},
    {id:'heart'    as TabId,label:'القلب',icon:Heart},
    {id:'planet'   as TabId,label:'الكوكب',icon:Globe},
    {id:'garden'   as TabId,label:'البستان',icon:Shrub},
    {id:'tree'     as TabId,label:'الشجرة',icon:Calendar},
    {id:'home'     as TabId,label:'البيت',icon:Home},
    {id:'palace'   as TabId,label:'القصر',icon:BookOpen},
    {id:'galaxy'   as TabId,label:'المجرة',icon:Star},
    {id:'lifebook' as TabId,label:'السيرة',icon:BookOpen},
    {id:'timetravel'as TabId,label:'الزمن',icon:Clock},
    {id:'ai-story' as TabId,label:'الذكاء',icon:Sparkles},
  ];

  const ROSE_C  =['#e11d48','#f43f5e','#fb7185','#be123c','#881337','#fda4af'];
  const TULIP_C =['#a855f7','#c084fc','#7c3aed','#d946ef','#4f46e5','#ec4899'];
  const roses   =Array.from({length:Math.min(14,Math.ceil(universeStats.totalMessages/7))});
  const tulips  =Array.from({length:Math.min(8, Math.max(0,universeStats.voiceCount))});
  const suns    =Array.from({length:Math.min(6, Math.ceil(universeStats.photoCount/2))});

  // Heartbeat animation duration from BPM
  const beatDuration = 60/emotion.heartRate;

  return (
    <motion.div
      initial={{opacity:0,scale:0.93,filter:'blur(12px)'}}
      animate={{opacity:1,scale:1,filter:'blur(0px)'}}
      exit={{opacity:0,scale:0.93,filter:'blur(12px)'}}
      transition={{duration:0.5,ease:[0.16,1,0.3,1]}}
      className="absolute inset-0 z-50 text-white flex flex-col overflow-hidden"
      style={{background:'#070714'}}
      dir="rtl"
    >
      <style>{CSS_ANIMATIONS}</style>

      {/* Ambient background – driven by emotional engine */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full opacity-15"
          style={{background:`radial-gradient(ellipse,${emotion.glowColor} 0%,transparent 70%)`,animation:'ambientPulse 4s ease-in-out infinite'}}/>
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-8"
          style={{background:`radial-gradient(ellipse,${emotion.orbColors[1]} 0%,transparent 70%)`}}/>
      </div>

      {/* Header */}
      <header className="shrink-0 h-16 px-4 flex items-center justify-between border-b border-white/5 bg-black/35 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/70 hover:text-white transition-all">
            <ArrowLeft className="w-5 h-5 rotate-180"/>
          </button>
          <div className="flex flex-col text-right">
            <span className="text-[10px] font-bold tracking-widest uppercase" style={{color:emotion.glowColor}}>الكون الخاص</span>
            <span className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-rose-300 to-amber-200">عالم عباس ❤️ فاطمة</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Live emotional state pill */}
          <motion.div animate={{scale:[1,1.04,1]}} transition={{repeat:Infinity,duration:beatDuration*2,ease:'easeInOut'}}
            className="px-3 py-1.5 rounded-full border flex items-center gap-2 text-xs font-bold"
            style={{borderColor:`${emotion.glowColor}40`,background:`${emotion.glowColor}18`,color:emotion.glowColor}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:emotion.glowColor,display:'inline-block',boxShadow:`0 0 6px ${emotion.glowColor}`,animation:`ambientPulse ${beatDuration}s ease-in-out infinite`}}/>
            {emotion.label}
          </motion.div>
          <div className="bg-gradient-to-r from-purple-900/40 to-rose-900/40 border border-white/10 px-3 py-1.5 rounded-full text-[11px] font-bold text-white/80">
            Lv.{universeStats.level}
          </div>
        </div>
      </header>

      {/* Special day banner */}
      <AnimatePresence>
        {seasonal.specialDay && <SpecialDayBanner label={seasonal.specialLabel} emoji={seasonal.specialEmoji}/>}
      </AnimatePresence>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar */}
        <div className="w-full md:w-52 shrink-0 border-b md:border-b-0 md:border-l border-white/5 bg-black/20 p-2 flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto scrollbar-none z-20">
          {TABS.map(tab=>{
            const Icon=tab.icon; const active=activeTab===tab.id;
            return (
              <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-right shrink-0 select-none ${active?'font-bold border':'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'}`}
                style={active?{background:`${emotion.glowColor}18`,borderColor:`${emotion.glowColor}35`,color:emotion.glowColor}:{}}>
                <Icon className="w-4 h-4 shrink-0"/>
                <span className="text-sm">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5">
          <AnimatePresence mode="wait">

            {/* OVERVIEW */}
            {activeTab==='overview'&&(
              <motion.div key="overview" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                <UniverseOverview stats={universeStats} emotion={emotion} seasonal={seasonal} onTabChange={setActiveTab}/>
              </motion.div>
            )}

            {/* HEART – THE LIVING CENTER */}
            {activeTab==='heart'&&(
              <motion.div key="heart" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="flex flex-col items-center justify-center min-h-[550px] relative">
                <div className="absolute inset-0 pointer-events-none" style={{background:emotion.bgGradient}}/>

                {/* Orbs orbit around the heart */}
                <div className="relative flex items-center justify-center w-64 h-64">
                  <MemoryOrbs colors={emotion.orbColors} count={7}/>

                  {/* Pulse rings */}
                  <AnimatePresence>
                    {showPulse&&[0,1,2].map(i=>(
                      <motion.div key={i} className="absolute inset-0 rounded-full border"
                        style={{borderColor:`${emotion.glowColor}60`}}
                        initial={{scale:0.7,opacity:0.8}} animate={{scale:2.8+i*0.4,opacity:0}}
                        exit={{opacity:0}} transition={{duration:1.2,delay:i*0.18,ease:'easeOut'}}/>
                    ))}
                  </AnimatePresence>

                  {/* Heart SVG – anatomical */}
                  <div className="relative cursor-pointer select-none z-10" onClick={handleHeartTap}>
                    <motion.svg width="170" height="160" viewBox="0 0 170 160"
                      animate={{scale:[1,1+0.08*emotion.glowIntensity,0.98,1+0.05*emotion.glowIntensity,1]}}
                      transition={{repeat:Infinity,duration:beatDuration,ease:[0.4,0,0.2,1]}}>
                      <defs>
                        <radialGradient id="hfill" cx="38%" cy="32%">
                          <stop offset="0%" stopColor={emotion.orbColors[0]}/>
                          <stop offset="40%" stopColor={emotion.glowColor}/>
                          <stop offset="100%" stopColor="#7f1d1d"/>
                        </radialGradient>
                        <filter id="hgf">
                          <feGaussianBlur stdDeviation={7*emotion.glowIntensity} result="b"/>
                          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                        <radialGradient id="hglw" cx="50%" cy="50%">
                          <stop offset="0%" stopColor={emotion.glowColor} stopOpacity={emotion.glowIntensity*0.6}/>
                          <stop offset="100%" stopColor={emotion.glowColor} stopOpacity="0"/>
                        </radialGradient>
                      </defs>
                      {/* outer glow */}
                      <circle cx="85" cy="80" r="70" fill="url(#hglw)"/>
                      {/* heart path */}
                      <path d="M85 148 C55 122 8 92 8 54 C8 24 28 8 52 8 C66 8 78 16 85 30 C92 16 104 8 118 8 C142 8 162 24 162 54 C162 92 115 122 85 148Z"
                        fill="url(#hfill)" filter="url(#hgf)"/>
                      {/* highlight */}
                      <ellipse cx="58" cy="44" rx="20" ry="13" fill="white" opacity="0.12" transform="rotate(-28,58,44)"/>
                      <ellipse cx="50" cy="38" rx="9" ry="6" fill="white" opacity="0.2" transform="rotate(-28,50,38)"/>
                      {/* vein lines */}
                      <path d="M85 140 C68 120 28 95 22 60" stroke={emotion.orbColors[2]} strokeWidth="1" fill="none" opacity="0.35"/>
                      <path d="M85 140 C102 120 142 95 148 60" stroke={emotion.orbColors[2]} strokeWidth="1" fill="none" opacity="0.35"/>
                    </motion.svg>

                    {/* Tap sparks */}
                    {heartTaps.map(s=>(
                      <motion.div key={s.id} className="absolute pointer-events-none text-base"
                        initial={{opacity:1,scale:0.7,x:s.x-85,y:s.y-80}}
                        animate={{opacity:0,scale:2,y:s.y-280,x:s.x-85+(Math.random()*80-40)}}
                        transition={{duration:1.4,ease:'easeOut'}}>
                        {['✨','❤️','🌸','💫','⭐','🔥'][Math.floor(Math.random()*6)]}
                      </motion.div>
                    ))}
                  </div>

                  {/* State label below heart */}
                  <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-4 py-1 rounded-full text-xs font-bold backdrop-blur-sm border"
                    style={{background:`${emotion.glowColor}20`,borderColor:`${emotion.glowColor}40`,color:emotion.glowColor}}>
                    {emotion.label} • {emotion.heartRate} bpm
                  </div>
                </div>

                {/* Activity rings + EKG */}
                <div className="mt-12 flex gap-6 items-center justify-center flex-wrap">
                  <ActivityRings progress={emotion.ringProgress} colors={emotion.orbColors} size={140}/>
                  <div className="flex flex-col gap-2">
                    <div className="text-xs text-white/40 text-center mb-1">خط النبض الحي</div>
                    <svg width="220" height="52" viewBox="0 0 280 52">
                      <motion.path
                        d="M0 26 L35 26 L50 26 L55 10 L60 42 L65 5 L70 26 L90 26 L125 26 L140 26 L145 10 L150 42 L155 5 L160 26 L180 26 L215 26 L230 26 L235 10 L240 42 L245 5 L250 26 L280 26"
                        stroke={emotion.glowColor} strokeWidth="2" fill="none"
                        strokeDasharray="600" strokeDashoffset="600"
                        animate={{strokeDashoffset:[600,0,-600]}}
                        transition={{repeat:Infinity,duration:beatDuration*3,ease:'linear'}}
                        style={{filter:`drop-shadow(0 0 3px ${emotion.glowColor})`}}/>
                    </svg>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[{l:'رسائل',v:universeStats.totalMessages,c:emotion.orbColors[0]},{l:'صوتيات',v:universeStats.voiceCount,c:emotion.orbColors[1]},{l:'صور',v:universeStats.photoCount,c:emotion.orbColors[2]}].map(s=>(
                        <div key={s.l} className="bg-white/5 border border-white/5 rounded-xl p-2">
                          <span className="text-[9px] text-white/35 block">{s.l}</span>
                          <b className="text-base font-bold font-mono" style={{color:s.c}}>{s.v}</b>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PLANET */}
            {activeTab==='planet'&&(
              <motion.div key="planet" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="flex flex-col items-center justify-center min-h-[520px] gap-5">
                <div className="absolute inset-0 pointer-events-none" style={{background:emotion.bgGradient}}/>
                <RealisticPlanet level={universeStats.level} glowColor={emotion.glowColor}/>
                <div className="text-center max-w-sm">
                  <h3 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-rose-300">كوكب الوفاء الأزلي</h3>
                  <p className="text-xs text-white/50 mt-2 leading-relaxed bg-white/5 border border-white/5 rounded-2xl p-3">
                    الكوكب في مرحلة <b style={{color:emotion.glowColor}}>{universeStats.level<3?'التشكّل الأولي':universeStats.level<6?'الواحة الآهلة':'القلعة الكونية الكبرى'}</b> — تزداد قاراته وتظهر مدنه المضيئة كلما تعمّق التواصل.
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="bg-white/5 border border-white/5 p-2 rounded-xl text-center text-xs"><span className="text-white/40 block">الأيام معاً</span><b style={{color:emotion.glowColor}}>{universeStats.daysCount}</b></div>
                    <div className="bg-white/5 border border-white/5 p-2 rounded-xl text-center text-xs"><span className="text-white/40 block">مستوى الكوكب</span><b style={{color:emotion.glowColor}}>{universeStats.level}/10</b></div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* GARDEN */}
            {activeTab==='garden'&&(
              <motion.div key="garden" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold flex items-center gap-2"><Shrub className="w-5 h-5" style={{color:seasonal.ambientColor}}/> بستان الذكريات الحيّ</h3>
                  <span className="text-[11px] text-white/40">يزهر بكل رسالة وصوتية وصورة</span>
                </div>
                <div className="relative rounded-3xl overflow-hidden border border-white/5 min-h-[400px]"
                  style={{background:`linear-gradient(180deg, ${seasonal.skyColors[0]} 0%, ${seasonal.skyColors[1]} 100%)`}}>
                  {/* Sky */}
                  <div className="absolute top-0 inset-x-0 h-36" style={{background:'linear-gradient(180deg,#020a18 0%,#0a1a35 60%,transparent 100%)'}}>
                    {Array.from({length:30},(_,i)=>(
                      <div key={i} className="absolute rounded-full bg-white"
                        style={{width:Math.random()*1.5+0.5,height:Math.random()*1.5+0.5,top:`${Math.random()*85}%`,left:`${Math.random()*100}%`,opacity:Math.random()*0.55+0.2,animation:`twinkle ${2+Math.random()*3}s ${Math.random()*2}s ease-in-out infinite`}}/>
                    ))}
                  </div>
                  {/* Moon */}
                  <div className="absolute top-5 right-8"><div className="relative w-10 h-10">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-amber-200" style={{boxShadow:'0 0 22px rgba(251,191,36,0.32)'}}/>
                    <div className="absolute top-1 right-1 w-9 h-9 rounded-full" style={{background:seasonal.skyColors[0]}}/>
                  </div></div>
                  {/* Season particles */}
                  {Array.from({length:12},(_,i)=>(
                    <div key={i} className="absolute text-sm pointer-events-none"
                      style={{left:`${(i*9)%100}%`,top:-24,animation:`${seasonal.season==='winter'?'snowFall':seasonal.season==='autumn'?'leafFall':'petalFall'} ${4.5+i*0.7}s linear ${i*0.75}s infinite`}}>
                      {seasonal.leafParticle}
                    </div>
                  ))}
                  {/* Fireflies */}
                  {Array.from({length:7},(_,i)=>(
                    <motion.div key={`ff${i}`} className="absolute w-1.5 h-1.5 rounded-full" style={{background:'#fde047',left:`${16+i*11}%`,top:`${32+(i%3)*14}%`,boxShadow:'0 0 7px #fde047',animation:`twinkle ${1+i*0.4}s ease-in-out infinite alternate`}}
                      animate={{x:[0,18,-10,14,0],y:[0,-14,8,-7,0]}} transition={{repeat:Infinity,duration:4+i,ease:'easeInOut'}}/>
                  ))}
                  {/* Flowers */}
                  <div className="absolute bottom-12 inset-x-0 flex items-end justify-around px-4 flex-wrap gap-y-2 min-h-[180px]">
                    {roses.map((_,i)=>(
                      <motion.div key={`r${i}`} initial={{scale:0,y:20}} animate={{scale:1,y:0}} transition={{delay:i*0.055,type:'spring',stiffness:180}}>
                        <SVGRose color={ROSE_C[i%ROSE_C.length]} size={30+((i%3)*5)} delay={i%4}/>
                      </motion.div>
                    ))}
                    {tulips.map((_,i)=>(
                      <motion.div key={`t${i}`} initial={{scale:0,y:20}} animate={{scale:1,y:0}} transition={{delay:0.35+i*0.07,type:'spring'}}>
                        <SVGTulip color={TULIP_C[i%TULIP_C.length]} size={26+(i%3)*5} delay={i%3}/>
                      </motion.div>
                    ))}
                    {suns.map((_,i)=>(
                      <motion.div key={`s${i}`} initial={{scale:0,y:20}} animate={{scale:1,y:0}} transition={{delay:0.6+i*0.09,type:'spring'}}>
                        <SVGSunflower size={34+(i%2)*5} delay={i%3}/>
                      </motion.div>
                    ))}
                    {roses.length===0&&tulips.length===0&&(
                      <p className="text-xs text-white/25 py-16 text-center w-full">ابدأ بإرسال الرسائل وستزهر الحديقة 🌱</p>
                    )}
                  </div>
                  {/* Grass */}
                  <div className="absolute bottom-0 inset-x-0">
                    <svg viewBox="0 0 400 44" className="w-full">
                      <path d={`M0 44 Q200 22 400 44Z`} fill={seasonal.groundColor}/>
                      {Array.from({length:44},(_,i)=>(
                        <path key={i} d={`M${i*9+4} 44 Q${i*9+2} ${30+(i%4)*3} ${i*9+6} 24`} stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" opacity="0.55"/>
                      ))}
                    </svg>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-white/38 text-center">
                  🌹 {roses.length} وردة &nbsp;•&nbsp; 🌷 {tulips.length} زنبق &nbsp;•&nbsp; 🌻 {suns.length} عباد شمس
                </div>
              </motion.div>
            )}

            {/* TREE */}
            {activeTab==='tree'&&(
              <motion.div key="tree" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex flex-col">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h3 className="text-base font-bold flex items-center gap-2"><Calendar className="text-amber-400 w-5 h-5"/> شجرة الفصول المشتركة</h3>
                  <div className="flex bg-white/5 border border-white/5 p-1 rounded-full gap-1">
                    {(['spring','summer','autumn','winter'] as const).map(s=>(
                      <button key={s} onClick={()=>setActiveSeason(s)}
                        className={`px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all ${activeSeason===s?'bg-rose-500/20 text-rose-400 border border-rose-500/20':'text-white/38 hover:text-white'}`}>
                        {s==='spring'?'🌸':s==='summer'?'☀️':s==='autumn'?'🍂':'❄️'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative rounded-3xl overflow-hidden border border-white/5 min-h-[400px]"
                  style={{background:activeSeason==='winter'?'linear-gradient(180deg,#0d1b2e,#1e293b)':activeSeason==='autumn'?'linear-gradient(180deg,#1a0e00,#2d1a00)':activeSeason==='summer'?'linear-gradient(180deg,#071a3e,#0d2b10)':'linear-gradient(180deg,#0d1e3a,#0e2010)'}}>
                  {activeSeason==='spring'&&Array.from({length:14},(_,i)=>(
                    <div key={i} className="absolute text-xs pointer-events-none" style={{left:`${(i*7)%100}%`,top:-24,animation:`petalFall ${4+i*0.6}s linear ${i*0.58}s infinite`}}>🌸</div>
                  ))}
                  {activeSeason==='autumn'&&Array.from({length:14},(_,i)=>(
                    <div key={i} className="absolute text-xs pointer-events-none" style={{left:`${(i*8)%100}%`,top:-22,animation:`leafFall ${5+i*0.5}s linear ${i*0.5}s infinite`}}>🍂</div>
                  ))}
                  {activeSeason==='winter'&&Array.from({length:18},(_,i)=>(
                    <div key={i} className="absolute text-[8px] pointer-events-none text-sky-200/60" style={{left:`${(i*6)%100}%`,top:-12,animation:`snowFall ${4+i*0.4}s linear ${i*0.38}s infinite`}}>❄</div>
                  ))}
                  <div className="w-full h-[390px]"><SVGTree season={activeSeason} memories={pinnedMemories}/></div>
                </div>
                <button onClick={()=>{
                  const t=prompt('عنوان الذكرى:'); const d=prompt('ماذا تعني لك هذه اللحظة؟');
                  if(t&&d) addMilestone(t,d,'special');
                }} className="mt-3 bg-white/5 border border-white/10 hover:border-rose-500/30 p-3 rounded-2xl cursor-pointer text-center text-xs font-bold text-rose-300 transition-all">
                  + علّق ذكرى خالدة جديدة على أغصان الشجرة 🍎
                </button>
              </motion.div>
            )}

            {/* HOME */}
            {activeTab==='home'&&(
              <motion.div key="home" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold flex items-center gap-2"><Home className="text-rose-400 w-5 h-5"/> بيتنا الدافئ المشترك</h3>
                  <span className="text-[11px] text-white/38">يتطور بتراكم الذكريات</span>
                </div>
                <div className="rounded-3xl overflow-hidden border border-white/10 shadow-xl shadow-black/60">
                  <CozyHome level={universeStats.level} voiceCount={universeStats.voiceCount} photoCount={universeStats.photoCount} streakDays={universeStats.streakDays}/>
                </div>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    {emoji:'🔥',l:'المدفأة',ok:true},
                    {emoji:'🛋️',l:'الأريكة',ok:universeStats.level>=2},
                    {emoji:'📻',l:'الجراموفون',ok:universeStats.voiceCount>=1},
                    {emoji:'🖼️',l:'الإطارات',ok:universeStats.photoCount>=1},
                    {emoji:'📚',l:'المكتبة',ok:universeStats.level>=2},
                    {emoji:'🐈',l:'القط النائم',ok:universeStats.streakDays>=5},
                    {emoji:'🌙',l:'نافذة الليل',ok:true},
                    {emoji:'🕯️',l:'شمعة الحب',ok:universeStats.totalMessages>=20},
                  ].map(item=>(
                    <div key={item.l} className={`p-2 rounded-xl border text-center text-[11px] transition-all ${item.ok?'bg-white/5 border-white/10 text-white/80':'bg-white/2 border-white/5 text-white/22'}`}>
                      <div className={`text-lg mb-0.5 ${!item.ok&&'grayscale opacity-28'}`}>{item.emoji}</div>
                      <span>{item.l}</span>
                      {!item.ok&&<div className="text-[9px] text-white/25 mt-0.5">مقفل</div>}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* PALACE */}
            {activeTab==='palace'&&(
              <motion.div key="palace" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex flex-col">
                <h3 className="text-base font-bold mb-4 flex items-center gap-2"><BookOpen className="text-purple-400 w-5 h-5"/> أروقة قصر الذاكرة</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/5 p-4 rounded-3xl hover:bg-white/8 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center"><Clock className="w-5 h-5"/></div>
                      <h4 className="font-bold text-sm text-yellow-200">رواق الحروف الأولى</h4>
                    </div>
                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto scrollbar-none">
                      {messages.slice(0,10).map(msg=>(
                        <div key={msg.id} className="text-[11px] bg-white/5 p-2 rounded-xl border border-white/5">
                          <b className="text-rose-300">{msg.senderId==='abbas'?'عباس':'فاطمة'}:</b>{' '}
                          <span className="text-white/68">{msg.text?.slice(0,90)}</span>
                        </div>
                      ))}
                      {messages.length===0&&<span className="text-[11px] text-white/28 text-center py-6">لا توجد رسائل بعد...</span>}
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-4 rounded-3xl hover:bg-white/8 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-400 flex items-center justify-center"><ImageIcon className="w-5 h-5"/></div>
                      <h4 className="font-bold text-sm text-pink-200">بهو الصور الخالدة</h4>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto scrollbar-none">
                      {messages.filter(m=>m.imageUrls&&m.imageUrls.length>0).flatMap(m=>m.imageUrls||[]).map((url,i)=>(
                        <img key={i} src={url} alt="" className="w-full h-16 object-cover rounded-xl border border-white/10 hover:scale-105 transition-transform cursor-pointer"/>
                      ))}
                      {messages.filter(m=>m.imageUrls?.length).length===0&&(
                        <span className="text-[11px] text-white/28 col-span-3 text-center py-8">أرسل صوراً في المحادثة أولاً</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* GALAXY */}
            {activeTab==='galaxy'&&(
              <motion.div key="galaxy" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold flex items-center gap-2"><Star className="text-yellow-300 w-5 h-5"/> المجرة النجمية للعشاق</h3>
                  <span className="text-[11px] text-white/38">{universeStats.totalMessages} نجمة مضيئة</span>
                </div>
                <div className="rounded-3xl overflow-hidden border border-white/5 min-h-[380px]">
                  <GalaxyCanvas totalMessages={universeStats.totalMessages} glowColor={emotion.glowColor}/>
                </div>
                <div className="mt-2 text-center text-xs text-white/35">كل رسالة تشعل نجمة في سماء كونكما 🌟 • كوكبة عباس وفاطمة موسومة بالذهب</div>
              </motion.div>
            )}

            {/* LIFE BOOK */}
            {activeTab==='lifebook'&&(
              <motion.div key="lifebook" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold">📖 كتاب سيرة العشاق</h3>
                  <span className="text-[11px] text-white/38">يُكتب تلقائياً بكل رسالة</span>
                </div>
                <div className="bg-gradient-to-b from-zinc-950 to-zinc-900 border border-white/8 p-5 rounded-3xl shadow-2xl space-y-5">
                  <div className="border-r-2 pr-4" style={{borderColor:`${emotion.glowColor}60`}}>
                    <h4 className="font-bold text-sm" style={{color:emotion.orbColors[0]}}>الفصل الأول: البدايات العذبة</h4>
                    <p className="text-[12px] text-white/52 mt-1.5 leading-relaxed">بدأت خيوط التلافي الساحرة منذ التقاء عباس وفاطمة في مدار العشّاق، وكان لكل حديث نبضٌ يسري في شرايين هذا الفضاء السري.</p>
                    <span className="text-[10px] text-white/28 mt-1 block font-mono">المدار الأولي • ٢٠٢٦</span>
                  </div>
                  {universeStats.level>=2&&(
                    <div className="border-r-2 border-purple-500/50 pr-4">
                      <h4 className="font-bold text-sm text-purple-300">الفصل الثاني: التآلف والنضج</h4>
                      <p className="text-[12px] text-white/52 mt-1.5 leading-relaxed">نمت الثقة وتعمّقت الروابط — {universeStats.totalMessages} رسالة رسمت ملامح كون خاص. المزاج الحالي: <b style={{color:emotion.glowColor}}>{emotion.label}</b>.</p>
                      <span className="text-[10px] text-white/28 mt-1 block font-mono">{universeStats.totalMessages} حوار</span>
                    </div>
                  )}
                  {universeStats.level>=4&&(
                    <div className="border-r-2 border-amber-500/50 pr-4">
                      <h4 className="font-bold text-sm text-amber-300">الفصل الثالث: المجد المشترك</h4>
                      <p className="text-[12px] text-white/52 mt-1.5 leading-relaxed">بلغا مرحلة من التوافق حيث صارت اللحظات الصامتة أبلغ من الكلام، ومجرد الحضور كافٍ.</p>
                    </div>
                  )}
                  {stories.map(s=>(
                    <div key={s.id} className="border-r-2 border-emerald-500/50 pr-4">
                      <h4 className="font-bold text-sm text-emerald-300">{s.title}</h4>
                      <p className="text-[11px] text-white/48 mt-1 leading-relaxed whitespace-pre-wrap line-clamp-4">{s.content}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* TIME TRAVEL */}
            {activeTab==='timetravel'&&(
              <motion.div key="timetravel" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold flex items-center gap-2"><Clock className="text-indigo-400 w-5 h-5"/> مركبة السفر عبر الزمن</h3>
                  <span className="text-[11px] text-white/38">اختر يوماً وسافر إليه</span>
                </div>
                <div className="bg-white/5 p-4 rounded-3xl border border-white/5 flex flex-col gap-4 mb-4">
                  <input type="date" value={timeTravelDate} onChange={e=>setTimeTravelDate(e.target.value)}
                    className="bg-black/60 border border-white/10 rounded-2xl p-3 text-center text-sm font-semibold text-white focus:outline-none focus:border-rose-500"/>
                  <button onClick={handleTimeTravel} disabled={isTravelling}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 py-3 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 active:scale-95 transition-all">
                    {isTravelling?<><RefreshCw className="w-4 h-4 animate-spin"/><span>الانعطاف الزمني جارٍ...</span></> : <><Play className="w-4 h-4"/><span>انطلق نحو هذا اليوم 🛸</span></>}
                  </button>
                </div>
                <div className="flex-1 bg-black/40 border border-white/5 rounded-3xl p-4 min-h-[200px] relative overflow-hidden">
                  {isTravelling?(
                    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{background:`radial-gradient(ellipse,rgba(79,70,229,0.32) 0%,rgba(7,7,20,0.92) 70%)`}}>
                      <div className="text-5xl animate-spin mb-3">🛸</div>
                      <span className="text-xs text-indigo-300 font-bold tracking-widest">تخليد الوفاء قيد الاستدعاء...</span>
                    </div>
                  ):travelResults.length>0?(
                    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto scrollbar-none">
                      <span className="text-[10px] text-rose-400 font-mono mb-2 text-center bg-rose-500/10 py-1 px-3 rounded-full border border-rose-500/20 block">{timeTravelDate} • {travelResults.length} رسالة</span>
                      {travelResults.map(msg=>(
                        <div key={msg.id} className={`p-2.5 rounded-2xl max-w-[85%] text-xs ${msg.senderId===currentUser?'self-start bg-rose-500/15 border border-rose-500/15':'self-end bg-white/5 border border-white/5'}`}>
                          <b className="block text-[10px] opacity-38 mb-1">{msg.senderId==='abbas'?'عباس':'فاطمة'}</b>
                          <span className="text-white/78">{msg.text}</span>
                        </div>
                      ))}
                    </div>
                  ):(
                    <div className="my-auto text-center py-12">
                      <div className="text-3xl mb-2">🌌</div>
                      <p className="text-xs text-slate-400">لا توجد رسائل في هذا التاريخ</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* AI STORY */}
            {activeTab==='ai-story'&&(
              <motion.div key="ai-story" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold flex items-center gap-2"><Sparkles className="text-rose-400 w-5 h-5"/> مؤرخ الذكاء الاصطناعي</h3>
                  <span className="text-[11px] text-white/38">Gemini ينسج حكايتكما</span>
                </div>
                <div className="bg-white/5 p-4 rounded-3xl border border-white/5 flex flex-col gap-3 mb-4">
                  <select value={storyPeriod} onChange={e=>setStoryPeriod(e.target.value)}
                    className="bg-black/60 border border-white/10 rounded-2xl p-2.5 text-sm font-semibold text-white focus:outline-none text-center">
                    <option value="all-time">ملحمة البداية الخالدة (تأريخ كامل)</option>
                    <option value="weekly">ترنيمة النبض الأسبوعية</option>
                  </select>
                  <button onClick={generateAIStory} disabled={isGeneratingStory}
                    className="w-full py-3 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 active:scale-95 transition-all"
                    style={{background:`linear-gradient(90deg,${emotion.glowColor},${emotion.orbColors[1]})`}}>
                    {isGeneratingStory?<><RefreshCw className="w-4 h-4 animate-spin"/><span>جاري نسج العبارات...</span></>:<><Sparkles className="w-4 h-4 text-amber-200"/><span>استدعِ المؤرخ الفلكي</span></>}
                  </button>
                </div>
                <div className="flex-1 bg-black/40 border border-white/5 rounded-3xl p-4 min-h-[200px] max-h-72 overflow-y-auto flex flex-col scrollbar-none">
                  {isGeneratingStory?(
                    <div className="my-auto flex flex-col items-center py-10">
                      <div className="text-4xl animate-pulse mb-3">✍️</div>
                      <span className="text-xs text-rose-300">جاري تدوين التاريخ المشترك...</span>
                    </div>
                  ):generatedStory?(
                    <div className="flex flex-col h-full justify-between">
                      <p className="text-[12px] text-slate-200 italic leading-relaxed whitespace-pre-wrap">{generatedStory}</p>
                      <button onClick={pinStory} className="mt-4 font-bold py-2 px-4 rounded-xl text-xs text-white flex items-center justify-center gap-2 self-center transition-all active:scale-95" style={{background:'#059669'}}>
                        <Save className="w-3.5 h-3.5"/> خلّد هذه الحكاية في كتاب السيرة
                      </button>
                    </div>
                  ):(
                    <div className="my-auto text-center py-12 text-white/28">
                      <div className="text-4xl mb-2">✨</div>
                      <p className="text-xs">اضغط الزر لنسج حكاية شعرية من رسائلكم</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
