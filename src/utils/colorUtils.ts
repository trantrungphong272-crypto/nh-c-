export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RgbColor {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) {
    return { r: 34, g: 211, b: 238 };
  }
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return { r: 34, g: 211, b: 238 };
  }
  return { r, g, b };
}

export function interpolatePaletteRgb(
  stops: readonly RgbColor[],
  tNorm: number,
  wrapClosed = true,
): RgbColor {
  if (stops.length === 0) return { r: 34, g: 211, b: 238 };
  if (stops.length === 1) return stops[0];

  const t = ((tNorm % 1) + 1) % 1;
  const count = wrapClosed ? stops.length : stops.length - 1;
  const scaled = t * count;
  const idx0 = Math.floor(scaled) % stops.length;
  const idx1 = (idx0 + 1) % stops.length;
  const frac = scaled - Math.floor(scaled);

  const a = stops[idx0];
  const b = stops[idx1];
  return {
    r: Math.round(a.r + (b.r - a.r) * frac),
    g: Math.round(a.g + (b.g - a.g) * frac),
    b: Math.round(a.b + (b.b - a.b) * frac),
  };
}

export function rgbToCss(c: RgbColor, alpha = 1): string {
  if (alpha >= 0.999) {
    return `rgb(${c.r}, ${c.g}, ${c.b})`;
  }
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}
