import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getGeminiApiKey, analyzeMood, detectPain, summarizeMoodWeek } from '../geminiService';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock @google/genai module
const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent };
  },
  Type: { OBJECT: 'OBJECT', NUMBER: 'NUMBER' },
}));

describe('geminiService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('getGeminiApiKey', () => {
    it('should return empty string when no key stored', () => {
      expect(getGeminiApiKey()).toBe('');
    });

    it('should return the stored API key', () => {
      localStorageMock.setItem('geminiApiKey', 'test-key-123');
      expect(getGeminiApiKey()).toBe('test-key-123');
    });
  });

  describe('analyzeMood', () => {
    it('should return null when no API key is set', async () => {
      const result = await analyzeMood('hello');
      expect(result).toBeNull();
    });

    it('should call Gemini API and return mood coordinates', async () => {
      localStorageMock.setItem('geminiApiKey', 'fake-key');
      mockGenerateContent.mockResolvedValue({
        text: '{"x": 0.5, "y": -0.3}',
      });

      const result = await analyzeMood('I am so happy today!');
      expect(result).toEqual({ x: 0.5, y: -0.3 });
      expect(mockGenerateContent).toHaveBeenCalledOnce();
    });

    it('should return {x: 0, y: 0} on API error', async () => {
      localStorageMock.setItem('geminiApiKey', 'fake-key');
      mockGenerateContent.mockRejectedValue(new Error('API error'));

      const result = await analyzeMood('test');
      expect(result).toEqual({ x: 0, y: 0 });
    });
  });

  describe('detectPain', () => {
    it('should return false when no API key is set', async () => {
      const result = await detectPain('test');
      expect(result).toBe(false);
    });

    it('should return true when API detects pain', async () => {
      localStorageMock.setItem('geminiApiKey', 'fake-key');
      mockGenerateContent.mockResolvedValue({ text: 'true' });

      const result = await detectPain('تعبت من كل شيء');
      expect(result).toBe(true);
    });

    it('should return false when API does not detect pain', async () => {
      localStorageMock.setItem('geminiApiKey', 'fake-key');
      mockGenerateContent.mockResolvedValue({ text: 'false' });

      const result = await detectPain('I feel great!');
      expect(result).toBe(false);
    });

    it('should return false on API error', async () => {
      localStorageMock.setItem('geminiApiKey', 'fake-key');
      mockGenerateContent.mockRejectedValue(new Error('fail'));

      const result = await detectPain('test');
      expect(result).toBe(false);
    });
  });

  describe('summarizeMoodWeek', () => {
    it('should return default message when no API key is set', async () => {
      const result = await summarizeMoodWeek([{ x: 0.5, y: 0.3 }]);
      expect(result).toBe('نحتاج لمزيد من اللحظات لنفهم شعوركم.');
    });

    it('should return summary from API', async () => {
      localStorageMock.setItem('geminiApiKey', 'fake-key');
      mockGenerateContent.mockResolvedValue({ text: 'أسبوع جميل' });

      const result = await summarizeMoodWeek([
        { x: 0.8, y: 0.2 },
        { x: 0.6, y: -0.1 },
      ]);
      expect(result).toBe('أسبوع جميل');
    });

    it('should return fallback on API error', async () => {
      localStorageMock.setItem('geminiApiKey', 'fake-key');
      mockGenerateContent.mockRejectedValue(new Error('fail'));

      const result = await summarizeMoodWeek([{ x: 0, y: 0 }]);
      expect(result).toBe('أسبوع مليء بالنبض.');
    });

    it('should return fallback when API returns empty text', async () => {
      localStorageMock.setItem('geminiApiKey', 'fake-key');
      mockGenerateContent.mockResolvedValue({ text: '' });

      const result = await summarizeMoodWeek([{ x: 0.5, y: 0.5 }]);
      expect(result).toBe('أسبوع مليء بالنبض.');
    });
  });
});
