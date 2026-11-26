import type { DemoTrack, PaletteId, VisualizerSettings } from '../types/visualizer';

export interface PaletteDefinition {
  id: PaletteId;
  name: string;
  colors: string[];
  glowColor: string;
}

export const PALETTES: Record<PaletteId, PaletteDefinition> = {
  neon: {
    id: 'neon',
    name: 'Neon',
    colors: ['#00F5D4', '#00BBF9', '#9B5DE5', '#F15BB5'],
    glowColor: '#00BBF9',
  },
  sunset: {
    id: 'sunset',
    name: 'Hoàng Hôn',
    colors: ['#FF595E', '#FF924C', '#FFCA3A', '#C9184A'],
    glowColor: '#FF924C',
  },
  ocean: {
    id: 'ocean',
    name: 'Đại Dương',
    colors: ['#03045E', '#0077B6', '#00B4D8', '#90E0EF'],
    glowColor: '#00B4D8',
  },
  mono: {
    id: 'mono',
    name: 'Đơn Sắc',
    colors: ['#94A3B8', '#CBD5E1', '#F8FAFC', '#E2E8F0'],
    glowColor: '#E2E8F0',
  },
  vaporwave: {
    id: 'vaporwave',
    name: 'Vaporwave',
    colors: ['#FF71CE', '#01CDFE', '#05FFA1', '#B967FF'],
    glowColor: '#FF71CE',
  },
  fire: {
    id: 'fire',
    name: 'Ngọn Lửa',
    colors: ['#DC2626', '#EA580C', '#F59E0B', '#FDE047'],
    glowColor: '#F59E0B',
  },
  forest: {
    id: 'forest',
    name: 'Rừng Xanh',
    colors: ['#059669', '#10B981', '#34D399', '#A7F3D0'],
    glowColor: '#10B981',
  },
  custom: {
    id: 'custom',
    name: 'Tự Chọn Màu',
    colors: ['#22D3EE', '#A855F7'],
    glowColor: '#22D3EE',
  },
};

export const BACKGROUND_OPTIONS = [
  { id: 'nebula', name: 'Tinh vân vũ trụ' },
  { id: 'city', name: 'Thành phố về đêm' },
  { id: 'bokeh', name: 'Bokeh nhiều màu' },
  { id: 'aurora', name: 'Cực quang (Aurora)' },
  { id: 'gradient', name: 'Gradient Neon' },
  { id: 'minimal', name: 'Nền tối tối giản' },
  { id: 'custom', name: 'Hình nền cá nhân' },
] as const;

export const EQUALIZER_STYLES = [
  { id: 'rounded', name: 'Thanh tròn' },
  { id: 'square', name: 'Thanh vuông' },
  { id: 'led', name: 'Chấm LED' },
  { id: 'wave', name: 'Đường sóng' },
  { id: 'spikes', name: 'Dạng gai' },
] as const;

export const DEFAULT_SETTINGS: VisualizerSettings = {
  // Nhóm 1: Giao diện
  showClock: true,
  clock24Hour: true,
  showTrackInfo: true,
  showLyrics: true,
  showAlbumArt: true,
  circleOffsetX: 0,
  circleOffsetY: -6,
  circleSize: 1.0,

  // Nhóm 2: Equalizer
  eqStyle: 'rounded',
  barCount: 96,
  barWidth: 5,
  barLength: 115,
  barDirection: 'outward',
  rotationDirection: 'cw',
  rotationSpeed: 0.35,

  // Nhóm 3: Màu sắc
  palette: 'neon',
  customPrimaryColor: '#22D3EE',
  customSecondaryColor: '#EC4899',

  // Nhóm 4: Hình nền
  background: 'nebula',
  customBackgroundUrl: null,
  bgBlur: 2,
  bgDarkness: 38,
  bgGlow: 65,

  // Nhóm 5: Hiệu ứng
  neonGlow: true,
  particlesEnabled: true,
  particleDensity: 72,
  bassPulseEnabled: true,
  flashEnabled: false,
  auroraOverlay: true,
  colorShift: false,
  autoQualityScale: true,

  // Nhóm 6: Âm thanh
  sensitivity: 1.15,
  bassGain: 1.25,
  trebleGain: 1.05,
  smoothness: 0.68,
  fpsLimit: 60,
  updateRate: 60,

  // Nhóm 7: Lời bài hát
  lyricsAutoShow: true,
  lyricsDisplayMode: 'multi-line',
  lyricsSourceMode: 'auto',
  lyricsOffsetMs: 0,
  lyricsColor: '#F8FAFC',
  lyricsFontFamily: 'Plus Jakarta Sans',
  lyricsFontSize: 20,
  lyricsActiveBrightness: 100,
  lyricsPosition: 'below-ring',
};

export const GENERATED_IMAGES = {
  nebula: '/src/assets/images/bg_nebula_1795661813675.jpg',
  city: '/src/assets/images/bg_city_lights_1795661815412.jpg',
  albumCosmos: '/src/assets/images/album_cosmos_1795661814195.jpg',
  albumMidnight: '/src/assets/images/album_midnight_1795661815072.jpg',
} as const;

export const DEMO_TRACKS: DemoTrack[] = [
  {
    id: 'demo-cosmos',
    title: 'Tinh Vân Đêm Khuya',
    artist: 'Hòa Âm Không Gian',
    album: 'Dải Ngân Hà Điện Tử',
    albumArtUrl: GENERATED_IMAGES.albumCosmos,
    durationSec: 48,
    bpm: 112,
    rootHz: 110,
    lrcContent: `[ti:Tinh Vân Đêm Khuya]
[ar:Hòa Âm Không Gian]
[al:Dải Ngân Hà Điện Tử]
[00:00.00]Ánh sáng dịu êm lan tỏa giữa màn đêm
[00:04.20]Từng nhịp trầm vang vọng theo làn sóng ngân hà
[00:08.50]Những vì sao khẽ chuyển động theo giai điệu
[00:12.80]Vòng tròn ánh sáng bừng lên sắc màu Neon
[00:17.10]Giữ lại khoảnh khắc bình yên giữa nhịp sống vội
[00:21.40]Từng tần số rung động hòa quyện cùng không gian
[00:25.70]Âm bass sâu lắng đánh thức mọi giác quan
[00:30.00]Ánh cực quang lướt nhẹ qua đường chân trời
[00:34.30]Giai điệu cứ thế trôi qua từng phút giây
[00:38.60]Lắng nghe nhịp đập trái tim trong từng thanh âm
[00:43.00]Khép lại bản hòa ca dưới bầu trời tinh vân`,
  },
  {
    id: 'demo-midnight',
    title: 'Phố Đêm Mưa Rơi',
    artist: 'Nhịp Sóng Thành Thị',
    album: 'Ánh Đèn Qua Kính',
    albumArtUrl: GENERATED_IMAGES.albumMidnight,
    durationSec: 44,
    bpm: 96,
    rootHz: 98,
    lrcContent: `[ti:Phố Đêm Mưa Rơi]
[ar:Nhịp Sóng Thành Thị]
[al:Ánh Đèn Qua Kính]
[00:00.00]Hạt mưa rơi khẽ trên khung cửa kính mờ
[00:04.50]Ánh đèn thành phố phản chiếu sắc vàng hổ phách
[00:09.00]Từng nốt nhạc trầm ấm vang lên giữa đêm thâu
[00:13.50]Dòng xe lặng lẽ lướt qua con đường ướt mưa
[00:18.00]Giai điệu Lo-fi dịu dàng ru êm tâm trí
[00:22.50]Thời gian như chậm lại cùng đồng hồ trung tâm
[00:27.00]Mỗi thanh âm là một sắc màu ký ức
[00:31.50]Bầu trời đêm lấp lánh những đốm sáng Bokeh
[00:36.00]Còn lại đây chỉ là âm nhạc và bình yên
[00:40.50]Chờ đón bình minh rực rỡ phía cuối chân trời`,
  },
];

export interface WallpaperScenePreset {
  id: string;
  name: string;
  subtitle: string;
  patch: Partial<VisualizerSettings>;
}

export const WALLPAPER_PRESETS: WallpaperScenePreset[] = [
  {
    id: 'nebula-neon',
    name: 'Tinh Vân Neon',
    subtitle: 'Không gian vũ trụ & thanh tròn phát sáng',
    patch: {
      background: 'nebula',
      palette: 'neon',
      eqStyle: 'rounded',
      barDirection: 'outward',
      neonGlow: true,
      auroraOverlay: true,
      particlesEnabled: true,
      bgBlur: 2,
      bgDarkness: 36,
    },
  },
  {
    id: 'city-sunset',
    name: 'Phố Đêm Hoàng Hôn',
    subtitle: 'Thành phố ánh đèn & chấm LED hổ phách',
    patch: {
      background: 'city',
      palette: 'sunset',
      eqStyle: 'led',
      barDirection: 'outward',
      neonGlow: true,
      auroraOverlay: false,
      particlesEnabled: true,
      bgBlur: 4,
      bgDarkness: 42,
    },
  },
  {
    id: 'aurora-ocean',
    name: 'Cực Quang Đại Dương',
    subtitle: 'Dải cực quang chuyển động & đường sóng mượt',
    patch: {
      background: 'aurora',
      palette: 'ocean',
      eqStyle: 'wave',
      barDirection: 'outward',
      neonGlow: true,
      auroraOverlay: true,
      particlesEnabled: true,
      bgBlur: 0,
      bgDarkness: 25,
    },
  },
  {
    id: 'bokeh-vaporwave',
    name: 'Bokeh Vaporwave',
    subtitle: 'Đốm sáng đa sắc & gai năng lượng hai chiều',
    patch: {
      background: 'bokeh',
      palette: 'vaporwave',
      eqStyle: 'spikes',
      barDirection: 'bidirectional',
      neonGlow: true,
      auroraOverlay: true,
      particlesEnabled: true,
      bgBlur: 0,
      bgDarkness: 30,
    },
  },
  {
    id: 'minimal-mono',
    name: 'Tối Giản Đơn Sắc',
    subtitle: 'Nền tối thanh lịch & thanh vuông sắc nét',
    patch: {
      background: 'minimal',
      palette: 'mono',
      eqStyle: 'square',
      barDirection: 'outward',
      neonGlow: false,
      auroraOverlay: false,
      particlesEnabled: false,
      bgBlur: 0,
      bgDarkness: 20,
    },
  },
];

