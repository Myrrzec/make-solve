import type { CubeState, SolutionMethod } from '../cube/types';
import { SOLVERS } from './registry';

self.onmessage = async (e: MessageEvent<{ id: number; method: SolutionMethod; state: CubeState }>) => {
  const { id, method, state } = e.data;
  try {
    const solution = await SOLVERS[method].solve(state);
    self.postMessage({ id, solution });
  } catch (err) {
    self.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
};
