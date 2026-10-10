export type FaceId = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';

export const FACES: readonly FaceId[] = ['U', 'R', 'F', 'D', 'L', 'B'];

export type CubeColor = 'white' | 'yellow' | 'red' | 'orange' | 'blue' | 'green';

export const COLORS: readonly CubeColor[] = ['white', 'yellow', 'red', 'orange', 'blue', 'green'];

/** Public cube format: 9 stickers per face, row-major, canonical view (see facelets.ts). */
export interface CubeState {
  faces: Record<FaceId, CubeColor[]>;
}

/** Possibly incomplete state used while scanning. */
export type PartialCubeState = Record<FaceId, (CubeColor | null)[]>;

export type MoveKind = 'face' | 'wide' | 'slice' | 'rotation';
export type MoveTarget = FaceId | 'M' | 'E' | 'S' | 'x' | 'y' | 'z';

export interface CubeMove {
  raw: string;
  target: MoveTarget;
  amount: 1 | -1 | 2;
  kind: MoveKind;
}

export type ExplanationMode = 'beginner' | 'notation';
export type SolutionMethod = 'beginner' | 'cfop';
