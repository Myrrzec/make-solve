import { describe, expect, it } from 'vitest';
import type { CubeColor } from '../cube/types';
import { detectFace, type Frame } from './cubeDetector';

const RGB: Record<CubeColor, [number, number, number]> = {
  white: [236, 236, 228],
  yellow: [222, 205, 50],
  red: [185, 30, 38],
  orange: [238, 112, 30],
  blue: [30, 80, 185],
  green: [30, 155, 75],
};

interface Scene {
  width: number;
  height: number;
  cx: number;
  cy: number;
  /** Face side in pixels. */
  side: number;
  angle: number;
  colors: CubeColor[];
  hand?: boolean;
  /** Plastic cube without stickers: thin dark seams only, pale wall, hand touching the face. */
  stickerless?: boolean;
  /** Brightness of the seam between pieces (1 = invisible), stickerless only. */
  seamShade?: number;
}

/** Renders a cube face on a noisy wall, optionally with a skin-colored hand blob. */
function render(s: Scene): Frame {
  const data = new Uint8ClampedArray(s.width * s.height * 4);
  let seed = 7;
  const noise = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32 - 0.5) * 16;
  const cos = Math.cos(-s.angle);
  const sin = Math.sin(-s.angle);
  const cell = s.side / 3;
  for (let y = 0; y < s.height; y++)
    for (let x = 0; x < s.width; x++) {
      let rgb: [number, number, number] = s.stickerless ? [190, 214, 210] : [150 + (x / s.width) * 40, 140, 128];
      // A finger bar exactly three pieces tall right next to the face: the case that once shifted the grid.
      if (s.stickerless && x > s.cx - s.side * 0.5 - s.side / 3 - 2 && x < s.cx - s.side * 0.5 - 2 && Math.abs(y - s.cy) < s.side * 0.5) rgb = [214, 160, 130];
      if (s.hand && Math.hypot((x - s.width * 0.75) / 1.6, y - s.height * 0.6) < s.height * 0.18) rgb = [214, 160, 130];
      const lx = (x - s.cx) * cos - (y - s.cy) * sin + s.side / 2;
      const ly = (x - s.cx) * sin + (y - s.cy) * cos + s.side / 2;
      if (lx >= 0 && ly >= 0 && lx < s.side && ly < s.side) {
        rgb = [22, 22, 24];
        const col = Math.floor(lx / cell);
        const row = Math.floor(ly / cell);
        const gx = lx - col * cell;
        const gy = ly - row * cell;
        const base = RGB[s.colors[row * 3 + col]];
        if (s.stickerless) {
          // Whole piece is colored; only a thin shadowed seam and soft shading.
          const seam = cell * 0.035;
          const shade = 1 - 0.12 * (gy / cell);
          const inSeam = gx < seam || gy < seam || gx > cell - seam || gy > cell - seam;
          const k = inSeam ? (s.seamShade ?? 0.5) : shade;
          rgb = [base[0] * k, base[1] * k, base[2] * k];
        } else {
          const gap = cell * 0.08;
          if (gx > gap && gy > gap && gx < cell - gap && gy < cell - gap) rgb = base;
        }
      }
      const k = (y * s.width + x) * 4;
      data[k] = rgb[0] + noise();
      data[k + 1] = rgb[1] + noise();
      data[k + 2] = rgb[2] + noise();
      data[k + 3] = 255;
    }
  return { data, width: s.width, height: s.height };
}

const FACE: CubeColor[] = ['white', 'red', 'green', 'orange', 'blue', 'yellow', 'green', 'white', 'red'];

describe('cube detector', () => {
  it('finds a small face in a wide frame and reads it left to right, top to bottom', () => {
    const det = detectFace(render({ width: 480, height: 360, cx: 140, cy: 150, side: 96, angle: 0, colors: FACE }));
    expect(det).not.toBeNull();
    expect(det!.colors).toEqual(FACE);
    expect(det!.matched).toBe(9);
  });

  it('handles a tilted face and a hand in the shot', () => {
    const det = detectFace(render({ width: 480, height: 360, cx: 250, cy: 170, side: 130, angle: 0.3, colors: FACE, hand: true }));
    expect(det?.colors).toEqual(FACE);
  });

  it('reads a face tilted the other way', () => {
    const det = detectFace(render({ width: 480, height: 360, cx: 240, cy: 180, side: 120, angle: 0.1, colors: FACE }));
    expect(det?.colors).toEqual(FACE);
  });

  it('returns nothing when there is no cube', () => {
    expect(detectFace(render({ width: 320, height: 240, cx: -500, cy: -500, side: 10, angle: 0, colors: FACE, hand: true }))).toBeNull();
  });

  it('reads a stickerless cube with merged pieces, a pale wall and a hand touching it', () => {
    const face: CubeColor[] = ['white', 'red', 'red', 'red', 'blue', 'orange', 'orange', 'red', 'yellow'];
    for (const [side, angle] of [
      [300, 0],
      [240, 0.06],
      [180, -0.08],
    ] as const) {
      const det = detectFace(render({ width: 640, height: 360, cx: 330, cy: 190, side, angle, colors: face, stickerless: true }));
      expect(det?.colors, `side ${side}`).toEqual(face);
    }
  });

  describe('stickerless faces with big same-colored blocks', () => {
    const scene = (colors: CubeColor[], side: number, angle = 0) =>
      render({ width: 640, height: 360, cx: 330, cy: 185, side, angle, colors, stickerless: true, seamShade: 0.92 });

    it('reads a side face once the first two layers are solved', () => {
      const face: CubeColor[] = ['red', 'green', 'orange', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue'];
      for (const [side, angle] of [
        [270, 0],
        [210, 0.07],
      ] as const) {
        expect(detectFace(scene(face, side, angle))?.colors, `side ${side}`).toEqual(face);
      }
    });

    it('reads a fully solved face, also turned', () => {
      const face: CubeColor[] = Array(9).fill('yellow');
      expect(detectFace(scene(face, 240))?.colors).toEqual(face);
      expect(detectFace(scene(face, 220, 0.14))?.colors).toEqual(face);
    });

    it('is fast enough for live camera frames', () => {
      const frame = scene(['red', 'green', 'orange', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue'], 240, 0.05);
      const t = performance.now();
      for (let i = 0; i < 10; i++) detectFace(frame);
      expect((performance.now() - t) / 10).toBeLessThan(60);
    });

    it('reads a face with a 2x2 block in the corner', () => {
      const face: CubeColor[] = ['green', 'green', 'red', 'green', 'green', 'orange', 'yellow', 'blue', 'white'];
      expect(detectFace(scene(face, 240, -0.05))?.colors).toEqual(face);
    });
  });
});
