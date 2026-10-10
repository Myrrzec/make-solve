import { invertMove, makeMove, parseSequence } from '../../cube/moveParser';
import { applyMoves, centerColor, isSolved, solvedFacelets, type Facelets } from '../../cube/state';
import { CORNER_FACELETS, EDGE_FACELETS } from '../../cube/pieces';
import type { CubeMove, FaceId } from '../../cube/types';
import { FACES } from '../../cube/types';
import { turns } from '../common/SolutionBuilder';
import { OLL_CASES, PLL_CASES, type LastLayerCase, type PllCase } from './lastLayerCases';
import { OLL_NAMES, type OllName } from './ollNames';

/** Top-layer stickers: U face, then the top rows of F, R, B, L. */
const SIDE_ROWS: Record<'F' | 'R' | 'B' | 'L', number[]> = {
  F: [18, 19, 20],
  R: [9, 10, 11],
  B: [45, 46, 47],
  L: [36, 37, 38],
};
const RING = ['F', 'R', 'B', 'L'] as const;
const Y = [0, 1, 2, 3].map((k) => turns('y', k));
const U_TURNS = [0, 1, 2, 3].map((k) => turns('U', k));
const faceTurns = (face: FaceId): CubeMove[][] => [[], [makeMove(face, 1, 'face')], [makeMove(face, 2, 'face')], [makeMove(face, -1, 'face')]];

/** First two layers solved: every sticker below the top row matches its center. */
export function firstTwoLayersSolved(f: Facelets): boolean {
  for (let face = 1; face < 6; face++) {
    const center = f[face * 9 + 4];
    const cells = face === 3 ? [0, 1, 2, 3, 4, 5, 6, 7, 8] : [3, 4, 5, 6, 7, 8];
    for (const c of cells) if (f[face * 9 + c] !== center) return false;
  }
  return true;
}

export const lastLayerOriented = (f: Facelets) => firstTwoLayersSolved(f) && f.slice(0, 9).every((c) => c === centerColor(f, 'U'));

/** Orientation pattern of the top layer, the same however the top is turned. */
export function ollSignature(f: Facelets): string {
  return Y.map((y) => {
    const g = applyMoves(f, y);
    const top = centerColor(g, 'U');
    const cells = [...Array(9).keys(), ...RING.flatMap((s) => SIDE_ROWS[s])];
    return cells.map((i) => (g[i] === top ? '1' : '0')).join('');
  }).sort()[0];
}

/** Permutation pattern of the top layer, the same before and after any turn of the top. */
export function pllSignature(f: Facelets): string {
  const options: string[] = [];
  for (const y of Y) {
    const g = applyMoves(f, y);
    const ringOf = new Map(RING.map((s, i) => [centerColor(g, s), i]));
    const offsets = RING.flatMap((s, i) => SIDE_ROWS[s].map((cell) => ((ringOf.get(g[cell]) ?? 0) - i + 4) % 4));
    for (let shift = 0; shift < 4; shift++) options.push(offsets.map((o) => (o + shift) % 4).join(''));
  }
  return options.sort()[0];
}

const parsedCache = new Map<string, CubeMove[]>();
const parsed = (alg: string) => {
  let moves = parsedCache.get(alg);
  if (!moves) parsedCache.set(alg, (moves = parseSequence(alg)));
  return moves;
};

export const algorithmsOf = (c: LastLayerCase) => [c.alg, ...(c.alts ?? [])];

export interface CaseMatch<T extends LastLayerCase> {
  case: T;
  /** Algorithm used, as printed on the sheet. */
  algorithm: string;
  /** Turn of the top before the algorithm. */
  before: CubeMove[];
  /** Turn of the top after the algorithm (PLL only). */
  after: CubeMove[];
  moves: CubeMove[];
}

/** Finds the OLL case of a cube with the first two layers solved, and how to apply it. */
export function matchOll(f: Facelets): CaseMatch<LastLayerCase> | null {
  if (!firstTwoLayersSolved(f) || lastLayerOriented(f)) return null;
  for (const c of OLL_CASES)
    for (const algorithm of algorithmsOf(c))
      for (const before of U_TURNS) {
        const moves = [...before, ...parsed(algorithm)];
        if (lastLayerOriented(applyMoves(f, moves))) return { case: c, algorithm, before, after: [], moves };
      }
  return null;
}

/** Finds the PLL case of a cube whose last layer is oriented. */
export function matchPll(f: Facelets): CaseMatch<PllCase> | null {
  if (!lastLayerOriented(f) || U_TURNS.some((u) => isSolved(applyMoves(f, u)))) return null;
  for (const c of PLL_CASES)
    for (const algorithm of algorithmsOf(c))
      for (const before of U_TURNS) {
        const g = applyMoves(f, [...before, ...parsed(algorithm)]);
        // Some algorithms end with the whole cube turned (they start with l' or x'):
        // the last adjustment turns whichever face now carries the top color.
        const top = FACES.find((face) => centerColor(g, face) === centerColor(f, 'U'))!;
        const after = faceTurns(top).find((u) => isSolved(applyMoves(g, u)));
        if (after) return { case: c, algorithm, before, after, moves: [...before, ...parsed(algorithm), ...after] };
      }
  return null;
}

const ALL_ROTATIONS = ['', 'x', "x'", 'x2', 'z', "z'"].flatMap((a) => ['', 'y', 'y2', "y'"].map((b) => parseSequence(`${a} ${b}`)));

/**
 * The cube that an algorithm solves: a solved cube with the top up, taken
 * back through the algorithm. Algorithms that start with l' or x' leave the
 * whole cube turned, so the run starts from the solved cube turned the same
 * way and ends back in the original hold.
 */
export function caseFromAlgorithm(solvedTopUp: Facelets, algorithm: string): Facelets {
  const inverse = parsed(algorithm).map(invertMove).reverse();
  const sameHold = (g: Facelets) => FACES.every((face) => centerColor(g, face) === centerColor(solvedTopUp, face));
  for (const r of ALL_ROTATIONS) {
    const f = applyMoves(applyMoves(solvedTopUp, r), inverse);
    if (sameHold(f)) return f;
  }
  return applyMoves(solvedTopUp, inverse);
}

let ollNameIndex: Map<number, OllName> | null = null;

/** Name of a sheet OLL case as said in the video, matched by the shape itself. */
export function ollNameFor(n: number): OllName | undefined {
  if (!ollNameIndex) {
    ollNameIndex = new Map();
    const yellowUp = applyMoves(solvedFacelets(), parseSequence('x2'));
    for (const name of OLL_NAMES) {
      const m = matchOll(caseFromAlgorithm(yellowUp, name.alg));
      if (m) ollNameIndex.set(m.case.n, name);
    }
  }
  return ollNameIndex.get(n);
}

/** Turn of the top that makes `algorithm` orient this last layer, if there is one. */
export function applyCaseAlgorithm(f: Facelets, algorithm: string): { before: CubeMove[]; moves: CubeMove[] } | null {
  for (const before of U_TURNS) {
    const moves = [...before, ...parsed(algorithm)];
    if (lastLayerOriented(applyMoves(f, moves))) return { before, moves };
  }
  return null;
}

export interface PieceArrow {
  kind: 'corner' | 'edge';
  /** Cells of the top face (0..8, row by row, back row first). */
  from: number;
  to: number;
  /** Two pieces swap places: draw one line with two heads. */
  swap: boolean;
}

/** Top-face cell of each top-layer corner and edge position (Kociemba order). */
const CORNER_CELL = [8, 6, 0, 2];
const EDGE_CELL = [5, 7, 3, 1];

/**
 * Where every top-layer piece travels when `algorithm` is applied to `f`,
 * for drawing PLL arrows. Algorithms that turn the whole cube are turned back
 * so arrows stay in the same view.
 */
export function pieceArrows(f: Facelets, algorithm: string): PieceArrow[] {
  let g = applyMoves(f, parsed(algorithm));
  const sameHold = (h: Facelets) => FACES.every((face) => centerColor(h, face) === centerColor(f, face));
  g = ALL_ROTATIONS.map((r) => applyMoves(g, r)).find(sameHold) ?? g;
  const key = (facelets: Facelets, stickers: readonly number[]) => stickers.map((i) => facelets[i]).sort().join();
  const moves: Omit<PieceArrow, 'swap'>[] = [];
  const track = (kind: PieceArrow['kind'], table: readonly (readonly number[])[], cells: number[]) => {
    for (let from = 0; from < 4; from++) {
      const piece = key(f, table[from]);
      const to = [0, 1, 2, 3].find((p) => key(g, table[p]) === piece)!;
      if (to !== from) moves.push({ kind, from: cells[from], to: cells[to] });
    }
  };
  track('corner', CORNER_FACELETS, CORNER_CELL);
  track('edge', EDGE_FACELETS, EDGE_CELL);
  const arrows: PieceArrow[] = [];
  for (const m of moves) {
    const back = moves.find((o) => o.kind === m.kind && o.from === m.to && o.to === m.from);
    if (back && m.from > m.to) continue;
    arrows.push({ ...m, swap: !!back });
  }
  return arrows;
}
