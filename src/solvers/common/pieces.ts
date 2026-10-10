import { CORNER_FACELETS, EDGE_FACELETS } from '../../cube/pieces';
import type { Facelets } from '../../cube/state';
import type { CubeColor } from '../../cube/types';

/** Color of the center on the same face as facelet `i`. */
export const centerOf = (f: Facelets, i: number): CubeColor => f[Math.floor(i / 9) * 9 + 4];

export const stickerSolved = (f: Facelets, i: number) => f[i] === centerOf(f, i);

export const cornerSolved = (f: Facelets, pos: number) => CORNER_FACELETS[pos].every((i) => stickerSolved(f, i));
export const edgeSolved = (f: Facelets, pos: number) => EDGE_FACELETS[pos].every((i) => stickerSolved(f, i));

const sameSet = (a: CubeColor[], b: CubeColor[]) => a.length === b.length && a.every((c) => b.includes(c));

export function findCorner(f: Facelets, colors: CubeColor[]): number {
  return CORNER_FACELETS.findIndex((st) => sameSet(st.map((i) => f[i]), colors));
}

export function findEdge(f: Facelets, colors: CubeColor[]): number {
  return EDGE_FACELETS.findIndex((st) => sameSet(st.map((i) => f[i]), colors));
}

export const cornerColors = (f: Facelets, pos: number) => CORNER_FACELETS[pos].map((i) => f[i]);
export const edgeColors = (f: Facelets, pos: number) => EDGE_FACELETS[pos].map((i) => f[i]);

/** Corner positions: 0 URF, 1 UFL, 2 ULB, 3 UBR, 4 DFR, 5 DLF, 6 DBL, 7 DRB. */
export const U_CORNERS = [0, 1, 2, 3];
export const D_CORNERS = [4, 5, 6, 7];
/** Edge positions: 0 UR, 1 UF, 2 UL, 3 UB, 4 DR, 5 DF, 6 DL, 7 DB, 8 FR, 9 FL, 10 BL, 11 BR. */
export const U_EDGES = [0, 1, 2, 3];
export const D_EDGES = [4, 5, 6, 7];
export const MIDDLE_EDGES = [8, 9, 10, 11];
