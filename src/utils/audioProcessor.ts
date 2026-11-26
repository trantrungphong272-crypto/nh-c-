export interface AudioBands {
  bass: number; // 0..1+
  mid: number;
  treble: number;
  overall: number;
  beatImpulse: number; // transient kick detector 0..1
}

export class AudioSpectrumProcessor {
  private smoothedBars: Float32Array;
  private peakHistory = 0.08;
  private beatPulse = 0;

  constructor(maxBars = 256) {
    this.smoothedBars = new Float32Array(maxBars);
  }

  public process(
    rawInput: ArrayLike<number>,
    barCount: number,
    options: {
      sensitivity: number;
      bassGain: number;
      trebleGain: number;
      smoothness: number;
    },
    outBars: Float32Array,
  ): AudioBands {
    const inputLen = rawInput.length;
    if (inputLen === 0 || barCount <= 0) {
      this.beatPulse *= 0.85;
      return {
        bass: 0,
        mid: 0,
        treble: 0,
        overall: 0,
        beatImpulse: this.beatPulse,
      };
    }

    const clampedCount = Math.min(barCount, outBars.length, this.smoothedBars.length);
    const smooth = Math.min(0.95, Math.max(0.05, options.smoothness));
    const lerpFactor = 1 - smooth;

    let bassSum = 0;
    let bassBins = 0;
    let midSum = 0;
    let midBins = 0;
    let trebleSum = 0;
    let trebleBins = 0;
    let totalSum = 0;

    // Lively sends 128 samples (64 left + 64 right) or WebAudio sends 128/256 frequency bins
    // Fold stereo halves if Lively-style mirrored 128 array or use progressive logarithmic mapping
    const usableLen = Math.max(1, Math.min(inputLen, 128));

    for (let i = 0; i < clampedCount; i++) {
      // Symmetrical spectrum mapping around the circle or progressive low->high->low
      const half = clampedCount / 2;
      const distFromStart = i <= half ? i / half : (clampedCount - i) / half;
      // Slight logarithmic compression so bass occupies meaningful visual arc while treble remains detailed
      const freqNorm = Math.pow(Math.min(1, Math.max(0, distFromStart)), 1.35);
      const exactIdx = freqNorm * (usableLen - 1);
      const idx0 = Math.floor(exactIdx);
      const idx1 = Math.min(usableLen - 1, idx0 + 1);
      const frac = exactIdx - idx0;

      const s0 = rawInput[idx0] ?? 0;
      const s1 = rawInput[idx1] ?? 0;
      let sample = s0 + (s1 - s0) * frac;

      // Apply frequency-dependent gain: bass boost on low end, treble boost on high end
      const bandGain =
        freqNorm < 0.28
          ? options.bassGain * (1.15 - freqNorm)
          : freqNorm > 0.6
            ? options.trebleGain * (0.95 + (freqNorm - 0.6) * 0.8)
            : (options.bassGain * 0.4 + options.trebleGain * 0.6);

      sample = Math.min(1.5, Math.max(0, sample * options.sensitivity * bandGain));

      // Exponential smoothing without allocations
      const prev = this.smoothedBars[i];
      // Faster attack, smoother decay
      const rate = sample > prev ? Math.min(1, lerpFactor * 1.65) : lerpFactor;
      const next = prev + (sample - prev) * rate;
      this.smoothedBars[i] = next;
      outBars[i] = next;

      totalSum += next;
      if (freqNorm < 0.22) {
        bassSum += next;
        bassBins++;
      } else if (freqNorm < 0.62) {
        midSum += next;
        midBins++;
      } else {
        trebleSum += next;
        trebleBins++;
      }
    }

    const bass = bassBins > 0 ? Math.min(1.4, bassSum / bassBins) : 0;
    const mid = midBins > 0 ? Math.min(1.4, midSum / midBins) : 0;
    const treble = trebleBins > 0 ? Math.min(1.4, trebleSum / trebleBins) : 0;
    const overall = clampedCount > 0 ? Math.min(1.4, totalSum / clampedCount) : 0;

    // Beat / kick transient detection
    this.peakHistory = this.peakHistory * 0.96 + bass * 0.04;
    const threshold = Math.max(0.14, this.peakHistory * 1.24);
    if (bass > threshold) {
      this.beatPulse = Math.min(1, this.beatPulse + (bass - threshold) * 2.1);
    } else {
      this.beatPulse *= 0.86;
    }

    return {
      bass,
      mid,
      treble,
      overall,
      beatImpulse: this.beatPulse,
    };
  }

  public reset(): void {
    this.smoothedBars.fill(0);
    this.beatPulse = 0;
    this.peakHistory = 0.08;
  }
}
