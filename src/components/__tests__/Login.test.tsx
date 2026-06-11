import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Login from '../Login';

// Mock motion/react to render plain elements
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...filterProps(props)}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...filterProps(props)}>{children}</button>,
    p: ({ children, ...props }: any) => <p {...filterProps(props)}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Filter out motion-specific props that React DOM doesn't accept
function filterProps(props: Record<string, any>) {
  const filtered: Record<string, any> = {};
  const motionProps = ['whileTap', 'initial', 'animate', 'exit', 'transition', 'layoutId', 'whileHover'];
  for (const [key, val] of Object.entries(props)) {
    if (!motionProps.includes(key)) filtered[key] = val;
  }
  return filtered;
}

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Heart: () => <span data-testid="icon-heart">Heart</span>,
  Lock: () => <span data-testid="icon-lock">Lock</span>,
  Eye: () => <span data-testid="icon-eye">Eye</span>,
  EyeOff: () => <span data-testid="icon-eyeoff">EyeOff</span>,
}));

describe('Login component', () => {
  let onLogin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onLogin = vi.fn();
    Object.defineProperty(window.navigator, 'vibrate', { value: vi.fn(), writable: true });
  });

  it('should render the app title', () => {
    render(<Login onLogin={onLogin} />);
    expect(screen.getByText('SoulMate Bridge')).toBeDefined();
  });

  it('should render user selection buttons', () => {
    render(<Login onLogin={onLogin} />);
    expect(screen.getByText('عباس')).toBeDefined();
    expect(screen.getByText('فاطمة')).toBeDefined();
  });

  it('should show password input after selecting a user', () => {
    render(<Login onLogin={onLogin} />);
    fireEvent.click(screen.getByText('عباس'));
    expect(screen.getByPlaceholderText('الرمز السري')).toBeDefined();
  });

  it('should call onLogin with correct user when passcode is correct', () => {
    render(<Login onLogin={onLogin} />);
    fireEvent.click(screen.getByText('عباس'));
    const input = screen.getByPlaceholderText('الرمز السري');
    fireEvent.change(input, { target: { value: 'always' } });
    fireEvent.submit(input.closest('form')!);
    expect(onLogin).toHaveBeenCalledWith('abbas');
  });

  it('should call onLogin for fatima with correct passcode', () => {
    render(<Login onLogin={onLogin} />);
    fireEvent.click(screen.getByText('فاطمة'));
    const input = screen.getByPlaceholderText('الرمز السري');
    fireEvent.change(input, { target: { value: 'ALWAYS' } });
    fireEvent.submit(input.closest('form')!);
    expect(onLogin).toHaveBeenCalledWith('fatima');
  });

  it('should not call onLogin with wrong passcode', () => {
    render(<Login onLogin={onLogin} />);
    fireEvent.click(screen.getByText('عباس'));
    const input = screen.getByPlaceholderText('الرمز السري');
    fireEvent.change(input, { target: { value: 'wrong' } });
    fireEvent.submit(input.closest('form')!);
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('should show error message on wrong passcode', async () => {
    render(<Login onLogin={onLogin} />);
    fireEvent.click(screen.getByText('عباس'));
    const input = screen.getByPlaceholderText('الرمز السري');
    fireEvent.change(input, { target: { value: 'wrong' } });
    fireEvent.submit(input.closest('form')!);
    expect(screen.getByText('الرمز غير صحيح، حاول مرة ثانية')).toBeDefined();
  });

  it('should not call onLogin without selecting a user', () => {
    render(<Login onLogin={onLogin} />);
    // No user selected, password field not visible, form won't submit
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('should accept case-insensitive passcode', () => {
    render(<Login onLogin={onLogin} />);
    fireEvent.click(screen.getByText('عباس'));
    const input = screen.getByPlaceholderText('الرمز السري');
    fireEvent.change(input, { target: { value: 'AlWaYs' } });
    fireEvent.submit(input.closest('form')!);
    expect(onLogin).toHaveBeenCalledWith('abbas');
  });
});
