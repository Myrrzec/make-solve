import { parseSequence } from './moveParser';
import type { CubeMove } from './types';

/** Small deterministic PRNG so failures are reproducible. */
export function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

export function randomScramble(rand: () => number, length = 25): CubeMove[] {
  const faces = ['U', 'R', 'F', 'D', 'L', 'B'];
  const suffix = ['', "'", '2'];
  const tokens: string[] = [];
  for (let i = 0; i < length; i++) tokens.push(faces[Math.floor(rand() * 6)] + suffix[Math.floor(rand() * 3)]);
  return parseSequence(tokens.join(' '));
}

