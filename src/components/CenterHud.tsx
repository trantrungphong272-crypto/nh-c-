import { Disc3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { TrackMetadata, VisualizerSettings } from '../types/visualizer';
import { formatVietnameseClock } from '../utils/clockFormatter';
import type { ActiveLyricWindow } from '../utils/lrcParser';

interface CenterHudProps {
  settings: VisualizerSettings;
  track: TrackMetadata | null;
  lyricWindow: ActiveLyricWindow;
  hasLyrics: boolean;
  isLyricsLoading: boolean;
}

export function CenterHud({
  settings,
  track,
  lyricWindow,
  hasLyrics,
  isLyricsLoading,
}: CenterHudProps) {
  const [now, setNow] = useState(() => new Date());
  const [albumArtError, setAlbumArtError] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setAlbumArtError(false);
  }, [track?.albumArtUrl]);

  const clock = formatVietnameseClock(now, settings.clock24Hour);
  const showInsideLyrics =
    settings.showLyrics && settings.lyricsPosition === 'inside-ring';

  // Position matches CircularVisualizerRenderer center calculation
  const leftPct = 50 + settings.circleOffsetX;
  const topPct = 50 + settings.circleOffsetY;
  const scale = Math.max(0.65, Math.min(1.35, settings.circleSize));

  return (
    <div
      className="pointer-events-none absolute z-10 flex flex-col items-center justify-center text-center select-none"
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        width: 'min(38vmin, 320px)',
      }}
    >
      {/* Album Art (optional compact circular disc) */}
      {settings.showAlbumArt && track && (
        <div className="mb-2.5 flex items-center justify-center">
          {track.albumArtUrl && !albumArtError ? (
            <img
              src={track.albumArtUrl}
              alt={`Ảnh bìa ${track.title}`}
              referrerPolicy="no-referrer"
              onError={() => setAlbumArtError(true)}
              className="h-12 w-12 rounded-full object-cover ring-1 ring-white/25 shadow-lg"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/80 ring-1 ring-white/20">
              <Disc3 className="h-6 w-6 text-cyan-300/80" aria-hidden="true" />
            </div>
          )}
        </div>
      )}

      {/* Digital Clock */}
      {settings.showClock && (
        <div className="flex flex-col items-center">
          <div className="flex items-baseline gap-1.5">
            <time
              dateTime={now.toISOString()}
              data-testid="vietnamese-clock-time"
              key={clock.timeFormatted}
              className="font-display text-5xl sm:text-6xl font-bold tracking-tight text-white tabular-nums transition-opacity duration-300"
              style={{
                textShadow: settings.neonGlow
                  ? '0 0 24px rgba(34, 211, 238, 0.45)'
                  : '0 2px 12px rgba(0, 0, 0, 0.75)',
              }}
            >
              {clock.timeFormatted}
            </time>
            {clock.periodStr && (
              <span className="font-mono-tabular text-xs font-semibold text-cyan-300/90">
                {clock.periodStr}
              </span>
            )}
          </div>
          <p
            data-testid="vietnamese-clock-date"
            className="mt-1 text-xs sm:text-sm font-medium tracking-wide text-slate-200/90"
          >
            {clock.dateLineStr}
          </p>
        </div>
      )}

      {/* Track Metadata inside circle */}
      {settings.showTrackInfo && track && (
        <div className="mt-2.5 max-w-[85%] space-y-0.5">
          <p
            data-testid="center-track-title"
            className="truncate text-sm font-semibold text-white/95"
          >
            {track.title}
          </p>
          <p
            data-testid="center-track-artist"
            className="truncate text-xs text-slate-300/80"
          >
            {track.artist}
          </p>
        </div>
      )}

      {/* Optional Inside-Ring Lyrics */}
      {showInsideLyrics && (
        <div className="mt-3 max-w-[92%] px-2">
          {isLyricsLoading ? (
            <p className="text-xs text-slate-300/75">Đang tải lời bài hát...</p>
          ) : !hasLyrics ? (
            <p className="text-xs text-slate-400/80">Chưa tìm thấy lời bài hát</p>
          ) : (
            <p
              key={lyricWindow.activeIndex}
              className="line-clamp-2 text-xs sm:text-sm font-medium transition-opacity duration-300"
              style={{
                color: settings.lyricsColor,
                fontFamily: settings.lyricsFontFamily,
                opacity: settings.lyricsActiveBrightness / 100,
              }}
            >
              {lyricWindow.currentLine?.text ?? lyricWindow.nextLine?.text ?? ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
