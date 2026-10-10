import { parseSequence } from '../../cube/moveParser';
import { CORNER_FACELETS, EDGE_FACELETS } from '../../cube/pieces';
import { applyMoves, centerColor, isSolved, toFacelets, type Facelets } from '../../cube/state';
import type { CubeColor, CubeMove, CubeState, FaceId } from '../../cube/types';
import { FACES } from '../../cube/types';
import { validateCube } from '../../cube/validation';
import { centerOf, cornerSolved, edgeSolved, U_CORNERS } from '../common/pieces';
import { macro, trackedBfs, type Macro } from '../common/search';
import { searchBlocks, SolutionBuilder, turns } from '../common/SolutionBuilder';
import { SolverError, type CubeSolver, type Solution } from '../types';
import { OLL_CORNERS, OLL_EDGES, PLL_CORNERS, PLL_EDGES } from './algorithms';
import { applyCaseAlgorithm, matchOll, matchPll, ollNameFor } from './lastLayer';

/**
 * CFOP (Friedrich): cross on the bottom, F2L pairs inserted straight into
 * their slots, then the last layer with two-look OLL and two-look PLL.
 * Its own implementation, not a relabelled output of another solver.
 */

const ROTATION_TO_BOTTOM: Record<FaceId, string> = { D: '', U: 'x2', F: "x'", B: 'x', R: 'z', L: "z'" };

/** D-layer edge facelet next to each side face. */
const CROSS_SLOTS: Record<'F' | 'R' | 'B' | 'L', number> = { F: 28, R: 32, B: 34, L: 30 };

interface Slot {
  corner: number;
  edge: number;
  faces: ['F' | 'R' | 'B' | 'L', 'F' | 'R' | 'B' | 'L'];
  /** Moves that lift the slot into the top layer and put it back. */
  triggers: [string, string][];
}

/** Each trigger X U^k X' only touches the top layer and its own slot. */
const SLOTS: Slot[] = [
  { corner: 4, edge: 8, faces: ['F', 'R'], triggers: [["R", "R'"], ["F'", 'F']] },
  { corner: 5, edge: 9, faces: ['F', 'L'], triggers: [["L'", 'L'], ['F', "F'"]] },
  { corner: 6, edge: 10, faces: ['B', 'L'], triggers: [['L', "L'"], ["B'", 'B']] },
  { corner: 7, edge: 11, faces: ['B', 'R'], triggers: [["R'", 'R'], ['B', "B'"]] },
];

const U_MACROS: Macro[] = ['U', "U'", 'U2'].map((m) => macro(m));
const SLOT_MACROS: Macro[][] = SLOTS.map((slot) =>
  slot.triggers.flatMap(([a, b]) => ['U', "U'", 'U2'].map((u) => macro(`${a} ${u} ${b}`))),
);

const slotSolved = (f: Facelets, s: Slot) => cornerSolved(f, s.corner) && edgeSolved(f, s.edge);
const crossDone = (f: Facelets) => Object.values(CROSS_SLOTS).every((i) => f[i] === centerColor(f, 'D') && f[stickerPartner(i)] === centerOf(f, stickerPartner(i)));
export const f2lDone = (f: Facelets) => crossDone(f) && SLOTS.every((s) => slotSolved(f, s));
const top = (f: Facelets) => centerColor(f, 'U');
const ollDone = (f: Facelets) => f2lDone(f) && f.slice(0, 9).every((c) => c === top(f));
const edgesOriented = (f: Facelets) => f2lDone(f) && [1, 3, 5, 7].every((i) => f[i] === top(f));

function stickerPartner(i: number): number {
  const edge = EDGE_FACELETS.find((e) => e.includes(i))!;
  return edge[0] === i ? edge[1] : edge[0];
}

const U_TURNS = [0, 1, 2, 3].map((k) => turns('U', k));
const solvedModuloU = (f: Facelets) => U_TURNS.some((u) => isSolved(applyMoves(f, u)));
const cornersPlaced = (f: Facelets) => ollDone(f) && U_CORNERS.every((p) => cornerSolved(f, p));
const cornersPlacedModuloU = (f: Facelets) => U_TURNS.some((u) => cornersPlaced(applyMoves(f, u)));

function solveCross(b: SolutionBuilder) {
  const f = b.facelets;
  const base = centerColor(f, 'D');
  const start: number[] = [];
  const target: number[] = [];
  for (const side of ['F', 'R', 'B', 'L'] as const) {
    const color = centerColor(f, side);
    const pos = EDGE_FACELETS.findIndex((st) => st.some((i) => f[i] === base) && st.some((i) => f[i] === color));
    start.push(EDGE_FACELETS[pos].find((i) => f[i] === base)!);
    target.push(CROSS_SLOTS[side]);
  }
  b.apply(trackedBfs(start, target, undefined, 8));
}

function solvePair(f: Facelets, slot: Slot, free: Slot[]): CubeMove[] {
  const base = centerColor(f, 'D');
  const [c1, c2] = slot.faces.map((s) => centerColor(f, s));
  const cornerPos = CORNER_FACELETS.findIndex((st) => [base, c1, c2].every((c) => st.some((i) => f[i] === c)));
  const edgePos = EDGE_FACELETS.findIndex((st) => [c1, c2].every((c) => st.some((i) => f[i] === c)));
  const cornerSticker = CORNER_FACELETS[cornerPos].find((i) => f[i] === base)!;
  const edgeSticker = EDGE_FACELETS[edgePos].find((i) => f[i] === c1)!;
  const edgeHome = EDGE_FACELETS[slot.edge].find((i) => FACES[Math.floor(i / 9)] === slot.faces[0])!;
  const macros = [...U_MACROS, ...free.flatMap((s) => SLOT_MACROS[SLOTS.indexOf(s)])];
  return trackedBfs([cornerSticker, edgeSticker], [CORNER_FACELETS[slot.corner][0], edgeHome], macros, 8);
}

function solveF2L(b: SolutionBuilder) {
  for (let guard = 0; guard < 4; guard++) {
    const free = SLOTS.filter((s) => !slotSolved(b.facelets, s));
    if (free.length === 0) return;
    // Take the pair that is quickest to insert, as a solver looking ahead would.
    const options = free.map((s) => solvePair(b.facelets, s, free));
    b.apply(options.reduce((best, o) => (o.length < best.length ? o : best)));
  }
}

function blocks(algs: Record<string, string>): CubeMove[][] {
  return U_TURNS.flatMap((u) => Object.values(algs).map((a) => [...u, ...parseSequence(a)]));
}

/** One look with the full table; two looks only if the table has no match. */
function solveOll(b: SolutionBuilder) {
  if (ollDone(b.facelets)) return;
  const m = matchOll(b.facelets);
  if (m) {
    const named = ollNameFor(m.case.n);
    // Prefer the formula from the video so the card matches what the user learned.
    const video = named ? applyCaseAlgorithm(b.facelets, named.alg) : null;
    b.setCase({
      set: 'OLL',
      number: m.case.n,
      name: named?.name,
      groupHint: named ? `Группа «${named.group}»` : undefined,
      algorithm: video ? named!.alg : m.algorithm,
      sheetAlgorithm: video && named!.alg !== m.algorithm ? m.algorithm : undefined,
      videoAt: named?.at,
      before: video ? video.before : m.before,
      after: [],
    });
    if (video) {
      b.apply(video.moves);
      return;
    }
    b.apply(m.moves);
    return;
  }
  const edges = searchBlocks(b.facelets, blocks(OLL_EDGES), edgesOriented, 2);
  if (!edges) throw new SolverError('OLL: не удалось сориентировать рёбра', 'oll');
  b.apply(edges);
  const corners = searchBlocks(b.facelets, blocks(OLL_CORNERS), ollDone, 2);
  if (!corners) throw new SolverError('OLL: не удалось сориентировать углы', 'oll');
  b.apply(corners);
}

function solvePll(b: SolutionBuilder) {
  if (isSolved(b.facelets)) return;
  const m = matchPll(b.facelets);
  if (m) {
    b.setCase({
      set: 'PLL',
      number: m.case.n,
      group: m.case.group,
      letter: m.case.letter,
      name: m.case.group,
      algorithm: m.algorithm,
      before: m.before,
      after: m.after,
    });
    b.apply(m.moves);
    return;
  }
  const finish = U_TURNS.find((u) => isSolved(applyMoves(b.facelets, u)));
  if (finish) {
    b.apply(finish);
    return;
  }
  const corners = searchBlocks(b.facelets, blocks(PLL_CORNERS), cornersPlacedModuloU, 2);
  if (!corners) throw new SolverError('PLL: не удалось расставить углы', 'pll');
  b.apply(corners);
  const edges = searchBlocks(b.facelets, blocks(PLL_EDGES), solvedModuloU, 2);
  if (!edges) throw new SolverError('PLL: не удалось расставить рёбра', 'pll');
  b.apply(edges);
  b.apply(U_TURNS.find((u) => isSolved(applyMoves(b.facelets, u)))!);
}

export function solveCfop(state: CubeState): Solution {
  const b = new SolutionBuilder(toFacelets(state));
  const centers = FACES.map((f) => centerColor(b.facelets, f));
  const base: CubeColor = centers.includes('white') ? 'white' : centers[0];
  const baseFace = FACES.find((f) => centerColor(b.facelets, f) === base)!;

  b.beginPhase('cross', 'Cross', 'Белый крест на нижней грани. Кубик держим белым центром вниз и собираем крест сразу снизу.');
  if (ROTATION_TO_BOTTOM[baseFace]) b.apply(ROTATION_TO_BOTTOM[baseFace]);
  solveCross(b);
  b.endPhase(crossDone);

  b.beginPhase('f2l', 'F2L', 'Первые два слоя одновременно: угол и ребро соединяются в пару сверху и вставляются в свой слот.');
  solveF2L(b);
  b.endPhase(f2lDone);

  b.beginPhase('oll', 'OLL', 'Вся верхняя грань становится жёлтой одним алгоритмом из таблицы OLL.');
  solveOll(b);
  b.endPhase(ollDone);

  b.beginPhase('pll', 'PLL', 'Детали последнего слоя встают на свои места одним алгоритмом из таблицы PLL.');
  solvePll(b);
  b.endPhase(isSolved);

  const solution = b.build('cfop');
  if (!isSolved(applyMoves(toFacelets(state), solution.allMoves))) throw new SolverError('Решение не собирает кубик');
  return solution;
}

export const cfopSolver: CubeSolver = {
  id: 'cfop',
  status: 'available',
  validateSupport(state: CubeState) {
    const result = validateCube(state.faces);
    return result.ok ? { supported: true } : { supported: false, reason: result.issues[0]?.title };
  },
  async solve(state: CubeState) {
    return solveCfop(state);
  },
};
