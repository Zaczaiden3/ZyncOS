import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import VoiceInput from './VoiceInput';

// Mock Web Speech API
const mockStart = vi.fn();
const mockStop = vi.fn();
const mockAbort = vi.fn();

class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = 'en-US';
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onresult: ((event: any) => void) | null = null;

  start() {
    mockStart();
    if (this.onstart) this.onstart();
  }
  stop() {
    mockStop();
    if (this.onend) this.onend();
  }
  abort() {
    mockAbort();
    if (this.onend) this.onend();
  }
}

// Mock Web Audio API
class MockAudioContext {
  createAnalyser() {
    return {
      fftSize: 2048,
      frequencyBinCount: 1024,
      getByteFrequencyData: vi.fn(),
      disconnect: vi.fn(),
      connect: vi.fn(),
    };
  }
  createMediaStreamSource() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
  close() {
    return Promise.resolve();
  }
}

// Mock getUserMedia
const mockGetUserMedia = vi.fn().mockResolvedValue({
  getTracks: () => [{ stop: vi.fn() }],
});

describe('VoiceInput Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup global mocks
    window.SpeechRecognition = MockSpeechRecognition as any;
    window.webkitSpeechRecognition = MockSpeechRecognition as any;
    window.AudioContext = MockAudioContext as any;
    (window as any).webkitAudioContext = MockAudioContext;
    
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: mockGetUserMedia,
      },
      writable: true,
    });

    // Mock Canvas API
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Array(100).fill(0) })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => []),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      transform: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
    })) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the microphone button in resting state', () => {
    render(<VoiceInput onTranscript={() => {}} onStateChange={() => {}} />);
    const button = screen.getByTitle('Voice Command Input');
    expect(button).toBeInTheDocument();
    // Check for Mic icon (lucide-react renders svgs, we can check for the button content)
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('starts listening when clicked', async () => {
    const handleStateChange = vi.fn();
    render(<VoiceInput onTranscript={() => {}} onStateChange={handleStateChange} />);
    
    const button = screen.getByTitle('Voice Command Input');
    fireEvent.click(button);

    expect(mockStart).toHaveBeenCalled();
    expect(handleStateChange).toHaveBeenCalledWith(true);
    
    // Should show the active listening HUD
    expect(screen.getByText(/Listening.../i)).toBeInTheDocument();
  });

  it('stops listening when the stop button is clicked', async () => {
    const handleStateChange = vi.fn();
    render(<VoiceInput onTranscript={() => {}} onStateChange={handleStateChange} />);
    
    // Start listening
    const startButton = screen.getByTitle('Voice Command Input');
    fireEvent.click(startButton);
    
    // Find stop button (Check icon)
    const stopButton = screen.getByTitle('Stop & Send');
    fireEvent.click(stopButton);

    expect(mockStop).toHaveBeenCalled();
    // State change to false might happen async in the real component due to onend callback, 
    // but our mock calls it synchronously in stop()
    expect(handleStateChange).toHaveBeenCalledWith(false);
  });

  it('aborts listening when the cancel button is clicked', async () => {
    render(<VoiceInput onTranscript={() => {}} onStateChange={() => {}} />);
    
    // Start listening
    fireEvent.click(screen.getByTitle('Voice Command Input'));
    
    // Find cancel button (X icon)
    const cancelButton = screen.getByTitle('Cancel');
    fireEvent.click(cancelButton);

    expect(mockAbort).toHaveBeenCalled();
  });

  it('displays error state when API is unsupported', () => {
    // Remove API mocks for this test
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;

    render(<VoiceInput onTranscript={() => {}} onStateChange={() => {}} />);
    
    const button = screen.getByTitle('API_UNSUPPORTED');
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });
});
