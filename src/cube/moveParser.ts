import type { CubeMove, FaceId, MoveKind, MoveTarget } from './types';

export type ParseErrorCode = 'UNKNOWN_SYMBOL' | 'INVALID_WIDE' | 'INVALID_SUFFIX' | 'UNSUPPORTED_SYNTAX';

export class MoveParseError extends Error {
  constructor(
    public code: ParseErrorCode,
    public position: number,
    public token: string,
    message: string,
  ) {
    super(message);
    this.name = 'MoveParseError';
  }
}

const FACE_LETTERS = 'URFDLB';
const WIDE_LOWER = 'urfdlb';
const SLICES = 'MES';
const ROTATIONS = 'xyz';
const PRIMES = "'’′`";

export type NotationStyle = 'Rw' | 'r';

/** Parses a whole sequence such as "R U R' U'" or "RUR'U'". */
export function parseSequence(input: string): CubeMove[] {
  const moves: CubeMove[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    const start = i;
    let target: MoveTarget;
    let kind: MoveKind;
    if (FACE_LETTERS.includes(ch)) {
      target = ch as FaceId;
      kind = 'face';
      i++;
      if (input[i] === 'w') {
        kind = 'wide';
        i++;
      }
    } else if (WIDE_LOWER.includes(ch)) {
      target = ch.toUpperCase() as FaceId;
      kind = 'wide';
      i++;
      if (input[i] === 'w') {
        throw new MoveParseError('INVALID_WIDE', i, input.slice(start, i + 1), `Запись «${input.slice(start, i + 1)}» не поддерживается: используйте «${ch.toUpperCase()}w» или «${ch}».`);
      }
    } else if (SLICES.includes(ch) || ROTATIONS.includes(ch)) {
      target = ch as MoveTarget;
      kind = SLICES.includes(ch) ? 'slice' : 'rotation';
      i++;
      if (input[i] === 'w') {
        throw new MoveParseError('INVALID_WIDE', i, input.slice(start, i + 1), `У «${ch}» не бывает широкого поворота.`);
      }
    } else if ('()[],'.includes(ch)) {
      throw new MoveParseError('UNSUPPORTED_SYNTAX', i, ch, 'Скобки и повторы пока не поддерживаются.');
    } else if ('mes'.includes(ch)) {
      throw new MoveParseError('UNKNOWN_SYMBOL', i, ch, `Неизвестный символ «${ch}». Средние слои пишутся заглавными: M, E, S.`);
    } else {
      throw new MoveParseError('UNKNOWN_SYMBOL', i, ch, `Неизвестный символ «${ch}».`);
    }

    let amount: 1 | -1 | 2 = 1;
    if (input[i] === '2') {
      amount = 2;
      i++;
      if (input[i] !== undefined && PRIMES.includes(input[i])) i++; // R2' == R2
    } else if (input[i] !== undefined && PRIMES.includes(input[i])) {
      amount = -1;
      i++;
    }
    if (input[i] !== undefined && (/[0-9]/.test(input[i]) || PRIMES.includes(input[i]))) {
      throw new MoveParseError('INVALID_SUFFIX', i, input.slice(start, i + 1), `Неверное окончание хода «${input.slice(start, i + 1)}».`);
    }
    const raw = input.slice(start, i).replace(/[’′`]/g, "'");
    moves.push({ raw, target, amount, kind });
  }
  return moves;
}

export function parseMove(input: string): CubeMove {
  const moves = parseSequence(input);
  if (moves.length !== 1) {
    throw new MoveParseError('UNKNOWN_SYMBOL', 0, input, `Ожидался один ход, получено: ${moves.length}.`);
  }
  return moves[0];
}

const SUFFIX: Record<CubeMove['amount'], string> = { 1: '', [-1]: "'", 2: '2' };

export function formatMove(move: CubeMove, style: NotationStyle = 'Rw'): string {
  const base =
    move.kind === 'wide' ? (style === 'Rw' ? `${move.target}w` : move.target.toLowerCase()) : move.target;
  return base + SUFFIX[move.amount];
}

export function formatSequence(moves: CubeMove[], style: NotationStyle = 'Rw'): string {
  return moves.map((m) => formatMove(m, style)).join(' ');
}

export function makeMove(target: MoveTarget, amount: 1 | -1 | 2, kind: MoveKind): CubeMove {
  const move: CubeMove = { raw: '', target, amount, kind };
  move.raw = formatMove(move);
  return move;
}

export function invertMove(move: CubeMove): CubeMove {
  if (move.amount === 2) return { ...move };
  return makeMove(move.target, move.amount === 1 ? -1 : 1, move.kind);
}

/** Merges consecutive moves of the same target and kind: R R -> R2, R R' -> nothing. */
export function simplify(moves: CubeMove[]): CubeMove[] {
  const out: CubeMove[] = [];
  for (const m of moves) {
    const last = out[out.length - 1];
    if (last && last.target === m.target && last.kind === m.kind) {
      const total = (((last.amount === 2 ? 2 : last.amount) + (m.amount === 2 ? 2 : m.amount)) % 4 + 4) % 4;
      out.pop();
      if (total === 1) out.push(makeMove(m.target, 1, m.kind));
      else if (total === 2) out.push(makeMove(m.target, 2, m.kind));
      else if (total === 3) out.push(makeMove(m.target, -1, m.kind));
    } else {
      out.push(m);
    }
  }
  return out;
}
