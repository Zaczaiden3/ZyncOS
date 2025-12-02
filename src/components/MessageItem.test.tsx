import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MessageItem from './MessageItem';
import { AIRole, Message } from '../types';
import React from 'react';

// Mock TTSPlayer to avoid issues with audio APIs
vi.mock('./TTSPlayer', () => ({
  default: () => <div data-testid="tts-player">TTS Player</div>
}));

describe('MessageItem', () => {
  it('renders user message correctly', () => {
    const message: Message = {
      id: '1',
      role: AIRole.USER,
      text: 'Hello World',
      timestamp: Date.now(),
    };

    render(<MessageItem message={message} />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
    expect(screen.getByText('USER_CMD')).toBeInTheDocument();
  });

  it('renders reflex message correctly', () => {
    const message: Message = {
      id: '2',
      role: AIRole.REFLEX,
      text: 'Reflex Response',
      timestamp: Date.now(),
      metrics: { latency: 10, tokens: 5, confidence: 90 }
    };

    render(<MessageItem message={message} />);
    expect(screen.getByText('Reflex Response')).toBeInTheDocument();
    expect(screen.getByText('REFLEX CORE')).toBeInTheDocument();
    expect(screen.getByText('10ms')).toBeInTheDocument();
  });

  it('renders attachment correctly', () => {
    const message: Message = {
      id: '3',
      role: AIRole.USER,
      text: '',
      timestamp: Date.now(),
      attachment: 'base64data',
      attachmentType: 'image'
    };

    render(<MessageItem message={message} />);
    expect(screen.getByText('IMG_DATA')).toBeInTheDocument();
    expect(screen.getByAltText('User attachment')).toBeInTheDocument();
  });
});
