import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PeaceMaker from '../PeaceMaker';

// Mock motion/react
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Gavel: () => <span>Gavel</span>,
  Sparkles: () => <span>Sparkles</span>,
}));

// Mock @google/genai
const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent };
  },
}));

describe('PeaceMaker component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the title', () => {
    render(<PeaceMaker />);
    expect(screen.getByText('صانع السلام (The Peace Maker)')).toBeDefined();
  });

  it('should render the input placeholder', () => {
    render(<PeaceMaker />);
    expect(screen.getByPlaceholderText('محتارين بشنو؟ (مثلاً: وين نتعشى؟ فيلـم رعب لو رومانسي؟)')).toBeDefined();
  });

  it('should render the submit button', () => {
    render(<PeaceMaker />);
    expect(screen.getByText('اسأل صانع السلام')).toBeDefined();
  });

  it('should update input value', () => {
    render(<PeaceMaker />);
    const input = screen.getByPlaceholderText('محتارين بشنو؟ (مثلاً: وين نتعشى؟ فيلـم رعب لو رومانسي؟)');
    fireEvent.change(input, { target: { value: 'وين نتعشى؟' } });
    expect((input as HTMLInputElement).value).toBe('وين نتعشى؟');
  });

  it('should not call API when prompt is empty', () => {
    render(<PeaceMaker apiKey="test-key" />);
    const button = screen.getByText('اسأل صانع السلام');
    fireEvent.click(button);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('should show error message when no API key provided', async () => {
    render(<PeaceMaker />);
    const input = screen.getByPlaceholderText('محتارين بشنو؟ (مثلاً: وين نتعشى؟ فيلـم رعب لو رومانسي؟)');
    fireEvent.change(input, { target: { value: 'test question' } });
    
    const button = screen.getByText('اسأل صانع السلام');
    fireEvent.click(button);

    await vi.waitFor(() => {
      expect(screen.getByText('يرجى إدخال مفتاح صانع السلام في الإعدادات أولاً!')).toBeDefined();
    });
  });

  it('should call API and show suggestion when API key exists', async () => {
    mockGenerateContent.mockResolvedValue({ text: 'اذهبوا للبيتزا!' });
    
    render(<PeaceMaker apiKey="test-key" />);
    const input = screen.getByPlaceholderText('محتارين بشنو؟ (مثلاً: وين نتعشى؟ فيلـم رعب لو رومانسي؟)');
    fireEvent.change(input, { target: { value: 'وين نتعشى؟' } });
    
    const button = screen.getByText('اسأل صانع السلام');
    fireEvent.click(button);

    await vi.waitFor(() => {
      expect(screen.getByText('اذهبوا للبيتزا!')).toBeDefined();
    });
  });

  it('should show loading state while waiting for API', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise(resolve => { resolvePromise = resolve; });
    mockGenerateContent.mockReturnValue(promise);

    render(<PeaceMaker apiKey="test-key" />);
    const input = screen.getByPlaceholderText('محتارين بشنو؟ (مثلاً: وين نتعشى؟ فيلـم رعب لو رومانسي؟)');
    fireEvent.change(input, { target: { value: 'test' } });
    
    fireEvent.click(screen.getByText('اسأل صانع السلام'));
    
    await vi.waitFor(() => {
      expect(screen.getByText('جاري التفكير...')).toBeDefined();
    });

    resolvePromise!({ text: 'done' });
  });

  it('should show error message on API failure', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API fail'));
    
    render(<PeaceMaker apiKey="test-key" />);
    const input = screen.getByPlaceholderText('محتارين بشنو؟ (مثلاً: وين نتعشى؟ فيلـم رعب لو رومانسي؟)');
    fireEvent.change(input, { target: { value: 'test question' } });
    
    fireEvent.click(screen.getByText('اسأل صانع السلام'));

    await vi.waitFor(() => {
      expect(screen.getByText('صار خلل بذكائي، جرب مرة ثانية! وتأكد من المفتاح.')).toBeDefined();
    });
  });
});
