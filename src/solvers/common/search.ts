import { moveGeometry, turnPermutation } from '../../cube/geometry';
import { makeMove, parseSequence } from '../../cube/moveParser';
import type { CubeMove } from '../../cube/types';
import { FACES } from '../../cube/types';
import { SolverError } from '../types';

/** A block of moves with its combined sticker permutation (`to[src] = dest`). */
export interface Macro {
  moves: CubeMove[];
  to: Int8Array;
}

export function macro(moves: CubeMove[] | string): Macro {
  const list = typeof moves === 'string' ? parseSequence(moves) : moves;
  let to = new Int8Array(54).map((_, i) => i);
  for (const m of list) {
    const step = turnPermutation(moveGeometry(m));
    to = to.map((dest) => step[dest]);
  }
  return { moves: list, to };
}

export const FACE_MACROS: Macro[] = FACES.flatMap((face) => ([1, -1, 2] as const).map((amount) => macro([makeMove(face, amount, 'face')])));

/**
 * Breadth-first search over macros that moves every tracked sticker to its
 * target. Tracking one sticker per piece fully describes its place and twist.
 * Among the shortest macro sequences, the one with the fewest moves wins.
 */
export function trackedBfs(start: number[], target: number[], macros: Macro[] = FACE_MACROS, maxDepth = 9): CubeMove[] {
  const encode = (locs: number[]) => locs.reduce((acc, l) => acc * 54 + l, 0);
  const goal = encode(target);
  const startKey = encode(start);
  if (startKey === goal) return [];
  const parent = new Map<number, { prev: number; macro: number }>([[startKey, { prev: -1, macro: -1 }]]);
  const path = (k: number) => {
    const out: CubeMove[] = [];
    for (let cur = k; cur !== startKey; cur = parent.get(cur)!.prev) out.unshift(...macros[parent.get(cur)!.macro].moves);
    return out;
  };
  let frontier: number[][] = [start];
  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
    const next: number[][] = [];
    let best: CubeMove[] | null = null;
    for (const locs of frontier) {
      const key = encode(locs);
      for (let m = 0; m < macros.length; m++) {
        const moved = locs.map((l) => macros[m].to[l]);
        const k = encode(moved);
        if (k === goal) {
          const candidate = [...path(key), ...macros[m].moves];
          if (!best || candidate.length < best.length) best = candidate;
          continue;
        }
        if (parent.has(k)) continue;
        parent.set(k, { prev: key, macro: m });
        next.push(moved);
      }
    }
    if (best) return best;
    frontier = next;
  }
  throw new SolverError('Search found no solution for this step');
}
