import type { CubeMove, CubeState, SolutionMethod } from '../cube/types';

export interface SolverSupportResult {
  supported: boolean;
  reason?: string;
}

/** Which last layer case a CFOP step solves, numbered as on the reference sheet. */
export interface CaseInfo {
  set: 'OLL' | 'PLL';
  number: number;
  /** Group name and letter for PLL, e.g. "T perm" (T). */
  group?: string;
  letter?: string;
  /** Name of the shape as cubers call it, e.g. "fish". */
  name?: string;
  /** How to recognise the shape. */
  groupHint?: string;
  algorithm: string;
  /** The same case as printed on the sheet, when the main formula comes from the video. */
  sheetAlgorithm?: string;
  /** Second in the explanation video where this formula is shown. */
  videoAt?: number;
  before: CubeMove[];
  after: CubeMove[];
}

export interface SolutionPhase {
  id: string;
  title: string;
  description: string;
  moves: CubeMove[];
  caseInfo?: CaseInfo;
  /** The step was already done on the cube that was shown. */
  skipped?: boolean;
}

export interface Solution {
  method: SolutionMethod;
  phases: SolutionPhase[];
  allMoves: CubeMove[];
}

export type SolverStatus = 'available' | 'experimental' | 'unavailable';

export interface CubeSolver {
  id: SolutionMethod;
  status: SolverStatus;
  validateSupport(state: CubeState): SolverSupportResult;
  solve(state: CubeState): Promise<Solution>;
}

export class SolverError extends Error {
  constructor(
    message: string,
    public phaseId?: string,
  ) {
    super(message);
    this.name = 'SolverError';
  }
}
