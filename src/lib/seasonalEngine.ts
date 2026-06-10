export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type SpecialDay = 'ramadan' | 'eid_fitr' | 'eid_adha' | 'anniversary' | 'birthday_abbas' | 'birthday_fatima' | null;

export interface SeasonalState {
  season: Season;
  specialDay: SpecialDay;
  specialLabel: string;
  specialEmoji: string;
  skyColors: [string, string];   // gradient top→bottom
  ambientColor: string;          // tint
  leafColor: string;
  leafParticle: string;          // emoji
  groundColor: string;
}

/* Islamic calendar approximations for 2025-2027 */
const RAMADAN_RANGES: [number, number, number, number, number][] = [
  [2025, 2, 28, 3, 29],
  [2026, 2, 17, 3, 18],
  [2027, 2,  6, 3,  7],
];
const EID_FITR: [number, number, number][] = [[2025, 3, 29], [2026, 3, 19], [2027, 3, 7]];
const EID_ADHA: [number, number, number][] = [[2025, 6,  5], [2026, 5, 26], [2027, 5, 15]];

function inRange(d: Date, y: number, m1: number, d1: number, m2: number, d2: number) {
  const start = new Date(y, m1, d1);
  const end   = new Date(y, m2, d2 + 3);
  return d >= start && d <= end;
}

export function computeSeasonalState(
  now: Date = new Date(),
  anniversaryDate?: Date,
  abbBirthday?: string,
  fatBirthday?: string
): SeasonalState {
  const month = now.getMonth(); // 0-based
  const year  = now.getFullYear();
  const day   = now.getDate();

  // Season (Northern/Arabian hemisphere)
  let season: Season;
  if ([11, 0, 1].includes(month))      season = 'winter';
  else if ([2, 3, 4].includes(month))  season = 'spring';
  else if ([5, 6, 7].includes(month))  season = 'summer';
  else                                  season = 'autumn';

  // Special day detection
  let specialDay: SpecialDay = null;
  let specialLabel = '';
  let specialEmoji = '';

  // Eid al-Adha (3-day window)
  for (const [y, m, d2] of EID_ADHA) {
    if (year === y && month === m && Math.abs(day - d2) <= 2) {
      specialDay = 'eid_adha'; specialLabel = 'عيد الأضحى المبارك'; specialEmoji = '🐑'; break;
    }
  }
  // Eid al-Fitr
  if (!specialDay) for (const [y, m, d2] of EID_FITR) {
    if (year === y && month === m && Math.abs(day - d2) <= 2) {
      specialDay = 'eid_fitr'; specialLabel = 'عيد الفطر المبارك'; specialEmoji = '🌙'; break;
    }
  }
  // Ramadan
  if (!specialDay) for (const [y, m1, d1, m2, d2] of RAMADAN_RANGES) {
    if (year === y && inRange(now, y, m1, d1, m2, d2)) {
      specialDay = 'ramadan'; specialLabel = 'رمضان كريم'; specialEmoji = '🕌'; break;
    }
  }
  // Anniversary (±1 day)
  if (!specialDay && anniversaryDate) {
    const am = anniversaryDate.getMonth(), ad = anniversaryDate.getDate();
    if (month === am && Math.abs(day - ad) <= 1) {
      specialDay = 'anniversary'; specialLabel = 'ذكرى سنوية مباركة 💍'; specialEmoji = '💍';
    }
  }

  // Season-specific visuals
  const configs: Record<Season, Omit<SeasonalState, 'season' | 'specialDay' | 'specialLabel' | 'specialEmoji'>> = {
    spring: {
      skyColors: ['#0d1e3a', '#0e2010'],
      ambientColor: '#f472b6',
      leafColor: '#86efac',
      leafParticle: '🌸',
      groundColor: '#14532d',
    },
    summer: {
      skyColors: ['#071a3e', '#0d2b10'],
      ambientColor: '#22c55e',
      leafColor: '#16a34a',
      leafParticle: '🌿',
      groundColor: '#166534',
    },
    autumn: {
      skyColors: ['#1a0e00', '#2d1a00'],
      ambientColor: '#f97316',
      leafColor: '#d97706',
      leafParticle: '🍂',
      groundColor: '#7c2d12',
    },
    winter: {
      skyColors: ['#0d1b2e', '#1e293b'],
      ambientColor: '#93c5fd',
      leafColor: '#cbd5e1',
      leafParticle: '❄',
      groundColor: '#1e3a5f',
    },
  };

  return { season, specialDay, specialLabel, specialEmoji, ...configs[season] };
}
