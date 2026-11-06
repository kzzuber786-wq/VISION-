import { LiveVoiceStatus } from '../types/vision';

// Fallback Speech Recognition
export interface SpeechRecognitionResultCallback {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

export class VoiceRecognitionManager {
  private recognition: any = null;
  private isListening = false;

  constructor() {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      this.recognition = new SpeechRec();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
    }
  }

  public get isSupported(): boolean {
    return !!this.recognition;
  }

  public start(callbacks: SpeechRecognitionResultCallback) {
    if (!this.recognition) {
      callbacks.onError?.('Speech recognition is not supported in this browser environment.');
      return;
    }

    if (this.isListening) {
      this.stop();
    }

    this.recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const text = final || interim;
      if (text) {
        callbacks.onTranscript(text, !!final);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.warn('Speech recognition warning:', event.error);
      callbacks.onError?.(event.error);
      this.isListening = false;
    };

    this.recognition.onend = () => {
      this.isListening = false;
      callbacks.onEnd?.();
    };

    try {
      this.recognition.start();
      this.isListening = true;
    } catch (err: any) {
      callbacks.onError?.(err.message || 'Failed to start microphone');
    }
  }

  public stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
      this.isListening = false;
    }
  }
}

/**
 * WAV / Audio playback controller for Gemini TTS
 */
export class AudioPlaybackManager {
  private currentAudio: HTMLAudioElement | null = null;
  private isMuted = false;
  private speechRate = 1.0;

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.currentAudio && muted) {
      this.currentAudio.pause();
    }
  }

  public setRate(rate: number) {
    this.speechRate = rate;
    if (this.currentAudio) {
      this.currentAudio.playbackRate = rate;
    }
  }

  public stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public async playWavBase64(base64Wav: string): Promise<void> {
    if (this.isMuted) return;

    this.stop();

    return new Promise((resolve, reject) => {
      try {
        const audio = new Audio(`data:audio/wav;base64,${base64Wav}`);
        audio.playbackRate = this.speechRate;
        this.currentAudio = audio;

        audio.onended = () => {
          this.currentAudio = null;
          resolve();
        };

        audio.onerror = (err) => {
          this.currentAudio = null;
          reject(err);
        };

        audio.play().catch(reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Browser SpeechSynthesis fallback if offline or TTS error
   */
  public speakFallback(text: string): Promise<void> {
    if (this.isMuted || !('speechSynthesis' in window)) return Promise.resolve();

    this.stop();

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = this.speechRate;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }
}

/**
 * Real-time Live API Client (gemini-3.8-live over WebSocket)
 */
export class LiveVoiceClient {
  private ws: WebSocket | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private nextPlayTime = 0;
  private onStatusChange: (status: LiveVoiceStatus) => void;

  constructor(onStatusChange: (status: LiveVoiceStatus) => void) {
    this.onStatusChange = onStatusChange;
  }

  public async connect(): Promise<void> {
    this.onStatusChange('connecting');

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/live`;
      this.ws = new WebSocket(wsUrl);

      // Setup 24kHz output context for Gemini model audio
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.outputAudioCtx = new AudioCtx({ sampleRate: 24000 });

      this.ws.onopen = async () => {
        try {
          await this.startMicStreaming();
          this.onStatusChange('connected');
        } catch (micErr) {
          console.error('Mic access error:', micErr);
          this.onStatusChange('error');
          this.disconnect();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'ready') {
            this.onStatusChange('listening');
          } else if (msg.type === 'audio' && msg.data) {
            this.onStatusChange('speaking');
            this.playPcm24Chunk(msg.data);
          } else if (msg.type === 'interrupted') {
            this.clearAudioBuffer();
            this.onStatusChange('listening');
          } else if (msg.type === 'error') {
            console.warn('Live API warning:', msg.message);
            this.onStatusChange('error');
          }
        } catch (e) {
          console.error('Live WS parsing error:', e);
        }
      };

      this.ws.onerror = (e) => {
        console.error('Live WS error:', e);
        this.onStatusChange('error');
      };

      this.ws.onclose = () => {
        this.onStatusChange('disconnected');
        this.cleanup();
      };
    } catch (err) {
      console.error('Live connect error:', err);
      this.onStatusChange('error');
    }
  }

  private async startMicStreaming() {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
      },
    });

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.inputAudioCtx = new AudioCtx({ sampleRate: 16000 });
    const source = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);

    // 4096 buffer size at 16kHz (~250ms chunks)
    this.processor = this.inputAudioCtx.createScriptProcessor(4096, 1, 1);
    source.connect(this.processor);
    this.processor.connect(this.inputAudioCtx.destination);

    this.processor.onaudioprocess = (e) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const floatData = e.inputBuffer.getChannelData(0);
        const pcm16Base64 = float32ToPcm16Base64(floatData);
        this.ws.send(
          JSON.stringify({
            type: 'audio',
            data: pcm16Base64,
          })
        );
      }
    };
  }

  public sendVideoFrame(base64Jpeg: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      let clean = base64Jpeg;
      const match = base64Jpeg.match(/^data:([^;]+);base64,(.+)$/);
      if (match) clean = match[2];

      this.ws.send(
        JSON.stringify({
          type: 'video',
          data: clean,
        })
      );
    }
  }

  private playPcm24Chunk(base64Pcm: string) {
    if (!this.outputAudioCtx) return;

    const raw = atob(base64Pcm);
    const int16 = new Int16Array(raw.length / 2);
    for (let i = 0; i < int16.length; i++) {
      const byte1 = raw.charCodeAt(i * 2);
      const byte2 = raw.charCodeAt(i * 2 + 1);
      int16[i] = (byte2 << 8) | byte1;
    }

    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    const buffer = this.outputAudioCtx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    const source = this.outputAudioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.outputAudioCtx.destination);

    const currentTime = this.outputAudioCtx.currentTime;
    if (this.nextPlayTime < currentTime) {
      this.nextPlayTime = currentTime;
    }

    source.start(this.nextPlayTime);
    this.nextPlayTime += buffer.duration;
  }

  private clearAudioBuffer() {
    if (this.outputAudioCtx) {
      this.nextPlayTime = this.outputAudioCtx.currentTime;
    }
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.cleanup();
    this.onStatusChange('disconnected');
  }

  private cleanup() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.inputAudioCtx) {
      this.inputAudioCtx.close().catch(() => {});
      this.inputAudioCtx = null;
    }
    if (this.outputAudioCtx) {
      this.outputAudioCtx.close().catch(() => {});
      this.outputAudioCtx = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
  }
}

function float32ToPcm16Base64(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
