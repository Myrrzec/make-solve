import { describe, expect, it } from 'vitest';
import { applyMoves, fromFacelets, isSolved, solvedFacelets } from '../cube/state';
import { randomScramble, rng } from '../cube/testUtils';
import { solveBeginner } from './beginner/BeginnerSolver';
import { invertMove, parseSequence } from '../cube/moveParser';
import { f2lDone, solveCfop } from './cfop/CfopSolver';
import { OLL_CORNERS, OLL_EDGES, PLL_CORNERS, PLL_EDGES } from './cfop/algorithms';

describe('beginner solver', () => {
  it('solves an already solved cube', () => {
    const s = solveBeginner(fromFacelets(solvedFacelets()));
    expect(isSolved(applyMoves(solvedFacelets(), s.allMoves))).toBe(true);
  });

  it('solves random scrambles phase by phase', () => {
    const rand = rng(123);
    let longest = 0;
    for (let i = 0; i < 300; i++) {
      const start = applyMoves(solvedFacelets(), randomScramble(rand));
      const s = solveBeginner(fromFacelets(start));
      expect(s.phases.map((p) => p.id)).toEqual([
        'cross',
        'first-layer-corners',
        'middle-layer',
        'yellow-cross',
        'yellow-edges',
        'top-corners',
        'corner-twist',
      ]);
      expect(isSolved(applyMoves(start, s.allMoves))).toBe(true);
      longest = Math.max(longest, s.allMoves.length);
    }
    expect(longest).toBeLessThan(250);
  });

  it('starts by turning white to the top when it is elsewhere', () => {
    const start = applyMoves(solvedFacelets(), parseSequence("R U F' x"));
    const s = solveBeginner(fromFacelets(start));
    expect(s.phases[0].moves[0].raw).toBe("x'");
  });

  it('leaves a white cross that is already at the bottom where it is', () => {
    const start = applyMoves(solvedFacelets(), parseSequence("x2 R U R' U R U2 R' U"));
    const s = solveBeginner(fromFacelets(start));
    expect(s.phases[0].moves).toEqual([]);
    expect(s.phases[1].moves).toEqual([]);
    expect(s.phases[2].moves).toEqual([]);
    expect(isSolved(applyMoves(start, s.allMoves))).toBe(true);
  });

  it('is deterministic', () => {
    const start = applyMoves(solvedFacelets(), randomScramble(rng(5)));
    expect(solveBeginner(fromFacelets(start)).allMoves).toEqual(solveBeginner(fromFacelets(start)).allMoves);
  });
});

describe('CFOP solver', () => {
  it('solves random scrambles in four real stages', () => {
    const rand = rng(321);
    let worst = 0;
    for (let i = 0; i < 150; i++) {
      const start = applyMoves(solvedFacelets(), randomScramble(rand));
      const s = solveCfop(fromFacelets(start));
      expect(s.phases.map((p) => p.id)).toEqual(['cross', 'f2l', 'oll', 'pll']);
      expect(isSolved(applyMoves(start, s.allMoves))).toBe(true);
      const crossTurns = s.phases[0].moves.filter((m) => m.kind !== 'rotation').length;
      expect(crossTurns).toBeLessThanOrEqual(8);
      worst = Math.max(worst, s.allMoves.length);
    }
    expect(worst).toBeLessThan(130);
  }, 60000);

  it('keeps the first two layers with every last layer algorithm', () => {
    for (const table of [OLL_EDGES, OLL_CORNERS, PLL_CORNERS, PLL_EDGES]) {
      for (const [name, alg] of Object.entries(table)) {
        const after = applyMoves(solvedFacelets(), parseSequence(alg));
        expect(f2lDone(after), name).toBe(true);
        expect(isSolved(after), name).toBe(false);
      }
    }
  });

  it('solves every PLL case with one algorithm per step', () => {
    for (const alg of [...Object.values(PLL_CORNERS), ...Object.values(PLL_EDGES)]) {
      // White already at the bottom, so the case lands in the last layer.
      const start = applyMoves(solvedFacelets(), [...parseSequence('x2'), ...parseSequence(alg).map(invertMove).reverse()]);
      const s = solveCfop(fromFacelets(start));
      expect(s.phases.slice(0, 3).every((p) => p.moves.length === 0)).toBe(true);
      expect(s.phases[3].moves.length).toBeLessThanOrEqual(parseSequence(alg).length + 2);
    }
  });

  it('names the OLL and PLL case it uses', () => {
    for (const alg of Object.values(OLL_CORNERS)) {
      const start = applyMoves(solvedFacelets(), [...parseSequence('x2'), ...parseSequence(alg).map(invertMove).reverse()]);
      const s = solveCfop(fromFacelets(start));
      expect(s.phases[2].caseInfo?.set).toBe('OLL');
      expect(s.phases[0].skipped && s.phases[1].skipped).toBe(true);
    }
    const tStart = applyMoves(solvedFacelets(), [...parseSequence('x2'), ...parseSequence("R U R' U' R' F R2 U' R' U' R U R' F'").map(invertMove).reverse()]);
    const t = solveCfop(fromFacelets(tStart)).phases[3].caseInfo;
    expect([t?.number, t?.group, t?.letter]).toEqual([12, 'T perm', 'T']);
  });
});
