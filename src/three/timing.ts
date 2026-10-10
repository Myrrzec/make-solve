import type { CubeMove } from '../cube/types';

/** Duration of a plain quarter turn at speed 1×. */
export const BASE_MOVE_MS = 650;

/**
 * Harder moves get more time so the eye can follow them: half turns,
 * slices and wide turns, and above all whole-cube rotations.
 */
export function moveDurationFactor(move: CubeMove): number {
  const half = move.amount === 2;
  switch (move.kind) {
    case 'rotation':
      return half ? 2.4 : 1.7;
    case 'slice':
    case 'wide':
      return half ? 1.9 : 1.3;
    default:
      return half ? 1.6 : 1;
  }
}

export function moveDurationMs(move: CubeMove | undefined, speed: number): number {
  return move ? (BASE_MOVE_MS * moveDurationFactor(move)) / speed : 0;
}
