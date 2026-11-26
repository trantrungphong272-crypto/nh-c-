import {
  Eye,
  EyeOff,
  FileAudio,
  FileText,
  Maximize2,
  Mic,
  Minimize2,
  Pause,
  Play,
  Settings,
  SkipBack,
  SkipForward,
  Volume2,
} from 'lucide-react';
import { useRef } from 'react';
import type { AudioInputMode, TrackMetadata } from '../types/visualizer';

interface MediaControlBarProps {
  audioMode: AudioInputMode;
  isPlaying: boolean;
  zenMode: boolean;
  isFullscreen: boolean;
  currentTimeMs: number;
  durationMs: number;
  volume: number;
  track: TrackMetadata | null;
  micError: string | null;
  onToggleZenMode: () => void;
  onToggleFullscreen: () => void;
  onOpenSettings: () => void;
  onTogglePlay: () => void;
  onPrevDemo: () => void;
  onNextDemo: () => void;
  onSeek: (ms: number) => void;
  onVolumeChange: (vol: number) => void;
  onSelectMode: (mode: AudioInputMode) => void;
  onUploadAudio: (file: File) => void;
  onUploadLyrics: (file: File) => void;
}

function formatTimeMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function MediaControlBar({
  audioMode,
  isPlaying,
  zenMode,
  isFullscreen,
  currentTimeMs,
  durationMs,
  volume,
  track,
  micError,
  onToggleZenMode,
  onToggleFullscreen,
  onOpenSettings,
  onTogglePlay,
  onPrevDemo,
  onNextDemo,
  onSeek,
  onVolumeChange,
  onSelectMode,
  onUploadAudio,
  onUploadLyrics,
}: MediaControlBarProps) {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const lyricsInputRef = useRef<HTMLInputElement>(null);

  if (zenMode) {
    return (
      <div className="fixed right-5 bottom-5 z-30 flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
          title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-[#0B0E17]/80 text-slate-200 transition-colors hover:bg-slate-800/90 focus-visible:outline-2 focus-visible:outline-cyan-400 shrink-0"
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4 text-cyan-400" aria-hidden="true" />
          ) : (
            <Maximize2 className="h-4 w-4 text-cyan-400" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={onToggleZenMode}
          aria-label="Hiện bảng điều khiển"
          className="flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-[#0B0E17]/80 px-3.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800/90 focus-visible:outline-2 focus-visible:outline-cyan-400 whitespace-nowrap shrink-0"
        >
          <Eye className="h-4 w-4 text-cyan-400" aria-hidden="true" />
          <span>Hiện điều khiển</span>
        </button>
      </div>
    );
  }

  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 flex flex-col items-center px-4 pb-4 pointer-events-none">
      {micError && (
        <div
          role="alert"
          className="pointer-events-auto mb-2 rounded-lg border border-rose-500/30 bg-rose-950/85 px-4 py-2 text-xs text-rose-200 backdrop-blur-md"
        >
          {micError}
        </div>
      )}

      <div className="pointer-events-auto flex w-full max-w-[1260px] flex-wrap md:flex-nowrap items-center justify-between gap-2.5 rounded-xl border border-white/12 bg-[#0B0E17]/92 px-3.5 py-2 shadow-2xl">
        {/* Left: Playback & Track summary */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          {audioMode === 'demo' && (
            <button
              type="button"
              onClick={onPrevDemo}
              aria-label="Bài mẫu trước"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-400 shrink-0"
            >
              <SkipBack className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

          <button
            type="button"
            onClick={onTogglePlay}
            data-testid="play-pause-btn"
            aria-label={isPlaying ? 'Tạm dừng nhạc' : 'Phát nhạc'}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-cyan-500 px-3 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400 focus-visible:outline-2 focus-visible:outline-cyan-300 whitespace-nowrap shrink-0"
          >
            {isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                <span>Tạm dừng</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                <span>Phát nhạc</span>
              </>
            )}
          </button>

          {audioMode === 'demo' && (
            <button
              type="button"
              onClick={onNextDemo}
              aria-label="Bài mẫu tiếp theo"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-400 shrink-0"
            >
              <SkipForward className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

          <div className="hidden xl:flex flex-col min-w-0 max-w-[155px] pl-1">
            <span className="truncate text-xs font-semibold text-slate-100">
              {track?.title ?? 'Chưa có bài hát'}
            </span>
            <span className="truncate text-[11px] text-slate-400">
              {track?.artist ?? 'Chọn nguồn âm thanh'}
            </span>
          </div>
        </div>

        {/* Center: Timeline scrubber */}
        <div className="flex flex-1 items-center gap-2 min-w-[130px] max-w-[260px]">
          <span className="font-mono-tabular text-[11px] text-slate-400 w-9 text-right shrink-0">
            {formatTimeMs(currentTimeMs)}
          </span>
          <input
            type="range"
            aria-label="Thanh thời gian phát nhạc"
            min={0}
            max={Math.max(1000, durationMs)}
            value={Math.min(currentTimeMs, Math.max(1000, durationMs))}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="studio-slider flex-1"
          />
          <span className="font-mono-tabular text-[11px] text-slate-400 w-9 shrink-0">
            {formatTimeMs(durationMs)}
          </span>
        </div>

        {/* Right: Audio Source selector + Volume + Uploads + Settings + Zen */}
        <div className="flex flex-wrap md:flex-nowrap items-center gap-1.5 shrink-0">
          <div
            role="group"
            aria-label="Nguồn âm thanh"
            className="flex items-center rounded-lg bg-white/5 p-0.5 border border-white/10"
          >
            <button
              type="button"
              onClick={() => onSelectMode('demo')}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                audioMode === 'demo'
                  ? 'bg-slate-800 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Nhạc mẫu
            </button>
            <button
              type="button"
              onClick={() => audioInputRef.current?.click()}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                audioMode === 'file'
                  ? 'bg-slate-800 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileAudio className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Tệp nhạc</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectMode('microphone')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                audioMode === 'microphone'
                  ? 'bg-slate-800 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mic className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Micro</span>
            </button>
          </div>

          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            aria-label="Tải lên tệp âm thanh"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadAudio(file);
              e.target.value = '';
            }}
          />

          <button
            type="button"
            onClick={() => lyricsInputRef.current?.click()}
            aria-label="Tải tệp lời bài hát LRC hoặc TXT"
            title="Tải tệp lời bài hát (.lrc / .txt)"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 whitespace-nowrap shrink-0"
          >
            <FileText className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
            <span className="hidden md:inline">Nạp LRC/TXT</span>
          </button>
          <input
            ref={lyricsInputRef}
            type="file"
            accept=".lrc,.txt"
            className="hidden"
            aria-label="Tải lên tệp lời bài hát"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadLyrics(file);
              e.target.value = '';
            }}
          />

          <div className="hidden lg:flex items-center gap-1.5 px-1.5">
            <Volume2 className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <input
              type="range"
              aria-label="Âm lượng"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="studio-slider w-16"
            />
          </div>

          <button
            type="button"
            onClick={onOpenSettings}
            data-testid="open-settings-btn"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-cyan-500/35 bg-cyan-500/15 px-3 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/25 focus-visible:outline-2 focus-visible:outline-cyan-400 whitespace-nowrap shrink-0"
          >
            <Settings className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Cài Đặt</span>
          </button>

          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
            title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white shrink-0"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={onToggleZenMode}
            aria-label="Ẩn thanh điều khiển"
            title="Chế độ Hình nền (Ẩn điều khiển)"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white shrink-0"
          >
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
}
