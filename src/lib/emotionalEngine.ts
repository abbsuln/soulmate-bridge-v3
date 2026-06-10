export interface EmotionalState {
  heartRate: number;         // 48–120 bpm
  glowColor: string;         // CSS color for heart glow
  glowIntensity: number;     // 0–1
  label: string;             // Arabic emotional label
  labelEn: string;           // English key
  activityScore: number;     // 0–100
  connectionScore: number;   // 0–100 (voice + photo richness)
  streakBonus: number;       // multiplier 1–2
  orbColors: string[];       // particle/orb palette
  bgGradient: string;        // ambient background gradient
  ringProgress: [number, number, number]; // messages, voice, photos 0–1
}

export interface EngineInput {
  messages: { timestamp: Date; senderId: string; voiceUrl?: string; imageUrls?: string[] }[];
  totalMessages: number;
  voiceCount: number;
  photoCount: number;
  daysCount: number;
  streakDays: number;
  level: number;
}

export function computeEmotionalState(input: EngineInput): EmotionalState {
  const { messages, totalMessages, voiceCount, photoCount, daysCount, streakDays, level } = input;
  const now = Date.now();

  // Activity in last 24 h
  const last24h = messages.filter(m => now - m.timestamp.getTime() < 86_400_000).length;
  // Activity in last 7 days
  const last7d  = messages.filter(m => now - m.timestamp.getTime() < 7 * 86_400_000).length;
  // Hours since last message
  const lastMsg = messages.length ? messages[messages.length - 1].timestamp : null;
  const hoursSinceLast = lastMsg ? (now - lastMsg.getTime()) / 3_600_000 : 999;

  // Activity score 0–100
  const activityScore = Math.min(100, Math.round((last24h * 8) + (last7d * 2) + (streakDays * 3)));
  // Connection score (voice + photo depth)
  const connectionScore = Math.min(100, Math.round(
    (voiceCount / Math.max(1, totalMessages) * 300) +
    (photoCount / Math.max(1, totalMessages) * 200) +
    (daysCount / 30) * 20
  ));

  // Streak bonus
  const streakBonus = 1 + Math.min(1, streakDays / 20);

  // ─── Emotional State classification ───
  let label: string;
  let labelEn: string;
  let glowColor: string;
  let orbColors: string[];
  let bgGradient: string;

  if (hoursSinceLast > 48) {
    label = 'مُشتاق'; labelEn = 'longing';
    glowColor = '#818cf8';
    orbColors = ['#818cf8', '#a78bfa', '#c4b5fd', '#6366f1'];
    bgGradient = 'radial-gradient(ellipse at 50% 40%, rgba(99,102,241,0.18) 0%, transparent 70%)';
  } else if (last24h >= 20 || activityScore > 75) {
    label = 'متوهّج'; labelEn = 'radiant';
    glowColor = '#f43f5e';
    orbColors = ['#f43f5e', '#fb7185', '#fda4af', '#fecdd3'];
    bgGradient = 'radial-gradient(ellipse at 50% 40%, rgba(244,63,94,0.22) 0%, transparent 70%)';
  } else if (connectionScore > 60) {
    label = 'متصل'; labelEn = 'connected';
    glowColor = '#ec4899';
    orbColors = ['#ec4899', '#f9a8d4', '#fbcfe8', '#db2777'];
    bgGradient = 'radial-gradient(ellipse at 50% 40%, rgba(236,72,153,0.18) 0%, transparent 70%)';
  } else if (last24h > 0 && last24h < 8) {
    label = 'هادئ'; labelEn = 'serene';
    glowColor = '#a78bfa';
    orbColors = ['#a78bfa', '#c4b5fd', '#8b5cf6', '#ddd6fe'];
    bgGradient = 'radial-gradient(ellipse at 50% 40%, rgba(167,139,250,0.15) 0%, transparent 70%)';
  } else if (streakDays >= 7) {
    label = 'وفيّ'; labelEn = 'devoted';
    glowColor = '#f59e0b';
    orbColors = ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a'];
    bgGradient = 'radial-gradient(ellipse at 50% 40%, rgba(245,158,11,0.15) 0%, transparent 70%)';
  } else {
    label = 'حنين'; labelEn = 'nostalgic';
    glowColor = '#f472b6';
    orbColors = ['#f472b6', '#f9a8d4', '#fce7f3', '#be185d'];
    bgGradient = 'radial-gradient(ellipse at 50% 40%, rgba(244,114,182,0.15) 0%, transparent 70%)';
  }

  // Heart rate: calm 52–active 108 bpm
  const heartRate = Math.round(52 + (activityScore / 100) * 56 * streakBonus);

  // Glow intensity
  const glowIntensity = Math.min(1, 0.3 + (activityScore / 100) * 0.7);

  // Ring progress (0–1)
  const ringProgress: [number, number, number] = [
    Math.min(1, totalMessages / 500),
    Math.min(1, voiceCount / 50),
    Math.min(1, photoCount / 100),
  ];

  return { heartRate, glowColor, glowIntensity, label, labelEn, activityScore, connectionScore, streakBonus, orbColors, bgGradient, ringProgress };
}
