import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SecretBox from '../SecretBox';

// Mock motion/react
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div>{children}</div>,
    button: ({ children, ...props }: any) => <button>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Clock: () => <span>Clock</span>,
  Send: () => <span>Send</span>,
  Lock: () => <span>Lock</span>,
  ArrowLeft: () => <span>ArrowLeft</span>,
  Sparkles: () => <span>Sparkles</span>,
}));

// Mock firebase
const mockAddDoc = vi.fn().mockResolvedValue({ id: 'test-id' });
vi.mock('../../lib/firebase', () => ({
  db: {},
}));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: (...args: any[]) => mockAddDoc(...args),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
}));

describe('SecretBox component', () => {
  let onBack: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    onBack = vi.fn<() => void>();
    mockAddDoc.mockClear();
  });

  it('should render the title', () => {
    render(<SecretBox currentUser="abbas" onBack={onBack} />);
    expect(screen.getByText('صندوق الأسرار ⏰')).toBeDefined();
  });

  it('should render delay day buttons (1, 3, 7, 30)', () => {
    render(<SecretBox currentUser="abbas" onBack={onBack} />);
    expect(screen.getByText('1')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
    expect(screen.getByText('7')).toBeDefined();
    expect(screen.getByText('30')).toBeDefined();
  });

  it('should render the textarea placeholder', () => {
    render(<SecretBox currentUser="abbas" onBack={onBack} />);
    expect(screen.getByPlaceholderText('اكتب شيئاً سيقرأه لاحقاً...')).toBeDefined();
  });

  it('should update textarea value on input', () => {
    render(<SecretBox currentUser="abbas" onBack={onBack} />);
    const textarea = screen.getByPlaceholderText('اكتب شيئاً سيقرأه لاحقاً...');
    fireEvent.change(textarea, { target: { value: 'رسالة سرية' } });
    expect((textarea as HTMLTextAreaElement).value).toBe('رسالة سرية');
  });

  it('should disable send button when text is empty', () => {
    render(<SecretBox currentUser="abbas" onBack={onBack} />);
    const button = screen.getByText('تجميد الرسالة').closest('button');
    expect(button?.disabled).toBe(true);
  });

  it('should enable send button when text is entered', () => {
    render(<SecretBox currentUser="abbas" onBack={onBack} />);
    const textarea = screen.getByPlaceholderText('اكتب شيئاً سيقرأه لاحقاً...');
    fireEvent.change(textarea, { target: { value: 'test message' } });
    const button = screen.getByText('تجميد الرسالة').closest('button');
    expect(button?.disabled).toBe(false);
  });

  it('should call onBack when back button is clicked', () => {
    render(<SecretBox currentUser="abbas" onBack={onBack} />);
    const backButton = screen.getByText('ArrowLeft').closest('button');
    fireEvent.click(backButton!);
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('should call addDoc and onBack when sending a secret', async () => {
    render(<SecretBox currentUser="abbas" onBack={onBack} />);
    const textarea = screen.getByPlaceholderText('اكتب شيئاً سيقرأه لاحقاً...');
    fireEvent.change(textarea, { target: { value: 'secret message' } });
    
    const button = screen.getByText('تجميد الرسالة').closest('button');
    fireEvent.click(button!);

    // Wait for async
    await vi.waitFor(() => {
      expect(mockAddDoc).toHaveBeenCalledOnce();
      expect(onBack).toHaveBeenCalledOnce();
    });
  });

  it('should allow selecting different delay days', () => {
    render(<SecretBox currentUser="abbas" onBack={onBack} />);
    const day7Button = screen.getByText('7').closest('button');
    fireEvent.click(day7Button!);
    // The button with value 7 should get the active class
    expect(day7Button?.className).toContain('bg-purple-600');
  });
});
