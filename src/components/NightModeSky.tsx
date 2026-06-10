import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music, Pause, Play, Star, Volume2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface NightModeSkyProps {
  weather: 'rain' | 'clear' | 'clouds';
  startedAt: Date | null;
  currentUser: string;
  onOurStarClick: () => void;
  starClickAbbas: number | null;
  starClickFatima: number | null;
}

const SECRET_POEMS = [
  "لو كان الحب كلمات تُكتب،\nلانتهت أقلامي...\nأنتِ نجمتي الأبدية.",
  "في كل ليلة أنظر للسماء\nأبحث عن نجمة تشبهك\nما أجد.. لأن نجمتي هنا معي.",
  "الكون كله ليلة واحدة\nوأنا فيها أحمل اسمك\nبين النجوم.",
];

export default function NightModeSky({
  weather, startedAt, currentUser,
  onOurStarClick, starClickAbbas, starClickFatima
}: NightModeSkyProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.65);
  const [timeTogether, setTimeTogether] = useState('٠ دقيقة');
  const [showSecretMessage, setShowSecretMessage] = useState(false);
  const [poem] = useState(() => SECRET_POEMS[Math.floor(Math.random() * SECRET_POEMS.length)]);

  // Audio refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const chordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chordIdxRef = useRef(0);
  const activeOscsRef = useRef<OscillatorNode[]>([]);

  // Chord progression (Am – F – C – G pentatonic — calm/romantic)
  const CHORDS = [
    [220.00, 261.63, 329.63],   // Am
    [174.61, 220.00, 261.63],   // F
    [130.81, 196.00, 261.63],   // C
    [196.00, 246.94, 293.66],   // G
  ];
  const MOODS = ['هادئة', 'حالمة', 'رومانسية', 'ناعمة'];

  const playChordNow = useCallback((ctx: AudioContext, dest: AudioNode, delay: DelayNode) => {
    const chord = CHORDS[chordIdxRef.current % CHORDS.length];
    chordIdxRef.current++;
    chord.forEach(freq => {
      [-3, 0, 3].forEach(det => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filt = ctx.createBiquadFilter();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.detune.value = det;
        filt.type = 'lowpass'; filt.frequency.value = 1000; filt.Q.value = 0.5;
        osc.connect(filt); filt.connect(gain);
        gain.connect(dest); gain.connect(delay);
        const now = ctx.currentTime;
        const v = 0.062;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(v, now + 1.6);
        gain.gain.setValueAtTime(v, now + 7);
        gain.gain.linearRampToValueAtTime(0, now + 9.5);
        osc.start(now); osc.stop(now + 10);
        activeOscsRef.current.push(osc);
      });
    });
    // purge finished refs
    activeOscsRef.current = activeOscsRef.current.filter(o => {
      try { return o.context.state !== 'closed'; } catch { return false; }
    });
  }, []);

  const startAmbient = useCallback(() => {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AC();
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    const ctx = audioCtxRef.current;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(volume, ctx.currentTime + 2);
    master.connect(ctx.destination);
    masterGainRef.current = master;

    // Reverb via delay feedback
    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.85;
    const delayGain = ctx.createGain(); delayGain.gain.value = 0.32;
    delay.connect(delayGain); delayGain.connect(delay); delayGain.connect(master);

    playChordNow(ctx, master, delay);
    chordIntervalRef.current = setInterval(() => playChordNow(ctx, master, delay), 9500);
    setIsPlaying(true);
  }, [volume, playChordNow]);

  const stopAmbient = useCallback(() => {
    if (masterGainRef.current && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime;
      masterGainRef.current.gain.setValueAtTime(masterGainRef.current.gain.value, now);
      masterGainRef.current.gain.linearRampToValueAtTime(0, now + 1.5);
    }
    if (chordIntervalRef.current) clearInterval(chordIntervalRef.current);
    setTimeout(() => {
      activeOscsRef.current.forEach(o => { try { o.stop(); } catch { /**/ } });
      activeOscsRef.current = [];
    }, 1600);
    setIsPlaying(false);
  }, []);

  // Volume change while playing
  useEffect(() => {
    if (masterGainRef.current && audioCtxRef.current && isPlaying) {
      masterGainRef.current.gain.setTargetAtTime(volume, audioCtxRef.current.currentTime, 0.3);
    }
  }, [volume, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAmbient();
      audioCtxRef.current?.close().catch(() => {/**/});
    };
  }, []);

  useEffect(() => {
    if (!startedAt) return;
    const tick = () => {
      const mins = Math.floor((Date.now() - startedAt.getTime()) / 60000);
      setTimeTogether(mins.toLocaleString('ar-EG') + ' دقيقة');
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  useEffect(() => {
    if (starClickAbbas && starClickFatima) {
      setShowSecretMessage(Math.abs(starClickAbbas - starClickFatima) < 5000);
    } else {
      setShowSecretMessage(false);
    }
  }, [starClickAbbas, starClickFatima]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    // ── Stars ──────────────────────────────────────────────────────────
    const stars = Array.from({ length: 380 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.88,
      r: Math.random() * 1.8 + 0.2,
      a: Math.random(),
      da: (Math.random() * 0.012 + 0.003) * (Math.random() > 0.5 ? 1 : -1),
      warm: Math.random() > 0.8,          // slightly warm-tinted stars
      large: Math.random() > 0.93,         // sparkle stars
    }));

    // ── Fireflies ──────────────────────────────────────────────────────
    const flies = Array.from({ length: 22 }, () => ({
      x: Math.random() * W,
      y: H * 0.62 + Math.random() * H * 0.35,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.28,
      a: Math.random(), da: (Math.random() * 0.025 + 0.01) * (Math.random() > 0.5 ? 1 : -1),
      r: Math.random() * 1.6 + 0.8,
    }));

    // ── Shooting stars ─────────────────────────────────────────────────
    type Ss = { x: number; y: number; vx: number; vy: number; life: number; max: number; tail: {x:number;y:number}[] };
    let shooters: Ss[] = [];
    let lastShot = 0, nextShot = 7000 + Math.random() * 8000;

    // ── Rain ───────────────────────────────────────────────────────────
    const drops = weather === 'rain'
      ? Array.from({ length: 180 }, () => ({
          x: Math.random() * W, y: Math.random() * H,
          spd: Math.random() * 10 + 12, len: Math.random() * 14 + 7,
          a: Math.random() * 0.25 + 0.08,
        }))
      : [];

    // ── Moon position ──────────────────────────────────────────────────
    const moonX = W * 0.72, moonY = H * 0.17, moonR = 36;
    let auroraT = 0;

    const frame = (t: number) => {
      ctx.clearRect(0, 0, W, H);

      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0,   '#000209');
      sky.addColorStop(0.25,'#020614');
      sky.addColorStop(0.55,'#08041a');
      sky.addColorStop(1,   '#100820');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // Aurora
      auroraT += 0.002;
      const auroras = [
        [120, 80, 220, 0.045],
        [60, 180, 140, 0.03],
        [220, 80, 160, 0.025],
      ];
      auroras.forEach(([r, g, b, base], i) => {
        const wave = Math.sin(auroraT + i * 1.4) * 0.018;
        const a = (base as number) + wave;
        const ag = ctx.createLinearGradient(0, 0, 0, H * 0.55);
        ag.addColorStop(0, `rgba(${r},${g},${b},${a})`);
        ag.addColorStop(0.6, `rgba(${r},${g},${b},${a * 0.4})`);
        ag.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = ag;
        ctx.fillRect(0, 0, W, H);
      });

      // Moon outer halo
      const halo = ctx.createRadialGradient(moonX, moonY, moonR, moonX, moonY, moonR + 70);
      halo.addColorStop(0, 'rgba(255,253,200,0.10)');
      halo.addColorStop(0.5,'rgba(255,253,200,0.04)');
      halo.addColorStop(1,  'rgba(255,253,200,0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(moonX, moonY, moonR + 70, 0, Math.PI * 2); ctx.fill();

      // Moon body
      const mb = ctx.createRadialGradient(moonX - 9, moonY - 9, 0, moonX, moonY, moonR);
      mb.addColorStop(0,   'rgba(255,255,225,1)');
      mb.addColorStop(0.7, 'rgba(240,238,200,0.97)');
      mb.addColorStop(1,   'rgba(215,210,170,0.88)');
      ctx.save();
      ctx.shadowColor = 'rgba(255,252,190,0.55)'; ctx.shadowBlur = 22;
      ctx.fillStyle = mb;
      ctx.beginPath(); ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2); ctx.fill();
      // Crescent
      ctx.fillStyle = '#000209'; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(moonX + 17, moonY - 5, moonR - 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // Stars
      stars.forEach(s => {
        s.a += s.da;
        if (s.a >= 1 || s.a <= 0.04) s.da *= -1;
        const alpha = Math.max(0, Math.min(1, s.a));
        ctx.globalAlpha = alpha;
        if (s.large) {
          // 4-point sparkle
          ctx.save();
          ctx.translate(s.x, s.y);
          const size = s.r * 3.5;
          ctx.shadowColor = s.warm ? 'rgba(255,230,180,0.9)' : 'rgba(200,220,255,0.9)';
          ctx.shadowBlur = 8;
          ctx.fillStyle = s.warm ? 'rgba(255,235,190,0.9)' : 'rgba(220,230,255,0.9)';
          for (let ang = 0; ang < Math.PI * 2; ang += Math.PI / 2) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(Math.cos(ang + 0.4) * size * 0.4, Math.sin(ang + 0.4) * size * 0.4,
              Math.cos(ang) * size, Math.sin(ang) * size);
            ctx.quadraticCurveTo(Math.cos(ang - 0.4) * size * 0.4, Math.sin(ang - 0.4) * size * 0.4, 0, 0);
            ctx.fill();
          }
          ctx.restore();
        } else {
          ctx.fillStyle = s.warm ? 'rgb(255,235,200)' : 'rgb(220,230,255)';
          ctx.shadowColor = s.warm ? 'rgba(255,220,150,0.5)' : 'rgba(180,200,255,0.5)';
          ctx.shadowBlur = s.r > 1.2 ? 5 : 1;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
      ctx.globalAlpha = 1;

      // Shooting stars
      if (t - lastShot > nextShot) {
        const angle = 0.15 + Math.random() * 0.35;
        const spd = 10 + Math.random() * 9;
        shooters.push({
          x: W * 0.1 + Math.random() * W * 0.6, y: H * 0.05 + Math.random() * H * 0.2,
          vx: -spd * Math.cos(angle), vy: spd * Math.sin(angle),
          life: 0, max: 55 + Math.random() * 45, tail: [],
        });
        lastShot = t; nextShot = 7000 + Math.random() * 9000;
      }
      shooters = shooters.filter(ss => {
        ss.tail.push({ x: ss.x, y: ss.y });
        if (ss.tail.length > 22) ss.tail.shift();
        ss.x += ss.vx; ss.y += ss.vy; ss.life++;
        const p = ss.life / ss.max;
        const a = p < 0.25 ? p / 0.25 : 1 - (p - 0.25) / 0.75;
        for (let i = 1; i < ss.tail.length; i++) {
          const frac = i / ss.tail.length;
          ctx.strokeStyle = `rgba(255,255,255,${a * frac * 0.85})`;
          ctx.lineWidth = frac * 2.8;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(ss.tail[i-1].x, ss.tail[i-1].y);
          ctx.lineTo(ss.tail[i].x, ss.tail[i].y);
          ctx.stroke();
        }
        // head glow
        const hg = ctx.createRadialGradient(ss.x, ss.y, 0, ss.x, ss.y, 10);
        hg.addColorStop(0, `rgba(255,255,255,${a})`);
        hg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(ss.x, ss.y, 10, 0, Math.PI*2); ctx.fill();
        return ss.life < ss.max && ss.x > -150;
      });

      // Fireflies
      flies.forEach(f => {
        f.x += f.vx; f.y += f.vy;
        f.a += f.da;
        if (f.a >= 1 || f.a <= 0) f.da *= -1;
        if (f.x < 0 || f.x > W) f.vx *= -1;
        if (f.y < H * 0.58 || f.y > H * 0.97) f.vy *= -1;
        ctx.globalAlpha = Math.max(0, Math.min(0.75, f.a));
        ctx.shadowColor = 'rgba(190,255,130,1)'; ctx.shadowBlur = 12;
        ctx.fillStyle = 'rgba(210,255,155,1)';
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      });

      // Fog at bottom
      const fog = ctx.createLinearGradient(0, H * 0.78, 0, H);
      fog.addColorStop(0, 'rgba(8,4,20,0)');
      fog.addColorStop(1, 'rgba(4,2,12,0.85)');
      ctx.fillStyle = fog; ctx.fillRect(0, H * 0.78, W, H * 0.22);

      // Rain
      if (weather === 'rain') {
        ctx.lineCap = 'round';
        drops.forEach(d => {
          ctx.globalAlpha = d.a;
          ctx.strokeStyle = 'rgba(180,210,255,0.8)'; ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + d.spd * 0.12, d.y + d.len);
          ctx.stroke();
          d.y += d.spd; d.x += d.spd * 0.12;
          if (d.y > H) { d.y = -d.len; d.x = Math.random() * W; }
        });
        ctx.globalAlpha = 1;
      }

      rafId = requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafId);
    };
  }, [weather]);

  const myClicked = currentUser === 'abbas' ? !!starClickAbbas : !!starClickFatima;

  return (
    <>
      <canvas ref={canvasRef} className="fixed inset-0 z-0" />

      {/* Clouds */}
      {(weather === 'clouds' || weather === 'rain') && (
        <div
          className="fixed inset-0 z-[1] pointer-events-none"
          style={{
            backgroundImage: 'url("https://www.transparenttextures.com/patterns/clouds.png")',
            backgroundSize: '700px',
            opacity: weather === 'rain' ? 0.12 : 0.07,
            animation: 'panClouds 90s linear infinite',
            mixBlendMode: 'screen',
          }}
        />
      )}

      {/* Time Together */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 1.2, ease: 'easeOut' }}
        className="absolute top-[68px] left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center"
      >
        <p className="text-amber-100/40 text-[10px] tracking-[0.22em] uppercase" style={{ fontFamily: 'Georgia, serif' }}>
          قضيتما معاً الليلة
        </p>
        <p className="text-amber-100/75 text-[17px] font-semibold mt-0.5 tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
          {timeTogether}
        </p>
      </motion.div>

      {/* Subtitle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3, duration: 2 }}
        className="absolute top-[118px] left-1/2 -translate-x-1/2 z-20 pointer-events-none"
      >
        <p className="text-white/18 text-[11px] italic tracking-[0.28em] whitespace-nowrap" style={{ fontFamily: 'Georgia, serif' }}>
          ~ ليلة تحت النجوم ~
        </p>
      </motion.div>

      {/* Secret Star — center of screen */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
        {/* Pulsing rings */}
        {[1, 2, 3].map(i => (
          <motion.div
            key={i}
            className="absolute inset-0 m-auto rounded-full border border-yellow-300/15"
            style={{ width: 20 + i * 22, height: 20 + i * 22, top: -(i * 11), left: -(i * 11) }}
            animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2.5 + i * 0.6, repeat: Infinity, delay: i * 0.5 }}
          />
        ))}
        {/* Rotating orbit */}
        <motion.div
          className="absolute w-12 h-12 rounded-full border border-dashed border-yellow-300/15"
          style={{ top: -16, left: -16 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        />

        <motion.button
          whileTap={{ scale: 0.65 }}
          onClick={() => {
            onOurStarClick();
            if (window.navigator.vibrate) window.navigator.vibrate([20, 15, 30]);
          }}
          className="relative z-10 w-8 h-8 flex items-center justify-center focus:outline-none"
        >
          <Star
            className={cn(
              'w-7 h-7 transition-all duration-700',
              myClicked
                ? 'fill-yellow-300 text-yellow-300 drop-shadow-[0_0_18px_rgba(253,224,71,1)]'
                : 'fill-yellow-300/30 text-yellow-300/50 drop-shadow-[0_0_8px_rgba(253,224,71,0.4)]',
            )}
          />
        </motion.button>

        {/* Hint text */}
        {!myClicked && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: 5 }}
            className="absolute top-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-yellow-200/30 text-[10px] pointer-events-none"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            اضغط معاً
          </motion.p>
        )}

        {/* Secret message */}
        <AnimatePresence>
          {showSecretMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.55, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 10 }}
              transition={{ type: 'spring', stiffness: 180, damping: 18 }}
              className="absolute top-11 left-1/2 -translate-x-1/2 w-[290px] z-30"
            >
              <div
                className="relative p-5 rounded-[22px] text-center overflow-hidden"
                style={{
                  background: 'linear-gradient(145deg, rgba(8,4,18,0.94), rgba(25,10,45,0.94))',
                  border: '1px solid rgba(253,224,71,0.18)',
                  boxShadow: '0 0 50px rgba(253,224,71,0.12), 0 25px 70px rgba(0,0,0,0.7)',
                }}
              >
                {/* stars bg */}
                {[...Array(6)].map((_, i) => (
                  <motion.span
                    key={i}
                    className="absolute text-yellow-200/20 text-xs select-none pointer-events-none"
                    style={{ top: `${15 + i * 12}%`, left: `${8 + i * 14}%` }}
                    animate={{ opacity: [0.1, 0.5, 0.1] }}
                    transition={{ duration: 2 + i * 0.4, repeat: Infinity }}
                  >✦</motion.span>
                ))}
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.15, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="text-[26px] mb-3"
                >✨</motion.div>
                <p
                  className="text-yellow-100/90 text-[14.5px] leading-[1.75] whitespace-pre-line"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {poem}
                </p>
                <div className="flex justify-center gap-2 mt-4">
                  {['✨', '💛', '🌙', '💛', '✨'].map((e, i) => (
                    <motion.span
                      key={i}
                      className="text-[13px]"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ delay: i * 0.18, duration: 1.6, repeat: Infinity }}
                    >{e}</motion.span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Music Player — fixed top-left corner, away from chat */}
      <div className="fixed top-[68px] left-3 z-40" style={{ direction: 'ltr' }}>

        {/* Small floating toggle button */}
        <motion.button
          onClick={() => setShowPlayer(v => !v)}
          whileTap={{ scale: 0.88 }}
          className="flex items-center gap-2 px-3 py-2 rounded-2xl transition-all duration-300"
          style={{
            background: showPlayer
              ? 'rgba(55,25,95,0.88)'
              : 'rgba(4,2,12,0.75)',
            backdropFilter: 'blur(18px)',
            border: showPlayer
              ? '1px solid rgba(167,139,250,0.28)'
              : '1px solid rgba(255,255,255,0.08)',
            boxShadow: isPlaying
              ? '0 0 18px rgba(124,58,237,0.3)'
              : 'none',
            color: showPlayer ? 'rgba(180,150,255,1)' : 'rgba(255,255,255,0.45)',
          }}
        >
          <motion.div
            animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 3.5, repeat: isPlaying ? Infinity : 0, ease: 'linear' }}
          >
            <Music className="w-[14px] h-[14px]" />
          </motion.div>
          {isPlaying && (
            <div className="flex items-end gap-[2px] h-[12px]">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-[2px] rounded-full bg-purple-400"
                  animate={{ height: ['4px', '10px', '4px'] }}
                  transition={{ duration: 0.6 + i * 0.15, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
                />
              ))}
            </div>
          )}
          {!isPlaying && (
            <span className="text-[11px]" style={{ fontFamily: 'Georgia, serif' }}>موسيقى</span>
          )}
        </motion.button>

        {/* Expanded player panel — drops down from the button */}
        <AnimatePresence>
          {showPlayer && (
            <motion.div
              initial={{ opacity: 0, y: -8, scaleY: 0.85, originY: 0 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, y: -6, scaleY: 0.9 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              className="mt-2 w-[240px] rounded-[20px] p-4 overflow-hidden"
              style={{
                background: 'linear-gradient(160deg, rgba(8,4,20,0.96), rgba(20,8,40,0.96))',
                backdropFilter: 'blur(28px)',
                border: '1px solid rgba(167,139,250,0.12)',
                boxShadow: '0 12px 48px rgba(0,0,0,0.85), 0 0 24px rgba(100,50,200,0.1)',
              }}
            >
              {/* Title row */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-white/75 text-[12px] font-semibold" style={{ fontFamily: 'Georgia, serif' }}>
                    موسيقى الليل
                  </p>
                  <p className="text-purple-300/45 text-[10px] mt-0.5">
                    {MOODS[chordIdxRef.current % MOODS.length]} · بلا إنترنت
                  </p>
                </div>
                <Volume2 className="w-3.5 h-3.5 text-white/15" />
              </div>

              {/* Waveform */}
              <div className="flex items-end gap-[2.5px] h-9 mb-4 px-1">
                {Array.from({ length: 24 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="rounded-full flex-1"
                    style={{
                      background: isPlaying
                        ? `rgba(${148 + i * 4},${90 + i * 3},255,0.65)`
                        : 'rgba(255,255,255,0.1)',
                    }}
                    animate={isPlaying
                      ? { height: [5 + Math.sin(i * 0.8) * 8, 18 + Math.sin(i * 0.5) * 12, 5 + Math.cos(i) * 7] }
                      : { height: 3 }
                    }
                    transition={isPlaying ? {
                      duration: 0.75 + (i % 5) * 0.13,
                      repeat: Infinity,
                      repeatType: 'reverse',
                      ease: 'easeInOut',
                      delay: i * 0.035,
                    } : { duration: 0.3 }}
                  />
                ))}
              </div>

              {/* Controls row */}
              <div className="flex items-center gap-3">
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => isPlaying ? stopAmbient() : startAmbient()}
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isPlaying
                      ? 'linear-gradient(135deg,#a78bfa,#7c3aed)'
                      : 'linear-gradient(135deg,#fde047,#f59e0b)',
                    boxShadow: isPlaying
                      ? '0 0 18px rgba(124,58,237,0.5)'
                      : '0 0 16px rgba(253,224,71,0.4)',
                  }}
                >
                  {isPlaying
                    ? <Pause className="w-4 h-4 text-white fill-white" />
                    : <Play className="w-4 h-4 text-black fill-black" />}
                </motion.button>

                <div className="flex-1">
                  <input
                    type="range"
                    min={0} max={1} step={0.02}
                    value={volume}
                    onChange={e => setVolume(parseFloat(e.target.value))}
                    className="w-full h-[3px] rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, rgba(167,139,250,0.85) ${volume * 100}%, rgba(255,255,255,0.1) ${volume * 100}%)`,
                      WebkitAppearance: 'none',
                    }}
                  />
                  <p className="text-white/22 text-[9px] text-center mt-1.5">
                    {isPlaying ? 'يعزف الآن ♪' : 'اضغط للبدء'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes panClouds {
          from { background-position: 0 0; }
          to { background-position: 700px 0; }
        }
      `}</style>
    </>
  );
}
