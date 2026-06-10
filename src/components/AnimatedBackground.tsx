import React, { useMemo } from 'react';

interface AnimatedBackgroundProps {
  theme: string;
}

// Static particles computed once — no JS per frame, pure CSS animations
const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ theme }) => {
  // 7 particles max, generated once per theme
  const particles = useMemo(() => Array.from({ length: 7 }, (_, i) => ({
    id: i,
    left: 8 + i * 13,
    dur:  14 + i * 3,
    delay: i * 2.8,
    size: 10 + (i % 3) * 6,
  })), []);

  const themeKey = theme === 'default' ? 'rose' : theme;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <style>{`
        @keyframes ab-float {
          0%   { transform: translateY(0) rotate(0deg);    opacity: 0; }
          10%  { opacity: 0.5; }
          90%  { opacity: 0.5; }
          100% { transform: translateY(-105vh) rotate(180deg); opacity: 0; }
        }
        @keyframes ab-twinkle {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50%       { opacity: 0.55; transform: scale(1.15); }
        }
        @keyframes ab-fall {
          0%   { transform: translateY(-10px) rotate(0deg);   opacity: 0; }
          10%  { opacity: 0.4; }
          90%  { opacity: 0.4; }
          100% { transform: translateY(105vh) rotate(120deg); opacity: 0; }
        }
      `}</style>

      {(themeKey === 'rose') && particles.map(p => (
        <div key={p.id} className="absolute text-rose-500/15"
          style={{ left: `${p.left}%`, bottom: '-5%',
            animation: `ab-float ${p.dur}s linear -${p.delay}s infinite` }}>
          <svg width={p.size} height={p.size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
          </svg>
        </div>
      ))}

      {themeKey === 'purple' && particles.map(p => (
        <div key={p.id} className="absolute text-purple-400/40"
          style={{ left: `${p.left}%`, top: `${10 + p.id * 12}%`,
            animation: `ab-twinkle ${p.dur / 2}s ease-in-out -${p.delay}s infinite` }}>
          <svg width={p.size / 1.8} height={p.size / 1.8} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>
      ))}

      {themeKey === 'ocean' && particles.map(p => (
        <div key={p.id}
          className="absolute rounded-full border border-blue-400/15 bg-blue-400/5"
          style={{ left: `${p.left}%`, bottom: '-5%',
            width: p.size, height: p.size,
            animation: `ab-float ${p.dur}s ease-in -${p.delay}s infinite` }}
        />
      ))}

      {themeKey === 'forest' && particles.map(p => (
        <div key={p.id} className="absolute text-green-500/15"
          style={{ left: `${p.left}%`, top: '-5%',
            animation: `ab-fall ${p.dur}s linear -${p.delay}s infinite` }}>
          <svg width={p.size} height={p.size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l.95-2.3C7.14 19.87 7.64 20 8 20c11 0 14-17 14-17-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/>
          </svg>
        </div>
      ))}

      {themeKey === 'sunset' && particles.map(p => (
        <div key={p.id}
          className="absolute rounded-full bg-orange-400/20"
          style={{ left: `${p.left}%`, top: `${5 + p.id * 13}%`,
            width: p.size * 1.8, height: p.size * 1.8,
            animation: `ab-twinkle ${p.dur}s ease-in-out -${p.delay}s infinite` }}
        />
      ))}
    </div>
  );
};

export default React.memo(AnimatedBackground);
