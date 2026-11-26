import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CenterHud } from './components/CenterHud';
import { LyricsOverlay } from './components/LyricsOverlay';
import { MediaControlBar } from './components/MediaControlBar';
import { SettingsDrawer } from './components/SettingsDrawer';
import { DEFAULT_SETTINGS, DEMO_TRACKS } from './constants/palettes';
import { WebAudioEngine } from './engine/demoSynth';
import { CircularVisualizerRenderer } from './engine/visualizerRenderer';
import type {
  AudioInputMode,
  ParsedLyrics,
  TrackMetadata,
  VisualizerSettings,
} from './types/visualizer';
import { exportLivelyWallpaperZip } from './utils/exportLivelyPackage';
import { applyLivelyProperty, parseLivelyTrackPayload } from './utils/livelyBridge';
import {
  fetchLyricsFromLrcLib,
  parseLrc,
  resolveActiveLyric,
} from './utils/lrcParser';

const SETTINGS_STORAGE_KEY = 'vong_tron_nhac_settings_v1';

function loadSavedSettings(): VisualizerSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<VisualizerSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function App() {
  const [settings, setSettings] = useState<VisualizerSettings>(loadSavedSettings);
  const [audioMode, setAudioMode] = useState<AudioInputMode>('demo');
  const [demoIndex, setDemoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(DEMO_TRACKS[0].durationSec * 1000);
  const [volume, setVolume] = useState(0.75);

  const [track, setTrack] = useState<TrackMetadata | null>(() => ({
    title: DEMO_TRACKS[0].title,
    artist: DEMO_TRACKS[0].artist,
    album: DEMO_TRACKS[0].album,
    albumArtUrl: DEMO_TRACKS[0].albumArtUrl,
    durationMs: DEMO_TRACKS[0].durationSec * 1000,
  }));

  const [parsedLyrics, setParsedLyrics] = useState<ParsedLyrics>(() =>
    parseLrc(DEMO_TRACKS[0].lrcContent, 'Nhạc mẫu LRC'),
  );
  const [isLyricsLoading, setIsLyricsLoading] = useState(false);
  const [lyricsStatusMessage, setLyricsStatusMessage] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<CircularVisualizerRenderer | null>(null);
  const audioEngineRef = useRef<WebAudioEngine | null>(null);
  const audioModeRef = useRef<AudioInputMode>(audioMode);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const livelyStartedAtRef = useRef<number>(performance.now());
  const activeTrackRef = useRef<TrackMetadata | null>(track);

  audioModeRef.current = audioMode;
  isPlayingRef.current = isPlaying;
  activeTrackRef.current = track;

  // Persist user settings (excluding ephemeral object URLs)
  useEffect(() => {
    try {
      const toSave = { ...settings, customBackgroundUrl: null };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      // Ignore storage failures
    }
    rendererRef.current?.updateSettings(settings);
  }, [settings]);

  // Mount Canvas2D Renderer + WebAudioEngine once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new WebAudioEngine();
    audioEngineRef.current = engine;

    const renderer = new CircularVisualizerRenderer(canvas, settings, (out) => {
      if (audioModeRef.current === 'lively') {
        return false; // Lively pushes directly via livelyAudioListener
      }
      return engine.readFrequencyData(out);
    });
    rendererRef.current = renderer;
    renderer.start();

    const handleResize = () => renderer.resize();
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      renderer.stop();
      engine.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Playback time ticker for synced LRC lyrics
  useEffect(() => {
    if (!isPlaying) return;

    const id = window.setInterval(() => {
      const engine = audioEngineRef.current;
      if (audioMode === 'demo' && engine) {
        setCurrentTimeMs(engine.getDemoTimeMs());
      } else if (audioMode === 'file' && engine) {
        const t = engine.getFileTimeMs();
        setCurrentTimeMs(t.currentMs);
        if (t.durationMs > 0) setDurationMs(t.durationMs);
      } else if (audioMode === 'lively') {
        setCurrentTimeMs(performance.now() - livelyStartedAtRef.current);
      }
    }, 250);

    return () => clearInterval(id);
  }, [isPlaying, audioMode]);

  // Online lyrics lookup helper (LRCLIB + cache)
  const lookupLyricsOnline = useCallback(
    async (title: string, artist: string) => {
      if (!title.trim()) {
        setLyricsStatusMessage('Vui lòng nhập tên bài hát để tìm kiếm.');
        return;
      }
      setIsLyricsLoading(true);
      setLyricsStatusMessage('Đang tìm lời bài hát trên LRCLIB...');
      const found = await fetchLyricsFromLrcLib(title, artist);
      setIsLyricsLoading(false);
      if (found) {
        setParsedLyrics(found);
        setLyricsStatusMessage(`Đã tải lời bài hát (${found.sourceLabel}).`);
      } else {
        setParsedLyrics({ lines: [], isSynced: false, sourceLabel: 'Không có' });
        setLyricsStatusMessage('Chưa tìm thấy lời bài hát phù hợp.');
      }
    },
    [],
  );

  // Register official Lively Wallpaper callbacks on window
  useEffect(() => {
    window.livelyAudioListener = (audioArray: number[]) => {
      if (Array.isArray(audioArray)) {
        if (audioModeRef.current !== 'lively' && !isPlayingRef.current) {
          setAudioMode('lively');
          setIsPlaying(true);
        }
        rendererRef.current?.pushLivelyAudio(audioArray);
      }
    };

    window.livelyCurrentTrack = (data: string | Record<string, unknown>) => {
      const next = parseLivelyTrackPayload(data);
      if (!next) {
        setTrack(null);
        setParsedLyrics({ lines: [], isSynced: false, sourceLabel: 'Không có' });
        return;
      }
      const prev = activeTrackRef.current;
      const changed = !prev || prev.title !== next.title || prev.artist !== next.artist;
      setTrack(next);
      if (changed) {
        livelyStartedAtRef.current = performance.now();
        setCurrentTimeMs(0);
        void lookupLyricsOnline(next.title, next.artist);
      }
    };

    window.livelyWallpaperPlaybackChanged = (data: { IsPaused?: boolean } | boolean) => {
      const paused = typeof data === 'boolean' ? data : Boolean(data?.IsPaused);
      rendererRef.current?.setPaused(paused);
      if (paused) {
        setIsPlaying(false);
      } else if (audioModeRef.current === 'lively') {
        setIsPlaying(true);
      }
    };

    window.livelyPropertyListener = (name: string, val: unknown) => {
      setSettings((prev) => applyLivelyProperty(prev, name, val));
    };

    return () => {
      delete window.livelyAudioListener;
      delete window.livelyCurrentTrack;
      delete window.livelyWallpaperPlaybackChanged;
      delete window.livelyPropertyListener;
    };
  }, [lookupLyricsOnline]);

  const loadDemoTrack = useCallback(
    (idx: number, autoPlay: boolean) => {
      const safeIdx = (idx + DEMO_TRACKS.length) % DEMO_TRACKS.length;
      const demo = DEMO_TRACKS[safeIdx];
      setDemoIndex(safeIdx);
      setAudioMode('demo');
      setMicError(null);
      setTrack({
        title: demo.title,
        artist: demo.artist,
        album: demo.album,
        albumArtUrl: demo.albumArtUrl,
        durationMs: demo.durationSec * 1000,
      });
      setDurationMs(demo.durationSec * 1000);
      setCurrentTimeMs(0);
      setParsedLyrics(parseLrc(demo.lrcContent, 'Nhạc mẫu LRC'));
      setLyricsStatusMessage(`Đang sử dụng lời đồng bộ của "${demo.title}".`);

      const engine = audioEngineRef.current;
      if (engine) {
        if (autoPlay) {
          engine.startDemo(demo, 0);
          setIsPlaying(true);
        } else {
          engine.pauseDemo();
          setIsPlaying(false);
        }
      }
    },
    [],
  );

  const handleTogglePlay = useCallback(() => {
    const engine = audioEngineRef.current;
    if (!engine) return;

    if (audioMode === 'demo') {
      const demo = DEMO_TRACKS[demoIndex];
      if (isPlaying) {
        engine.pauseDemo();
        setIsPlaying(false);
      } else {
        engine.startDemo(demo, currentTimeMs);
        setIsPlaying(true);
      }
    } else if (audioMode === 'file') {
      const next = !isPlaying;
      engine.toggleFilePlayback(next);
      setIsPlaying(next);
    } else if (audioMode === 'microphone') {
      if (isPlaying) {
        engine.stopMicrophone();
        setIsPlaying(false);
      } else {
        void engine
          .startMicrophone()
          .then(() => {
            setMicError(null);
            setIsPlaying(true);
          })
          .catch(() => {
            setMicError(
              'Không thể truy cập Micro. Vui lòng cấp quyền âm thanh trong trình duyệt.',
            );
            setIsPlaying(false);
          });
      }
    }
  }, [audioMode, currentTimeMs, demoIndex, isPlaying]);

  const handleSelectMode = useCallback(
    (nextMode: AudioInputMode) => {
      const engine = audioEngineRef.current;
      if (!engine) return;
      setMicError(null);

      if (nextMode === 'demo') {
        loadDemoTrack(demoIndex, true);
      } else if (nextMode === 'microphone') {
        setAudioMode('microphone');
        setTrack({
          title: 'Âm thanh Micro / Hệ thống',
          artist: 'Thu âm thời gian thực',
          albumArtUrl: null,
        });
        setParsedLyrics({ lines: [], isSynced: false, sourceLabel: 'Không có' });
        void engine
          .startMicrophone()
          .then(() => setIsPlaying(true))
          .catch(() => {
            setMicError(
              'Không thể truy cập Micro. Vui lòng cấp quyền âm thanh trong trình duyệt.',
            );
            setIsPlaying(false);
          });
      }
    },
    [demoIndex, loadDemoTrack],
  );

  const handleUploadAudio = useCallback(
    (file: File) => {
      const engine = audioEngineRef.current;
      if (!engine) return;
      setMicError(null);
      setAudioMode('file');

      const rawName = file.name.replace(/\.[^/.]+$/, '');
      const parts = rawName.split(' - ');
      const title = parts.length > 1 ? parts.slice(1).join(' - ').trim() : rawName;
      const artist = parts.length > 1 ? parts[0].trim() : 'Tệp âm thanh cục bộ';

      setTrack({
        title,
        artist,
        albumArtUrl: null,
      });
      setCurrentTimeMs(0);

      engine.loadAudioFile(
        file,
        (cur, dur) => {
          setCurrentTimeMs(cur);
          if (dur > 0) setDurationMs(dur);
        },
        () => {
          setIsPlaying(false);
        },
      );
      setIsPlaying(true);
      void lookupLyricsOnline(title, artist === 'Tệp âm thanh cục bộ' ? '' : artist);
    },
    [lookupLyricsOnline],
  );

  const handleUploadLyrics = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const isLrc = file.name.toLowerCase().endsWith('.lrc');
      const parsed = parseLrc(content, isLrc ? `Tệp LRC (${file.name})` : `Tệp TXT (${file.name})`);
      setParsedLyrics(parsed);
      setLyricsStatusMessage(
        parsed.lines.length > 0
          ? `Đã nạp ${parsed.lines.length} dòng lời bài hát từ "${file.name}".`
          : 'Tệp lời bài hát trống hoặc không hợp lệ.',
      );
    };
    reader.readAsText(file, 'utf-8');
  }, []);

  const handleApplyManualLyrics = useCallback((rawText: string) => {
    const parsed = parseLrc(rawText, 'Nhập thủ công');
    setParsedLyrics(parsed);
    setLyricsStatusMessage(
      parsed.lines.length > 0
        ? `Đã áp dụng ${parsed.lines.length} dòng lời bài hát thủ công.`
        : 'Không có dòng lời hợp lệ.',
    );
  }, []);

  const handleSeek = useCallback(
    (ms: number) => {
      setCurrentTimeMs(ms);
      if (audioMode === 'demo') {
        audioEngineRef.current?.seekDemo(ms);
      } else if (audioMode === 'file') {
        audioEngineRef.current?.seekFile(ms);
      } else if (audioMode === 'lively') {
        livelyStartedAtRef.current = performance.now() - ms;
      }
    },
    [audioMode],
  );

  const handleVolumeChange = useCallback((vol: number) => {
    setVolume(vol);
    audioEngineRef.current?.setVolume(vol);
  }, []);

  const handleUpdateSetting = useCallback(
    <K extends keyof VisualizerSettings>(key: K, value: VisualizerSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleApplyPreset = useCallback((patch: Partial<VisualizerSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }, []);

  const handleUploadCustomBackground = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setSettings((prev) => ({
      ...prev,
      background: 'custom',
      customBackgroundUrl: url,
    }));
  }, []);

  const handleExportLivelyZip = useCallback(async () => {
    setIsExportingZip(true);
    try {
      await exportLivelyWallpaperZip();
      setLyricsStatusMessage('Đã đóng gói và tải xuống VongTronNhac-LivelyWallpaper.zip');
    } catch {
      setLyricsStatusMessage('Không thể đóng gói tệp ZIP. Vui lòng thử lại.');
    } finally {
      setIsExportingZip(false);
    }
  }, []);

  const lyricWindow = useMemo(
    () => resolveActiveLyric(parsedLyrics.lines, currentTimeMs, settings.lyricsOffsetMs),
    [parsedLyrics.lines, currentTimeMs, settings.lyricsOffsetMs],
  );

  const hasLyrics = parsedLyrics.lines.length > 0;

  return (
    <main
      className="relative h-screen w-screen overflow-hidden bg-[#07090E] select-none"
      data-playing={isPlaying ? 'true' : 'false'}
      data-audio-mode={audioMode}
    >
      <canvas
        ref={canvasRef}
        data-testid="visualizer-canvas"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
            rendererRef.current?.setPointerNormalized(nx, ny);
          }
        }}
        onMouseLeave={() => rendererRef.current?.setPointerNormalized(0, 0)}
        onClick={(e) => rendererRef.current?.triggerRipple(e.clientX, e.clientY)}
        onDoubleClick={() => setZenMode((z) => !z)}
        className="block h-full w-full cursor-pointer"
      />

      {/* Minimal top title mark when not in Zen Mode */}
      {!zenMode && (
        <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-4">
          <h1 className="font-display text-base font-semibold tracking-tight text-white/90 whitespace-nowrap">
            Vòng Tròn Nhạc
          </h1>
          <span className="font-mono-tabular text-xs text-slate-400/85">
            {audioMode === 'demo'
              ? 'Nhạc mẫu tương tác'
              : audioMode === 'file'
                ? 'Tệp nhạc cục bộ'
                : audioMode === 'microphone'
                  ? 'Micro thời gian thực'
                  : 'Chế độ Lively Wallpaper'}
          </span>
        </header>
      )}

      <CenterHud
        settings={settings}
        track={track}
        lyricWindow={lyricWindow}
        hasLyrics={hasLyrics}
        isLyricsLoading={isLyricsLoading}
      />

      <LyricsOverlay
        settings={settings}
        track={track}
        lyricWindow={lyricWindow}
        hasLyrics={hasLyrics}
        isSynced={parsedLyrics.isSynced}
        sourceLabel={parsedLyrics.sourceLabel}
        isLoading={isLyricsLoading}
      />

      {!isSettingsOpen && (
        <MediaControlBar
          audioMode={audioMode}
          isPlaying={isPlaying}
          zenMode={zenMode}
          isFullscreen={isFullscreen}
          currentTimeMs={currentTimeMs}
          durationMs={durationMs}
          volume={volume}
          track={track}
          micError={micError}
          onToggleZenMode={() => setZenMode((z) => !z)}
          onToggleFullscreen={handleToggleFullscreen}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onTogglePlay={handleTogglePlay}
          onPrevDemo={() => loadDemoTrack(demoIndex - 1, isPlaying)}
          onNextDemo={() => loadDemoTrack(demoIndex + 1, isPlaying)}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onSelectMode={handleSelectMode}
          onUploadAudio={handleUploadAudio}
          onUploadLyrics={handleUploadLyrics}
        />
      )}

      <SettingsDrawer
        isOpen={isSettingsOpen}
        settings={settings}
        track={track}
        lyricsStatusMessage={lyricsStatusMessage}
        isExportingZip={isExportingZip}
        onClose={() => setIsSettingsOpen(false)}
        onUpdate={handleUpdateSetting}
        onApplyPreset={handleApplyPreset}
        onResetDefaults={() => setSettings(DEFAULT_SETTINGS)}
        onApplyManualLyrics={handleApplyManualLyrics}
        onUploadLyricsFile={handleUploadLyrics}
        onSearchOnlineLyrics={lookupLyricsOnline}
        onUploadCustomBackground={handleUploadCustomBackground}
        onExportLivelyZip={handleExportLivelyZip}
      />
    </main>
  );
}
