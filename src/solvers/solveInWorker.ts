import type { CubeState, SolutionMethod } from '../cube/types';
import type { Solution } from './types';

let worker: Worker | null = null;
let nextId = 1;

/** Runs a solver off the main thread so the interface stays responsive. */
export function solveInWorker(method: SolutionMethod, state: CubeState): Promise<Solution> {
  worker ??= new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' });
  const id = nextId++;
  const w = worker;
  return new Promise((resolve, reject) => {
    const onMessage = (e: MessageEvent<{ id: number; solution?: Solution; error?: string }>) => {
      if (e.data.id !== id) return;
      w.removeEventListener('message', onMessage);
      if (e.data.solution) resolve(e.data.solution);
      else reject(new Error(e.data.error));
    };
    w.addEventListener('message', onMessage);
    w.postMessage({ id, method, state });
  });
}
