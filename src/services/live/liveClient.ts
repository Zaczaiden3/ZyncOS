import { AudioRecorder, AudioStreamPlayer } from './audioStreamer';
import { getSettings } from '../settings';

// Types for Gemini Live API Protocol
interface SetupMessage {
  setup: {
    model: string;
    generationConfig?: {
      responseModalities?: string[];
      speechConfig?: {
        voiceConfig?: {
          prebuiltVoiceConfig?: {
            voiceName: string;
          };
        };
      };
    };
  };
}

interface RealtimeInputMessage {
  realtimeInput: {
    mediaChunks: {
      mimeType: string;
      data: string;
    }[];
  };
}

interface ClientContentMessage {
  clientContent: {
    turns: {
      role: string;
      parts: { text: string }[];
    }[];
    turnComplete: boolean;
  };
}

type ClientMessage = SetupMessage | RealtimeInputMessage | ClientContentMessage;

export class LiveClient {
  private ws: WebSocket | null = null;
  private audioRecorder: AudioRecorder | null = null;
  private audioPlayer: AudioStreamPlayer | null = null;
  private url: string;
  
  public onConnect?: () => void;
  public onDisconnect?: () => void;
  public onError?: (error: any) => void;
  public onAudioData?: (isPlaying: boolean) => void;

  constructor() {
    const settings = getSettings();
    const apiKey = settings.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY;
    const host = "generativelanguage.googleapis.com";
    this.url = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    
    this.audioPlayer = new AudioStreamPlayer();
    this.audioRecorder = new AudioRecorder(this.handleRecordedAudio.bind(this));
  }

  async connect() {
    if (this.ws) {
      this.disconnect();
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log("Gemini Live WebSocket Connected");
        this.sendSetup();
        this.onConnect?.();
        // Start recording immediately upon connection for "Live" feel
        this.audioRecorder?.start();
      };

      this.ws.onmessage = async (event) => {
        await this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket Error:", error);
        this.onError?.(error);
      };

      this.ws.onclose = () => {
        console.log("Gemini Live WebSocket Closed");
        this.disconnect();
      };

    } catch (e) {
      console.error("Connection failed:", e);
      this.onError?.(e);
    }
  }

  disconnect() {
    this.audioRecorder?.stop();
    this.audioPlayer?.stop();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.onDisconnect?.();
  }

  private sendSetup() {
    const msg: SetupMessage = {
      setup: {
        model: "models/gemini-2.0-flash-exp",
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Puck" // or "Kore", "Fenrir"
              }
            }
          }
        }
      }
    };
    this.send(msg);
  }

  private handleRecordedAudio(base64Data: string) {
    const msg: RealtimeInputMessage = {
      realtimeInput: {
        mediaChunks: [{
          mimeType: "audio/pcm",
          data: base64Data
        }]
      }
    };
    this.send(msg);
  }

  private async handleMessage(data: any) {
    let message;
    if (data instanceof Blob) {
      const text = await data.text();
      message = JSON.parse(text);
    } else {
      message = JSON.parse(data);
    }

    // Handle Server Content
    if (message.serverContent) {
      const content = message.serverContent;

      // 1. Audio Turn
      if (content.modelTurn) {
        const parts = content.modelTurn.parts;
        for (const part of parts) {
          if (part.inlineData && part.inlineData.mimeType.startsWith("audio")) {
            // Received Audio
            const base64 = part.inlineData.data;
            this.audioPlayer?.addChunk(base64);
            this.onAudioData?.(true);
          }
        }
      }

      // 2. Turn Complete
      if (content.turnComplete) {
        // console.log("Turn Complete");
      }

      // 3. Interruption (Server indicates it was interrupted)
      if (content.interrupted) {
        console.log("Server Interrupted");
        this.audioPlayer?.stop();
      }
    }
  }

  private send(data: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}

export const liveClient = new LiveClient();
