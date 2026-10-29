import type { FaceId } from '../cube/types';

export interface ScanStep {
  face: FaceId;
  title: string;
  /** Whole-cube turn from the home position, in notation. */
  turn: string;
  howToHold: string;
  topEdge: string;
  leftEdge: string;
}

/**
 * Every photo starts from the home position (pick a face to look at you and
 * keep it) and returns there afterwards, so mistakes never pile up.
 */
export const SCAN_SEQUENCE: ScanStep[] = [
  {
    face: 'U',
    title: 'Top face',
    turn: "x'",
    howToHold: 'Tilt the top of the cube toward you so the top face looks at you.',
    topEdge: 'back face',
    leftEdge: 'left face',
  },
  {
    face: 'R',
    title: 'Right face',
    turn: 'y',
    howToHold: 'Turn the whole cube to the left so the right face is in front of you.',
    topEdge: 'top face',
    leftEdge: 'front face',
  },
  {
    face: 'F',
    title: 'Front face',
    turn: '',
    howToHold: 'Hold the cube in the home position: the front face looks at you.',
    topEdge: 'top face',
    leftEdge: 'left face',
  },
  {
    face: 'D',
    title: 'Bottom face',
    turn: 'x',
    howToHold: 'Tilt the top of the cube away from you so the bottom face looks at you.',
    topEdge: 'front face',
    leftEdge: 'left face',
  },
  {
    face: 'L',
    title: 'Left face',
    turn: "y'",
    howToHold: 'Turn the whole cube to the right so the left face is in front of you.',
    topEdge: 'top face',
    leftEdge: 'back face',
  },
  {
    face: 'B',
    title: 'Back face',
    turn: 'y2',
    howToHold: 'Turn the whole cube around so the back face looks at you.',
    topEdge: 'top face',
    leftEdge: 'right face',
  },
];

export const SCAN_ORDER: FaceId[] = SCAN_SEQUENCE.map((s) => s.face);
