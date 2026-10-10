import { describe, expect, it } from 'vitest';
import { rotateMatrix } from '../cube/faceMatrix';
import { classify, isConvexQuad, rgbToLab, squareToQuad, type Quad } from './recognition';

describe('recognition math', () => {
  it('maps the unit square onto the quad corners', () => {
    const q: Quad = [
      { x: 10, y: 20 },
      { x: 200, y: 30 },
      { x: 220, y: 240 },
      { x: 5, y: 210 },
    ];
    const map = squareToQuad(q);
    const close = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      expect(a.x).toBeCloseTo(b.x, 6);
      expect(a.y).toBeCloseTo(b.y, 6);
    };
    close(map(0, 0), q[0]);
    close(map(1, 0), q[1]);
    close(map(1, 1), q[2]);
    close(map(0, 1), q[3]);
  });

  it('rejects self-intersecting frames', () => {
    expect(isConvexQuad([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }, { x: 10, y: 10 }])).toBe(false);
    expect(isConvexQuad([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }])).toBe(true);
  });

  it('classifies typical sticker colors, including under warm light', () => {
    const sample = (rgb: [number, number, number]) => classify({ rgb, lab: rgbToLab(rgb) }).color;
    expect(sample([240, 238, 230])).toBe('white');
    expect(sample([216, 196, 58])).toBe('yellow');
    expect(sample([181, 42, 44])).toBe('red');
    expect(sample([232, 118, 44])).toBe('orange');
    expect(sample([44, 95, 181])).toBe('blue');
    expect(sample([42, 154, 85])).toBe('green');
    expect(sample([250, 225, 190])).toBe('white');
    // Dull and teal greens as webcams render them.
    expect(sample([90, 150, 110])).toBe('green');
    expect(sample([70, 140, 100])).toBe('green');
    expect(sample([60, 150, 130])).toBe('green');
    expect(sample([200, 205, 210])).toBe('white');
  });

  it('rotates the matrix around the center', () => {
    const m = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    expect(rotateMatrix(m, 1)).toEqual([6, 3, 0, 7, 4, 1, 8, 5, 2]);
    expect(rotateMatrix(m, 4)).toEqual(m);
  });
});
