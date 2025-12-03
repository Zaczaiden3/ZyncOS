/**
 * Audio Processing Utilities for Gemini Live API
 * Handles recording (downsampling to 16kHz) and playback (PCM streaming).
 */

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private onDataAvailable: (base64Data: string) => void;

  constructor(onDataAvailable: (base64Data: string) => void) {
    this.onDataAvailable = onDataAvailable;
  }

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000, // Try to request 16kHz directly
        },
      });

      this.audioContext = new AudioContext({ sampleRate: 16000 });
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      
      // Use ScriptProcessor for broad compatibility and simplicity in this context
      // Buffer size 2048 gives ~128ms latency at 16kHz, which is acceptable
      this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);

      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32 to Int16 PCM
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          // Clamp and scale
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Convert to Base64
        const base64 = this.arrayBufferToBase64(pcmData.buffer);
        this.onDataAvailable(base64);
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination); // Necessary for script processor to run

    } catch (error) {
      console.error("Failed to start audio recording:", error);
      throw error;
    }
  }

  stop() {
    if (this.processor && this.source) {
      this.source.disconnect(this.processor);
      this.processor.disconnect();
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    this.stream = null;
    this.source = null;
    this.processor = null;
    this.audioContext = null;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

export class AudioStreamPlayer {
  private audioContext: AudioContext;
  private nextStartTime: number = 0;
  private isPlaying: boolean = false;
  private queue: AudioBuffer[] = [];
  private scheduledSources: AudioBufferSourceNode[] = [];

  constructor(sampleRate: number = 24000) {
    this.audioContext = new AudioContext({ sampleRate });
  }

  async addChunk(base64Data: string, sampleRate: number = 24000) {
    // 1. Decode Base64
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // 2. Convert Int16 PCM to Float32
    const dataInt16 = new Int16Array(bytes.buffer);
    const float32Data = new Float32Array(dataInt16.length);
    for (let i = 0; i < dataInt16.length; i++) {
      float32Data[i] = dataInt16[i] / 32768.0;
    }

    // 3. Create AudioBuffer
    const buffer = this.audioContext.createBuffer(1, float32Data.length, sampleRate);
    buffer.copyToChannel(float32Data, 0);

    this.queueAudio(buffer);
  }

  private queueAudio(buffer: AudioBuffer) {
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    // Schedule playback
    const currentTime = this.audioContext.currentTime;
    // If next start time is in the past, reset it to now (plus a tiny buffer)
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime + 0.05;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
    
    this.scheduledSources.push(source);
    
    // Cleanup finished sources
    source.onended = () => {
      const index = this.scheduledSources.indexOf(source);
      if (index > -1) {
        this.scheduledSources.splice(index, 1);
      }
    };
  }

  stop() {
    // Stop all scheduled sources
    this.scheduledSources.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
    });
    this.scheduledSources = [];
    this.nextStartTime = 0;
  }

  async close() {
    this.stop();
    await this.audioContext.close();
  }
}
