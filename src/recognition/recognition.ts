import type { CubeColor } from '../cube/types';
import { COLORS } from '../cube/types';

export interface Point {
  x: number;
  y: number;
}

/** Corners in image pixels: top-left, top-right, bottom-right, bottom-left. */
export type Quad = [Point, Point, Point, Point];

export interface DecodedImage {
  /** RGBA pixels; ImageData fits. */
  data: { data: Uint8ClampedArray };
  width: number;
  height: number;
}

export class ImageReadError extends Error {
  constructor(
    public kind: 'read' | 'unsupported' | 'too_small',
    message: string,
  ) {
    super(message);
  }
}

const MAX_SIDE = 1600;

/** Decodes a photo locally, honoring EXIF orientation, and downsizes it. Nothing leaves the browser. */
export async function decodeImage(file: File): Promise<DecodedImage> {
  const name = file.name.toLowerCase();
  if (/\.(heic|heif)$/.test(name) || /heic|heif/.test(file.type)) {
    throw new ImageReadError('unsupported', 'Browsers cannot open HEIC. Save the photo as JPEG or PNG and upload it again.');
  }
  if (file.type && !file.type.startsWith('image/')) {
    throw new ImageReadError('unsupported', 'This is not an image. Use JPEG, PNG or WebP.');
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new ImageReadError('read', 'Could not open the file. It may be damaged or in an unsupported format.');
  }
  if (Math.min(bitmap.width, bitmap.height) < 200) {
    throw new ImageReadError('too_small', 'The photo is too small. It needs at least 200 pixels on the short side.');
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return { data: ctx.getImageData(0, 0, width, height), width, height };
}

export function initialQuad(width: number, height: number): Quad {
  const side = Math.min(width, height) * 0.7;
  const x0 = (width - side) / 2;
  const y0 = (height - side) / 2;
  return [
    { x: x0, y: y0 },
    { x: x0 + side, y: y0 },
    { x: x0 + side, y: y0 + side },
    { x: x0, y: y0 + side },
  ];
}

/**
 * Projective map from the unit square to the quad (Heckbert's closed form).
 * (0,0)->TL, (1,0)->TR, (1,1)->BR, (0,1)->BL.
 */
export function squareToQuad(q: Quad): (u: number, v: number) => Point {
  const [p0, p1, p2, p3] = q;
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const dy3 = p0.y - p1.y + p2.y - p3.y;
  let g = 0;
  let h = 0;
  const det = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(det) > 1e-9 && (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9)) {
    g = (dx3 * dy2 - dx2 * dy3) / det;
    h = (dx1 * dy3 - dx3 * dy1) / det;
  }
  const a = p1.x - p0.x + g * p1.x;
  const b = p3.x - p0.x + h * p3.x;
  const d = p1.y - p0.y + g * p1.y;
  const e = p3.y - p0.y + h * p3.y;
  return (u, v) => {
    const w = g * u + h * v + 1;
    return { x: (a * u + b * v + p0.x) / w, y: (d * u + e * v + p0.y) / w };
  };
}

export function isConvexQuad(q: Quad): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i];
    const b = q[(i + 1) % 4];
    const c = q[(i + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 1e-6) return false;
    const s = Math.sign(cross);
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

export type Lab = [number, number, number];

export interface CellSample {
  rgb: [number, number, number];
  lab: Lab;
}

function srgbToLinear(c: number) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function rgbToLab([r, g, b]: [number, number, number]): Lab {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
  const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(X);
  const fy = f(Y);
  const fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function trimmedMedian(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const cut = Math.floor(sorted.length * 0.2);
  const kept = sorted.slice(cut, sorted.length - cut);
  return kept[Math.floor(kept.length / 2)];
}

/** Samples the central half of each of the 9 cells, row by row. */
export function sampleCells(image: DecodedImage, quad: Quad): CellSample[] {
  const map = squareToQuad(quad);
  const { data, width, height } = image;
  const samples: CellSample[] = [];
  const steps = 9;
  for (let cell = 0; cell < 9; cell++) {
    const row = Math.floor(cell / 3);
    const col = cell % 3;
    const rs: number[] = [];
    const gs: number[] = [];
    const bs: number[] = [];
    for (let i = 0; i < steps; i++) {
      for (let j = 0; j < steps; j++) {
        const u = (col + 0.25 + (0.5 * (j + 0.5)) / steps) / 3;
        const v = (row + 0.25 + (0.5 * (i + 0.5)) / steps) / 3;
        const p = map(u, v);
        const x = Math.min(width - 1, Math.max(0, Math.round(p.x)));
        const y = Math.min(height - 1, Math.max(0, Math.round(p.y)));
        const k = (y * width + x) * 4;
        rs.push(data.data[k]);
        gs.push(data.data[k + 1]);
        bs.push(data.data[k + 2]);
      }
    }
    const rgb: [number, number, number] = [trimmedMedian(rs), trimmedMedian(gs), trimmedMedian(bs)];
    samples.push({ rgb, lab: rgbToLab(rgb) });
  }
  return samples;
}

/** Typical sticker colors under neutral light. Overridden by centers already confirmed by the user. */
const DEFAULT_REFERENCE: Record<CubeColor, Lab> = {
  white: rgbToLab([225, 225, 220]),
  yellow: rgbToLab([225, 210, 40]),
  red: rgbToLab([185, 25, 35]),
  orange: rgbToLab([240, 110, 25]),
  blue: rgbToLab([20, 70, 190]),
  green: rgbToLab([20, 160, 70]),
};

export type ColorReferences = Partial<Record<CubeColor, Lab>>;

function distance(a: Lab, b: Lab): number {
  // Lightness matters less than hue under uneven light.
  const dl = (a[0] - b[0]) * 0.6;
  return Math.hypot(dl, a[1] - b[1], a[2] - b[2]);
}

export interface Classification {
  color: CubeColor;
  /** 0..1: how much better the best match is than the runner-up. */
  confidence: number;
}

export function classify(sample: CellSample, references: ColorReferences = {}): Classification {
  const chroma = Math.hypot(sample.lab[1], sample.lab[2]);
  const scored = COLORS.map((color) => {
    let d = distance(sample.lab, references[color] ?? DEFAULT_REFERENCE[color]);
    // A clearly colored cell is never white, and a gray one is rarely a color:
    // dull webcam greens otherwise drift towards white.
    if (color === 'white') d += Math.max(0, chroma - 15) * 1.5;
    else d += Math.max(0, 12 - chroma) * 1.5;
    return { color, d };
  }).sort((a, b) => a.d - b.d);
  const [best, second] = scored;
  const confidence = Math.max(0, Math.min(1, (second.d - best.d) / (second.d + 1e-6)));
  return { color: best.color, confidence };
}
