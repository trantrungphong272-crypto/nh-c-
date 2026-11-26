import type { DemoTrack } from '../types/visualizer';

// Pentatonic minor & ambient chord progressions (Hz multipliers)
const CHORD_PROGRESSION = [
  [1, 1.5, 2, 2.378, 3], // m7 feel
  [0.891, 1.335, 1.782, 2.245, 2.67], // bVII
  [0.794, 1.189, 1.587, 1.984, 2.378], // bVI
  [0.841, 1.26, 1.682, 2.119, 2.52], // v/bVI
];

export class WebAudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private freqBytes: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(256));

  // Local file playback
  private audioEl: HTMLAudioElement | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;

  // Microphone playback
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;

  // Demo synth timer
  private synthInterval: number | null = null;
  private synthStep = 0;
  private synthStartTimeMs = 0;
  private synthElapsedOffsetMs = 0;
  private synthPlaying = false;
  private activeDemo: DemoTrack | null = null;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.72;
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.75;
      this.analyser.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.freqBytes = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public setVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
    if (this.audioEl) {
      this.audioEl.volume = Math.max(0, Math.min(1, volume));
    }
  }

  public startDemo(track: DemoTrack, fromMs = 0): void {
    this.stopFile();
    this.stopMicrophone();
    this.stopDemoLoop();

    const ctx = this.ensureContext();
    if (this.masterGain && this.masterGain.gain.value === 0) {
      this.masterGain.gain.value = 0.75;
    }

    this.activeDemo = track;
    this.synthPlaying = true;
    this.synthElapsedOffsetMs = fromMs % (track.durationSec * 1000);
    this.synthStartTimeMs = performance.now();
    this.synthStep = Math.floor(fromMs / ((60 / track.bpm / 2) * 1000));

    const stepMs = (60 / track.bpm / 2) * 1000; // 8th note steps
    this.triggerSynthStep(ctx, track, this.synthStep);

    this.synthInterval = window.setInterval(() => {
      if (!this.synthPlaying || !this.activeDemo) return;
      this.synthStep++;
      this.triggerSynthStep(ctx, this.activeDemo, this.synthStep);
    }, stepMs);
  }

  public pauseDemo(): void {
    if (this.synthPlaying && this.activeDemo) {
      this.synthElapsedOffsetMs = this.getDemoTimeMs();
    }
    this.stopDemoLoop();
    this.synthPlaying = false;
  }

  public seekDemo(ms: number): void {
    if (!this.activeDemo) return;
    const clamped = Math.max(0, ms % (this.activeDemo.durationSec * 1000));
    this.synthElapsedOffsetMs = clamped;
    this.synthStartTimeMs = performance.now();
  }

  public getDemoTimeMs(): number {
    if (!this.activeDemo) return 0;
    const durMs = this.activeDemo.durationSec * 1000;
    if (!this.synthPlaying) return this.synthElapsedOffsetMs % durMs;
    const elapsed = this.synthElapsedOffsetMs + (performance.now() - this.synthStartTimeMs);
    return elapsed % durMs;
  }

  private stopDemoLoop(): void {
    if (this.synthInterval !== null) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
  }

  private triggerSynthStep(ctx: AudioContext, track: DemoTrack, step: number): void {
    if (!this.analyser) return;
    const now = ctx.currentTime;
    const beatInBar = step % 8;

    // Kick drum on 0 and 4 (and subtle syncopated on 6)
    if (beatInBar === 0 || beatInBar === 4 || (track.bpm > 105 && beatInBar === 6)) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(125, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.16);
      const peak = beatInBar === 6 ? 0.35 : 0.72;
      gain.gain.setValueAtTime(peak, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(this.analyser);
      osc.start(now);
      osc.stop(now + 0.3);
    }

    // Pad / Chord on step % 16 === 0
    if (step % 16 === 0) {
      const chordIdx = Math.floor(step / 16) % CHORD_PROGRESSION.length;
      const chord = CHORD_PROGRESSION[chordIdx];
      chord.slice(0, 3).forEach((mult) => {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(track.rootHz * mult, now);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, now);
        filter.frequency.exponentialRampToValueAtTime(420, now + 2.8);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.07, now + 0.35);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 3.2);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.analyser!);
        osc.start(now);
        osc.stop(now + 3.25);
      });
    }

    // Melodic arpeggio shimmer
    const chordIdx = Math.floor(step / 16) % CHORD_PROGRESSION.length;
    const arpMult = CHORD_PROGRESSION[chordIdx][step % CHORD_PROGRESSION[chordIdx].length];
    const arpOsc = ctx.createOscillator();
    const arpGain = ctx.createGain();
    arpOsc.type = 'triangle';
    arpOsc.frequency.setValueAtTime(track.rootHz * 2 * arpMult, now);
    arpGain.gain.setValueAtTime(0.11, now);
    arpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    arpOsc.connect(arpGain);
    arpGain.connect(this.analyser);
    arpOsc.start(now);
    arpOsc.stop(now + 0.25);

    // Crisp hi-hat noise burst on off-beats for treble bars
    if (beatInBar % 2 === 1) {
      const bufferSize = Math.floor(ctx.sampleRate * 0.04);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 5500;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.14, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      noise.connect(hp);
      hp.connect(ng);
      ng.connect(this.analyser);
      noise.start(now);
    }
  }

  public loadAudioFile(
    file: File,
    onTimeUpdate?: (currentMs: number, durationMs: number) => void,
    onEnded?: () => void,
  ): string {
    this.pauseDemo();
    this.stopMicrophone();
    this.stopFile();

    const ctx = this.ensureContext();
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.crossOrigin = 'anonymous';
    audio.loop = false;

    this.mediaSource = ctx.createMediaElementSource(audio);
    this.mediaSource.connect(this.analyser!);

    audio.addEventListener('timeupdate', () => {
      onTimeUpdate?.(audio.currentTime * 1000, (audio.duration || 0) * 1000);
    });
    audio.addEventListener('ended', () => {
      onEnded?.();
    });

    this.audioEl = audio;
    void audio.play();
    return url;
  }

  public toggleFilePlayback(play: boolean): void {
    if (!this.audioEl) return;
    if (play) {
      this.ensureContext();
      void this.audioEl.play();
    } else {
      this.audioEl.pause();
    }
  }

  public seekFile(ms: number): void {
    if (!this.audioEl) return;
    this.audioEl.currentTime = Math.max(0, ms / 1000);
  }

  public getFileTimeMs(): { currentMs: number; durationMs: number } {
    if (!this.audioEl) return { currentMs: 0, durationMs: 0 };
    return {
      currentMs: this.audioEl.currentTime * 1000,
      durationMs: (this.audioEl.duration || 0) * 1000,
    };
  }

  public stopFile(): void {
    if (this.mediaSource) {
      this.mediaSource.disconnect();
      this.mediaSource = null;
    }
    if (this.audioEl) {
      this.audioEl.pause();
      URL.revokeObjectURL(this.audioEl.src);
      this.audioEl.src = '';
      this.audioEl = null;
    }
  }

  public async startMicrophone(): Promise<void> {
    this.pauseDemo();
    this.stopFile();
    this.stopMicrophone();

    const ctx = this.ensureContext();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.micStream = stream;
    this.micSource = ctx.createMediaStreamSource(stream);
    // Connect mic ONLY to analyser (not masterGain/speakers) to avoid feedback!
    if (this.analyser) {
      this.micSource.connect(this.analyser);
      this.analyser.disconnect();
      if (this.masterGain) {
        // Keep demo/file muted when mic active
        this.masterGain.gain.value = 0;
      }
    }
  }

  public stopMicrophone(): void {
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.analyser && this.masterGain) {
      try {
        this.analyser.connect(this.masterGain);
        this.masterGain.gain.value = 0.75;
      } catch {
        // Already connected
      }
    }
  }

  public readFrequencyData(outNormalized: Float32Array): boolean {
    if (!this.analyser) return false;
    this.analyser.getByteFrequencyData(this.freqBytes);
    const len = Math.min(outNormalized.length, this.freqBytes.length);
    let hasSignal = false;
    for (let i = 0; i < len; i++) {
      const val = this.freqBytes[i] / 255;
      outNormalized[i] = val;
      if (val > 0.01) hasSignal = true;
    }
    return hasSignal;
  }

  public dispose(): void {
    this.stopDemoLoop();
    this.stopFile();
    this.stopMicrophone();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
