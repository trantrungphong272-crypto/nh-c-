import { DEFAULT_SETTINGS } from './constants/palettes';
import { CircularVisualizerRenderer } from './engine/visualizerRenderer';
import type { ParsedLyrics, TrackMetadata, VisualizerSettings } from './types/visualizer';
import { formatVietnameseClock } from './utils/clockFormatter';
import { applyLivelyProperty, parseLivelyTrackPayload } from './utils/livelyBridge';
import { fetchLyricsFromLrcLib, resolveActiveLyric } from './utils/lrcParser';

// Standalone Lively Wallpaper runtime (bundled to public/lively-app.js)
// Override image URLs to relative paths inside Lively package
(function initLivelyStandalone() {
  const canvas = document.getElementById('visualizer-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;

  let settings: VisualizerSettings = { ...DEFAULT_SETTINGS };
  let activeTrack: TrackMetadata | null = null;
  let parsedLyrics: ParsedLyrics | null = null;
  let trackStartedAtMs = performance.now();
  let isPaused = false;

  const renderer = new CircularVisualizerRenderer(canvas, settings, () => false);
  // Preload relative local images for offline Lively package
  const bgMap = (renderer as unknown as { bgImages?: Record<string, HTMLImageElement> }).bgImages;
  if (bgMap) {
    bgMap.nebula = new Image();
    bgMap.nebula.src = './bg-nebula.jpg';
    bgMap.city = new Image();
    bgMap.city.src = './bg-city-lights.jpg';
  }
  renderer.start();

  window.addEventListener('resize', () => renderer.resize());

  const hudEl = document.getElementById('center-hud');
  const albumArtEl = document.getElementById('album-art') as HTMLImageElement | null;
  const clockTimeEl = document.getElementById('clock-time');
  const clockDateEl = document.getElementById('clock-date');
  const trackInfoEl = document.getElementById('track-info');
  const trackTitleEl = document.getElementById('track-title');
  const trackArtistEl = document.getElementById('track-artist');
  const lyricsContainerEl = document.getElementById('lyrics-container');
  const lyricPrevEl = document.getElementById('lyric-prev');
  const lyricCurrentEl = document.getElementById('lyric-current');
  const lyricNextEl = document.getElementById('lyric-next');

  function syncHudLayout() {
    if (hudEl) {
      hudEl.style.left = `${50 + settings.circleOffsetX}%`;
      hudEl.style.top = `${50 + settings.circleOffsetY}%`;
      hudEl.style.transform = `translate(-50%, -50%) scale(${settings.circleSize})`;
    }
    if (lyricsContainerEl) {
      lyricsContainerEl.style.display = settings.showLyrics ? 'block' : 'none';
      if (settings.lyricsPosition === 'inside-ring') {
        lyricsContainerEl.style.top = `calc(${50 + settings.circleOffsetY}% + 72px)`;
      } else {
        lyricsContainerEl.style.top = `calc(${50 + settings.circleOffsetY}% + min(24vmin, 215px) * ${settings.circleSize})`;
      }
      lyricsContainerEl.style.left = `${50 + settings.circleOffsetX}%`;
    }
  }

  function updateClockAndLyrics() {
    const clock = formatVietnameseClock(new Date(), settings.clock24Hour);
    if (clockTimeEl) {
      clockTimeEl.style.display = settings.showClock ? 'block' : 'none';
      clockTimeEl.textContent = clock.periodStr
        ? `${clock.timeFormatted} ${clock.periodStr}`
        : clock.timeFormatted;
    }
    if (clockDateEl) {
      clockDateEl.style.display = settings.showClock ? 'block' : 'none';
      clockDateEl.textContent = clock.dateLineStr;
    }

    if (trackInfoEl && trackTitleEl && trackArtistEl) {
      trackInfoEl.style.display = settings.showTrackInfo && activeTrack ? 'block' : 'none';
      trackTitleEl.textContent = activeTrack?.title ?? '';
      trackArtistEl.textContent = activeTrack?.artist ?? '';
    }

    if (albumArtEl) {
      if (settings.showAlbumArt && activeTrack?.albumArtUrl) {
        albumArtEl.src = activeTrack.albumArtUrl;
        albumArtEl.style.display = 'block';
      } else {
        albumArtEl.style.display = 'none';
      }
    }

    if (lyricPrevEl && lyricCurrentEl && lyricNextEl) {
      lyricCurrentEl.style.color = settings.lyricsColor;
      lyricCurrentEl.style.fontSize = `${settings.lyricsFontSize}px`;
      lyricCurrentEl.style.opacity = String(settings.lyricsActiveBrightness / 100);

      if (!parsedLyrics || parsedLyrics.lines.length === 0) {
        lyricPrevEl.textContent = '';
        lyricCurrentEl.textContent = activeTrack ? 'Chưa tìm thấy lời bài hát' : '';
        lyricNextEl.textContent = '';
      } else {
        const elapsedMs = isPaused ? 0 : performance.now() - trackStartedAtMs;
        const win = resolveActiveLyric(parsedLyrics.lines, elapsedMs, settings.lyricsOffsetMs);
        if (settings.lyricsDisplayMode === 'single-line') {
          lyricPrevEl.textContent = '';
          lyricCurrentEl.textContent = win.currentLine?.text ?? win.nextLine?.text ?? '';
          lyricNextEl.textContent = '';
        } else {
          lyricPrevEl.textContent = win.prevLine?.text ?? '';
          lyricCurrentEl.textContent = win.currentLine?.text ?? '♪';
          lyricNextEl.textContent = win.nextLine?.text ?? '';
        }
      }
    }
  }

  syncHudLayout();
  updateClockAndLyrics();
  window.setInterval(updateClockAndLyrics, 250);

  // Lively Wallpaper Official Callbacks
  window.livelyAudioListener = (audioArray: number[]) => {
    if (Array.isArray(audioArray)) {
      renderer.pushLivelyAudio(audioArray);
    }
  };

  window.livelyCurrentTrack = (data: string | Record<string, unknown>) => {
    const nextTrack = parseLivelyTrackPayload(data);
    if (!nextTrack) {
      activeTrack = null;
      parsedLyrics = null;
      updateClockAndLyrics();
      return;
    }
    const changed =
      !activeTrack ||
      activeTrack.title !== nextTrack.title ||
      activeTrack.artist !== nextTrack.artist;
    activeTrack = nextTrack;
    if (changed) {
      trackStartedAtMs = performance.now();
      parsedLyrics = null;
      void fetchLyricsFromLrcLib(nextTrack.title, nextTrack.artist).then((res) => {
        if (
          activeTrack &&
          activeTrack.title === nextTrack.title &&
          activeTrack.artist === nextTrack.artist
        ) {
          parsedLyrics = res;
          updateClockAndLyrics();
        }
      });
    }
    updateClockAndLyrics();
  };

  window.livelyWallpaperPlaybackChanged = (data: { IsPaused?: boolean } | boolean) => {
    const paused = typeof data === 'boolean' ? data : Boolean(data?.IsPaused);
    isPaused = paused;
    renderer.setPaused(paused);
  };

  window.livelyPropertyListener = (name: string, val: unknown) => {
    settings = applyLivelyProperty(settings, name, val);
    renderer.updateSettings(settings);
    syncHudLayout();
    updateClockAndLyrics();
  };
})();
