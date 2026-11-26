import { GENERATED_IMAGES, PALETTES } from '../constants/palettes';
import type { VisualizerSettings } from '../types/visualizer';
import { AudioBands, AudioSpectrumProcessor } from '../utils/audioProcessor';
import { hexToRgb, interpolatePaletteRgb, RgbColor, rgbToCss } from '../utils/colorUtils';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  hueShift: number;
  depth: number;
}

interface BokehOrb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  colorIdx: number;
  alpha: number;
}

interface ShockwaveRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  speed: number;
  active: boolean;
}

const MAX_PARTICLES = 140;
const MAX_BOKEH = 26;
const MAX_BARS = 256;
const MAX_SHOCKWAVES = 6;

export class CircularVisualizerRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private processor = new AudioSpectrumProcessor(MAX_BARS);

  // Pre-allocated typed buffers (zero GC pressure in animation loop)
  private barHeights = new Float32Array(MAX_BARS);
  private peakCaps = new Float32Array(MAX_BARS);
  private rawSpectrum = new Float32Array(128);
  private particles: Particle[] = [];
  private bokehOrbs: BokehOrb[] = [];
  private shockwaves: ShockwaveRing[] = [];

  // Background images & offscreen blur cache
  private bgImages: Record<string, HTMLImageElement> = {};
  private customImg: HTMLImageElement | null = null;
  private customImgSrc: string | null = null;
  private cachedBgCanvas: HTMLCanvasElement | null = null;
  private cachedBgKey = '';

  // Cached palette RGB stops
  private cachedRgbStops: RgbColor[] = [];
  private cachedPaletteKey = '';

  // Transition, parallax & animation state
  private rotationAngle = 0;
  private orbitalAngle = 0;
  private colorPhase = 0;
  private auroraPhase = 0;
  private lastBgId = '';
  private bgTransitionAlpha = 1;
  private targetParallaxX = 0;
  private targetParallaxY = 0;
  private parallaxX = 0;
  private parallaxY = 0;

  // Performance & adaptive scaling
  private rafId: number | null = null;
  private lastFrameTime = 0;
  private lastAudioUpdate = 0;
  private avgFrameDelta = 16.6;
  private qualityMultiplier = 1.0;
  private isPaused = false;
  private width = 1440;
  private height = 900;
  private dpr = 1;

  // External audio provider
  private getAudioFrame: (out: Float32Array) => boolean;
  private settings: VisualizerSettings;
  private latestBands: AudioBands = { bass: 0, mid: 0, treble: 0, overall: 0, beatImpulse: 0 };

  constructor(
    canvas: HTMLCanvasElement,
    initialSettings: VisualizerSettings,
    getAudioFrame: (out: Float32Array) => boolean,
  ) {
    this.canvas = canvas;
    const isAutomated = typeof navigator !== 'undefined' && Boolean(navigator.webdriver);
    const ctx = canvas.getContext('2d', isAutomated ? { willReadFrequently: true } : { alpha: false });
    if (!ctx) {
      throw new Error('Không thể khởi tạo Canvas 2D');
    }
    this.ctx = ctx;
    this.settings = initialSettings;
    this.getAudioFrame = getAudioFrame;
    this.lastBgId = initialSettings.background;

    this.initParticlePool();
    this.initBokehPool();
    this.initShockwavePool();
    this.preloadBackgrounds();
    this.resize();
  }

  private initParticlePool(): void {
    this.particles = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const depth = 0.35 + Math.random() * 0.65;
      this.particles.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0003 * depth,
        vy: (-0.00014 - Math.random() * 0.00042) * depth,
        size: (0.8 + Math.random() * 2.0) * depth,
        alpha: 0.22 + Math.random() * 0.65,
        hueShift: Math.random(),
        depth,
      });
    }
  }

  private initBokehPool(): void {
    this.bokehOrbs = [];
    for (let i = 0; i < MAX_BOKEH; i++) {
      this.bokehOrbs.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.00022,
        vy: (Math.random() - 0.5) * 0.00022,
        radius: 36 + Math.random() * 110,
        colorIdx: i % 4,
        alpha: 0.12 + Math.random() * 0.24,
      });
    }
  }

  private initShockwavePool(): void {
    this.shockwaves = [];
    for (let i = 0; i < MAX_SHOCKWAVES; i++) {
      this.shockwaves.push({
        x: 0,
        y: 0,
        radius: 0,
        maxRadius: 300,
        alpha: 0,
        speed: 0.25,
        active: false,
      });
    }
  }

  public setPointerNormalized(nx: number, ny: number): void {
    this.targetParallaxX = Math.max(-1, Math.min(1, nx));
    this.targetParallaxY = Math.max(-1, Math.min(1, ny));
  }

  public triggerRipple(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    this.spawnShockwave(x, y, 8, Math.min(this.width, this.height) * 0.32, 0.52, 0.34);
  }

  private spawnShockwave(
    x: number,
    y: number,
    startRadius: number,
    maxRadius: number,
    alpha: number,
    speed: number,
  ): void {
    for (let i = 0; i < this.shockwaves.length; i++) {
      const sw = this.shockwaves[i];
      if (!sw.active) {
        sw.x = x;
        sw.y = y;
        sw.radius = startRadius;
        sw.maxRadius = maxRadius;
        sw.alpha = alpha;
        sw.speed = speed;
        sw.active = true;
        return;
      }
    }
  }

  private preloadBackgrounds(): void {
    const loadImg = (key: string, src: string) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.cachedBgKey = '';
      };
      img.src = src;
      this.bgImages[key] = img;
    };
    loadImg('nebula', GENERATED_IMAGES.nebula);
    loadImg('city', GENERATED_IMAGES.city);
  }

  public updateSettings(next: VisualizerSettings): void {
    if (next.background !== this.lastBgId) {
      this.lastBgId = next.background;
      this.bgTransitionAlpha = 0.08;
      this.cachedBgKey = '';
    }
    if (next.customBackgroundUrl && next.customBackgroundUrl !== this.customImgSrc) {
      this.customImgSrc = next.customBackgroundUrl;
      const img = new Image();
      img.onload = () => {
        this.cachedBgKey = '';
      };
      img.src = next.customBackgroundUrl;
      this.customImg = img;
    }
    this.settings = next;
  }

  public pushLivelyAudio(samples: number[]): void {
    const len = Math.min(this.rawSpectrum.length, samples.length);
    for (let i = 0; i < len; i++) {
      this.rawSpectrum[i] = Math.max(0, Math.min(1.5, samples[i] ?? 0));
    }
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
    if (paused) {
      this.stop();
    } else {
      this.start();
    }
  }

  public resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(320, rect.width || window.innerWidth);
    this.height = Math.max(240, rect.height || window.innerHeight);
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.cachedBgKey = '';
  }

  public start(): void {
    if (this.rafId !== null || this.isPaused) return;
    this.lastFrameTime = performance.now();
    const tick = (now: number) => {
      if (this.isPaused) {
        this.rafId = null;
        return;
      }
      this.rafId = requestAnimationFrame(tick);
      if (document.hidden) return;

      const minInterval = 1000 / this.settings.fpsLimit;
      const dt = now - this.lastFrameTime;
      if (dt < minInterval - 1.5) return;
      this.lastFrameTime = now;

      // Adaptive FPS quality controller
      const clampedDt = Math.min(100, Math.max(4, dt));
      this.avgFrameDelta = this.avgFrameDelta * 0.92 + clampedDt * 0.08;
      if (this.settings.autoQualityScale) {
        const budgetMs = 1000 / this.settings.fpsLimit;
        if (this.avgFrameDelta > budgetMs * 1.45) {
          this.qualityMultiplier = Math.max(0.45, this.qualityMultiplier - 0.03);
        } else if (this.avgFrameDelta < budgetMs * 1.15) {
          this.qualityMultiplier = Math.min(1.0, this.qualityMultiplier + 0.02);
        }
      } else {
        this.qualityMultiplier = 1.0;
      }

      this.stepAudio(now);
      this.renderFrame(clampedDt);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  public stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private stepAudio(now: number): void {
    const audioInterval = 1000 / Math.max(15, this.settings.updateRate);
    if (now - this.lastAudioUpdate >= audioInterval) {
      this.lastAudioUpdate = now;
      const hasLiveSignal = this.getAudioFrame(this.rawSpectrum);
      if (!hasLiveSignal) {
        // Check if Lively pushed non-zero data; if completely silent, apply gentle ambient breathing
        let maxRaw = 0;
        for (let i = 0; i < 64; i++) {
          if (this.rawSpectrum[i] > maxRaw) maxRaw = this.rawSpectrum[i];
        }
        if (maxRaw < 0.005) {
          const t = now * 0.0014;
          for (let i = 0; i < 128; i++) {
            this.rawSpectrum[i] =
              0.035 + 0.03 * Math.sin(t + i * 0.14) * Math.cos(t * 0.7 - i * 0.05);
          }
        }
      }
      this.latestBands = this.processor.process(
        this.rawSpectrum,
        this.settings.barCount,
        {
          sensitivity: this.settings.sensitivity,
          bassGain: this.settings.bassGain,
          trebleGain: this.settings.trebleGain,
          smoothness: this.settings.smoothness,
        },
        this.barHeights,
      );

      // Update floating peak-hold caps
      for (let i = 0; i < this.settings.barCount; i++) {
        const cur = this.barHeights[i];
        if (cur >= this.peakCaps[i]) {
          this.peakCaps[i] = cur;
        } else {
          this.peakCaps[i] = Math.max(0, this.peakCaps[i] - 0.012);
        }
      }

      if (this.settings.bassPulseEnabled && this.latestBands.beatImpulse > 0.6) {
        const s = this.settings;
        const baseMin = Math.min(this.width, this.height);
        const cx = this.width * (0.5 + s.circleOffsetX / 100);
        const cy = this.height * (0.5 + s.circleOffsetY / 100);
        const r = baseMin * 0.215 * s.circleSize;
        this.spawnShockwave(cx, cy, r, r + baseMin * 0.22, 0.42, 0.25);
      }
    }
  }

  private getPaletteColors(): { colors: string[]; glow: string; rgbStops: RgbColor[] } {
    const s = this.settings;
    let colors: string[];
    let glow: string;
    if (s.palette === 'custom') {
      colors = [s.customPrimaryColor, s.customSecondaryColor];
      glow = s.customPrimaryColor;
    } else {
      const p = PALETTES[s.palette] ?? PALETTES.neon;
      colors = p.colors;
      glow = p.glowColor;
    }

    const key = colors.join('|');
    if (this.cachedPaletteKey !== key) {
      this.cachedRgbStops = colors.map(hexToRgb);
      this.cachedPaletteKey = key;
    }

    return { colors, glow, rgbStops: this.cachedRgbStops };
  }

  private renderFrame(dtMs: number): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const s = this.settings;
    const bands = this.latestBands;
    const { colors, glow, rgbStops } = this.getPaletteColors();

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // Smooth pointer parallax damping
    this.parallaxX += (this.targetParallaxX - this.parallaxX) * 0.08;
    this.parallaxY += (this.targetParallaxY - this.parallaxY) * 0.08;

    // Smooth background fade
    if (this.bgTransitionAlpha < 1) {
      this.bgTransitionAlpha = Math.min(1, this.bgTransitionAlpha + dtMs * 0.0025);
    }
    if (s.colorShift) {
      this.colorPhase = (this.colorPhase + dtMs * 0.00018) % 1;
    } else {
      this.colorPhase = 0;
    }
    this.auroraPhase += dtMs * 0.00055;
    this.orbitalAngle -= dtMs * 0.00025;

    // 1. Draw Background Layer (with subtle pointer parallax)
    this.drawBackground(ctx, w, h, colors, bands);

    // 2. Aurora Overlay Effect (if enabled and not already aurora bg)
    if (s.auroraOverlay && s.background !== 'aurora') {
      this.drawAuroraRibbons(ctx, w, h, colors, bands, 0.24);
    }

    // 3. Depth-layered Particles / Starfield Layer
    if (s.particlesEnabled) {
      this.drawParticles(ctx, w, h, dtMs, colors, bands);
    }

    // 4. Center geometry for Circular Equalizer
    const baseMin = Math.min(w, h);
    const centerX = w * (0.5 + s.circleOffsetX / 100) + this.parallaxX * 6;
    const centerY = h * (0.5 + s.circleOffsetY / 100) + this.parallaxY * 6;
    const pulseScale = s.bassPulseEnabled ? 1 + bands.beatImpulse * 0.055 + bands.bass * 0.035 : 1;
    const radius = baseMin * 0.215 * s.circleSize * pulseScale;

    // Flash beat vignette if enabled
    if (s.flashEnabled && bands.beatImpulse > 0.45) {
      const flashAlpha = (bands.beatImpulse - 0.45) * 0.18;
      ctx.fillStyle = this.hexToRgba(glow, flashAlpha);
      ctx.fillRect(0, 0, w, h);
    }

    // Ambient radial glow behind ring
    if (s.bgGlow > 0 || s.neonGlow) {
      const glowFactor = (s.bgGlow / 100) * (0.35 + bands.bass * 0.45);
      const radGrad = ctx.createRadialGradient(centerX, centerY, radius * 0.45, centerX, centerY, radius * 2.15);
      radGrad.addColorStop(0, this.hexToRgba(colors[0], glowFactor * 0.35));
      radGrad.addColorStop(0.55, this.hexToRgba(colors[colors.length - 1], glowFactor * 0.14));
      radGrad.addColorStop(1, 'rgba(7, 9, 14, 0)');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // Multi-ring beat & pointer click shockwaves
    for (let i = 0; i < this.shockwaves.length; i++) {
      const sw = this.shockwaves[i];
      if (!sw.active) continue;
      sw.radius += dtMs * sw.speed;
      sw.alpha *= 0.945;
      if (sw.alpha < 0.012 || sw.radius > sw.maxRadius) {
        sw.active = false;
        continue;
      }
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = this.hexToRgba(glow, sw.alpha);
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }

    // Rotation update
    if (s.rotationDirection !== 'none' && s.rotationSpeed > 0) {
      const dirSign = s.rotationDirection === 'cw' ? 1 : -1;
      this.rotationAngle += dirSign * s.rotationSpeed * (dtMs / 1000) * 0.55;
    }

    // 5. Inner glowing circle & backdrop disc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(7, 9, 14, 0.48)';
    ctx.fill();

    if (s.neonGlow) {
      ctx.strokeStyle = this.hexToRgba(glow, 0.22 + bands.beatImpulse * 0.18);
      ctx.lineWidth = 10 + bands.beatImpulse * 6;
      ctx.stroke();
    }
    ctx.strokeStyle = this.hexToRgba(colors[0], 0.85);
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Inner counter-rotating orbital arcs & subtle radial ticks
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.91, this.orbitalAngle, this.orbitalAngle + Math.PI * 0.62);
    ctx.strokeStyle = this.hexToRgba(colors[colors.length - 1], 0.34 + bands.mid * 0.35);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.91, this.orbitalAngle + Math.PI, this.orbitalAngle + Math.PI * 1.62);
    ctx.strokeStyle = this.hexToRgba(colors[0], 0.34 + bands.treble * 0.35);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.84, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 6. Circular Equalizer Bars / Wave / LED / Spikes
    this.drawCircularEqualizer(ctx, centerX, centerY, radius, colors, rgbStops, glow, bands);

    ctx.restore();
  }

  private getOrBuildBlurredBg(
    img: HTMLImageElement,
    bgId: string,
    blurPx: number,
    w: number,
    h: number,
  ): HTMLCanvasElement | HTMLImageElement {
    if (blurPx <= 0) return img;
    const key = `${bgId}:${blurPx}:${Math.round(w)}:${Math.round(h)}:${img.src}`;
    if (this.cachedBgCanvas && this.cachedBgKey === key) {
      return this.cachedBgCanvas;
    }

    const scale = 0.5;
    const cw = Math.max(160, Math.floor(w * scale));
    const ch = Math.max(90, Math.floor(h * scale));
    if (!this.cachedBgCanvas) {
      this.cachedBgCanvas = document.createElement('canvas');
    }
    this.cachedBgCanvas.width = cw;
    this.cachedBgCanvas.height = ch;
    const bctx = this.cachedBgCanvas.getContext('2d');
    if (!bctx) return img;

    const imgAspect = img.naturalWidth / img.naturalHeight;
    const viewAspect = cw / ch;
    let drawW = cw;
    let drawH = ch;
    if (viewAspect > imgAspect) {
      drawW = cw;
      drawH = cw / imgAspect;
    } else {
      drawH = ch;
      drawW = ch * imgAspect;
    }
    const dx = (cw - drawW) / 2;
    const dy = (ch - drawH) / 2;

    bctx.clearRect(0, 0, cw, ch);
    bctx.filter = `blur(${Math.max(1, Math.round(blurPx * scale))}px)`;
    bctx.drawImage(img, dx, dy, drawW, drawH);
    bctx.filter = 'none';
    this.cachedBgKey = key;
    return this.cachedBgCanvas;
  }

  private drawBackground(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    colors: string[],
    bands: AudioBands,
  ): void {
    const s = this.settings;
    // Always fill base obsidian
    ctx.fillStyle = '#07090E';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = this.bgTransitionAlpha;

    const zoomScale = s.bassPulseEnabled ? 1 + bands.bass * 0.035 : 1;

    if (s.background === 'nebula' || s.background === 'city' || s.background === 'custom') {
      const img =
        s.background === 'custom'
          ? this.customImg
          : s.background === 'nebula'
            ? this.bgImages.nebula
            : this.bgImages.city;

      if (img && img.complete && img.naturalWidth > 0) {
        const source = this.getOrBuildBlurredBg(img, s.background, s.bgBlur, w, h);
        const srcW = source instanceof HTMLCanvasElement ? w : img.naturalWidth;
        const srcH = source instanceof HTMLCanvasElement ? h : img.naturalHeight;
        const imgAspect = srcW / srcH;
        const viewAspect = w / h;
        let drawW = w;
        let drawH = h;
        if (viewAspect > imgAspect) {
          drawW = w;
          drawH = w / imgAspect;
        } else {
          drawH = h;
          drawW = h * imgAspect;
        }
        drawW *= zoomScale * 1.06;
        drawH *= zoomScale * 1.06;
        const dx = (w - drawW) / 2 - this.parallaxX * 14;
        const dy = (h - drawH) / 2 - this.parallaxY * 14;
        ctx.drawImage(source, dx, dy, drawW, drawH);
      } else {
        this.drawGradientBackdrop(ctx, w, h, colors, bands);
      }
    } else if (s.background === 'bokeh') {
      this.drawGradientBackdrop(ctx, w, h, colors, bands, 0.35);
      this.drawBokehOrbs(ctx, w, h, colors, bands);
    } else if (s.background === 'aurora') {
      this.drawGradientBackdrop(ctx, w, h, colors, bands, 0.25);
      this.drawAuroraRibbons(ctx, w, h, colors, bands, 0.65);
    } else if (s.background === 'gradient') {
      this.drawGradientBackdrop(ctx, w, h, colors, bands, 0.85);
    } else {
      // minimal
      const minGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, 10, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
      minGrad.addColorStop(0, '#0F1624');
      minGrad.addColorStop(1, '#05070B');
      ctx.fillStyle = minGrad;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();

    // Darkness scrim for legibility
    if (s.bgDarkness > 0) {
      ctx.fillStyle = `rgba(5, 7, 12, ${Math.min(0.92, s.bgDarkness / 100)})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  private drawGradientBackdrop(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    colors: string[],
    bands: AudioBands,
    intensity = 0.6,
  ): void {
    const cx = w * (0.5 + Math.sin(this.auroraPhase * 0.6) * 0.12);
    const cy = h * (0.5 + Math.cos(this.auroraPhase * 0.5) * 0.1);
    const grad = ctx.createRadialGradient(cx, cy, 40, w * 0.5, h * 0.5, Math.max(w, h) * 0.85);
    grad.addColorStop(0, this.hexToRgba(colors[0], (0.28 + bands.bass * 0.18) * intensity));
    grad.addColorStop(0.5, this.hexToRgba(colors[colors.length - 1], 0.22 * intensity));
    grad.addColorStop(1, '#07090E');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  private drawBokehOrbs(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    colors: string[],
    bands: AudioBands,
  ): void {
    const count = Math.floor(this.bokehOrbs.length * this.qualityMultiplier);
    for (let i = 0; i < count; i++) {
      const orb = this.bokehOrbs[i];
      orb.x = (orb.x + orb.vx + 1) % 1;
      orb.y = (orb.y + orb.vy + 1) % 1;
      const px = orb.x * w;
      const py = orb.y * h;
      const r = orb.radius * (1 + bands.bass * 0.25);
      const col = colors[orb.colorIdx % colors.length];
      const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
      grad.addColorStop(0, this.hexToRgba(col, orb.alpha * 1.1));
      grad.addColorStop(0.7, this.hexToRgba(col, orb.alpha * 0.45));
      grad.addColorStop(1, this.hexToRgba(col, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawAuroraRibbons(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    colors: string[],
    bands: AudioBands,
    opacity: number,
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const bandsCount = 3;
    for (let b = 0; b < bandsCount; b++) {
      const col = colors[b % colors.length];
      const cx = w * (0.25 + b * 0.25) + Math.sin(this.auroraPhase * (0.9 + b * 0.25)) * w * 0.08;
      const cy = h * (0.34 + b * 0.11) + Math.cos(this.auroraPhase * (0.7 + b * 0.2)) * h * 0.05;
      const rx = Math.max(w, h) * (0.42 + b * 0.06);
      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, rx);
      grad.addColorStop(0, this.hexToRgba(col, opacity * (0.38 + bands.mid * 0.25)));
      grad.addColorStop(0.5, this.hexToRgba(col, opacity * 0.12));
      grad.addColorStop(1, this.hexToRgba(col, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  private drawParticles(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    dtMs: number,
    colors: string[],
    bands: AudioBands,
  ): void {
    const targetCount = Math.min(
      MAX_PARTICLES,
      Math.floor(this.settings.particleDensity * this.qualityMultiplier),
    );
    const speedBoost = 1 + bands.bass * 2.4;

    for (let i = 0; i < targetCount; i++) {
      const p = this.particles[i];
      p.x = (p.x + p.vx * dtMs * 0.06 * speedBoost + 1) % 1;
      p.y = (p.y + p.vy * dtMs * 0.06 * speedBoost + 1) % 1;

      const px = p.x * w + this.parallaxX * 18 * p.depth;
      const py = p.y * h + this.parallaxY * 18 * p.depth;
      const col = colors[Math.floor(p.hueShift * colors.length) % colors.length];
      const alpha = Math.min(0.95, p.alpha * (0.62 + bands.treble * 0.55));
      const r = p.size * (1 + bands.beatImpulse * 0.28);

      ctx.fillStyle = this.hexToRgba(col, alpha);
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();

      // Subtle star flare on bright foreground stars during treble sparkle
      if (p.depth > 0.84 && bands.treble > 0.25 && this.qualityMultiplier > 0.7) {
        const flareLen = r * (2.6 + bands.treble * 3.0);
        ctx.strokeStyle = this.hexToRgba(col, alpha * 0.45);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(px - flareLen, py);
        ctx.lineTo(px + flareLen, py);
        ctx.moveTo(px, py - flareLen);
        ctx.lineTo(px, py + flareLen);
        ctx.stroke();
      }
    }
  }

  private drawCircularEqualizer(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    colors: string[],
    rgbStops: RgbColor[],
    _glow: string,
    bands: AudioBands,
  ): void {
    const s = this.settings;
    const count = s.barCount;
    const maxBarLen = Math.min(s.barLength * s.circleSize, Math.min(this.width, this.height) * 0.15);
    const style = s.eqStyle;
    const gapOffset = 6;

    ctx.save();

    if (style === 'wave') {
      // Smooth continuous circular waveform using midpoint quadratic curves
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + this.rotationAngle - Math.PI / 2;
        const amp = this.barHeights[i] * maxBarLen * 0.85;
        const r =
          s.barDirection === 'inward'
            ? Math.max(radius * 0.55, radius - amp * 0.65)
            : s.barDirection === 'bidirectional'
              ? radius + gapOffset + amp * 0.65 + Math.sin(i * 0.4 + this.auroraPhase * 2) * amp * 0.25
              : radius + gapOffset + amp;
        pts.push({
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
        });
      }
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const cur = pts[i];
        const next = pts[(i + 1) % count];
        const mx = (cur.x + next.x) * 0.5;
        const my = (cur.y + next.y) * 0.5;
        if (i === 0) {
          const prev = pts[count - 1];
          ctx.moveTo((prev.x + cur.x) * 0.5, (prev.y + cur.y) * 0.5);
        }
        ctx.quadraticCurveTo(cur.x, cur.y, mx, my);
      }
      ctx.closePath();
      const grad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
      colors.forEach((c, i) => {
        grad.addColorStop(i / Math.max(1, colors.length - 1), c);
      });
      if (s.neonGlow && this.qualityMultiplier > 0.65) {
        ctx.strokeStyle = this.hexToRgba(colors[0], 0.25);
        ctx.lineWidth = Math.max(7, s.barWidth * 2.1);
        ctx.stroke();
      }
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(2.5, s.barWidth * 0.8);
      ctx.stroke();

      ctx.fillStyle = this.hexToRgba(colors[0], 0.08 + bands.overall * 0.12);
      ctx.fill();
      ctx.restore();
      return;
    }

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + this.rotationAngle - Math.PI / 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const val = this.barHeights[i];
      const len = Math.max(3, val * maxBarLen);

      // Continuous closed-ring RGB interpolation around circumference
      const tNorm = (i / count + this.colorPhase) % 1;
      const rgb = interpolatePaletteRgb(rgbStops, tNorm, true);
      const col = rgbToCss(rgb, 0.96);

      let rStart = radius + gapOffset;
      let rEnd = radius + gapOffset + len;
      if (s.barDirection === 'inward') {
        rStart = radius - 3;
        rEnd = Math.max(radius * 0.32, radius - 3 - len * 0.65);
      } else if (s.barDirection === 'bidirectional') {
        rStart = Math.max(radius * 0.4, radius - len * 0.32);
        rEnd = radius + gapOffset + len * 0.78;
      }

      if (style === 'spikes') {
        const perpX = -sin * (s.barWidth * 0.55);
        const perpY = cos * (s.barWidth * 0.55);
        const bx = cx + cos * rStart;
        const by = cy + sin * rStart;
        const tx = cx + cos * rEnd;
        const ty = cy + sin * rEnd;

        ctx.beginPath();
        ctx.moveTo(bx + perpX, by + perpY);
        ctx.lineTo(tx, ty);
        ctx.lineTo(bx - perpX, by - perpY);
        ctx.closePath();
        ctx.fillStyle = col;
        ctx.fill();
      } else if (style === 'led') {
        const dotStep = Math.max(5, s.barWidth + 3);
        const totalSpan = Math.abs(rEnd - rStart);
        const dotCount = Math.max(1, Math.floor(totalSpan / dotStep));
        const stepDir = rEnd >= rStart ? 1 : -1;
        const dotRadius = Math.max(1.5, s.barWidth * 0.42);
        ctx.fillStyle = col;
        for (let d = 0; d < dotCount; d++) {
          const dr = rStart + stepDir * d * dotStep;
          ctx.beginPath();
          ctx.arc(cx + cos * dr, cy + sin * dr, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // 'rounded' or 'square' with fast soft neon aura pass + floating peak-hold cap
        if (s.neonGlow && this.qualityMultiplier > 0.7) {
          ctx.beginPath();
          ctx.moveTo(cx + cos * rStart, cy + sin * rStart);
          ctx.lineTo(cx + cos * rEnd, cy + sin * rEnd);
          ctx.strokeStyle = rgbToCss(rgb, 0.22);
          ctx.lineWidth = s.barWidth + 4;
          ctx.lineCap = style === 'rounded' ? 'round' : 'butt';
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(cx + cos * rStart, cy + sin * rStart);
        ctx.lineTo(cx + cos * rEnd, cy + sin * rEnd);
        ctx.strokeStyle = col;
        ctx.lineWidth = s.barWidth;
        ctx.lineCap = style === 'rounded' ? 'round' : 'butt';
        ctx.stroke();

        // Floating peak-hold cap on outward bars when active
        const capVal = this.peakCaps[i];
        if (s.barDirection === 'outward' && capVal > val + 0.04 && capVal > 0.12) {
          const capR = radius + gapOffset + capVal * maxBarLen + 4;
          ctx.fillStyle = rgbToCss(rgb, 0.8);
          ctx.beginPath();
          ctx.arc(cx + cos * capR, cy + sin * capR, Math.max(1.4, s.barWidth * 0.36), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return `rgba(34, 211, 238, ${alpha})`;
    const r = Number.parseInt(clean.slice(0, 2), 16);
    const g = Number.parseInt(clean.slice(2, 4), 16);
    const b = Number.parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
  }
}
