import { describe, it, expect } from 'vitest';
import { computeSeasonalState } from '../seasonalEngine';

describe('computeSeasonalState', () => {
  describe('season detection', () => {
    it('should return winter for December', () => {
      const state = computeSeasonalState(new Date(2025, 11, 15));
      expect(state.season).toBe('winter');
    });

    it('should return winter for January', () => {
      const state = computeSeasonalState(new Date(2025, 0, 15));
      expect(state.season).toBe('winter');
    });

    it('should return winter for February', () => {
      const state = computeSeasonalState(new Date(2025, 1, 10));
      expect(state.season).toBe('winter');
    });

    it('should return spring for March', () => {
      const state = computeSeasonalState(new Date(2025, 2, 15));
      expect(state.season).toBe('spring');
    });

    it('should return spring for April', () => {
      const state = computeSeasonalState(new Date(2025, 3, 15));
      expect(state.season).toBe('spring');
    });

    it('should return spring for May', () => {
      const state = computeSeasonalState(new Date(2025, 4, 15));
      expect(state.season).toBe('spring');
    });

    it('should return summer for June', () => {
      const state = computeSeasonalState(new Date(2025, 5, 15));
      expect(state.season).toBe('summer');
    });

    it('should return summer for July', () => {
      const state = computeSeasonalState(new Date(2025, 6, 15));
      expect(state.season).toBe('summer');
    });

    it('should return summer for August', () => {
      const state = computeSeasonalState(new Date(2025, 7, 15));
      expect(state.season).toBe('summer');
    });

    it('should return autumn for September', () => {
      const state = computeSeasonalState(new Date(2025, 8, 15));
      expect(state.season).toBe('autumn');
    });

    it('should return autumn for October', () => {
      const state = computeSeasonalState(new Date(2025, 9, 15));
      expect(state.season).toBe('autumn');
    });

    it('should return autumn for November', () => {
      const state = computeSeasonalState(new Date(2025, 10, 15));
      expect(state.season).toBe('autumn');
    });
  });

  describe('special day detection', () => {
    // EID_ADHA 2025 is [2025, 6, 5] → July 5 (month 6, 0-based)
    it('should detect Eid al-Adha 2025 (July 5)', () => {
      const state = computeSeasonalState(new Date(2025, 6, 5));
      expect(state.specialDay).toBe('eid_adha');
      expect(state.specialEmoji).toBe('🐑');
    });

    it('should detect Eid al-Adha within 2-day window', () => {
      const state = computeSeasonalState(new Date(2025, 6, 7));
      expect(state.specialDay).toBe('eid_adha');
    });

    // EID_FITR 2025 is [2025, 3, 29] → April 29 (month 3, 0-based)
    it('should detect Eid al-Fitr 2025 (April 29)', () => {
      const state = computeSeasonalState(new Date(2025, 3, 29));
      expect(state.specialDay).toBe('eid_fitr');
      expect(state.specialEmoji).toBe('🌙');
    });

    it('should detect Eid al-Fitr within 2-day window', () => {
      const state = computeSeasonalState(new Date(2025, 3, 30));
      expect(state.specialDay).toBe('eid_fitr');
    });

    // RAMADAN 2025 is [2025, 2, 28, 3, 29] → March 28 to April 29+3 = May 2
    it('should detect Ramadan 2025', () => {
      const state = computeSeasonalState(new Date(2025, 2, 30)); // March 30
      expect(state.specialDay).toBe('ramadan');
      expect(state.specialEmoji).toBe('🕌');
      expect(state.specialLabel).toBe('رمضان كريم');
    });

    // RAMADAN 2026 is [2026, 2, 17, 3, 18] → March 17 to April 21
    it('should detect Ramadan 2026', () => {
      const state = computeSeasonalState(new Date(2026, 2, 20)); // March 20
      expect(state.specialDay).toBe('ramadan');
    });

    it('should detect anniversary within 1-day window', () => {
      const anniversaryDate = new Date(2024, 7, 15); // Aug 15
      const state = computeSeasonalState(new Date(2025, 7, 15), anniversaryDate);
      expect(state.specialDay).toBe('anniversary');
      expect(state.specialEmoji).toBe('💍');
    });

    it('should detect anniversary on adjacent day', () => {
      const anniversaryDate = new Date(2024, 7, 15); // Aug 15
      const state = computeSeasonalState(new Date(2025, 7, 14), anniversaryDate);
      expect(state.specialDay).toBe('anniversary');
    });

    it('should not detect anniversary if date is too far', () => {
      const anniversaryDate = new Date(2024, 7, 15); // Aug 15
      const state = computeSeasonalState(new Date(2025, 7, 20), anniversaryDate);
      expect(state.specialDay).not.toBe('anniversary');
    });

    it('should return null specialDay for a regular day', () => {
      const state = computeSeasonalState(new Date(2025, 7, 10)); // Aug 10
      expect(state.specialDay).toBeNull();
    });

    it('should prioritize Eid al-Adha over other special days', () => {
      // Eid Adha 2025 is July 5
      const state = computeSeasonalState(new Date(2025, 6, 5));
      expect(state.specialDay).toBe('eid_adha');
    });
  });

  describe('seasonal visuals', () => {
    it('should return correct winter visuals', () => {
      const state = computeSeasonalState(new Date(2025, 0, 15));
      expect(state.leafParticle).toBe('❄');
      expect(state.ambientColor).toBe('#93c5fd');
      expect(state.skyColors).toEqual(['#0d1b2e', '#1e293b']);
    });

    it('should return correct spring visuals', () => {
      const state = computeSeasonalState(new Date(2025, 3, 15));
      expect(state.leafParticle).toBe('🌸');
      expect(state.ambientColor).toBe('#f472b6');
    });

    it('should return correct summer visuals', () => {
      const state = computeSeasonalState(new Date(2025, 6, 15));
      expect(state.leafParticle).toBe('🌿');
      expect(state.ambientColor).toBe('#22c55e');
    });

    it('should return correct autumn visuals', () => {
      const state = computeSeasonalState(new Date(2025, 9, 15));
      expect(state.leafParticle).toBe('🍂');
      expect(state.ambientColor).toBe('#f97316');
    });
  });

  describe('output shape', () => {
    it('should return all required fields', () => {
      const state = computeSeasonalState(new Date(2025, 5, 1));
      expect(state).toHaveProperty('season');
      expect(state).toHaveProperty('specialDay');
      expect(state).toHaveProperty('specialLabel');
      expect(state).toHaveProperty('specialEmoji');
      expect(state).toHaveProperty('skyColors');
      expect(state).toHaveProperty('ambientColor');
      expect(state).toHaveProperty('leafColor');
      expect(state).toHaveProperty('leafParticle');
      expect(state).toHaveProperty('groundColor');
      expect(state.skyColors).toHaveLength(2);
    });
  });
});
