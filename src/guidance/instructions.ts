import { moveGeometry, type MoveGeometry } from '../cube/geometry';
import { formatMove, type NotationStyle } from '../cube/moveParser';
import { COLOR_NAME_FEM, FACE_NAME_ACC } from '../cube/names';
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
  U: { what: 'передний ряд', cw: 'влево', ccw: 'вправо' },
  D: { what: 'передний ряд', cw: 'вправо', ccw: 'влево' },
  R: { what: 'передний столбец', cw: 'вверх', ccw: 'вниз' },
  L: { what: 'передний столбец', cw: 'вниз', ccw: 'вверх' },
  F: { what: 'верхний ряд', cw: 'вправо', ccw: 'влево' },
  B: { what: 'верхний ряд (если смотреть спереди)', cw: 'влево', ccw: 'вправо' },
};

const VIEW_HINT: Record<FaceId, string> = {
  U: 'Направление считается, если смотреть на верхнюю грань сверху.',
  D: 'Направление считается, если смотреть на нижнюю грань снизу.',
  R: 'Направление считается, если смотреть на правую грань справа.',
  L: 'Направление считается, если смотреть на левую грань слева.',
  F: 'Направление считается, если смотреть прямо на переднюю грань.',
  B: 'Направление считается, если смотреть на заднюю грань сзади.',
};

const WIDE_NAME: Record<FaceId, string> = {
  U: 'два верхних слоя',
  D: 'два нижних слоя',
  R: 'два правых слоя',
  L: 'два левых слоя',
  F: 'два передних слоя',
  B: 'два задних слоя',
};

const SLICE: Record<'M' | 'E' | 'S', { name: string; like: FaceId }> = {
  M: { name: 'средний вертикальный слой между левой и правой гранями', like: 'L' },
  E: { name: 'средний горизонтальный слой между верхней и нижней гранями', like: 'D' },
  S: { name: 'средний слой между передней и задней гранями', like: 'F' },
};

const ROTATION_LIKE: Record<'x' | 'y' | 'z', FaceId> = { x: 'R', y: 'U', z: 'F' };

function direction(amount: CubeMove['amount']): string {
  if (amount === 2) return 'на 180°';
  return amount === 1 ? 'по часовой стрелке на 90°' : 'против часовой стрелки на 90°';
}

function relative(face: FaceId, amount: CubeMove['amount']): string {
  const r = RELATIVE_CW[face];
  if (amount === 2) return 'Полоборота: направление не важно.';
  const dir = amount === 1 ? r.cw : r.ccw;
  return `${r.what[0].toUpperCase()}${r.what.slice(1)} уходит ${dir}.`;
}

function colorHint(facelets: Facelets | undefined, face: FaceId): string {
  return facelets ? ` (${COLOR_NAME_FEM[centerColor(facelets, face)]})` : '';
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
      text = `Поверните ${FACE_NAME_ACC[face]} грань${colorHint(options.facelets, face)} ${direction(move.amount)}.`;
      viewHint = move.amount === 2 ? undefined : VIEW_HINT[face];
      relativeHint = relative(face, move.amount);
      break;
    }
    case 'wide': {
      const face = move.target as FaceId;
      text = `Поверните ${WIDE_NAME[face]} вместе ${direction(move.amount)}.`;
      viewHint = move.amount === 2 ? undefined : VIEW_HINT[face];
      relativeHint = relative(face, move.amount);
      break;
    }
    case 'slice': {
      const s = SLICE[move.target as 'M' | 'E' | 'S'];
      text = `Поверните ${s.name} так же, как ${FACE_NAME_ACC[s.like]} грань, ${direction(move.amount)}.`;
      relativeHint = relative(s.like, move.amount);
      break;
    }
    case 'rotation': {
      const like = ROTATION_LIKE[move.target as 'x' | 'y' | 'z'];
      const how =
        move.amount === 2 ? 'на 180°' : `в направлении поворота ${like}${move.amount === -1 ? "'" : ''}`;
      text = `Перехватите весь кубик ${how}. Слои не крутите.`;
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
      return half ? 'Переверните кубик через верх: верх и низ меняются местами.' : `Передняя грань уходит ${cw ? 'наверх' : 'вниз'}.`;
    case 'y':
      return half ? 'Разверните кубик: перед и зад меняются местами.' : `Передняя грань уходит ${cw ? 'влево' : 'вправо'}.`;
    default:
      return half ? 'Переверните кубик набок дважды: верх и низ меняются местами.' : `Верхняя грань уходит ${cw ? 'вправо' : 'влево'}.`;
  }
}
