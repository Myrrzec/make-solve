import type { SolutionMethod } from '../cube/types';
import { beginnerSolver } from './beginner/BeginnerSolver';
import { cfopSolver } from './cfop/CfopSolver';
import type { CubeSolver } from './types';

export const SOLVERS: Record<SolutionMethod, CubeSolver> = {
  beginner: beginnerSolver,
  cfop: cfopSolver,
};
