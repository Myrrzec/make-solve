import { moveGeometry, type MoveGeometry } from '../cube/geometry';
import { formatMove, type NotationStyle } from '../cube/moveParser';
import { COLOR_NAME, FACE_NAME } from '../cube/names';
import { centerColor, type Facelets } from '../cube/state';
import type { CubeMove, ExplanationMode, FaceId } from '../cube/types';

/**
 * One rule for the whole app: "clockwise" means clockwise when looking
 * straight at the turning face. Slices turn like the face they follow
 * (M like L, E like D, S like F); rotations like R, U, F.
 */

export interface Instruction {
  notation: string;
  primary: string;
  secondary?: string;
  viewHint?: string;
  relativeHint?: string;
  angle: 90 | 180;
  geometry: MoveGeometry;
}

/** What the user sees for a clockwise quarter turn, from the front. */
const RELATIVE_CW: Record<FaceId, { what: string; cw: string; ccw: string }> = {
  U: { what: 'the front row', cw: 'left', ccw: 'right' },
  D: { what: 'the front row', cw: 'right', ccw: 'left' },
  R: { what: 'the front column', cw: 'up', ccw: 'down' },
  L: { what: 'the front column', cw: 'down', ccw: 'up' },
  F: { what: 'the top row', cw: 'right', ccw: 'left' },
  B: { what: 'the top row (seen from the front)', cw: 'left', ccw: 'right' },
};

const VIEW_HINT: Record<FaceId, string> = {
  U: 'Direction as seen looking down at the top face.',
  D: 'Direction as seen looking up at the bottom face.',
  R: 'Direction as seen looking at the right face from the right.',
  L: 'Direction as seen looking at the left face from the left.',
  F: 'Direction as seen looking straight at the front face.',
  B: 'Direction as seen looking at the back face from behind.',
};

const WIDE_NAME: Record<FaceId, string> = {
  U: 'the two top layers',
  D: 'the two bottom layers',
  R: 'the two right layers',
  L: 'the two left layers',
  F: 'the two front layers',
  B: 'the two back layers',
};

const SLICE: Record<'M' | 'E' | 'S', { name: string; like: FaceId }> = {
  M: { name: 'the middle vertical layer between the left and right faces', like: 'L' },
  E: { name: 'the middle horizontal layer between the top and bottom faces', like: 'D' },
  S: { name: 'the middle layer between the front and back faces', like: 'F' },
};

const ROTATION_LIKE: Record<'x' | 'y' | 'z', FaceId> = { x: 'R', y: 'U', z: 'F' };

function direction(amount: CubeMove['amount']): string {
  if (amount === 2) return '180°';
  return amount === 1 ? '90° clockwise' : '90° counterclockwise';
}

function relative(face: FaceId, amount: CubeMove['amount']): string {
  const r = RELATIVE_CW[face];
  if (amount === 2) return 'Half turn: either direction works.';
  const dir = amount === 1 ? r.cw : r.ccw;
  return `${r.what[0].toUpperCase()}${r.what.slice(1)} moves ${dir}.`;
}

function colorHint(facelets: Facelets | undefined, face: FaceId): string {
  return facelets ? ` (${COLOR_NAME[centerColor(facelets, face)]})` : '';
}

/** Turns a move into an instruction. `facelets` is the cube before the move, for color hints. */
export function explainMove(
  move: CubeMove,
  mode: ExplanationMode,
  options: { facelets?: Facelets; notationStyle?: NotationStyle } = {},
): Instruction {
  const notation = formatMove(move, options.notationStyle);
  const geometry = moveGeometry(move);
  const angle = move.amount === 2 ? 180 : 90;
  let text: string;
  let viewHint: string | undefined;
  let relativeHint: string | undefined;

  switch (move.kind) {
    case 'face': {
      const face = move.target as FaceId;
      text = `Turn the ${FACE_NAME[face]} face${colorHint(options.facelets, face)} ${direction(move.amount)}.`;
      viewHint = move.amount === 2 ? undefined : VIEW_HINT[face];
      relativeHint = relative(face, move.amount);
      break;
    }
    case 'wide': {
      const face = move.target as FaceId;
      text = `Turn ${WIDE_NAME[face]} together ${direction(move.amount)}.`;
      viewHint = move.amount === 2 ? undefined : VIEW_HINT[face];
      relativeHint = relative(face, move.amount);
      break;
    }
    case 'slice': {
      const s = SLICE[move.target as 'M' | 'E' | 'S'];
      text = `Turn ${s.name} the same way as the ${FACE_NAME[s.like]} face, ${direction(move.amount)}.`;
      relativeHint = relative(s.like, move.amount);
      break;
    }
    case 'rotation': {
      const like = ROTATION_LIKE[move.target as 'x' | 'y' | 'z'];
      const how =
        move.amount === 2 ? '180°' : `in the direction of ${like}${move.amount === -1 ? "'" : ''}`;
      text = `Rotate the whole cube ${how}. Don't turn any layers.`;
      relativeHint = rotationHint(move);
      break;
    }
  }

  if (mode === 'notation') {
    return { notation, primary: notation, secondary: text, relativeHint, angle, geometry };
  }
  return { notation, primary: text, secondary: relativeHint, viewHint, relativeHint, angle, geometry };
}

function rotationHint(move: CubeMove): string {
  const cw = move.amount !== -1;
  const half = move.amount === 2;
  switch (move.target) {
    case 'x':
      return half ? 'Flip the cube over the top: top and bottom swap.' : `The front face moves ${cw ? 'up' : 'down'}.`;
    case 'y':
      return half ? 'Turn the cube around: front and back swap.' : `The front face moves ${cw ? 'left' : 'right'}.`;
    default:
      return half ? 'Tip the cube on its side twice: top and bottom swap.' : `The top face moves ${cw ? 'right' : 'left'}.`;
  }
}
