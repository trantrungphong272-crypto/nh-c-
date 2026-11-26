import test from 'node:test';
import assert from 'node:assert/strict';
import { formatVietnameseClock } from './clockFormatter';
import { parseLrc, parsePlainLyrics, resolveActiveLyric, buildLyricsCacheKey } from './lrcParser';
import { AudioSpectrumProcessor } from './audioProcessor';
import { applyLivelyProperty, parseLivelyTrackPayload } from './livelyBridge';
import { DEFAULT_SETTINGS, WALLPAPER_PRESETS } from '../constants/palettes';
import { buildZipArchive, crc32 } from './zipBuilder';
import { hexToRgb, interpolatePaletteRgb, rgbToCss } from './colorUtils';

test('formatVietnameseClock formats 24h and 12h with Vietnamese weekdays', () => {
  // Thursday Nov 26, 2026 at 09:48:05 local time
  const thursdayMorning = new Date(2026, 10, 26, 9, 48, 5);
  const f24 = formatVietnameseClock(thursdayMorning, true);
  assert.equal(f24.timeFormatted, '09:48');
  assert.equal(f24.periodStr, null);
  assert.equal(f24.dateLineStr, 'Thứ Năm, 26 tháng 11');

  const thursdayEvening = new Date(2026, 10, 26, 21, 5, 0);
  const f12 = formatVietnameseClock(thursdayEvening, false);
  assert.equal(f12.timeFormatted, '09:05');
  assert.equal(f12.periodStr, 'CH');
  assert.equal(f12.weekdayStr, 'Thứ Năm');

  const sundayMidnight = new Date(2026, 10, 22, 0, 15, 0);
  const fSun = formatVietnameseClock(sundayMidnight, false);
  assert.equal(fSun.timeFormatted, '12:15');
  assert.equal(fSun.periodStr, 'SA');
  assert.equal(fSun.weekdayStr, 'Chủ Nhật');
});

test('parseLrc parses metadata, multi-timestamp lines, and offset correctly', () => {
  const sample = `[ti:Tinh Vân Đêm Khuya]
[ar:Hòa Âm Không Gian]
[offset:500]
[00:01.00]Dòng một
[00:05.50][00:10.00]Dòng lặp lại`;

  const parsed = parseLrc(sample);
  assert.equal(parsed.isSynced, true);
  assert.equal(parsed.title, 'Tinh Vân Đêm Khuya');
  assert.equal(parsed.artist, 'Hòa Âm Không Gian');
  assert.equal(parsed.lines.length, 3);
  assert.equal(parsed.lines[0].timeMs, 1500);
  assert.equal(parsed.lines[0].text, 'Dòng một');
  assert.equal(parsed.lines[1].timeMs, 6000);
  assert.equal(parsed.lines[2].timeMs, 10500);
});

test('parsePlainLyrics falls back cleanly for TXT files without timestamps', () => {
  const plain = parsePlainLyrics('Câu thứ nhất\n\nCâu thứ hai\nCâu thứ ba', 'Tệp TXT', 30_000);
  assert.equal(plain.isSynced, false);
  assert.equal(plain.lines.length, 3);
  assert.equal(plain.lines[0].timeMs, 0);
  assert.equal(plain.lines[1].timeMs, 10_000);
});

test('resolveActiveLyric resolves current, previous, next lines and handles sync offset', () => {
  const lines = [
    { timeMs: 2000, text: 'Dòng A' },
    { timeMs: 6000, text: 'Dòng B' },
    { timeMs: 10000, text: 'Dòng C' },
  ];

  const before = resolveActiveLyric(lines, 1000, 0);
  assert.equal(before.activeIndex, -1);
  assert.equal(before.currentLine, null);
  assert.equal(before.nextLine?.text, 'Dòng A');

  const mid = resolveActiveLyric(lines, 6500, 0);
  assert.equal(mid.activeIndex, 1);
  assert.equal(mid.prevLine?.text, 'Dòng A');
  assert.equal(mid.currentLine?.text, 'Dòng B');
  assert.equal(mid.nextLine?.text, 'Dòng C');

  // With +3600ms offset, playbackTime 6500 behaves like 10100ms -> Dòng C
  const shifted = resolveActiveLyric(lines, 6500, 3600);
  assert.equal(shifted.activeIndex, 2);
  assert.equal(shifted.currentLine?.text, 'Dòng C');
});

test('buildLyricsCacheKey normalizes whitespace and casing', () => {
  assert.equal(
    buildLyricsCacheKey('  Tinh Vân  Đêm ', 'Hòa   Âm'),
    'vtn_lyrics_v1::hòa âm::tinh vân đêm',
  );
});

test('AudioSpectrumProcessor maps frequency array into bars and detects bass/treble bands', () => {
  const processor = new AudioSpectrumProcessor(128);
  const out = new Float32Array(64);
  const input = new Float32Array(128);
  for (let i = 0; i < 16; i++) input[i] = 0.9; // heavy bass
  for (let i = 80; i < 128; i++) input[i] = 0.2; // light treble

  const bands = processor.process(
    input,
    64,
    { sensitivity: 1.0, bassGain: 1.2, trebleGain: 1.0, smoothness: 0.2 },
    out,
  );

  assert.ok(bands.bass > bands.treble, 'Bass energy should exceed treble energy');
  assert.ok(bands.beatImpulse > 0, 'Heavy bass should trigger beat impulse');
  assert.ok(out[0] > 0, 'Output buffer should be populated');
});

test('applyLivelyProperty updates settings safely across all groups', () => {
  let s = { ...DEFAULT_SETTINGS };
  s = applyLivelyProperty(s, 'eqStyle', 2);
  assert.equal(s.eqStyle, 'led');

  s = applyLivelyProperty(s, 'palette', 1);
  assert.equal(s.palette, 'sunset');

  s = applyLivelyProperty(s, 'circleSize', 125);
  assert.equal(s.circleSize, 1.25);

  s = applyLivelyProperty(s, 'lyricsOffsetMs', -450);
  assert.equal(s.lyricsOffsetMs, -450);

  s = applyLivelyProperty(s, 'fpsLimit', 0);
  assert.equal(s.fpsLimit, 30);
});

test('parseLivelyTrackPayload parses JSON string with base64 thumbnail', () => {
  const parsed = parseLivelyTrackPayload(
    JSON.stringify({
      Title: 'Ánh Đèn Đêm',
      Artist: 'Minh Khôi',
      AlbumTitle: 'Sài Gòn',
      Thumbnail: 'iVBORw0KGgo=',
    }),
  );
  assert.ok(parsed);
  assert.equal(parsed.title, 'Ánh Đèn Đêm');
  assert.equal(parsed.artist, 'Minh Khôi');
  assert.equal(parsed.album, 'Sài Gòn');
  assert.equal(parsed.albumArtUrl, 'data:image/png;base64,iVBORw0KGgo=');
});

test('buildZipArchive produces valid PKZIP header and EOCD signature', () => {
  const data = new TextEncoder().encode('Xin chào Lively Wallpaper');
  assert.equal(typeof crc32(data), 'number');
  const zip = buildZipArchive([
    { name: 'README.txt', data },
    { name: 'LivelyInfo.json', data: new TextEncoder().encode('{"Title":"Test"}') },
  ]);
  // Local file header signature PK\x03\x04
  assert.equal(zip[0], 0x50);
  assert.equal(zip[1], 0x4b);
  assert.equal(zip[2], 0x03);
  assert.equal(zip[3], 0x04);
  // EOCD signature at end - 22 bytes: PK\x05\x06
  const eocdOffset = zip.length - 22;
  assert.equal(zip[eocdOffset], 0x50);
  assert.equal(zip[eocdOffset + 1], 0x4b);
  assert.equal(zip[eocdOffset + 2], 0x05);
  assert.equal(zip[eocdOffset + 3], 0x06);
});

test('colorUtils converts hex and interpolates closed-ring palette stops smoothly', () => {
  const red = hexToRgb('#FF0000');
  const blue = hexToRgb('#0000FF');
  assert.deepEqual(red, { r: 255, g: 0, b: 0 });
  assert.equal(rgbToCss(red), 'rgb(255, 0, 0)');
  assert.equal(rgbToCss(blue, 0.5), 'rgba(0, 0, 255, 0.500)');

  // Closed wraparound with 2 stops: t=0 -> red, t=0.25 -> 50% red/blue, t=0.5 -> blue, t=0.75 -> 50% blue/red
  assert.deepEqual(interpolatePaletteRgb([red, blue], 0, true), red);
  assert.deepEqual(interpolatePaletteRgb([red, blue], 0.25, true), { r: 128, g: 0, b: 128 });
  assert.deepEqual(interpolatePaletteRgb([red, blue], 0.5, true), blue);
  assert.deepEqual(interpolatePaletteRgb([red, blue], 0.75, true), { r: 128, g: 0, b: 128 });
  assert.deepEqual(interpolatePaletteRgb([red], 0.4, true), red);
});

test('WALLPAPER_PRESETS define valid scene patches and Vietnamese labels', () => {
  assert.ok(WALLPAPER_PRESETS.length >= 5);
  for (const preset of WALLPAPER_PRESETS) {
    assert.ok(preset.id.length > 0);
    assert.ok(preset.name.length > 0);
    assert.ok(preset.subtitle.length > 0);
    assert.ok(preset.patch.background);
    assert.ok(preset.patch.palette);
    assert.ok(preset.patch.eqStyle);
  }
});
