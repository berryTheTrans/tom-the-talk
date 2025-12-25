import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { PetEmotion } from '../types';

interface LiveSessionCallbacks {
  onAudioData: (buffer: AudioBuffer) => void;
  onEmotionChange: (emotion: PetEmotion) => void;
  onTurnComplete: () => void;
  onClose: () => void;
}

export class GeminiLiveSession {
  private client: GoogleGenAI;
  private session: any = null; // Session type isn't fully exported yet in types provided
  private audioContext: AudioContext;
  private inputScriptProcessor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private active: boolean = false;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.API_KEY });
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }

  async connect(callbacks: LiveSessionCallbacks) {
    if (this.active) return;
    this.active = true;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Initialize input audio context (16kHz for Gemini input preference)
    const inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    
    this.session = await this.client.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }, // A fun, higher pitched voice
        },
        systemInstruction: `You are a funny, energetic, and slightly mischievous pet alien named "Zog". 
        You love to chat, tell jokes, and make funny noises. 
        Keep your responses short, punchy, and sound like a cartoon character. 
        Do not be an assistant. Be a companion.`,
      },
      callbacks: {
        onopen: () => {
          console.log("Gemini Live Connected");
          this.startInputStream(inputContext, stream);
          callbacks.onEmotionChange(PetEmotion.LISTENING);
        },
        onmessage: async (message: LiveServerMessage) => {
          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          
          if (base64Audio) {
             callbacks.onEmotionChange(PetEmotion.TALKING);
             const audioBuffer = await this.decodeAudioData(base64Audio);
             callbacks.onAudioData(audioBuffer);
          }

          if (message.serverContent?.turnComplete) {
            callbacks.onTurnComplete();
            callbacks.onEmotionChange(PetEmotion.IDLE);
          }
        },
        onclose: () => {
          console.log("Gemini Live Closed");
          this.active = false;
          callbacks.onClose();
        },
        onerror: (err) => {
          console.error("Gemini Live Error", err);
          this.active = false;
          callbacks.onClose();
        }
      }
    });
  }

  private startInputStream(context: AudioContext, stream: MediaStream) {
    this.source = context.createMediaStreamSource(stream);
    this.inputScriptProcessor = context.createScriptProcessor(4096, 1, 1);
    
    this.inputScriptProcessor.onaudioprocess = (e) => {
      if (!this.active) return;
      
      const inputData = e.inputBuffer.getChannelData(0);
      const b64Data = this.pcmFloat32ToBase64(inputData);
      
      this.session.sendRealtimeInput({
        media: {
          mimeType: 'audio/pcm;rate=16000',
          data: b64Data
        }
      });
    };

    this.source.connect(this.inputScriptProcessor);
    this.inputScriptProcessor.connect(context.destination);
  }

  async disconnect() {
    this.active = false;
    if (this.source) this.source.disconnect();
    if (this.inputScriptProcessor) this.inputScriptProcessor.disconnect();
    // No explicit close method on session object in the snippet, relying on garbage collection/stream end
    // But ideally we send a close frame or just stop sending data.
    // Re-creating the client on next connect is safer for ensuring clean state.
  }

  // --- Helpers ---

  private async decodeAudioData(base64: string): Promise<AudioBuffer> {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Raw PCM 24kHz Mono 16-bit little-endian coming from Gemini usually.
    // Ensure byte length is even for Int16Array to avoid RangeError
    const alignedBuffer = bytes.buffer.slice(0, bytes.length - (bytes.length % 2));
    const dataInt16 = new Int16Array(alignedBuffer);
    
    const float32Data = new Float32Array(dataInt16.length);
    for(let i=0; i<dataInt16.length; i++) {
      float32Data[i] = dataInt16[i] / 32768.0;
    }

    const buffer = this.audioContext.createBuffer(1, float32Data.length, 24000);
    buffer.copyToChannel(float32Data, 0);
    return buffer;
  }

  private pcmFloat32ToBase64(data: Float32Array): string {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = Math.max(-1, Math.min(1, data[i])) * 32768;
    }
    const bytes = new Uint8Array(int16.buffer);
    let binary = '';
    for(let i=0; i<bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}