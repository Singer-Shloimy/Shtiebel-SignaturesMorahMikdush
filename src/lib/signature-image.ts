import { PNG } from "pngjs";

/** Make near-white pixels transparent and darken ink for a pen-like look. */
export function inkOnlyPng(pngBytes: Buffer): Buffer {
  const png = PNG.sync.read(pngBytes);
  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i];
    const g = png.data[i + 1];
    const b = png.data[i + 2];
    const a = png.data[i + 3];
    if (a < 10 || (r > 235 && g > 235 && b > 235)) {
      png.data[i + 3] = 0;
      continue;
    }
    // Push gray/blue strokes toward solid black
    const darkness = Math.min(r, g, b);
    const ink = Math.max(0, Math.floor(darkness * 0.35));
    png.data[i] = ink;
    png.data[i + 1] = ink;
    png.data[i + 2] = ink;
    png.data[i + 3] = Math.min(255, Math.floor(a * 1.15));
  }
  return PNG.sync.write(png);
}
