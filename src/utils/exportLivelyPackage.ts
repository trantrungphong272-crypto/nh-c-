import { buildZipArchive, ZipFileEntry } from './zipBuilder';

async function fetchAsBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Không thể tải tài nguyên: ${url}`);
  }
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

export async function exportLivelyWallpaperZip(): Promise<void> {
  const files: { zipName: string; fetchUrl: string }[] = [
    { zipName: 'index.html', fetchUrl: '/lively-index.html' },
    { zipName: 'lively-app.js', fetchUrl: '/lively-app.js' },
    { zipName: 'LivelyInfo.json', fetchUrl: '/LivelyInfo.json' },
    { zipName: 'LivelyProperties.json', fetchUrl: '/LivelyProperties.json' },
    { zipName: 'README.md', fetchUrl: '/README.md' },
    { zipName: 'bg-nebula.jpg', fetchUrl: '/bg-nebula.jpg' },
    { zipName: 'bg-city-lights.jpg', fetchUrl: '/bg-city-lights.jpg' },
  ];

  const entries: ZipFileEntry[] = await Promise.all(
    files.map(async (f) => ({
      name: f.zipName,
      data: await fetchAsBytes(f.fetchUrl),
    })),
  );

  const zipBytes = buildZipArchive(entries);
  const blob = new Blob([zipBytes.buffer as ArrayBuffer], { type: 'application/zip' });
  const blobUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = 'VongTronNhac-LivelyWallpaper.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 2500);
}
