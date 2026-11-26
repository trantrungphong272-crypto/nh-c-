import {
  Download,
  ImagePlus,
  RotateCcw,
  Search,
  Upload,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import {
  BACKGROUND_OPTIONS,
  EQUALIZER_STYLES,
  PALETTES,
  WALLPAPER_PRESETS,
} from '../constants/palettes';
import type {
  PaletteId,
  SettingsTabId,
  TrackMetadata,
  VisualizerSettings,
} from '../types/visualizer';

interface SettingsDrawerProps {
  isOpen: boolean;
  settings: VisualizerSettings;
  track: TrackMetadata | null;
  lyricsStatusMessage: string | null;
  isExportingZip: boolean;
  onClose: () => void;
  onUpdate: <K extends keyof VisualizerSettings>(
    key: K,
    value: VisualizerSettings[K],
  ) => void;
  onApplyPreset: (patch: Partial<VisualizerSettings>) => void;
  onResetDefaults: () => void;
  onApplyManualLyrics: (rawText: string) => void;
  onUploadLyricsFile: (file: File) => void;
  onSearchOnlineLyrics: (title: string, artist: string) => void;
  onUploadCustomBackground: (file: File) => void;
  onExportLivelyZip: () => void;
}

const TABS: { id: SettingsTabId; label: string }[] = [
  { id: 'interface', label: 'Giao diện' },
  { id: 'equalizer', label: 'Equalizer' },
  { id: 'colors', label: 'Màu sắc' },
  { id: 'background', label: 'Hình nền' },
  { id: 'effects', label: 'Hiệu ứng' },
  { id: 'audio', label: 'Âm thanh' },
  { id: 'lyrics', label: 'Lời bài hát' },
];

export function SettingsDrawer({
  isOpen,
  settings,
  track,
  lyricsStatusMessage,
  isExportingZip,
  onClose,
  onUpdate,
  onApplyPreset,
  onResetDefaults,
  onApplyManualLyrics,
  onUploadLyricsFile,
  onSearchOnlineLyrics,
  onUploadCustomBackground,
  onExportLivelyZip,
}: SettingsDrawerProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('interface');
  const [manualLyricsText, setManualLyricsText] = useState('');
  const [searchTitle, setSearchTitle] = useState('');
  const [searchArtist, setSearchArtist] = useState('');

  const customBgInputRef = useRef<HTMLInputElement>(null);
  const lyricsFileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  return (
    <aside
      role="dialog"
      aria-label="Bảng cài đặt Vòng Tròn Nhạc"
      data-testid="settings-drawer"
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[410px] flex-col border-l border-white/12 bg-[#0B0E17] shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">
            Cài Đặt Vòng Tròn Nhạc
          </h2>
          <p className="text-xs text-slate-400">
            Tùy chỉnh hiển thị, âm thanh và lời bài hát
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng bảng cài đặt"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-400"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* 7-Group Tab Bar */}
      <nav
        aria-label="Nhóm tùy chỉnh"
        className="flex flex-wrap gap-1.5 border-b border-white/10 px-4 py-3 bg-white/[0.02]"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === tab.id
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Scrollable Body */}
      <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {activeTab === 'interface' && (
          <div className="space-y-4">
            <div className="space-y-2 pb-1 border-b border-white/10">
              <span className="block text-xs font-semibold text-slate-200">
                Khung cảnh cài sẵn
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {WALLPAPER_PRESETS.map((preset) => {
                  const isActive =
                    settings.background === preset.patch.background &&
                    settings.palette === preset.patch.palette &&
                    settings.eqStyle === preset.patch.eqStyle;
                  const palColors = preset.patch.palette
                    ? PALETTES[preset.patch.palette].colors
                    : PALETTES.neon.colors;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onApplyPreset(preset.patch)}
                      className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                        isActive
                          ? 'border-cyan-400 bg-cyan-500/15 text-white'
                          : 'border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.07]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{preset.name}</div>
                        <div className="text-[11px] text-slate-400 truncate">{preset.subtitle}</div>
                      </div>
                      <span className="flex items-center gap-1 shrink-0">
                        {palColors.slice(0, 3).map((hex, i) => (
                          <span
                            key={i}
                            className="h-2.5 w-2.5 rounded-full border border-white/20"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <ToggleRow
              label="Hiển thị đồng hồ trung tâm"
              checked={settings.showClock}
              onChange={(v) => onUpdate('showClock', v)}
            />
            <ToggleRow
              label="Định dạng 24 giờ"
              checked={settings.clock24Hour}
              onChange={(v) => onUpdate('clock24Hour', v)}
            />
            <ToggleRow
              label="Hiển thị tên bài hát & ca sĩ"
              checked={settings.showTrackInfo}
              onChange={(v) => onUpdate('showTrackInfo', v)}
            />
            <ToggleRow
              label="Hiển thị ảnh bìa album"
              checked={settings.showAlbumArt}
              onChange={(v) => onUpdate('showAlbumArt', v)}
            />
            <ToggleRow
              label="Hiển thị lời bài hát"
              checked={settings.showLyrics}
              onChange={(v) => onUpdate('showLyrics', v)}
            />

            <SliderRow
              label="Kích thước vòng tròn"
              valueDisplay={`${Math.round(settings.circleSize * 100)}%`}
              min={0.55}
              max={1.45}
              step={0.05}
              value={settings.circleSize}
              onChange={(v) => onUpdate('circleSize', v)}
            />
            <SliderRow
              label="Vị trí ngang vòng tròn"
              valueDisplay={`${settings.circleOffsetX}%`}
              min={-30}
              max={30}
              step={1}
              value={settings.circleOffsetX}
              onChange={(v) => onUpdate('circleOffsetX', v)}
            />
            <SliderRow
              label="Vị trí dọc vòng tròn"
              valueDisplay={`${settings.circleOffsetY}%`}
              min={-30}
              max={30}
              step={1}
              value={settings.circleOffsetY}
              onChange={(v) => onUpdate('circleOffsetY', v)}
            />
          </div>
        )}

        {activeTab === 'equalizer' && (
          <div className="space-y-4">
            <SelectRow
              label="Kiểu Equalizer"
              value={settings.eqStyle}
              options={EQUALIZER_STYLES.map((s) => ({ value: s.id, label: s.name }))}
              onChange={(v) => onUpdate('eqStyle', v as VisualizerSettings['eqStyle'])}
            />
            <SliderRow
              label="Số lượng thanh"
              valueDisplay={`${settings.barCount}`}
              min={32}
              max={180}
              step={4}
              value={settings.barCount}
              onChange={(v) => onUpdate('barCount', v)}
            />
            <SliderRow
              label="Độ dày thanh"
              valueDisplay={`${settings.barWidth} px`}
              min={2}
              max={14}
              step={1}
              value={settings.barWidth}
              onChange={(v) => onUpdate('barWidth', v)}
            />
            <SliderRow
              label="Chiều dài thanh tối đa"
              valueDisplay={`${settings.barLength} px`}
              min={40}
              max={220}
              step={5}
              value={settings.barLength}
              onChange={(v) => onUpdate('barLength', v)}
            />
            <SelectRow
              label="Hướng chuyển động"
              value={settings.barDirection}
              options={[
                { value: 'outward', label: 'Hướng ra ngoài' },
                { value: 'inward', label: 'Hướng vào trong' },
                { value: 'bidirectional', label: 'Hai chiều' },
              ]}
              onChange={(v) =>
                onUpdate('barDirection', v as VisualizerSettings['barDirection'])
              }
            />
            <SelectRow
              label="Chiều xoay vòng tròn"
              value={settings.rotationDirection}
              options={[
                { value: 'cw', label: 'Theo chiều kim đồng hồ' },
                { value: 'ccw', label: 'Ngược chiều kim đồng hồ' },
                { value: 'none', label: 'Đứng yên' },
              ]}
              onChange={(v) =>
                onUpdate(
                  'rotationDirection',
                  v as VisualizerSettings['rotationDirection'],
                )
              }
            />
            <SliderRow
              label="Tốc độ xoay"
              valueDisplay={`${settings.rotationSpeed.toFixed(2)}x`}
              min={0}
              max={3}
              step={0.05}
              value={settings.rotationSpeed}
              onChange={(v) => onUpdate('rotationSpeed', v)}
            />
          </div>
        )}

        {activeTab === 'colors' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="block text-xs font-medium text-slate-300">
                Bảng màu sắc
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PALETTES) as PaletteId[]).map((pid) => {
                  const pal = PALETTES[pid];
                  const active = settings.palette === pid;
                  return (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => onUpdate('palette', pid)}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-xs font-medium transition-colors ${
                        active
                          ? 'border-cyan-400 bg-cyan-500/15 text-white'
                          : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]'
                      }`}
                    >
                      <span className="truncate">{pal.name}</span>
                      <span className="flex items-center gap-1 shrink-0">
                        {pal.colors.slice(0, 3).map((hex, i) => (
                          <span
                            key={i}
                            className="h-3 w-3 rounded-full border border-white/20"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {settings.palette === 'custom' && (
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <label className="flex flex-col gap-1.5 text-xs text-slate-300">
                  <span>Màu chính</span>
                  <input
                    type="color"
                    value={settings.customPrimaryColor}
                    onChange={(e) => onUpdate('customPrimaryColor', e.target.value)}
                    className="h-9 w-full cursor-pointer rounded border border-white/15 bg-transparent"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-slate-300">
                  <span>Màu phụ</span>
                  <input
                    type="color"
                    value={settings.customSecondaryColor}
                    onChange={(e) => onUpdate('customSecondaryColor', e.target.value)}
                    className="h-9 w-full cursor-pointer rounded border border-white/15 bg-transparent"
                  />
                </label>
              </div>
            )}
          </div>
        )}

        {activeTab === 'background' && (
          <div className="space-y-4">
            <SelectRow
              label="Chọn hình nền"
              value={settings.background}
              options={BACKGROUND_OPTIONS.map((b) => ({ value: b.id, label: b.name }))}
              onChange={(v) =>
                onUpdate('background', v as VisualizerSettings['background'])
              }
            />

            <div>
              <button
                type="button"
                onClick={() => customBgInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-400/50 hover:bg-white/[0.06]"
              >
                <ImagePlus className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                <span>Thêm hình nền cá nhân (JPG, PNG, WebP)</span>
              </button>
              <input
                ref={customBgInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                aria-label="Chọn hình nền cá nhân"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUploadCustomBackground(file);
                  e.target.value = '';
                }}
              />
            </div>

            <SliderRow
              label="Độ mờ hình nền"
              valueDisplay={`${settings.bgBlur} px`}
              min={0}
              max={24}
              step={1}
              value={settings.bgBlur}
              onChange={(v) => onUpdate('bgBlur', v)}
            />
            <SliderRow
              label="Độ tối lớp phủ"
              valueDisplay={`${settings.bgDarkness}%`}
              min={0}
              max={90}
              step={2}
              value={settings.bgDarkness}
              onChange={(v) => onUpdate('bgDarkness', v)}
            />
            <SliderRow
              label="Ánh sáng lan tỏa"
              valueDisplay={`${settings.bgGlow}%`}
              min={0}
              max={100}
              step={5}
              value={settings.bgGlow}
              onChange={(v) => onUpdate('bgGlow', v)}
            />
          </div>
        )}

        {activeTab === 'effects' && (
          <div className="space-y-4">
            <ToggleRow
              label="Ánh sáng Neon phát quang"
              checked={settings.neonGlow}
              onChange={(v) => onUpdate('neonGlow', v)}
            />
            <ToggleRow
              label="Hạt ánh sáng & sao chuyển động"
              checked={settings.particlesEnabled}
              onChange={(v) => onUpdate('particlesEnabled', v)}
            />
            {settings.particlesEnabled && (
              <SliderRow
                label="Mật độ hạt ánh sáng"
                valueDisplay={`${settings.particleDensity}`}
                min={20}
                max={140}
                step={4}
                value={settings.particleDensity}
                onChange={(v) => onUpdate('particleDensity', v)}
              />
            )}
            <ToggleRow
              label="Hiệu ứng nhịp bass & sóng xung"
              checked={settings.bassPulseEnabled}
              onChange={(v) => onUpdate('bassPulseEnabled', v)}
            />
            <ToggleRow
              label="Hiệu ứng nhấp nháy theo trống"
              checked={settings.flashEnabled}
              onChange={(v) => onUpdate('flashEnabled', v)}
            />
            <ToggleRow
              label="Lớp phủ cực quang nhẹ"
              checked={settings.auroraOverlay}
              onChange={(v) => onUpdate('auroraOverlay', v)}
            />
            <ToggleRow
              label="Tự động chuyển sắc màu"
              checked={settings.colorShift}
              onChange={(v) => onUpdate('colorShift', v)}
            />
            <ToggleRow
              label="Tự giảm chất lượng khi FPS thấp"
              checked={settings.autoQualityScale}
              onChange={(v) => onUpdate('autoQualityScale', v)}
            />
          </div>
        )}

        {activeTab === 'audio' && (
          <div className="space-y-4">
            <SliderRow
              label="Độ nhạy âm thanh (Equalizer)"
              valueDisplay={`${settings.sensitivity.toFixed(2)}x`}
              min={0.3}
              max={2.5}
              step={0.05}
              value={settings.sensitivity}
              onChange={(v) => onUpdate('sensitivity', v)}
            />
            <SliderRow
              label="Độ khuếch đại Bass"
              valueDisplay={`${settings.bassGain.toFixed(2)}x`}
              min={0.3}
              max={2.5}
              step={0.05}
              value={settings.bassGain}
              onChange={(v) => onUpdate('bassGain', v)}
            />
            <SliderRow
              label="Độ khuếch đại Treble"
              valueDisplay={`${settings.trebleGain.toFixed(2)}x`}
              min={0.3}
              max={2.5}
              step={0.05}
              value={settings.trebleGain}
              onChange={(v) => onUpdate('trebleGain', v)}
            />
            <SliderRow
              label="Độ mượt chuyển động"
              valueDisplay={`${Math.round(settings.smoothness * 100)}%`}
              min={0.1}
              max={0.95}
              step={0.03}
              value={settings.smoothness}
              onChange={(v) => onUpdate('smoothness', v)}
            />
            <SelectRow
              label="Giới hạn khung hình (FPS)"
              value={String(settings.fpsLimit)}
              options={[
                { value: '60', label: '60 FPS (Mượt tối đa)' },
                { value: '30', label: '30 FPS (Tiết kiệm pin/CPU)' },
              ]}
              onChange={(v) => onUpdate('fpsLimit', v === '30' ? 30 : 60)}
            />
            <SliderRow
              label="Tần số cập nhật âm thanh"
              valueDisplay={`${settings.updateRate} Hz`}
              min={15}
              max={60}
              step={5}
              value={settings.updateRate}
              onChange={(v) => onUpdate('updateRate', v)}
            />
          </div>
        )}

        {activeTab === 'lyrics' && (
          <div className="space-y-4">
            <ToggleRow
              label="Bật hiển thị lời bài hát"
              checked={settings.showLyrics}
              onChange={(v) => onUpdate('showLyrics', v)}
            />
            <ToggleRow
              label="Chế độ tự động hiển thị"
              checked={settings.lyricsAutoShow}
              onChange={(v) => onUpdate('lyricsAutoShow', v)}
            />
            <SelectRow
              label="Kiểu hiển thị"
              value={settings.lyricsDisplayMode}
              options={[
                { value: 'multi-line', label: 'Hiển thị nhiều dòng' },
                { value: 'single-line', label: 'Chỉ hiển thị dòng hiện tại' },
              ]}
              onChange={(v) =>
                onUpdate(
                  'lyricsDisplayMode',
                  v as VisualizerSettings['lyricsDisplayMode'],
                )
              }
            />
            <SelectRow
              label="Vị trí lời bài hát"
              value={settings.lyricsPosition}
              options={[
                { value: 'below-ring', label: 'Phía dưới vòng tròn Equalizer' },
                { value: 'inside-ring', label: 'Bên dưới đồng hồ trung tâm' },
                { value: 'floating-panel', label: 'Khu vực riêng (góc trái)' },
              ]}
              onChange={(v) =>
                onUpdate(
                  'lyricsPosition',
                  v as VisualizerSettings['lyricsPosition'],
                )
              }
            />
            <SliderRow
              label="Độ trễ đồng bộ"
              valueDisplay={`${settings.lyricsOffsetMs > 0 ? '+' : ''}${settings.lyricsOffsetMs} ms`}
              min={-5000}
              max={5000}
              step={100}
              value={settings.lyricsOffsetMs}
              onChange={(v) => onUpdate('lyricsOffsetMs', v)}
            />
            <SliderRow
              label="Kích thước chữ"
              valueDisplay={`${settings.lyricsFontSize} px`}
              min={14}
              max={34}
              step={1}
              value={settings.lyricsFontSize}
              onChange={(v) => onUpdate('lyricsFontSize', v)}
            />
            <SliderRow
              label="Độ sáng dòng hiện tại"
              valueDisplay={`${settings.lyricsActiveBrightness}%`}
              min={70}
              max={100}
              step={2}
              value={settings.lyricsActiveBrightness}
              onChange={(v) => onUpdate('lyricsActiveBrightness', v)}
            />
            <SelectRow
              label="Font chữ lời bài hát"
              value={settings.lyricsFontFamily}
              options={[
                { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans (Mềm mại)' },
                { value: 'Outfit', label: 'Outfit (Hiện đại)' },
                { value: 'JetBrains Mono', label: 'JetBrains Mono (Đều chữ)' },
              ]}
              onChange={(v) =>
                onUpdate(
                  'lyricsFontFamily',
                  v as VisualizerSettings['lyricsFontFamily'],
                )
              }
            />
            <label className="flex items-center justify-between text-xs font-medium text-slate-300">
              <span>Màu chữ lời bài hát</span>
              <input
                type="color"
                value={settings.lyricsColor}
                onChange={(e) => onUpdate('lyricsColor', e.target.value)}
                className="h-8 w-14 cursor-pointer rounded border border-white/15 bg-transparent"
              />
            </label>

            <div className="border-t border-white/10 pt-3 space-y-3">
              <p className="text-xs font-semibold text-slate-200">
                Nguồn lời bài hát
              </p>

              <button
                type="button"
                onClick={() => lyricsFileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10"
              >
                <Upload className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                <span>Chọn tệp .LRC hoặc .TXT từ máy</span>
              </button>
              <input
                ref={lyricsFileRef}
                type="file"
                accept=".lrc,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUploadLyricsFile(file);
                  e.target.value = '';
                }}
              />

              {/* LRCLIB legal search */}
              <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <p className="text-[11px] text-slate-400">
                  Tìm kiếm qua nguồn công khai LRCLIB (có lưu bộ nhớ đệm):
                </p>
                <input
                  type="text"
                  placeholder={track?.title || 'Tên bài hát'}
                  value={searchTitle}
                  onChange={(e) => setSearchTitle(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-slate-900/90 px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder={track?.artist || 'Tên ca sĩ (tùy chọn)'}
                  value={searchArtist}
                  onChange={(e) => setSearchArtist(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-slate-900/90 px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    onSearchOnlineLyrics(
                      searchTitle.trim() || track?.title || '',
                      searchArtist.trim() || track?.artist || '',
                    )
                  }
                  className="flex w-full items-center justify-center gap-1.5 rounded-md bg-cyan-500/20 border border-cyan-500/35 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/30"
                >
                  <Search className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Tìm lời bài hát</span>
                </button>
              </div>

              {/* Manual lyrics editor */}
              <div className="space-y-2">
                <label
                  htmlFor="manual-lyrics-input"
                  className="block text-[11px] font-medium text-slate-300"
                >
                  Nhập lời bài hát thủ công (hỗ trợ định dạng [mm:ss.xx] hoặc văn bản):
                </label>
                <textarea
                  id="manual-lyrics-input"
                  rows={4}
                  value={manualLyricsText}
                  onChange={(e) => setManualLyricsText(e.target.value)}
                  placeholder="[00:00.00] Dòng lời thứ nhất&#10;[00:04.50] Dòng lời thứ hai"
                  className="w-full rounded-lg border border-white/10 bg-slate-900/90 p-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (manualLyricsText.trim()) {
                      onApplyManualLyrics(manualLyricsText);
                    }
                  }}
                  className="w-full rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/15"
                >
                  Áp dụng lời bài hát thủ công
                </button>
              </div>

              {lyricsStatusMessage && (
                <p className="text-xs text-cyan-300">{lyricsStatusMessage}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-2 border-t border-white/10 px-5 py-3.5 bg-white/[0.02]">
        <button
          type="button"
          onClick={onResetDefaults}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white whitespace-nowrap shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Mặc định</span>
        </button>

        <button
          type="button"
          onClick={onExportLivelyZip}
          disabled={isExportingZip}
          data-testid="export-lively-zip-btn"
          className="flex h-9 items-center gap-1.5 rounded-lg bg-cyan-500 px-3.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{isExportingZip ? 'Đang đóng gói...' : 'Tải gói Lively (.zip)'}</span>
        </button>
      </div>
    </aside>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1">
      <span className="text-xs font-medium text-slate-200">{label}</span>
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded accent-cyan-400 cursor-pointer"
      />
    </label>
  );
}

function SliderRow({
  label,
  valueDisplay,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  valueDisplay: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (val: number) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-300">{label}</span>
        <span className="font-mono-tabular text-slate-400">{valueDisplay}</span>
      </div>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="studio-slider w-full"
      />
    </label>
  );
}

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-medium text-slate-300">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/12 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
