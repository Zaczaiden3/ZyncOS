import { useState, useEffect, useCallback } from 'react';

interface VoiceOptions {
  voice?: SpeechSynthesisVoice;
  pitch?: number;
  rate?: number;
  volume?: number;
}

export const useTextToSpeech = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      setIsSupported(true);
      
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
      };

      loadVoices();
      
      // Chrome loads voices asynchronously
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  const speak = useCallback((text: string, options: VoiceOptions = {}) => {
    if (!isSupported) return;

    // Cancel any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Select a "cybernetic" or "robotic" voice if available (usually Google US English or Microsoft Zira/David)
    // Otherwise fallback to the first available English voice
    const preferredVoice = voices.find(v => 
        v.name.includes('Google US English') || 
        v.name.includes('Microsoft Zira') || 
        v.name.includes('Samantha')
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

    utterance.voice = options.voice || preferredVoice;
    utterance.pitch = options.pitch || 1.0; // Slightly lower for more "serious" AI tone?
    utterance.rate = options.rate || 1.0;   // Slightly faster?
    utterance.volume = options.volume || 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
        console.error("TTS Error:", e);
        setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }, [isSupported, voices]);

  const cancel = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  return {
    speak,
    cancel,
    isSpeaking,
    isSupported,
    voices
  };
};
