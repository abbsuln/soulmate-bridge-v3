import { describe, it, expect } from 'vitest';
import { computeEmotionalState, EngineInput } from '../emotionalEngine';

function makeInput(overrides: Partial<EngineInput> = {}): EngineInput {
  return {
    messages: [],
    totalMessages: 0,
    voiceCount: 0,
    photoCount: 0,
    daysCount: 0,
    streakDays: 0,
    level: 1,
    ...overrides,
  };
}

function recentMessages(count: number, hoursAgo = 1): EngineInput['messages'] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    timestamp: new Date(now - hoursAgo * 3_600_000 + i * 1000),
    senderId: 'user1',
  }));
}

describe('computeEmotionalState', () => {
  describe('activity score', () => {
    it('should return 0 activity score when no messages', () => {
      const state = computeEmotionalState(makeInput());
      expect(state.activityScore).toBe(0);
    });

    it('should increase activity score with recent messages', () => {
      const msgs = recentMessages(10);
      const state = computeEmotionalState(makeInput({ messages: msgs }));
      expect(state.activityScore).toBeGreaterThan(0);
      expect(state.activityScore).toBeLessThanOrEqual(100);
    });

    it('should cap activity score at 100', () => {
      const msgs = recentMessages(50);
      const state = computeEmotionalState(makeInput({ messages: msgs, streakDays: 30 }));
      expect(state.activityScore).toBeLessThanOrEqual(100);
    });

    it('should include streak days in activity score', () => {
      const msgs = recentMessages(5);
      const withoutStreak = computeEmotionalState(makeInput({ messages: msgs, streakDays: 0 }));
      const withStreak = computeEmotionalState(makeInput({ messages: msgs, streakDays: 10 }));
      expect(withStreak.activityScore).toBeGreaterThan(withoutStreak.activityScore);
    });
  });

  describe('connection score', () => {
    it('should return 0 when no messages', () => {
      const state = computeEmotionalState(makeInput());
      expect(state.connectionScore).toBe(0);
    });

    it('should increase with voice messages ratio', () => {
      const low = computeEmotionalState(makeInput({ totalMessages: 100, voiceCount: 5 }));
      const high = computeEmotionalState(makeInput({ totalMessages: 100, voiceCount: 30 }));
      expect(high.connectionScore).toBeGreaterThan(low.connectionScore);
    });

    it('should increase with photo messages ratio', () => {
      const low = computeEmotionalState(makeInput({ totalMessages: 100, photoCount: 5 }));
      const high = computeEmotionalState(makeInput({ totalMessages: 100, photoCount: 40 }));
      expect(high.connectionScore).toBeGreaterThan(low.connectionScore);
    });

    it('should increase with days count', () => {
      const low = computeEmotionalState(makeInput({ totalMessages: 50, daysCount: 5 }));
      const high = computeEmotionalState(makeInput({ totalMessages: 50, daysCount: 30 }));
      expect(high.connectionScore).toBeGreaterThan(low.connectionScore);
    });

    it('should cap at 100', () => {
      const state = computeEmotionalState(makeInput({
        totalMessages: 100,
        voiceCount: 50,
        photoCount: 80,
        daysCount: 90,
      }));
      expect(state.connectionScore).toBeLessThanOrEqual(100);
    });
  });

  describe('streak bonus', () => {
    it('should be 1 when streakDays is 0', () => {
      const state = computeEmotionalState(makeInput({ streakDays: 0 }));
      expect(state.streakBonus).toBe(1);
    });

    it('should be 1.5 when streakDays is 10', () => {
      const state = computeEmotionalState(makeInput({ streakDays: 10 }));
      expect(state.streakBonus).toBe(1.5);
    });

    it('should cap at 2 when streakDays >= 20', () => {
      const state = computeEmotionalState(makeInput({ streakDays: 20 }));
      expect(state.streakBonus).toBe(2);
      const state2 = computeEmotionalState(makeInput({ streakDays: 100 }));
      expect(state2.streakBonus).toBe(2);
    });
  });

  describe('emotional state classification', () => {
    it('should return "longing" when last message was >48h ago', () => {
      const oldMsg = [{
        timestamp: new Date(Date.now() - 72 * 3_600_000),
        senderId: 'user1',
      }];
      const state = computeEmotionalState(makeInput({ messages: oldMsg }));
      expect(state.labelEn).toBe('longing');
      expect(state.label).toBe('مُشتاق');
      expect(state.glowColor).toBe('#818cf8');
    });

    it('should return "radiant" when 24h messages >= 20', () => {
      const msgs = recentMessages(25);
      const state = computeEmotionalState(makeInput({ messages: msgs }));
      expect(state.labelEn).toBe('radiant');
      expect(state.label).toBe('متوهّج');
    });

    it('should return "radiant" when activityScore > 75', () => {
      const msgs = recentMessages(8);
      const state = computeEmotionalState(makeInput({ messages: msgs, streakDays: 15 }));
      // 8*8 + 8*2 + 15*3 = 64+16+45 = 125 -> capped at 100, > 75
      expect(state.activityScore).toBeGreaterThan(75);
      expect(state.labelEn).toBe('radiant');
    });

    it('should return "connected" when connectionScore > 60', () => {
      // High voice/photo ratio but low recent activity
      const msgs = recentMessages(3, 20); // 3 msgs 20h ago (within 24h but low count)
      const state = computeEmotionalState(makeInput({
        messages: msgs,
        totalMessages: 100,
        voiceCount: 25,
        photoCount: 10,
        daysCount: 10,
      }));
      expect(state.connectionScore).toBeGreaterThan(60);
      expect(state.labelEn).toBe('connected');
    });

    it('should return "serene" when 0 < last24h < 8 and no other conditions met', () => {
      const msgs = recentMessages(5);
      const state = computeEmotionalState(makeInput({
        messages: msgs,
        totalMessages: 10,
        voiceCount: 0,
        photoCount: 0,
        daysCount: 1,
        streakDays: 2,
      }));
      expect(state.labelEn).toBe('serene');
    });

    it('should return "devoted" when streakDays >= 7 and no other conditions met', () => {
      const oldMsg = [{
        timestamp: new Date(Date.now() - 30 * 3_600_000), // 30h ago, outside 24h
        senderId: 'user1',
      }];
      const state = computeEmotionalState(makeInput({
        messages: oldMsg,
        totalMessages: 10,
        voiceCount: 0,
        photoCount: 0,
        daysCount: 1,
        streakDays: 7,
      }));
      expect(state.labelEn).toBe('devoted');
    });

    it('should return "nostalgic" as fallback', () => {
      const oldMsg = [{
        timestamp: new Date(Date.now() - 30 * 3_600_000), // 30h ago
        senderId: 'user1',
      }];
      const state = computeEmotionalState(makeInput({
        messages: oldMsg,
        streakDays: 3,
      }));
      expect(state.labelEn).toBe('nostalgic');
      expect(state.label).toBe('حنين');
    });
  });

  describe('heart rate', () => {
    it('should be 52 bpm when activity is 0 and streak bonus is 1', () => {
      const state = computeEmotionalState(makeInput());
      expect(state.heartRate).toBe(52);
    });

    it('should increase with activity score', () => {
      const low = computeEmotionalState(makeInput());
      const high = computeEmotionalState(makeInput({ messages: recentMessages(15) }));
      expect(high.heartRate).toBeGreaterThan(low.heartRate);
    });

    it('should be boosted by streak bonus', () => {
      const msgs = recentMessages(10);
      const noStreak = computeEmotionalState(makeInput({ messages: msgs, streakDays: 0 }));
      const withStreak = computeEmotionalState(makeInput({ messages: msgs, streakDays: 20 }));
      expect(withStreak.heartRate).toBeGreaterThan(noStreak.heartRate);
    });
  });

  describe('glow intensity', () => {
    it('should be 0.3 when activity is 0', () => {
      const state = computeEmotionalState(makeInput());
      expect(state.glowIntensity).toBeCloseTo(0.3);
    });

    it('should max at 1.0', () => {
      const state = computeEmotionalState(makeInput({ messages: recentMessages(50), streakDays: 30 }));
      expect(state.glowIntensity).toBeLessThanOrEqual(1);
    });
  });

  describe('ring progress', () => {
    it('should be [0, 0, 0] with no data', () => {
      const state = computeEmotionalState(makeInput());
      expect(state.ringProgress).toEqual([0, 0, 0]);
    });

    it('should scale messages to 500', () => {
      const state = computeEmotionalState(makeInput({ totalMessages: 250 }));
      expect(state.ringProgress[0]).toBeCloseTo(0.5);
    });

    it('should scale voice to 50', () => {
      const state = computeEmotionalState(makeInput({ voiceCount: 25 }));
      expect(state.ringProgress[1]).toBeCloseTo(0.5);
    });

    it('should scale photos to 100', () => {
      const state = computeEmotionalState(makeInput({ photoCount: 50 }));
      expect(state.ringProgress[2]).toBeCloseTo(0.5);
    });

    it('should cap each value at 1', () => {
      const state = computeEmotionalState(makeInput({
        totalMessages: 1000,
        voiceCount: 200,
        photoCount: 500,
      }));
      expect(state.ringProgress).toEqual([1, 1, 1]);
    });
  });

  describe('output shape', () => {
    it('should return all required fields', () => {
      const state = computeEmotionalState(makeInput({ messages: recentMessages(5) }));
      expect(state).toHaveProperty('heartRate');
      expect(state).toHaveProperty('glowColor');
      expect(state).toHaveProperty('glowIntensity');
      expect(state).toHaveProperty('label');
      expect(state).toHaveProperty('labelEn');
      expect(state).toHaveProperty('activityScore');
      expect(state).toHaveProperty('connectionScore');
      expect(state).toHaveProperty('streakBonus');
      expect(state).toHaveProperty('orbColors');
      expect(state).toHaveProperty('bgGradient');
      expect(state).toHaveProperty('ringProgress');
      expect(state.orbColors).toBeInstanceOf(Array);
      expect(state.orbColors.length).toBe(4);
      expect(state.ringProgress.length).toBe(3);
    });
  });
});
