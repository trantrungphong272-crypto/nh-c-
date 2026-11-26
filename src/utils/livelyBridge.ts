import { DEFAULT_SETTINGS } from '../constants/palettes';
import type {
  BackgroundId,
  BarDirection,
  EqualizerStyle,
  LyricsDisplayMode,
  LyricsFontFamily,
  LyricsPosition,
  PaletteId,
  RotationDirection,
  TrackMetadata,
  VisualizerSettings,
} from '../types/visualizer';

const EQ_STYLE_MAP: EqualizerStyle[] = ['rounded', 'square', 'led', 'wave', 'spikes'];
const BAR_DIR_MAP: BarDirection[] = ['outward', 'inward', 'bidirectional'];
const ROT_DIR_MAP: RotationDirection[] = ['cw', 'ccw', 'none'];
const PALETTE_MAP: PaletteId[] = [
  'neon',
  'sunset',
  'ocean',
  'mono',
  'vaporwave',
  'fire',
  'forest',
  'custom',
];
const BG_MAP: BackgroundId[] = [
  'nebula',
  'city',
  'bokeh',
  'aurora',
  'gradient',
  'minimal',
  'custom',
];
const LYRICS_POS_MAP: LyricsPosition[] = ['below-ring', 'inside-ring', 'floating-panel'];
const LYRICS_FONT_MAP: LyricsFontFamily[] = ['Outfit', 'Plus Jakarta Sans', 'JetBrains Mono'];

function asNumber(val: unknown, fallback: number): number {
  const num = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(num) ? num : fallback;
}

function asBoolean(val: unknown, fallback: boolean): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val.toLowerCase() === 'true';
  return fallback;
}

export function applyLivelyProperty(
  prev: VisualizerSettings,
  name: string,
  val: unknown,
): VisualizerSettings {
  switch (name) {
    // Nhóm 1: Giao diện
    case 'showClock':
      return { ...prev, showClock: asBoolean(val, prev.showClock) };
    case 'clock24Hour':
      return { ...prev, clock24Hour: asBoolean(val, prev.clock24Hour) };
    case 'showTrackInfo':
      return { ...prev, showTrackInfo: asBoolean(val, prev.showTrackInfo) };
    case 'showLyrics':
      return { ...prev, showLyrics: asBoolean(val, prev.showLyrics) };
    case 'showAlbumArt':
      return { ...prev, showAlbumArt: asBoolean(val, prev.showAlbumArt) };
    case 'circleOffsetX':
      return { ...prev, circleOffsetX: asNumber(val, prev.circleOffsetX) };
    case 'circleOffsetY':
      return { ...prev, circleOffsetY: asNumber(val, prev.circleOffsetY) };
    case 'circleSize':
      return { ...prev, circleSize: asNumber(val, prev.circleSize) / 100 };

    // Nhóm 2: Equalizer
    case 'eqStyle': {
      const idx = asNumber(val, 0);
      return { ...prev, eqStyle: EQ_STYLE_MAP[idx] ?? prev.eqStyle };
    }
    case 'barCount':
      return { ...prev, barCount: Math.max(32, Math.min(180, asNumber(val, prev.barCount))) };
    case 'barWidth':
      return { ...prev, barWidth: Math.max(2, Math.min(14, asNumber(val, prev.barWidth))) };
    case 'barLength':
      return { ...prev, barLength: Math.max(40, Math.min(220, asNumber(val, prev.barLength))) };
    case 'barDirection': {
      const idx = asNumber(val, 0);
      return { ...prev, barDirection: BAR_DIR_MAP[idx] ?? prev.barDirection };
    }
    case 'rotationDirection': {
      const idx = asNumber(val, 0);
      return { ...prev, rotationDirection: ROT_DIR_MAP[idx] ?? prev.rotationDirection };
    }
    case 'rotationSpeed':
      return { ...prev, rotationSpeed: asNumber(val, prev.rotationSpeed * 100) / 100 };

    // Nhóm 3: Màu sắc
    case 'palette': {
      const idx = asNumber(val, 0);
      return { ...prev, palette: PALETTE_MAP[idx] ?? prev.palette };
    }
    case 'customPrimaryColor':
      return typeof val === 'string' ? { ...prev, customPrimaryColor: val } : prev;
    case 'customSecondaryColor':
      return typeof val === 'string' ? { ...prev, customSecondaryColor: val } : prev;

    // Nhóm 4: Hình nền
    case 'background': {
      const idx = asNumber(val, 0);
      return { ...prev, background: BG_MAP[idx] ?? prev.background };
    }
    case 'customBackgroundFile':
      return typeof val === 'string' && val.trim().length > 0
        ? { ...prev, background: 'custom', customBackgroundUrl: val }
        : prev;
    case 'bgBlur':
      return { ...prev, bgBlur: Math.max(0, Math.min(24, asNumber(val, prev.bgBlur))) };
    case 'bgDarkness':
      return { ...prev, bgDarkness: Math.max(0, Math.min(90, asNumber(val, prev.bgDarkness))) };
    case 'bgGlow':
      return { ...prev, bgGlow: Math.max(0, Math.min(100, asNumber(val, prev.bgGlow))) };

    // Nhóm 5: Hiệu ứng
    case 'neonGlow':
      return { ...prev, neonGlow: asBoolean(val, prev.neonGlow) };
    case 'particlesEnabled':
      return { ...prev, particlesEnabled: asBoolean(val, prev.particlesEnabled) };
    case 'particleDensity':
      return { ...prev, particleDensity: Math.max(20, Math.min(140, asNumber(val, prev.particleDensity))) };
    case 'bassPulseEnabled':
      return { ...prev, bassPulseEnabled: asBoolean(val, prev.bassPulseEnabled) };
    case 'flashEnabled':
      return { ...prev, flashEnabled: asBoolean(val, prev.flashEnabled) };
    case 'auroraOverlay':
      return { ...prev, auroraOverlay: asBoolean(val, prev.auroraOverlay) };
    case 'colorShift':
      return { ...prev, colorShift: asBoolean(val, prev.colorShift) };
    case 'autoQualityScale':
      return { ...prev, autoQualityScale: asBoolean(val, prev.autoQualityScale) };

    // Nhóm 6: Âm thanh
    case 'sensitivity':
      return { ...prev, sensitivity: asNumber(val, prev.sensitivity * 100) / 100 };
    case 'bassGain':
      return { ...prev, bassGain: asNumber(val, prev.bassGain * 100) / 100 };
    case 'trebleGain':
      return { ...prev, trebleGain: asNumber(val, prev.trebleGain * 100) / 100 };
    case 'smoothness':
      return { ...prev, smoothness: Math.min(0.95, Math.max(0.1, asNumber(val, prev.smoothness * 100) / 100)) };
    case 'fpsLimit': {
      const idx = asNumber(val, 1);
      return { ...prev, fpsLimit: idx === 0 ? 30 : 60 };
    }
    case 'updateRate':
      return { ...prev, updateRate: Math.max(15, Math.min(60, asNumber(val, prev.updateRate))) };

    // Nhóm 7: Lời bài hát
    case 'lyricsAutoShow':
      return { ...prev, lyricsAutoShow: asBoolean(val, prev.lyricsAutoShow) };
    case 'lyricsDisplayMode': {
      const idx = asNumber(val, 0);
      const mode: LyricsDisplayMode = idx === 1 ? 'single-line' : 'multi-line';
      return { ...prev, lyricsDisplayMode: mode };
    }
    case 'lyricsOffsetMs':
      return { ...prev, lyricsOffsetMs: Math.max(-5000, Math.min(5000, asNumber(val, prev.lyricsOffsetMs))) };
    case 'lyricsColor':
      return typeof val === 'string' ? { ...prev, lyricsColor: val } : prev;
    case 'lyricsFontFamily': {
      const idx = asNumber(val, 1);
      return { ...prev, lyricsFontFamily: LYRICS_FONT_MAP[idx] ?? prev.lyricsFontFamily };
    }
    case 'lyricsFontSize':
      return { ...prev, lyricsFontSize: Math.max(14, Math.min(34, asNumber(val, prev.lyricsFontSize))) };
    case 'lyricsActiveBrightness':
      return {
        ...prev,
        lyricsActiveBrightness: Math.max(70, Math.min(100, asNumber(val, prev.lyricsActiveBrightness))),
      };
    case 'lyricsPosition': {
      const idx = asNumber(val, 0);
      return { ...prev, lyricsPosition: LYRICS_POS_MAP[idx] ?? prev.lyricsPosition };
    }
    case 'resetDefaults':
      return { ...DEFAULT_SETTINGS };
    default:
      return prev;
  }
}

export function parseLivelyTrackPayload(raw: string | Record<string, unknown> | null | undefined): TrackMetadata | null {
  if (!raw) return null;
  let obj: Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  } else {
    obj = raw;
  }

  const title = typeof obj.Title === 'string' ? obj.Title.trim() : '';
  const artist = typeof obj.Artist === 'string' ? obj.Artist.trim() : '';
  const album = typeof obj.AlbumTitle === 'string' ? obj.AlbumTitle.trim() : undefined;

  if (!title && !artist) return null;

  let albumArtUrl: string | null = null;
  if (typeof obj.Thumbnail === 'string' && obj.Thumbnail.trim().length > 0) {
    const thumb = obj.Thumbnail.trim();
    albumArtUrl = thumb.startsWith('data:') || thumb.startsWith('http') || thumb.startsWith('/')
      ? thumb
      : `data:image/png;base64,${thumb}`;
  }

  return {
    title: title || 'Không rõ tên bài hát',
    artist: artist || 'Nghệ sĩ chưa xác định',
    album,
    albumArtUrl,
  };
}
