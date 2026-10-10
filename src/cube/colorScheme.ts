import { parseSequence } from './moveParser';
import { applyMoves, centerColor, solvedFacelets } from './state';
import type { CubeColor, FaceId } from './types';
import { FACES } from './types';

/**
 * Standard color scheme (white opposite yellow, green opposite blue, red
 * opposite orange). The first face shown to the camera becomes the front;
 * white stays on top unless the front itself is white or yellow.
 */
const ORIENTATIONS = ['', 'y', 'y2', "y'", 'x', "x'", 'x2', 'z', "z'"].flatMap((a) => ['', 'y', 'y2', "y'"].map((b) => `${a} ${b}`));

export function upFor(front: CubeColor): CubeColor {
  if (front === 'white') return 'blue';
  if (front === 'yellow') return 'green';
  return 'white';
}

export function schemeFromFront(front: CubeColor): Record<FaceId, CubeColor> {
  const up = upFor(front);
  for (const rot of ORIENTATIONS) {
    const f = applyMoves(solvedFacelets(), parseSequence(rot));
    if (centerColor(f, 'F') === front && centerColor(f, 'U') === up) {
      return Object.fromEntries(FACES.map((face) => [face, centerColor(f, face)])) as Record<FaceId, CubeColor>;
    }
  }
  throw new Error(`No orientation with ${front} in front`);
}
