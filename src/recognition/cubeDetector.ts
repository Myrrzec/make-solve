import type { CubeColor } from '../cube/types';
import { classify, sampleCells, type CellSample, type ColorReferences, type Point, type Quad } from './recognition';

/**
 * Finds one cube face in a camera frame, however small the cube is in the
 * shot. Stickers are found as compact single-colored blobs, then a 3x3 grid of
 * similar blobs with an even pitch is fitted. Everything outside that grid is
 * ignored, so the background and hands never reach the color reader.
 */

export interface Frame {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface Blob {
  x: number;
  y: number;
  area: number;
  size: number;
  /** Region the piece was cut from; pieces of one block share it. */
  region?: number;
}

export interface FaceDetection {
  quad: Quad;
  /** Grid pitch in pixels (sticker plus gap). */
  pitch: number;
  /** How many of the 9 stickers were found as blobs. */
  matched: number;
  samples: CellSample[];
  colors: CubeColor[];
  confidence: number[];
}

const NONE = 0;
/** Sum of |dx| + |dy| over 2 pixels in any channel that counts as a seam. */
const EDGE_THRESHOLD = 45;

/** Coarse segmentation classes. The final colors come from the Lab classifier. */
export function segmentClass(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const v = max / 255;
  const s = max === 0 ? 0 : (max - min) / max;
  if (s < 0.24 && v > 0.55) return 1; // white
  if (s < 0.22 || v < 0.15) return NONE; // plastic, shadows, background
  let h: number;
  const d = max - min;
  if (max === r) h = ((g - b) / d) * 60;
  else if (max === g) h = ((b - r) / d) * 60 + 120;
  else h = ((r - g) / d) * 60 + 240;
  if (h < 0) h += 360;
  // Skin sits in the red and orange hues at moderate saturation (about 0.3 to
  // 0.45), while cube plastic is far more saturated, so those hues need more.
  if (h < 38 || h >= 330) {
    if (s < 0.52 || v < 0.22) return NONE;
    return h < 14 || h >= 330 ? 2 : 3; // red : orange
  }
  // Webcams often render green dull and teal, and blue dark: accept less saturation there.
  if (s < 0.28) return NONE;
  if (h < 68) return 4; // yellow
  if (h < 178) return 5; // green
  if (h < 265) return 6; // blue
  return NONE;
}

/** RGB used to paint each segmentation class in the debug view. */
export const CLASS_PREVIEW: [number, number, number][] = [
  [20, 20, 22],
  [240, 240, 236],
  [200, 30, 40],
  [240, 120, 30],
  [240, 210, 40],
  [30, 160, 70],
  [30, 90, 200],
];

/** What the detector sees: each pixel painted with its class color. */
export function segmentationPreview(frame: Frame): Uint8ClampedArray {
  const out = new Uint8ClampedArray(frame.width * frame.height * 4);
  for (let i = 0; i < frame.width * frame.height; i++) {
    const c = CLASS_PREVIEW[segmentClass(frame.data[i * 4], frame.data[i * 4 + 1], frame.data[i * 4 + 2])];
    out[i * 4] = c[0];
    out[i * 4 + 1] = c[1];
    out[i * 4 + 2] = c[2];
    out[i * 4 + 3] = 255;
  }
  return out;
}

/** Connected single-class regions that are compact and roughly square. */
export interface BlobDebug {
  cls: number;
  x: number;
  y: number;
  area: number;
  compactness: number;
  anisotropy: number;
  touchesEdge: boolean;
}

export interface Region {
  x: number;
  y: number;
  /** Unit vector of the long side. */
  ax: number;
  ay: number;
  length: number;
  thickness: number;
  area: number;
}

/** Connected single-color regions that are filled rectangles: a piece, a bar or a block of pieces. */
export function findRegions(frame: Frame, debug?: BlobDebug[]): Region[] {
  const { data, width, height } = frame;
  const n = width * height;
  const raw = new Uint8Array(n);
  for (let i = 0; i < n; i++) raw[i] = segmentClass(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);

  // Stickerless cubes have only thin seams between pieces, so same-colored
  // neighbours, a white piece and a pale wall, or an orange piece and a hand
  // touch each other. Strong local contrast marks a seam; cutting there and
  // eroding once keeps every piece a separate blob.
  const edge = new Uint8Array(n);
  for (let y = 1; y < height - 1; y++)
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      let g = 0;
      for (let ch = 0; ch < 3; ch++) {
        const dx = Math.abs(data[(i + 1) * 4 + ch] - data[(i - 1) * 4 + ch]);
        const dy = Math.abs(data[(i + width) * 4 + ch] - data[(i - width) * 4 + ch]);
        g = Math.max(g, dx + dy);
      }
      if (g > EDGE_THRESHOLD) edge[i] = 1;
    }
  const labels = new Uint8Array(n);
  for (let y = 1; y < height - 1; y++)
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const c = raw[i];
      if (c === NONE || edge[i]) continue;
      if (raw[i - 1] !== c || raw[i + 1] !== c || raw[i - width] !== c || raw[i + width] !== c) continue;
      if (edge[i - 1] || edge[i + 1] || edge[i - width] || edge[i + width]) continue;
      labels[i] = c;
    }

  const seen = new Uint8Array(n);
  const stack = new Int32Array(n);
  const pixels = new Int32Array(n);
  const regions: Region[] = [];
  const minArea = Math.max(12, (width * height) / 9000);

  for (let start = 0; start < n; start++) {
    const cls = labels[start];
    if (cls === NONE || seen[start]) continue;
    let top = 0;
    stack[top++] = start;
    seen[start] = 1;
    let area = 0;
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    let touchesEdge = false;
    let count = 0;
    while (top > 0) {
      const p = stack[--top];
      pixels[count++] = p;
      const x = p % width;
      const y = (p - x) / width;
      area++;
      sx += x;
      sy += y;
      sxx += x * x;
      syy += y * y;
      sxy += x * y;
      if (x <= 1 || y <= 1 || x >= width - 2 || y >= height - 2) touchesEdge = true;
      if (x > 0 && !seen[p - 1] && labels[p - 1] === cls) (seen[p - 1] = 1), (stack[top++] = p - 1);
      if (x < width - 1 && !seen[p + 1] && labels[p + 1] === cls) (seen[p + 1] = 1), (stack[top++] = p + 1);
      if (y > 0 && !seen[p - width] && labels[p - width] === cls) (seen[p - width] = 1), (stack[top++] = p - width);
      if (y < height - 1 && !seen[p + width] && labels[p + width] === cls) (seen[p + width] = 1), (stack[top++] = p + width);
    }
    if (area < minArea) continue;
    const mx = sx / area;
    const my = sy / area;
    const vxx = sxx / area - mx * mx;
    const vyy = syy / area - my * my;
    const vxy = sxy / area - mx * my;
    const tr = vxx + vyy;
    const det = vxx * vyy - vxy * vxy;
    if (det <= 0) continue;
    const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
    const l1 = tr / 2 + disc;
    const l2 = tr / 2 - disc;
    // A filled square has area == 12 * sqrt(det); ragged shapes fall well below.
    const compactness = area / (12 * Math.sqrt(det));
    debug?.push({ cls, x: mx, y: my, area, compactness, anisotropy: l1 / l2, touchesEdge });
    if (touchesEdge || l2 <= 0) continue;
    // Filled rectangles (one piece, a bar, or a solid block) all have compactness near 1.
    if (compactness < 0.78 || compactness > 1.2) continue;
    let ax = vxy;
    let ay = l1 - vxx;
    if (l1 / l2 < 1.3) {
      // A square has no long side, so the second moments say nothing about
      // its turn. The fourth-order moment sum of (dx + i*dy)^4 does: for a
      // square turned by t its phase is 4t + pi.
      let re = 0;
      let im = 0;
      for (let q = 0; q < count; q++) {
        const px = pixels[q] % width;
        const dx = px - mx;
        const dy = (pixels[q] - px) / width - my;
        const dx2 = dx * dx;
        const dy2 = dy * dy;
        re += dx2 * dx2 - 6 * dx2 * dy2 + dy2 * dy2;
        im += 4 * dx * dy * (dx2 - dy2);
      }
      const turn = (Math.atan2(im, re) - Math.PI) / 4;
      ax = Math.cos(turn);
      ay = Math.sin(turn);
    } else if (Math.hypot(ax, ay) < 1e-9) [ax, ay] = vxx >= vyy ? [1, 0] : [0, 1];
    const norm = Math.hypot(ax, ay);
    regions.push({ x: mx, y: my, ax: ax / norm, ay: ay / norm, length: Math.sqrt(12 * l1), thickness: Math.sqrt(12 * l2), area });
  }
  return regions;
}

/**
 * Splits every region into pieces of side `tile`. On a stickerless cube one
 * region can be a single piece, a bar of 2 or 3, or a whole block up to 3x3.
 * Regions that are not a whole number of pieces are dropped.
 */
export function splitRegions(regions: Region[], tile: number): Blob[] {
  const blobs: Blob[] = [];
  regions.forEach((r, index) => {
    const k = Math.round(r.length / tile);
    const m = Math.round(r.thickness / tile);
    if (k < 1 || k > 3 || m < 1 || m > 3) return;
    if (Math.abs(r.length / tile - k) > 0.3 || Math.abs(r.thickness / tile - m) > 0.3) return;
    // Minor axis is the major axis turned a quarter.
    const bx = -r.ay;
    const by = r.ax;
    for (let i = 0; i < k; i++)
      for (let j = 0; j < m; j++) {
        const along = (i - (k - 1) / 2) * (r.length / k);
        const across = (j - (m - 1) / 2) * (r.thickness / m);
        blobs.push({ x: r.x + r.ax * along + bx * across, y: r.y + r.ay * along + by * across, area: tile * tile, size: tile, region: index });
      }
  });
  return blobs;
}

/** Piece sizes worth trying: every region read as 1, 2 or 3 pieces along each side. */
function tileCandidates(regions: Region[], minTile: number, maxTile: number): number[] {
  const raw: number[] = [];
  for (const r of regions)
    for (const n of [1, 2, 3]) {
      raw.push(r.length / n, r.thickness / n);
    }
  const sorted = raw.filter((t) => t >= minTile && t <= maxTile).sort((a, b) => a - b);
  // Merge sizes within 8% and keep the ones most regions agree on.
  const groups: { t: number; votes: number }[] = [];
  for (const t of sorted) {
    const g = groups[groups.length - 1];
    if (g && t / g.t < 1.08) {
      g.t = (g.t * g.votes + t) / (g.votes + 1);
      g.votes++;
    } else groups.push({ t, votes: 1 });
  }
  return groups
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 14)
    .map((g) => g.t);
}

/** Kept for the debug view and older callers: pieces read with each region's own size. */
export function findStickerBlobs(frame: Frame, debug?: BlobDebug[]): Blob[] {
  return findRegions(frame, debug).flatMap((r) => splitRegions([r], Math.min(r.thickness, r.length / Math.max(1, Math.round(r.length / r.thickness)))));
}

interface GridFit {
  origin: Point;
  u: Point;
  v: Point;
  matched: number;
  /** Distinct regions behind the matched pieces. A grid cut out of one piece is not a face. */
  regions: number;
  error: number;
}

/** Better grid: built from more separate regions, then more pieces, then a closer fit. */
function better(a: GridFit, b: GridFit | null): boolean {
  if (!b) return true;
  if (a.regions !== b.regions) return a.regions > b.regions;
  if (a.matched !== b.matched) return a.matched > b.matched;
  return a.error < b.error;
}

/** Least squares for value = a + b*i + c*j over the matched grid cells. */
function fitAxis(points: { i: number; j: number; value: number }[]): [number, number, number] {
  let n = 0, si = 0, sj = 0, sii = 0, sjj = 0, sij = 0, sv = 0, siv = 0, sjv = 0;
  for (const { i, j, value } of points) {
    n++;
    si += i;
    sj += j;
    sii += i * i;
    sjj += j * j;
    sij += i * j;
    sv += value;
    siv += i * value;
    sjv += j * value;
  }
  // Solve the 3x3 normal equations by Cramer's rule.
  const m = [
    [n, si, sj],
    [si, sii, sij],
    [sj, sij, sjj],
  ];
  const rhs = [sv, siv, sjv];
  const det3 = (a: number[][]) =>
    a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) -
    a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) +
    a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
  const d = det3(m);
  if (Math.abs(d) < 1e-9) return [NaN, NaN, NaN];
  const col = (k: number) => det3(m.map((row, r) => row.map((x, c) => (c === k ? rhs[r] : x)))) / d;
  return [col(0), col(1), col(2)];
}

/**
 * Tries every blob at every position of the 3x3 grid and keeps the grid that
 * explains the most blobs. Five pieces spread over at least two rows and two
 * columns are enough: on stickerless cubes some pieces merge with the hand or
 * a pale wall, and their colors are still read from the fitted grid.
 */
export function fitGrid(blobs: Blob[]): GridFit | null {
  let best: GridFit | null = null;
  for (const c of blobs) {
    const similar = blobs.filter((b) => b !== c && Math.abs(b.size - c.size) / c.size < 0.5);
    // Nearest similar blobs give the pitch and the grid direction.
    const near = similar
      .map((b) => ({ b, d: Math.hypot(b.x - c.x, b.y - c.y) }))
      .filter(({ d }) => d > c.size * 0.9 && d < c.size * 2.4)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);
    for (const { b, d: pitch } of near) {
      const ux = (b.x - c.x) / pitch;
      const uy = (b.y - c.y) / pitch;
      for (let ci = -1; ci <= 1; ci++)
        for (let cj = -1; cj <= 1; cj++) {
          const pts: { i: number; j: number; x: number; y: number; region: number }[] = [];
          for (let i = -1; i <= 1; i++)
            for (let j = -1; j <= 1; j++) {
              const di = i - ci;
              const dj = j - cj;
              const px = c.x + pitch * (di * ux - dj * uy);
              const py = c.y + pitch * (di * uy + dj * ux);
              let hit: Blob | null = null;
              let hitD = pitch * 0.38;
              for (const s of [c, ...similar]) {
                const dd = Math.hypot(s.x - px, s.y - py);
                if (dd < hitD) (hit = s), (hitD = dd);
              }
              if (hit) pts.push({ i, j, x: hit.x, y: hit.y, region: hit.region ?? -1 - pts.length });
            }
          if (pts.length < 5) continue;
          if (new Set(pts.map((p) => p.i)).size < 2 || new Set(pts.map((p) => p.j)).size < 2) continue;
          const [ox, uxf, vxf] = fitAxis(pts.map((p) => ({ i: p.i, j: p.j, value: p.x })));
          const [oy, uyf, vyf] = fitAxis(pts.map((p) => ({ i: p.i, j: p.j, value: p.y })));
          if (!Number.isFinite(ox) || !Number.isFinite(oy)) continue;
          const error =
            pts.reduce((acc, p) => acc + Math.hypot(ox + p.i * uxf + p.j * vxf - p.x, oy + p.i * uyf + p.j * vyf - p.y), 0) / pts.length / pitch;
          if (error > 0.2) continue;
          const fit: GridFit = {
            origin: { x: ox, y: oy },
            u: { x: uxf, y: uyf },
            v: { x: vxf, y: vyf },
            matched: pts.length,
            regions: new Set(pts.map((p) => p.region)).size,
            error,
          };
          if (better(fit, best)) best = fit;
        }
    }
  }
  return best;
}

/** Picks the grid axes so `u` points right and `v` points down in the image. */
function uprightAxes(u: Point, v: Point): [Point, Point] {
  const options: [Point, Point][] = [
    [u, v],
    [v, { x: -u.x, y: -u.y }],
    [{ x: -u.x, y: -u.y }, { x: -v.x, y: -v.y }],
    [{ x: -v.x, y: -v.y }, u],
  ];
  // Keep handedness: v must be u turned clockwise on screen.
  const valid = options.filter(([a, b]) => a.x * b.y - a.y * b.x > 0);
  const pool = valid.length > 0 ? valid : options;
  return pool.reduce((best, o) => (o[0].x / Math.hypot(o[0].x, o[0].y) > best[0].x / Math.hypot(best[0].x, best[0].y) ? o : best));
}

export function gridToQuad(fit: GridFit): Quad {
  const [u, v] = uprightAxes(fit.u, fit.v);
  const at = (a: number, b: number): Point => ({ x: fit.origin.x + a * u.x + b * v.x, y: fit.origin.y + a * u.y + b * v.y });
  return [at(-1.5, -1.5), at(1.5, -1.5), at(1.5, 1.5), at(-1.5, 1.5)];
}

export function detectFace(frame: Frame, references: ColorReferences = {}): FaceDetection | null {
  const regions = findRegions(frame);
  // A face filling the frame height has pieces of a third of it; tiny pieces are noise.
  const minTile = Math.sqrt(Math.max(12, (frame.width * frame.height) / 9000));
  const maxTile = frame.height / 3;
  let fit: GridFit | null = null;
  for (const tile of tileCandidates(regions, minTile, maxTile)) {
    const candidate = fitGrid(splitRegions(regions, tile));
    if (candidate && better(candidate, fit)) fit = candidate;
  }
  if (!fit) return null;
  const quad = gridToQuad(fit);
  const samples = sampleCells({ data: frame, width: frame.width, height: frame.height }, quad);
  const results = samples.map((s) => classify(s, references));
  return {
    quad,
    pitch: Math.hypot(fit.u.x, fit.u.y),
    matched: fit.matched,
    samples,
    colors: results.map((r) => r.color),
    confidence: results.map((r) => r.confidence),
  };
}
