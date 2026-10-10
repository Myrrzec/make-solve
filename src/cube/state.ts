import { FACE_OFFSET, moveGeometry, turnPermutation } from './geometry';
import type { CubeColor, CubeMove, CubeState, FaceId } from './types';
import { FACES } from './types';

/**
 * 54 stickers in the user's frame: what the user sees on the cube in their
 * hands. Index = FACE_OFFSET[face] + cell. Whole-cube rotations move every
 * sticker (centers included) but never change how the pieces relate to each
 * other, so physical correctness is untouched by x/y/z.
 */
export type Facelets = CubeColor[];

export function toFacelets(state: CubeState): Facelets {
  return FACES.flatMap((f) => state.faces[f]);
}

export function fromFacelets(facelets: Facelets): CubeState {
  const faces = {} as Record<FaceId, CubeColor[]>;
  for (const f of FACES) faces[f] = facelets.slice(FACE_OFFSET[f], FACE_OFFSET[f] + 9);
  return { faces };
}

export const STANDARD_SCHEME: Record<FaceId, CubeColor> = {
  U: 'white',
  D: 'yellow',
  F: 'green',
  B: 'blue',
  R: 'red',
  L: 'orange',
};

export function solvedFacelets(scheme: Record<FaceId, CubeColor> = STANDARD_SCHEME): Facelets {
  return FACES.flatMap((f) => Array<CubeColor>(9).fill(scheme[f]));
}

export function applyPermutation<T>(facelets: T[], to: Int8Array): T[] {
  const out = new Array<T>(54);
  for (let i = 0; i < 54; i++) out[to[i]] = facelets[i];
  return out;
}

export function applyMove(facelets: Facelets, move: CubeMove): Facelets {
  return applyPermutation(facelets, turnPermutation(moveGeometry(move)));
}

export function applyMoves(facelets: Facelets, moves: CubeMove[]): Facelets {
  return moves.reduce(applyMove, facelets);
}

export function centerColor(facelets: Facelets, face: FaceId): CubeColor {
  return facelets[FACE_OFFSET[face] + 4];
}

export function isSolved(facelets: Facelets): boolean {
  return FACES.every((f) => {
    const c = centerColor(facelets, f);
    for (let i = 0; i < 9; i++) if (facelets[FACE_OFFSET[f] + i] !== c) return false;
    return true;
  });
}

/** Orientation of the cube relative to the user, described by which center is where. */
export interface Orientation {
  up: CubeColor;
  front: CubeColor;
}

export function orientationOf(facelets: Facelets): Orientation {
  return { up: centerColor(facelets, 'U'), front: centerColor(facelets, 'F') };
}

export function sameFacelets(a: Facelets, b: Facelets): boolean {
  return a.length === b.length && a.every((c, i) => c === b[i]);
}
