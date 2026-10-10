import { CORNER_FACELETS, EDGE_FACELETS } from '../../cube/pieces';
import { applyMoves, centerColor, isSolved, toFacelets, type Facelets } from '../../cube/state';
import type { CubeColor, CubeMove, CubeState, FaceId } from '../../cube/types';
import { FACES } from '../../cube/types';
import { validateCube } from '../../cube/validation';
import {
  centerOf,
  cornerColors,
  cornerSolved,
  D_CORNERS,
  edgeColors,
  edgeSolved,
  findCorner,
  MIDDLE_EDGES,
  U_CORNERS,
  U_EDGES,
} from '../common/pieces';
import { trackedBfs } from '../common/search';
import { SolutionBuilder, turns } from '../common/SolutionBuilder';
import { SolverError, type CubeSolver, type Solution, type SolverSupportResult } from '../types';
import { ALG } from './algorithms';

/**
 * Layer-by-layer method as taught in the reference video: white cross on top,
 * flip, white corners with пиф-паф, middle layer, yellow cross, cross edges to
 * their centers, corners to their places, then flip again and twist the
 * corners with пиф-паф turning only the bottom layer.
 */

/** U-layer edge facelet next to each side face, and the side sticker of that edge. */
const CROSS_SLOTS: Record<'F' | 'R' | 'B' | 'L', [number, number]> = {
  F: [7, 19],
  R: [5, 10],
  B: [1, 46],
  L: [3, 37],
};

const ROTATION_TO_TOP: Record<FaceId, string> = { U: '', D: 'x2', F: 'x', B: "x'", R: "z'", L: 'z' };

function crossEdge(f: Facelets, base: CubeColor, other: CubeColor): { loc: number; target: number } {
  const pos = EDGE_FACELETS.findIndex((st) => st.some((i) => f[i] === base) && st.some((i) => f[i] === other));
  const loc = EDGE_FACELETS[pos].find((i) => f[i] === base)!;
  const side = (Object.keys(CROSS_SLOTS) as (keyof typeof CROSS_SLOTS)[]).find((s) => centerColor(f, s) === other)!;
  return { loc, target: CROSS_SLOTS[side][0] };
}

const crossDone = (f: Facelets, base: CubeColor) =>
  Object.values(CROSS_SLOTS).every(([u, s]) => f[u] === base && stickerOk(f, s));
const stickerOk = (f: Facelets, i: number) => f[i] === centerOf(f, i);
function stickerPartner(i: number): number {
  const edge = EDGE_FACELETS.find((e) => e.includes(i))!;
  return edge[0] === i ? edge[1] : edge[0];
}

const firstLayerDone = (f: Facelets) => D_CORNERS.every((p) => cornerSolved(f, p)) && [4, 5, 6, 7].every((p) => edgeSolved(f, p));
const twoLayersDone = (f: Facelets) => firstLayerDone(f) && MIDDLE_EDGES.every((p) => edgeSolved(f, p));
const topColor = (f: Facelets) => centerColor(f, 'U');
const yellowCrossDone = (f: Facelets) => twoLayersDone(f) && [1, 3, 5, 7].every((i) => f[i] === topColor(f));

const Y_ROTATIONS = [0, 1, 2, 3].map((k) => turns('y', k));
const U_TURNS = [0, 1, 2, 3].map((k) => turns('U', k));

/** Picks the cheapest y^k (then U^j) that makes `ok` true. */
function pickSetup(f: Facelets, ok: (f: Facelets) => boolean, withU: boolean): CubeMove[] | null {
  let best: CubeMove[] | null = null;
  for (const y of Y_ROTATIONS) {
    for (const u of withU ? U_TURNS : [[]]) {
      const moves = [...y, ...u];
      if (ok(applyMoves(f, moves)) && (!best || moves.length < best.length)) best = moves;
    }
  }
  return best;
}

function solveCross(b: SolutionBuilder, base: CubeColor) {
  const sides = (['F', 'R', 'B', 'L'] as const).map((s) => centerColor(b.facelets, s));
  const solved: CubeColor[] = [];
  while (solved.length < 4) {
    let best: { color: CubeColor; moves: CubeMove[] } | null = null;
    for (const color of sides.filter((c) => !solved.includes(c))) {
      const tracked = [...solved, color].map((c) => crossEdge(b.facelets, base, c));
      const moves = trackedBfs(
        tracked.map((t) => t.loc),
        tracked.map((t) => t.target),
      );
      if (!best || moves.length < best.moves.length) best = { color, moves };
    }
    b.apply(best!.moves);
    solved.push(best!.color);
  }
}

function solveFirstLayerCorners(b: SolutionBuilder, base: CubeColor) {
  const sides = (['F', 'R', 'B', 'L'] as const).map((s) => centerColor(b.facelets, s));
  const corners = sides.map((c, i) => [base, c, sides[(i + 1) % 4]] as CubeColor[]);
  for (let guard = 0; guard < 12 && !D_CORNERS.every((p) => cornerSolved(b.facelets, p)); guard++) {
    // Prefer a corner already in the top layer; otherwise pull a wrong bottom corner up.
    const pending = corners.filter((cs) => {
      const pos = findCorner(b.facelets, cs);
      return !cornerSolved(b.facelets, pos);
    });
    const inTop = pending.find((cs) => U_CORNERS.includes(findCorner(b.facelets, cs)));
    if (!inTop) {
      const cs = pending[0];
      const setup = pickSetup(b.facelets, (f) => findCorner(f, cs) === 4, false)!;
      b.apply(setup);
      b.apply(ALG.sexy);
      continue;
    }
    // Put the target slot at front-right-bottom, then the corner right above it.
    const [, a, c] = inTop;
    const slotSetup = pickSetup(
      b.facelets,
      (f) => [centerColor(f, 'F'), centerColor(f, 'R')].every((x) => x === a || x === c),
      false,
    )!;
    b.apply(slotSetup);
    const uSetup = U_TURNS.find((u) => findCorner(applyMoves(b.facelets, u), inTop) === 0)!;
    b.apply(uSetup);
    for (let i = 0; i < 6 && !cornerSolved(b.facelets, 4); i++) b.apply(ALG.sexy);
  }
}

function solveMiddleLayer(b: SolutionBuilder) {
  for (let guard = 0; guard < 12 && !MIDDLE_EDGES.every((p) => edgeSolved(b.facelets, p)); guard++) {
    const top = topColor(b.facelets);
    const topEdge = U_EDGES.find((p) => !edgeColors(b.facelets, p).includes(top));
    if (topEdge === undefined) {
      // Every middle edge is in the middle layer but some are wrong: pop one out.
      const setup = pickSetup(b.facelets, (f) => !edgeSolved(f, 8), false)!;
      b.apply(setup);
      b.apply(ALG.middleRight);
      continue;
    }
    // Bring the edge to the front so its front sticker matches the front center.
    const colors = edgeColors(b.facelets, topEdge);
    const setup = pickSetup(
      b.facelets,
      (f) => {
        const [u, s] = EDGE_FACELETS[1];
        return colors.includes(f[u]) && colors.includes(f[s]) && f[s] === centerColor(f, 'F');
      },
      true,
    )!;
    b.apply(setup);
    const upSticker = b.facelets[EDGE_FACELETS[1][0]];
    b.apply(upSticker === centerColor(b.facelets, 'R') ? ALG.middleRight : ALG.middleLeft);
  }
}

function solveYellowCross(b: SolutionBuilder) {
  for (let guard = 0; guard < 6 && !yellowCrossDone(b.facelets); guard++) {
    const top = topColor(b.facelets);
    const has = (i: number, f = b.facelets) => f[i] === top;
    const count = [1, 3, 5, 7].filter((i) => has(i)).length;
    if (count === 2) {
      const isLine = (f: Facelets) => has(3, f) && has(5, f);
      const isL = (f: Facelets) => has(1, f) && has(3, f);
      const line = has(1) === has(7);
      const setup = U_TURNS.find((u) => (line ? isLine : isL)(applyMoves(b.facelets, u)))!;
      b.apply(setup);
    }
    b.apply(ALG.yellowCross);
  }
}

/** Rotates the top until the most cross edges match their side centers. */
const sideMatches = (f: Facelets) => U_EDGES.filter((p) => stickerOk(f, EDGE_FACELETS[p][1])).length;
const yellowEdgesDone = (f: Facelets) => yellowCrossDone(f) && sideMatches(f) === 4;

function bestTopTurn(f: Facelets): CubeMove[] {
  return U_TURNS.reduce((best, u) => (sideMatches(applyMoves(f, u)) > sideMatches(applyMoves(f, best)) ? u : best), U_TURNS[0]);
}

function solveYellowEdges(b: SolutionBuilder) {
  for (let guard = 0; guard < 6; guard++) {
    b.apply(bestTopTurn(b.facelets));
    if (yellowEdgesDone(b.facelets)) return;
    const matched = (f: Facelets, p: number) => stickerOk(f, EDGE_FACELETS[p][1]);
    // Two matching edges next to each other: hold them at the back and on the right.
    const setup = pickSetup(b.facelets, (f) => matched(f, 3) && matched(f, 0), false);
    if (setup) b.apply(setup);
    b.apply(ALG.yellowEdges);
  }
  b.apply(bestTopTurn(b.facelets));
}

/** A top corner is in place when it sits between its three centers, whatever its twist. */
function cornerInPlace(f: Facelets, pos: number): boolean {
  const colors = cornerColors(f, pos);
  return CORNER_FACELETS[pos].every((i) => colors.includes(centerOf(f, i)));
}
const topCornersInPlace = (f: Facelets) => yellowEdgesDone(f) && U_CORNERS.every((p) => cornerInPlace(f, p));

function solveTopCorners(b: SolutionBuilder) {
  for (let guard = 0; guard < 6 && !topCornersInPlace(b.facelets); guard++) {
    // A corner already in place goes to the front left, closer to you.
    const setup = pickSetup(b.facelets, (f) => cornerInPlace(f, 1), false);
    if (setup) b.apply(setup);
    b.apply(ALG.placeCorners);
  }
}

function solveCornerTwist(b: SolutionBuilder) {
  // Turn the cube over: yellow goes down. From here only the bottom layer turns.
  b.apply('x2');
  const yellow = centerColor(b.facelets, 'D');
  const front = CORNER_FACELETS[4][0];
  const D_TURNS = [0, 1, 2, 3].map((k) => turns('D', k));
  for (let guard = 0; guard < 8; guard++) {
    const twisted = D_CORNERS.filter((p) => b.facelets[CORNER_FACELETS[p][0]] !== yellow);
    if (twisted.length === 0) break;
    const setup = D_TURNS.find((d) => applyMoves(b.facelets, d)[front] !== yellow)!;
    b.apply(setup);
    for (let i = 0; i < 6 && b.facelets[front] !== yellow; i++) b.apply(ALG.sexy);
  }
  b.apply(D_TURNS.find((d) => isSolved(applyMoves(b.facelets, d))) ?? []);
}

export function solveBeginner(state: CubeState): Solution {
  const b = new SolutionBuilder(toFacelets(state));
  const centers = FACES.map((f) => centerColor(b.facelets, f));
  const base: CubeColor = centers.includes('white') ? 'white' : centers[0];
  const baseFace = FACES.find((f) => centerColor(b.facelets, f) === base)!;

  // A white cross already standing at the bottom stays there: no flip up and back down.
  const crossOnBottom = centerColor(b.facelets, 'D') === base && [28, 30, 32, 34].every((i) => b.facelets[i] === base && stickerOk(b.facelets, stickerPartner(i)));

  b.beginPhase('cross', 'Белый крест', 'Соберите белый крест сверху: белые рёбра вокруг белого центра, боковые цвета совпадают с центрами.');
  if (!crossOnBottom) {
    if (ROTATION_TO_TOP[baseFace]) b.apply(ROTATION_TO_TOP[baseFace]);
    solveCross(b, base);
  }
  b.endPhase((f) => crossOnBottom || crossDone(f, base));

  b.beginPhase('first-layer-corners', 'Белая грань', 'Переверните кубик белым крестом вниз и поставьте белые углы пиф-пафом.');
  if (!crossOnBottom) b.apply('x2');
  solveFirstLayerCorners(b, base);
  b.endPhase(firstLayerDone);

  b.beginPhase('middle-layer', 'Средний слой', 'Вставьте четыре ребра без жёлтого цвета в средний слой.');
  solveMiddleLayer(b);
  b.endPhase(twoLayersDone);

  b.beginPhase('yellow-cross', 'Жёлтый крест', 'Переднюю грань «роняем» направо, делаем пиф-паф и возвращаем грань. Точка, галочка, палочка, крест.');
  solveYellowCross(b);
  b.endPhase(yellowCrossDone);

  b.beginPhase('yellow-edges', 'Боковые цвета креста', 'Крутите верх, пока два ребра креста не совпадут с боковыми центрами. Держите их сзади и справа и делаете комбинацию.');
  solveYellowEdges(b);
  b.endPhase(yellowEdgesDone);

  b.beginPhase('top-corners', 'Расстановка углов', 'Угол, который уже стоит на своём месте, держите слева ближе к себе. Повторяйте комбинацию, пока все углы не встанут на места.');
  solveTopCorners(b);
  b.endPhase(topCornersInPlace);

  b.beginPhase('corner-twist', 'Разворот углов', 'Переверните кубик жёлтым вниз. Делайте пиф-паф, пока жёлтый не посмотрит вниз, затем крутите только нижний слой к следующему углу.');
  solveCornerTwist(b);
  b.endPhase(isSolved);

  const solution = b.build('beginner');
  if (!isSolved(applyMoves(toFacelets(state), solution.allMoves))) {
    throw new SolverError('Решение не собирает кубик');
  }
  return solution;
}

export const beginnerSolver: CubeSolver = {
  id: 'beginner',
  status: 'available',
  validateSupport(state: CubeState): SolverSupportResult {
    const result = validateCube(state.faces);
    return result.ok ? { supported: true } : { supported: false, reason: result.issues[0]?.title };
  },
  async solve(state: CubeState) {
    return solveBeginner(state);
  },
};
