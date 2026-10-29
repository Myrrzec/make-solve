import { makeMove, parseSequence, simplify } from '../../cube/moveParser';
import { applyMoves, type Facelets } from '../../cube/state';
import type { CubeMove, SolutionMethod } from '../../cube/types';
import { SolverError, type CaseInfo, type Solution, type SolutionPhase } from '../types';

/** Records moves into phases while keeping the simulated cube up to date. */
export class SolutionBuilder {
  facelets: Facelets;
  private phases: SolutionPhase[] = [];
  private current: SolutionPhase | null = null;

  constructor(start: Facelets) {
    this.facelets = start.slice();
  }

  beginPhase(id: string, title: string, description: string) {
    this.current = { id, title, description, moves: [] };
    this.phases.push(this.current);
  }

  setCase(info: CaseInfo) {
    if (this.current) this.current.caseInfo = info;
  }

  endPhase(check: (f: Facelets) => boolean) {
    if (!this.current) throw new Error('No phase started');
    if (!check(this.facelets)) {
      throw new SolverError(`Step "${this.current.title}" did not reach its goal`, this.current.id);
    }
    // Keep a case's moves exactly as on the sheet so they can be read along.
    if (!this.current.caseInfo) this.current.moves = simplify(this.current.moves);
    this.current.skipped = this.current.moves.length === 0;
    this.current = null;
  }

  apply(moves: CubeMove[] | string) {
    if (!this.current) throw new Error('No phase started');
    const list = typeof moves === 'string' ? parseSequence(moves) : moves;
    this.facelets = applyMoves(this.facelets, list);
    this.current.moves.push(...list);
  }

  build(method: SolutionMethod): Solution {
    const phases = this.phases;
    return { method, phases, allMoves: phases.flatMap((p) => p.moves) };
  }
}

/** y^k / U^k etc. as a move list (k = 0..3). */
export function turns(target: 'U' | 'y' | 'D', k: number): CubeMove[] {
  const q = ((k % 4) + 4) % 4;
  if (q === 0) return [];
  const kind = target === 'y' ? 'rotation' : 'face';
  return [makeMove(target, q === 1 ? 1 : q === 2 ? 2 : -1, kind)];
}

/** Breadth-first search over candidate move blocks; returns the shortest block list reaching the goal. */
export function searchBlocks(
  start: Facelets,
  blocks: CubeMove[][],
  goal: (f: Facelets) => boolean,
  maxDepth: number,
): CubeMove[] | null {
  if (goal(start)) return [];
  let frontier: { f: Facelets; path: CubeMove[] }[] = [{ f: start, path: [] }];
  for (let depth = 1; depth <= maxDepth; depth++) {
    const next: typeof frontier = [];
    let best: CubeMove[] | null = null;
    for (const node of frontier) {
      for (const block of blocks) {
        const f = applyMoves(node.f, block);
        const path = [...node.path, ...block];
        if (goal(f) && (!best || path.length < best.length)) best = path;
        next.push({ f, path });
      }
    }
    if (best) return best;
    frontier = next;
  }
  return null;
}
