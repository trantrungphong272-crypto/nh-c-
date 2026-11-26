import { Music2 } from 'lucide-react';
import type { TrackMetadata, VisualizerSettings } from '../types/visualizer';
import type { ActiveLyricWindow } from '../utils/lrcParser';

interface LyricsOverlayProps {
  settings: VisualizerSettings;
  track: TrackMetadata | null;
  lyricWindow: ActiveLyricWindow;
  hasLyrics: boolean;
  isSynced: boolean;
  sourceLabel: string;
  isLoading: boolean;
}

export function LyricsOverlay({
  settings,
  track,
  lyricWindow,
  hasLyrics,
  isSynced,
  sourceLabel,
  isLoading,
}: LyricsOverlayProps) {
  if (!settings.showLyrics || settings.lyricsPosition === 'inside-ring') {
    return null;
  }

  if (settings.lyricsAutoShow && !track && !hasLyrics) {
    return null;
  }

  const isFloating = settings.lyricsPosition === 'floating-panel';
  const activeOpacity = Math.max(0.7, Math.min(1, settings.lyricsActiveBrightness / 100));
  const fontSize = settings.lyricsFontSize;

  const containerStyle: React.CSSProperties = isFloating
    ? {
        fontFamily: settings.lyricsFontFamily,
      }
    : {
        left: `${50 + settings.circleOffsetX}%`,
        top: `calc(${50 + settings.circleOffsetY}% + min(26vmin, 235px) * ${settings.circleSize})`,
        transform: 'translateX(-50%)',
        fontFamily: settings.lyricsFontFamily,
      };

  const renderContent = () => {
    if (isLoading) {
      return (
        <p className="text-sm text-slate-300/80">
          Đang tìm kiếm lời bài hát...
        </p>
      );
    }

    if (!hasLyrics) {
      return (
        <p data-testid="lyrics-empty-state" className="text-sm font-medium text-slate-400">
          Chưa tìm thấy lời bài hát
        </p>
      );
    }

    if (settings.lyricsDisplayMode === 'single-line') {
      const displayLine =
        lyricWindow.currentLine?.text ?? lyricWindow.nextLine?.text ?? 'Chưa tìm thấy lời bài hát';
      return (
        <p
          key={`single-${lyricWindow.activeIndex}`}
          data-testid="lyrics-current-line"
          className="font-semibold leading-snug transition-all duration-300"
          style={{
            fontSize: `${fontSize}px`,
            color: settings.lyricsColor,
            opacity: activeOpacity,
            textShadow: settings.neonGlow
              ? '0 0 18px rgba(34, 211, 238, 0.38)'
              : '0 2px 10px rgba(0, 0, 0, 0.85)',
          }}
        >
          {displayLine}
        </p>
      );
    }

    return (
      <div className="flex flex-col items-center gap-1.5 transition-all duration-300">
        {lyricWindow.prevLine && (
          <p
            data-testid="lyrics-prev-line"
            className="line-clamp-1 font-normal transition-opacity duration-300"
            style={{
              fontSize: `${Math.max(12, Math.round(fontSize * 0.78))}px`,
              color: settings.lyricsColor,
              opacity: 0.42,
            }}
          >
            {lyricWindow.prevLine.text}
          </p>
        )}

        <p
          key={`cur-${lyricWindow.activeIndex}`}
          data-testid="lyrics-current-line"
          className="font-semibold leading-snug transition-all duration-300"
          style={{
            fontSize: `${fontSize}px`,
            color: settings.lyricsColor,
            opacity: activeOpacity,
            textShadow: settings.neonGlow
              ? '0 0 20px rgba(34, 211, 238, 0.45)'
              : '0 2px 10px rgba(0, 0, 0, 0.85)',
          }}
        >
          {lyricWindow.currentLine?.text ?? '♪'}
        </p>

        {lyricWindow.nextLine && (
          <p
            data-testid="lyrics-next-line"
            className="line-clamp-1 font-normal transition-opacity duration-300"
            style={{
              fontSize: `${Math.max(12, Math.round(fontSize * 0.82))}px`,
              color: settings.lyricsColor,
              opacity: 0.56,
            }}
          >
            {lyricWindow.nextLine.text}
          </p>
        )}
      </div>
    );
  };

  if (isFloating) {
    return (
      <aside
        aria-label="Lời bài hát"
        data-testid="lyrics-floating-panel"
        style={containerStyle}
        className="pointer-events-none absolute left-6 bottom-24 z-20 max-w-md rounded-xl border border-white/10 bg-[#0B0E17]/75 px-5 py-4 backdrop-blur-md shadow-2xl"
      >
        <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
          <Music2 className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
          <span className="truncate font-medium text-slate-200">
            {track ? `${track.title} · ${track.artist}` : 'Lời bài hát'}
          </span>
          {hasLyrics && (
            <>
              <span aria-hidden="true">·</span>
              <span>{isSynced ? 'Đồng bộ' : sourceLabel}</span>
            </>
          )}
        </div>
        <div className="text-left">{renderContent()}</div>
      </aside>
    );
  }

  return (
    <section
      aria-label="Lời bài hát"
      data-testid="lyrics-below-ring"
      style={containerStyle}
      className="pointer-events-none absolute z-10 w-[min(92vw,680px)] px-4 text-center"
    >
      {renderContent()}
    </section>
  );
}
