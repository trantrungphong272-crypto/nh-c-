import type { LyricLine, ParsedLyrics } from '../types/visualizer';

const TIMESTAMP_REGEX = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
const METADATA_REGEX = /^\[(ti|ar|al|by|offset):([^\]]*)\]$/i;

export function parseLrc(rawText: string, sourceLabel = 'Tệp LRC'): ParsedLyrics {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { lines: [], isSynced: false, sourceLabel };
  }

  const rawLines = trimmed.split(/\r?\n/);
  const syncedLines: LyricLine[] = [];
  let title: string | undefined;
  let artist: string | undefined;
  let album: string | undefined;
  let fileOffsetMs = 0;

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) continue;

    const metaMatch = line.match(METADATA_REGEX);
    if (metaMatch) {
      const tag = metaMatch[1].toLowerCase();
      const value = metaMatch[2].trim();
      if (tag === 'ti' && value) title = value;
      else if (tag === 'ar' && value) artist = value;
      else if (tag === 'al' && value) album = value;
      else if (tag === 'offset') {
        const parsedOffset = Number.parseInt(value, 10);
        if (Number.isFinite(parsedOffset)) {
          fileOffsetMs = parsedOffset;
        }
      }
      continue;
    }

    TIMESTAMP_REGEX.lastIndex = 0;
    const timestamps: number[] = [];
    let match: RegExpExecArray | null;
    while ((match = TIMESTAMP_REGEX.exec(line)) !== null) {
      const minutes = Number.parseInt(match[1], 10);
      const seconds = Number.parseInt(match[2], 10);
      const fracStr = match[3] ?? '0';
      let ms = 0;
      if (fracStr.length === 1) {
        ms = Number.parseInt(fracStr, 10) * 100;
      } else if (fracStr.length === 2) {
        ms = Number.parseInt(fracStr, 10) * 10;
      } else {
        ms = Number.parseInt(fracStr.slice(0, 3), 10);
      }
      timestamps.push(minutes * 60_000 + seconds * 1000 + ms);
    }

    if (timestamps.length > 0) {
      const lyricText = line.replace(TIMESTAMP_REGEX, '').trim();
      if (lyricText.length > 0) {
        for (const ts of timestamps) {
          syncedLines.push({
            timeMs: Math.max(0, ts + fileOffsetMs),
            text: lyricText,
          });
        }
      }
    }
  }

  if (syncedLines.length > 0) {
    syncedLines.sort((a, b) => a.timeMs - b.timeMs);
    return {
      lines: syncedLines,
      isSynced: true,
      title,
      artist,
      album,
      offsetMs: fileOffsetMs,
      sourceLabel,
    };
  }

  // Fallback to plain TXT lyrics when no LRC timestamps exist
  return parsePlainLyrics(rawText, sourceLabel === 'Tệp LRC' ? 'Tệp TXT' : sourceLabel);
}

export function parsePlainLyrics(
  rawText: string,
  sourceLabel = 'Văn bản thuần',
  totalDurationMs = 180_000,
): ParsedLyrics {
  const cleanLines = rawText
    .split(/\r?\n/)
    .map((l) => l.replace(TIMESTAMP_REGEX, '').trim())
    .filter((l) => l.length > 0 && !METADATA_REGEX.test(l));

  if (cleanLines.length === 0) {
    return { lines: [], isSynced: false, sourceLabel };
  }

  const stepMs = Math.max(2500, Math.floor(totalDurationMs / cleanLines.length));
  const lines: LyricLine[] = cleanLines.map((text, index) => ({
    timeMs: index * stepMs,
    text,
  }));

  return {
    lines,
    isSynced: false,
    sourceLabel,
  };
}

export interface ActiveLyricWindow {
  activeIndex: number;
  prevLine: LyricLine | null;
  currentLine: LyricLine | null;
  nextLine: LyricLine | null;
  progressInLine: number; // 0 to 1
}

export function resolveActiveLyric(
  lines: LyricLine[],
  playbackTimeMs: number,
  userOffsetMs = 0,
): ActiveLyricWindow {
  if (lines.length === 0) {
    return {
      activeIndex: -1,
      prevLine: null,
      currentLine: null,
      nextLine: null,
      progressInLine: 0,
    };
  }

  const adjustedMs = playbackTimeMs + userOffsetMs;

  if (adjustedMs < lines[0].timeMs) {
    return {
      activeIndex: -1,
      prevLine: null,
      currentLine: null,
      nextLine: lines[0],
      progressInLine: 0,
    };
  }

  // Binary search for largest index with timeMs <= adjustedMs
  let lo = 0;
  let hi = lines.length - 1;
  let activeIndex = 0;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].timeMs <= adjustedMs) {
      activeIndex = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  const currentLine = lines[activeIndex] ?? null;
  const prevLine = activeIndex > 0 ? lines[activeIndex - 1] : null;
  const nextLine = activeIndex < lines.length - 1 ? lines[activeIndex + 1] : null;

  let progressInLine = 0;
  if (currentLine) {
    const nextStart = nextLine ? nextLine.timeMs : currentLine.timeMs + 5000;
    const span = Math.max(500, nextStart - currentLine.timeMs);
    progressInLine = Math.min(1, Math.max(0, (adjustedMs - currentLine.timeMs) / span));
  }

  return {
    activeIndex,
    prevLine,
    currentLine,
    nextLine,
    progressInLine,
  };
}

export function buildLyricsCacheKey(title: string, artist: string): string {
  const norm = (v: string) =>
    v
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  return `vtn_lyrics_v1::${norm(artist)}::${norm(title)}`;
}

interface LrcLibResponseItem {
  trackName?: string;
  artistName?: string;
  albumName?: string;
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
}

const memoryLyricsCache = new Map<string, ParsedLyrics | null>();

export async function fetchLyricsFromLrcLib(
  title: string,
  artist: string,
  signal?: AbortSignal,
): Promise<ParsedLyrics | null> {
  const cleanTitle = title.trim();
  const cleanArtist = artist.trim();
  if (!cleanTitle) return null;

  const cacheKey = buildLyricsCacheKey(cleanTitle, cleanArtist);
  if (memoryLyricsCache.has(cacheKey)) {
    return memoryLyricsCache.get(cacheKey) ?? null;
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const cachedRaw = window.localStorage.getItem(cacheKey);
      if (cachedRaw) {
        const parsed = JSON.parse(cachedRaw) as ParsedLyrics | null;
        if (parsed && Array.isArray(parsed.lines) && parsed.lines.length > 0) {
          memoryLyricsCache.set(cacheKey, parsed);
          return parsed;
        }
      }
    }
  } catch {
    // Ignore storage read failures
  }

  try {
    const params = new URLSearchParams({ track_name: cleanTitle });
    if (cleanArtist) {
      params.set('artist_name', cleanArtist);
    }

    const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
      signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (res.ok) {
      const data = (await res.json()) as LrcLibResponseItem;
      const result = extractLrcLibResult(data, cleanTitle, cleanArtist);
      if (result) {
        saveLyricsToCache(cacheKey, result);
        return result;
      }
    }

    // Fallback to search endpoint if exact /get returns 404
    const searchParams = new URLSearchParams({ q: `${cleanArtist} ${cleanTitle}`.trim() });
    const searchRes = await fetch(`https://lrclib.net/api/search?${searchParams.toString()}`, {
      signal,
      headers: { Accept: 'application/json' },
    });

    if (searchRes.ok) {
      const list = (await searchRes.json()) as LrcLibResponseItem[];
      if (Array.isArray(list) && list.length > 0) {
        const withSynced = list.find((item) => Boolean(item.syncedLyrics)) ?? list[0];
        const result = extractLrcLibResult(withSynced, cleanTitle, cleanArtist);
        if (result) {
          saveLyricsToCache(cacheKey, result);
          return result;
        }
      }
    }
  } catch {
    // Network unavailable or aborted
  }

  memoryLyricsCache.set(cacheKey, null);
  return null;
}

function extractLrcLibResult(
  data: LrcLibResponseItem,
  fallbackTitle: string,
  fallbackArtist: string,
): ParsedLyrics | null {
  if (data.syncedLyrics) {
    const parsed = parseLrc(data.syncedLyrics, 'LRCLIB (Đồng bộ)');
    if (parsed.lines.length > 0) {
      parsed.title = data.trackName || fallbackTitle;
      parsed.artist = data.artistName || fallbackArtist;
      parsed.album = data.albumName;
      return parsed;
    }
  }
  if (data.plainLyrics) {
    const parsed = parsePlainLyrics(data.plainLyrics, 'LRCLIB (Văn bản)');
    if (parsed.lines.length > 0) {
      parsed.title = data.trackName || fallbackTitle;
      parsed.artist = data.artistName || fallbackArtist;
      parsed.album = data.albumName;
      return parsed;
    }
  }
  return null;
}

function saveLyricsToCache(cacheKey: string, result: ParsedLyrics): void {
  memoryLyricsCache.set(cacheKey, result);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(cacheKey, JSON.stringify(result));
    }
  } catch {
    // Ignore quota errors
  }
}
