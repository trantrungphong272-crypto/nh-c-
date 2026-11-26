export type EqualizerStyle = 'rounded' | 'square' | 'led' | 'wave' | 'spikes';

export type BarDirection = 'outward' | 'inward' | 'bidirectional';

export type RotationDirection = 'cw' | 'ccw' | 'none';

export type PaletteId =
  | 'neon'
  | 'sunset'
  | 'ocean'
  | 'mono'
  | 'vaporwave'
  | 'fire'
  | 'forest'
  | 'custom';

export type BackgroundId =
  | 'nebula'
  | 'city'
  | 'bokeh'
  | 'aurora'
  | 'gradient'
  | 'minimal'
  | 'custom';

export type LyricsPosition = 'below-ring' | 'inside-ring' | 'floating-panel';

export type LyricsDisplayMode = 'multi-line' | 'single-line';

export type LyricsSourceMode = 'auto' | 'lrc-file' | 'txt-file' | 'lrclib' | 'manual';

export type LyricsFontFamily = 'Outfit' | 'Plus Jakarta Sans' | 'JetBrains Mono';

export type AudioInputMode = 'demo' | 'file' | 'microphone' | 'lively';

export interface VisualizerSettings {
  // Nhóm 1: Giao diện
  showClock: boolean;
  clock24Hour: boolean;
  showTrackInfo: boolean;
  showLyrics: boolean;
  showAlbumArt: boolean;
  circleOffsetX: number; // -35 to 35 (%)
  circleOffsetY: number; // -35 to 35 (%)
  circleSize: number; // 0.55 to 1.45

  // Nhóm 2: Equalizer
  eqStyle: EqualizerStyle;
  barCount: number; // 32 to 180
  barWidth: number; // 2 to 14
  barLength: number; // 40 to 220
  barDirection: BarDirection;
  rotationDirection: RotationDirection;
  rotationSpeed: number; // 0 to 3.0

  // Nhóm 3: Màu sắc
  palette: PaletteId;
  customPrimaryColor: string;
  customSecondaryColor: string;

  // Nhóm 4: Hình nền
  background: BackgroundId;
  customBackgroundUrl: string | null;
  bgBlur: number; // 0 to 24 px
  bgDarkness: number; // 0 to 90 %
  bgGlow: number; // 0 to 100 %

  // Nhóm 5: Hiệu ứng
  neonGlow: boolean;
  particlesEnabled: boolean;
  particleDensity: number; // 20 to 140
  bassPulseEnabled: boolean;
  flashEnabled: boolean;
  auroraOverlay: boolean;
  colorShift: boolean;
  autoQualityScale: boolean;

  // Nhóm 6: Âm thanh
  sensitivity: number; // 0.3 to 2.5
  bassGain: number; // 0.3 to 2.5
  trebleGain: number; // 0.3 to 2.5
  smoothness: number; // 0.1 to 0.95
  fpsLimit: 30 | 60;
  updateRate: number; // 15 to 60 Hz

  // Nhóm 7: Lời bài hát
  lyricsAutoShow: boolean;
  lyricsDisplayMode: LyricsDisplayMode;
  lyricsSourceMode: LyricsSourceMode;
  lyricsOffsetMs: number; // -5000 to 5000
  lyricsColor: string;
  lyricsFontFamily: LyricsFontFamily;
  lyricsFontSize: number; // 14 to 34 px
  lyricsActiveBrightness: number; // 70 to 100 %
  lyricsPosition: LyricsPosition;
}

export interface LyricLine {
  timeMs: number;
  text: string;
}

export interface ParsedLyrics {
  lines: LyricLine[];
  isSynced: boolean;
  title?: string;
  artist?: string;
  album?: string;
  offsetMs?: number;
  sourceLabel: string;
}

export interface TrackMetadata {
  title: string;
  artist: string;
  album?: string;
  albumArtUrl?: string | null;
  durationMs?: number;
}

export interface DemoTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumArtUrl: string;
  durationSec: number;
  bpm: number;
  rootHz: number;
  lrcContent: string;
}

export type SettingsTabId =
  | 'interface'
  | 'equalizer'
  | 'colors'
  | 'background'
  | 'effects'
  | 'audio'
  | 'lyrics';

declare global {
  interface Window {
    livelyAudioListener?: (audioArray: number[]) => void;
    livelyCurrentTrack?: (data: string | Record<string, unknown>) => void;
    livelyWallpaperPlaybackChanged?: (data: { IsPaused?: boolean } | boolean) => void;
    livelyPropertyListener?: (name: string, val: unknown) => void;
  }
}
