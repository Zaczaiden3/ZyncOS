import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface VoiceSettings {
  voiceURI: string | null;
  rate: number;
  pitch: number;
  volume: number;
}

interface SpeechContextType {
  isMuted: boolean;
  toggleMute: () => void;
  cancelAll: () => void;
  voices: SpeechSynthesisVoice[];
  settings: VoiceSettings;
  updateSettings: (settings: Partial<VoiceSettings>) => void;
}

const SpeechContext = createContext<SpeechContextType | undefined>(undefined);

export const SpeechProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('ZYNC_MUTE_STATE') === 'true';
  });

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [settings, setSettings] = useState<VoiceSettings>(() => {
    const saved = localStorage.getItem('ZYNC_VOICE_SETTINGS');
    return saved ? JSON.parse(saved) : { voiceURI: null, rate: 1, pitch: 1, volume: 1 };
  });

  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('ZYNC_MUTE_STATE', String(isMuted));
    if (isMuted) {
      window.speechSynthesis.cancel();
    }
  }, [isMuted]);

  useEffect(() => {
    localStorage.setItem('ZYNC_VOICE_SETTINGS', JSON.stringify(settings));
  }, [settings]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const cancelAll = useCallback(() => {
    window.speechSynthesis.cancel();
  }, []);

  const updateSettings = useCallback((newSettings: Partial<VoiceSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  return (
    <SpeechContext.Provider value={{ isMuted, toggleMute, cancelAll, voices, settings, updateSettings }}>
      {children}
    </SpeechContext.Provider>
  );
};

export const useSpeechContext = () => {
  const context = useContext(SpeechContext);
  if (context === undefined) {
    throw new Error('useSpeechContext must be used within a SpeechProvider');
  }
  return context;
};
