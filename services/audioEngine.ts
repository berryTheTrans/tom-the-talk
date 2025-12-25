// Service for non-AI audio tasks (Mimic mode, SFX)
export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  
  constructor() {
    // Lazy init to comply with autoplay policies
  }

  private initContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    }
  }

  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  getVolume(): number {
    if (!this.analyser || !this.dataArray) return 0;
    this.analyser.getByteFrequencyData(this.dataArray);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    // Normalize somewhat
    return Math.min(1, (sum / this.dataArray.length) / 100);
  }

  async playSoundEffect(type: 'giggle' | 'grunt' | 'squeak') {
    this.initContext();
    if (!this.audioContext) return;
    
    // Resume context if needed (browsers might suspend it)
    if (this.audioContext.state === 'suspended') await this.audioContext.resume();

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    const now = this.audioContext.currentTime;

    if (type === 'giggle') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.2);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'grunt') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'squeak') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.1);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  }

  async startRecording(): Promise<MediaStream> {
    this.initContext();
    if (this.audioContext?.state === 'suspended') await this.audioContext.resume();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Connect stream to analyser for visuals during recording
    if (this.audioContext && this.analyser) {
        // Create a separate source for analysis so we don't interfere with the recorder stream logic excessively
        const source = this.audioContext.createMediaStreamSource(stream);
        source.connect(this.analyser);
    }

    this.mediaRecorder = new MediaRecorder(stream);
    this.audioChunks = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start();
    return stream;
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(new Blob([], { type: 'audio/webm' })); 
        return;
      }

      this.mediaRecorder.onstop = () => {
        // Fix: Use the recorder's actual mime type instead of forcing audio/wav.
        // Browsers usually record to audio/webm or audio/mp4 by default.
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        
        resolve(audioBlob);
        
        // Stop all tracks to release microphone
        this.mediaRecorder?.stream.getTracks().forEach(track => track.stop());
      };
      
      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
    });
  }

  async playWithPitchShift(audioBlob: Blob, pitchFactor: number = 1.4): Promise<void> {
    this.initContext();
    if (!this.audioContext || !this.analyser) return;

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      // Fix: decodeAudioData requires valid audio data. If the blob is empty or invalid, this throws.
      if (arrayBuffer.byteLength === 0) {
        console.warn("Audio buffer empty, skipping playback");
        return;
      }
      
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      // Pitch shift effect: Play faster (chipmunk)
      source.playbackRate.value = pitchFactor;
      
      // Connect to analyser for visuals, then to destination
      source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      return new Promise((resolve) => {
        source.onended = () => resolve();
        source.start();
      });
    } catch (error) {
      console.error("Error decoding or playing audio:", error);
      // Fail gracefully so the app doesn't crash
      return Promise.resolve();
    }
  }
}

export const audioEngine = new AudioEngine();