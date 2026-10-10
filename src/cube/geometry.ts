import type { CubeMove, FaceId, MoveTarget } from './types';
import { FACES } from './types';

/**
 * Coordinate system: +x points to R, +y to U, +z to F (toward the user).
 * A positive quarter turn is counterclockwise by the right-hand rule, so a
 * face turned "clockwise when looking straight at it" is a negative quarter
 * turn around that face's outward axis.
 */
export type Vec3 = [number, number, number];
export type Axis = 0 | 1 | 2;

export interface MoveGeometry {
  axis: Axis;
  /** Layer coordinates along the axis: -1, 0, 1. */
  layers: number[];
  /** Signed quarter turns, right-hand rule around the positive axis. */
  quarters: number;
}

/**
 * Canonical view of each face: `right` and `down` are the screen directions
 * of a photo taken straight at the face. Sticker (row, col) sits on the cubie
 * at normal + (col-1)*right + (row-1)*down.
 *   U: seen from above, B at the top edge.  D: seen from below, F at the top edge.
 *   R F L B: seen straight on, U at the top edge.
 */
const FACE_FRAMES: Record<FaceId, { normal: Vec3; right: Vec3; down: Vec3 }> = {
  U: { normal: [0, 1, 0], right: [1, 0, 0], down: [0, 0, 1] },
  R: { normal: [1, 0, 0], right: [0, 0, -1], down: [0, -1, 0] },
  F: { normal: [0, 0, 1], right: [1, 0, 0], down: [0, -1, 0] },
  D: { normal: [0, -1, 0], right: [1, 0, 0], down: [0, 0, -1] },
  L: { normal: [-1, 0, 0], right: [0, 0, 1], down: [0, -1, 0] },
  B: { normal: [0, 0, -1], right: [-1, 0, 0], down: [0, -1, 0] },
};

export const FACE_OFFSET: Record<FaceId, number> = { U: 0, R: 9, F: 18, D: 27, L: 36, B: 45 };

export interface StickerGeometry {
  index: number;
  face: FaceId;
  cell: number;
  /** Position of the cubie that carries the sticker. */
  pos: Vec3;
  normal: Vec3;
}

export const STICKERS: StickerGeometry[] = FACES.flatMap((face) => {
  const { normal, right, down } = FACE_FRAMES[face];
  return Array.from({ length: 9 }, (_, cell) => {
    const row = Math.floor(cell / 3) - 1;
    const col = (cell % 3) - 1;
    const pos: Vec3 = [0, 1, 2].map((k) => normal[k] + col * right[k] + row * down[k]) as Vec3;
    return { index: FACE_OFFSET[face] + cell, face, cell, pos, normal };
  });
});

const key = (pos: Vec3, normal: Vec3) => `${pos.join(',')}|${normal.join(',')}`;
const STICKER_BY_KEY = new Map(STICKERS.map((s) => [key(s.pos, s.normal), s.index]));

export function stickerAt(pos: Vec3, normal: Vec3): number {
  const index = STICKER_BY_KEY.get(key(pos, normal));
  if (index === undefined) throw new Error(`No sticker at ${key(pos, normal)}`);
  return index;
}

function rotate90(v: Vec3, axis: Axis): Vec3 {
  const [x, y, z] = v;
  if (axis === 0) return [x, -z, y];
  if (axis === 1) return [z, y, -x];
  return [-y, x, z];
}

export function rotateVec(v: Vec3, axis: Axis, quarters: number): Vec3 {
  let out = v;
  for (let i = 0; i < ((quarters % 4) + 4) % 4; i++) out = rotate90(out, axis);
  // normalize -0 so keys stay stable
  return out.map((c) => c + 0) as Vec3;
}

const permCache = new Map<string, Int8Array>();

/** `to[src] = dest`: where each sticker ends up after the turn. */
export function turnPermutation(geometry: MoveGeometry): Int8Array {
  const q = ((geometry.quarters % 4) + 4) % 4;
  const cacheKey = `${geometry.axis}:${[...geometry.layers].sort().join(',')}:${q}`;
  const cached = permCache.get(cacheKey);
  if (cached) return cached;
  const to = new Int8Array(54);
  for (const s of STICKERS) {
    if (geometry.layers.includes(s.pos[geometry.axis])) {
      to[s.index] = stickerAt(rotateVec(s.pos, geometry.axis, q), rotateVec(s.normal, geometry.axis, q));
    } else {
      to[s.index] = s.index;
    }
  }
  permCache.set(cacheKey, to);
  return to;
}

const BASE: Record<MoveTarget, { axis: Axis; layer: number; dir: 1 | -1 }> = {
  R: { axis: 0, layer: 1, dir: -1 },
  L: { axis: 0, layer: -1, dir: 1 },
  U: { axis: 1, layer: 1, dir: -1 },
  D: { axis: 1, layer: -1, dir: 1 },
  F: { axis: 2, layer: 1, dir: -1 },
  B: { axis: 2, layer: -1, dir: 1 },
  M: { axis: 0, layer: 0, dir: 1 },
  E: { axis: 1, layer: 0, dir: 1 },
  S: { axis: 2, layer: 0, dir: -1 },
  x: { axis: 0, layer: 1, dir: -1 },
  y: { axis: 1, layer: 1, dir: -1 },
  z: { axis: 2, layer: 1, dir: -1 },
};

/** Single source of geometry for the math model and the 3D animation. */
export function moveGeometry(move: Pick<CubeMove, 'target' | 'amount' | 'kind'>): MoveGeometry {
  const base = BASE[move.target];
  const layers =
    move.kind === 'rotation' ? [-1, 0, 1] : move.kind === 'wide' ? [base.layer, 0] : [base.layer];
  return { axis: base.axis, layers, quarters: base.dir * move.amount };
}
