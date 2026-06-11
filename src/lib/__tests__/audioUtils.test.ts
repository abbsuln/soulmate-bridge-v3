import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HeartbeatSound, PenSound } from '../audioUtils';

// Mock AudioContext
function createMockAudioContext() {
  const mockOscillator = {
    type: '',
    frequency: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };

  const mockGain = {
    gain: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  };

  const mockFilter = {
    type: '',
    frequency: { value: 0 },
    Q: { value: 0 },
    connect: vi.fn(),
  };

  const mockBufferSource = {
    buffer: null as AudioBuffer | null,
    connect: vi.fn(),
    start: vi.fn(),
  };

  const mockBuffer = {
    getChannelData: vi.fn().mockReturnValue(new Float32Array(2400)),
  };

  return {
    currentTime: 0,
    sampleRate: 48000,
    destination: {},
    createOscillator: vi.fn().mockReturnValue(mockOscillator),
    createGain: vi.fn().mockReturnValue(mockGain),
    createBiquadFilter: vi.fn().mockReturnValue(mockFilter),
    createBufferSource: vi.fn().mockReturnValue(mockBufferSource),
    createBuffer: vi.fn().mockReturnValue(mockBuffer),
    _mocks: { mockOscillator, mockGain, mockFilter, mockBufferSource, mockBuffer },
  };
}

describe('HeartbeatSound', () => {
  let mockCtx: ReturnType<typeof createMockAudioContext>;

  beforeEach(() => {
    mockCtx = createMockAudioContext();
    const MockAudioContext = function(this: any) { Object.assign(this, mockCtx); } as any;
    (globalThis as any).window = { AudioContext: MockAudioContext, webkitAudioContext: MockAudioContext };
    (globalThis as any).AudioContext = MockAudioContext;
  });

  it('should create an AudioContext on first play', async () => {
    const heartbeat = new HeartbeatSound();
    await heartbeat.play();
    expect(mockCtx.createOscillator).toHaveBeenCalled();
  });

  it('should create two oscillator pulses (lub-dub)', async () => {
    const heartbeat = new HeartbeatSound();
    await heartbeat.play();
    // Two pulses: one at delay 0 and one at delay 0.15
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2);
    expect(mockCtx.createGain).toHaveBeenCalledTimes(2);
  });

  it('should connect oscillator to gain to destination', async () => {
    const heartbeat = new HeartbeatSound();
    await heartbeat.play();
    const { mockOscillator, mockGain } = mockCtx._mocks;
    expect(mockOscillator.connect).toHaveBeenCalledWith(mockGain);
    expect(mockGain.connect).toHaveBeenCalledWith(mockCtx.destination);
  });

  it('should set frequency to 50 Hz (heartbeat bass)', async () => {
    const heartbeat = new HeartbeatSound();
    await heartbeat.play();
    const { mockOscillator } = mockCtx._mocks;
    expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(50, expect.any(Number));
  });

  it('should start and stop oscillators', async () => {
    const heartbeat = new HeartbeatSound();
    await heartbeat.play();
    const { mockOscillator } = mockCtx._mocks;
    expect(mockOscillator.start).toHaveBeenCalled();
    expect(mockOscillator.stop).toHaveBeenCalled();
  });
});

describe('PenSound', () => {
  let mockCtx: ReturnType<typeof createMockAudioContext>;

  beforeEach(() => {
    mockCtx = createMockAudioContext();
    const MockAudioContext = function(this: any) { Object.assign(this, mockCtx); } as any;
    (globalThis as any).window = { AudioContext: MockAudioContext, webkitAudioContext: MockAudioContext };
    (globalThis as any).AudioContext = MockAudioContext;
  });

  it('should create noise buffer on scratch', async () => {
    const pen = new PenSound();
    await pen.scratch();
    expect(mockCtx.createBuffer).toHaveBeenCalled();
    expect(mockCtx.createBufferSource).toHaveBeenCalled();
  });

  it('should create a bandpass filter', async () => {
    const pen = new PenSound();
    await pen.scratch();
    expect(mockCtx.createBiquadFilter).toHaveBeenCalled();
    const { mockFilter } = mockCtx._mocks;
    expect(mockFilter.type).toBe('bandpass');
  });

  it('should connect noise → filter → gain → destination', async () => {
    const pen = new PenSound();
    await pen.scratch();
    const { mockBufferSource, mockFilter, mockGain } = mockCtx._mocks;
    expect(mockBufferSource.connect).toHaveBeenCalledWith(mockFilter);
    expect(mockFilter.connect).toHaveBeenCalledWith(mockGain);
    expect(mockGain.connect).toHaveBeenCalledWith(mockCtx.destination);
  });

  it('should start the buffer source', async () => {
    const pen = new PenSound();
    await pen.scratch();
    const { mockBufferSource } = mockCtx._mocks;
    expect(mockBufferSource.start).toHaveBeenCalled();
  });

  it('should set bandpass frequency between 1000-1500', async () => {
    const pen = new PenSound();
    await pen.scratch();
    const { mockFilter } = mockCtx._mocks;
    expect(mockFilter.frequency.value).toBeGreaterThanOrEqual(1000);
    expect(mockFilter.frequency.value).toBeLessThanOrEqual(1500);
  });
});
