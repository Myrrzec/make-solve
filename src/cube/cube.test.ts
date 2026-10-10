import { describe, expect, it } from 'vitest';
import { rotateMatrix } from './faceMatrix';
import { FACE_OFFSET, STICKERS } from './geometry';
import { formatSequence, invertMove, MoveParseError, parseMove, parseSequence, simplify } from './moveParser';
import { CORNER_FACELETS, EDGE_FACELETS } from './pieces';
import { applyMoves, centerColor, fromFacelets, isSolved, sameFacelets, solvedFacelets, type Facelets } from './state';
import type { PartialCubeState } from './types';
import { FACES } from './types';
import { validateCube } from './validation';
import { randomScramble, rng } from './testUtils';

const seq = parseSequence;
const solved = solvedFacelets();

const asPartial = (f: Facelets): PartialCubeState => fromFacelets(f).faces;

describe('parser', () => {
  it('parses every supported token', () => {
    const moves = seq("U U' U2 Rw r' Fw2 M E' S2 x y' z2 R2'");
    expect(moves.map((m) => [m.target, m.amount, m.kind])).toEqual([
      ['U', 1, 'face'],
      ['U', -1, 'face'],
      ['U', 2, 'face'],
      ['R', 1, 'wide'],
      ['R', -1, 'wide'],
      ['F', 2, 'wide'],
      ['M', 1, 'slice'],
      ['E', -1, 'slice'],
      ['S', 2, 'slice'],
      ['x', 1, 'rotation'],
      ['y', -1, 'rotation'],
      ['z', 2, 'rotation'],
      ['R', 2, 'face'],
    ]);
  });

  it('accepts sequences without spaces and unicode primes', () => {
    expect(formatSequence(seq('RUR’U′'))).toBe("R U R' U'");
  });

  it('formats wide moves in both styles', () => {
    expect(formatSequence(seq('r Rw'), 'r')).toBe('r r');
    expect(formatSequence(seq('r Rw'), 'Rw')).toBe('Rw Rw');
  });

  it('reports errors with codes', () => {
    const code = (s: string) => {
      try {
        seq(s);
        return null;
      } catch (e) {
        return (e as MoveParseError).code;
      }
    };
    expect(code('Q')).toBe('UNKNOWN_SYMBOL');
    expect(code('Mw')).toBe('INVALID_WIDE');
    expect(code('R3')).toBe('INVALID_SUFFIX');
    expect(code("R''")).toBe('INVALID_SUFFIX');
    expect(code('(R U)2')).toBe('UNSUPPORTED_SYNTAX');
    expect(code('m')).toBe('UNKNOWN_SYMBOL');
  });

  it('simplifies and inverts', () => {
    expect(formatSequence(simplify(seq("R R U U' U2 F F' F")))).toBe('R2 U2 F');
    expect(invertMove(parseMove("R'")).raw).toBe('R');
  });
});

describe('geometry', () => {
  it('maps every corner and edge to one cubie', () => {
    for (const stickers of [...CORNER_FACELETS, ...EDGE_FACELETS]) {
      const positions = new Set(stickers.map((i) => STICKERS[i].pos.join(',')));
      expect(positions.size).toBe(1);
    }
  });

  it('turns the right face so the front column goes up', () => {
    const after = applyMoves(solved, seq('R'));
    expect([2, 5, 8].map((i) => after[FACE_OFFSET.U + i])).toEqual(['green', 'green', 'green']);
    expect([0, 3, 6].map((i) => after[FACE_OFFSET.U + i])).toEqual(['white', 'white', 'white']);
  });

  it('turns U so the front row goes left', () => {
    const after = applyMoves(solved, seq('U'));
    expect(after.slice(FACE_OFFSET.L, FACE_OFFSET.L + 3)).toEqual(['green', 'green', 'green']);
  });

  it('turns F so the top row goes right', () => {
    const after = applyMoves(solved, seq('F'));
    expect([0, 3, 6].map((i) => after[FACE_OFFSET.R + i])).toEqual(['white', 'white', 'white']);
  });

  it('has order 4 for every base move', () => {
    for (const m of ['U', 'R', 'F', 'D', 'L', 'B', 'M', 'E', 'S', 'x', 'y', 'z', 'Rw', 'u']) {
      expect(isSolved(applyMoves(solved, seq(`${m} ${m} ${m} ${m}`)))).toBe(true);
      expect(sameFacelets(applyMoves(solved, seq(`${m}2`)), applyMoves(solved, seq(`${m} ${m}`)))).toBe(true);
      expect(sameFacelets(applyMoves(solved, seq(`${m} ${m}'`)), solved)).toBe(true);
    }
  });

  it('respects the standard identities', () => {
    const scrambled = applyMoves(solved, randomScramble(rng(1)));
    const same = (a: string, b: string) =>
      expect(sameFacelets(applyMoves(scrambled, seq(a)), applyMoves(scrambled, seq(b)))).toBe(true);
    same('Rw', 'L x');
    same('Lw', "R x'");
    same('Uw', 'D y');
    same('Fw', 'B z');
    same('M', "R L' x'");
    same('E', "U D' y'");
    same('S', "F' B z");
    same('R L', 'L R');
  });

  it('has the known orders of common algorithms', () => {
    const order = (alg: string) => {
      let f = applyMoves(solved, seq(alg));
      let n = 1;
      while (!isSolved(f)) {
        f = applyMoves(f, seq(alg));
        n++;
      }
      return n;
    };
    expect(order("R U R' U'")).toBe(6);
    expect(order("R U R' U R U2 R'")).toBe(6);
    expect(order("R U R' U' R' F R2 U' R' U' R U R' F'")).toBe(2);
  });

  it('keeps physical state under whole-cube rotations', () => {
    const scrambled = applyMoves(solved, randomScramble(rng(2)));
    const rotated = applyMoves(scrambled, seq('x y2 z\''));
    expect(validateCube(asPartial(rotated)).ok).toBe(true);
    expect(centerColor(rotated, 'U')).not.toBe(centerColor(scrambled, 'U'));
  });
});

describe('validation', () => {
  it('accepts solved and random scrambles', () => {
    expect(validateCube(asPartial(solved)).ok).toBe(true);
    const rand = rng(42);
    for (let i = 0; i < 300; i++) {
      expect(validateCube(asPartial(applyMoves(solved, randomScramble(rand)))).ok).toBe(true);
    }
  });

  const scrambled = () => applyMoves(solved, randomScramble(rng(7)));
  const codes = (f: Facelets) => validateCube(asPartial(f)).issues.map((i) => i.code);

  it('detects a wrong color count', () => {
    const f = scrambled();
    const i = f.findIndex((c, k) => c === 'orange' && k % 9 !== 4);
    f[i] = 'red';
    const result = validateCube(asPartial(f));
    expect(result.issues[0].code).toBe('COLOR_COUNT');
    expect(result.issues[0].message).toContain('оранжевая клетка распознана как красная');
  });

  it('detects a twisted corner', () => {
    const f = solvedFacelets();
    const [a, b, c] = CORNER_FACELETS[0];
    [f[a], f[b], f[c]] = [f[b], f[c], f[a]];
    expect(codes(f)).toEqual(['CORNER_TWIST']);
  });

  it('detects a mirrored corner', () => {
    const f = solvedFacelets();
    const [a, b] = CORNER_FACELETS[0];
    [f[a], f[b]] = [f[b], f[a]];
    expect(codes(f)).toEqual(['MIRRORED_CORNER']);
  });

  it('detects a flipped edge', () => {
    const f = solvedFacelets();
    const [a, b] = EDGE_FACELETS[0];
    [f[a], f[b]] = [f[b], f[a]];
    expect(codes(f)).toEqual(['EDGE_FLIP']);
  });

  it('detects parity from two swapped edges', () => {
    const f = solvedFacelets();
    const [a1, b1] = EDGE_FACELETS[0];
    const [a2, b2] = EDGE_FACELETS[1];
    [f[a1], f[a2]] = [f[a2], f[a1]];
    [f[b1], f[b2]] = [f[b2], f[b1]];
    expect(codes(f)).toEqual(['PERMUTATION_PARITY']);
  });

  it('detects impossible edges and duplicate centers', () => {
    const f = solvedFacelets();
    f[EDGE_FACELETS[0][1]] = 'yellow'; // white + yellow edge
    f[EDGE_FACELETS[5][1]] = 'red';
    expect(codes(f)).toContain('INVALID_EDGE');
    const g = solvedFacelets();
    g[FACE_OFFSET.F + 4] = 'white';
    expect(codes(g)[0]).toBe('CENTERS_DUPLICATE');
  });

  it('suggests rotating a face photographed sideways', () => {
    const f = scrambled();
    const partial = asPartial(f);
    partial.R = rotateMatrix(partial.R, 1);
    const result = validateCube(partial);
    expect(result.ok).toBe(false);
    expect(result.rotationSuggestions).toContainEqual({ face: 'R', quarters: 3 });
  });

  it('reports missing cells', () => {
    const partial = asPartial(solved);
    partial.B = Array(9).fill(null);
    expect(validateCube(partial).issues[0].code).toBe('MISSING_CELLS');
  });

  it('keeps faces in canonical order', () => {
    expect(FACES.join('')).toBe('URFDLB');
  });
});

describe('color scheme from the first face', () => {
  it('puts red on the right and orange on the left of green, white on top', async () => {
    const { schemeFromFront } = await import('./colorScheme');
    expect(schemeFromFront('green')).toEqual({ U: 'white', R: 'red', F: 'green', D: 'yellow', L: 'orange', B: 'blue' });
    expect(schemeFromFront('red')).toEqual({ U: 'white', R: 'blue', F: 'red', D: 'yellow', L: 'green', B: 'orange' });
    expect(schemeFromFront('white')).toMatchObject({ F: 'white', U: 'blue', D: 'green', B: 'yellow' });
    expect(schemeFromFront('yellow')).toMatchObject({ F: 'yellow', U: 'green', B: 'white' });
  });
});

describe('rotation fix', () => {
  it('finds two faces photographed sideways', () => {
    const partial = fromFacelets(applyMoves(solvedFacelets(), randomScramble(rng(99)))).faces;
    partial.U = rotateMatrix(partial.U, 1);
    partial.B = rotateMatrix(partial.B, 2);
    const result = validateCube(partial);
    expect(result.ok).toBe(false);
    expect(result.rotationFix).toEqual([
      { face: 'U', quarters: 3 },
      { face: 'B', quarters: 2 },
    ]);
  });
});
