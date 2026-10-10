import { describe, expect, it } from 'vitest';
import { parseSequence } from '../../cube/moveParser';
import { applyMoves, centerColor, isSolved, solvedFacelets } from '../../cube/state';
import { pieceArrows, algorithmsOf, caseFromAlgorithm, firstTwoLayersSolved, lastLayerOriented, matchOll, matchPll, ollSignature, pllSignature } from './lastLayer';
import { OLL_CASES, PLL_CASES } from './lastLayerCases';

const yellowUp = applyMoves(solvedFacelets(), parseSequence('x2'));

function report(cases: { n: number; alg: string; alts?: string[] }[], oll: boolean) {
  const problems: string[] = [];
  const seen = new Map<string, number>();
  for (const c of cases) {
    const good = algorithmsOf(c).filter((a) => {
      const f = caseFromAlgorithm(yellowUp, a);
      return centerColor(f, 'U') === 'yellow' && firstTwoLayersSolved(f) && (oll ? !lastLayerOriented(f) : lastLayerOriented(f));
    });
    if (good.length === 0) {
      problems.push(`${c.n}: no valid algorithm`);
      continue;
    }
    if (good[0] !== c.alg) problems.push(`${c.n}: main algorithm invalid, alt used`);
    const sig = oll ? ollSignature(caseFromAlgorithm(yellowUp, good[0])) : pllSignature(caseFromAlgorithm(yellowUp, good[0]));
    if (seen.has(sig)) problems.push(`${c.n}: same case as ${seen.get(sig)}`);
    seen.set(sig, c.n);
  }
  return problems;
}

describe('last layer tables', () => {
  it('has 57 valid and different OLL cases', () => {
    expect(report(OLL_CASES, true)).toEqual([]);
  });
  it('has 21 valid and different PLL cases', () => {
    expect(report(PLL_CASES, false)).toEqual([]);
  });

  it('recognises every OLL case however the top is turned', () => {
    for (const c of OLL_CASES) {
      for (const turn of ['', 'U', 'U2', "U'"]) {
        const f = applyMoves(caseFromAlgorithm(yellowUp, c.alg), parseSequence(turn));
        const m = matchOll(f);
        expect(m?.case.n, `OLL ${c.n} ${turn}`).toBe(c.n);
        expect(lastLayerOriented(applyMoves(f, m!.moves))).toBe(true);
      }
    }
  });

  it('recognises every PLL case however the top is turned', () => {
    for (const c of PLL_CASES) {
      for (const turn of ['', 'U', 'U2', "U'"]) {
        const f = applyMoves(caseFromAlgorithm(yellowUp, c.alg), parseSequence(turn));
        const m = matchPll(f);
        expect(m?.case.n, `PLL ${c.n} ${turn}`).toBe(c.n);
        expect(isSolved(applyMoves(f, m!.moves))).toBe(true);
      }
    }
  });

  it('draws T as two swaps and Ua as a three-edge cycle', () => {
    const t = PLL_CASES.find((c) => c.n === 12)!;
    const arrows = pieceArrows(caseFromAlgorithm(yellowUp, t.alg), t.alg);
    expect(arrows).toEqual(
      expect.arrayContaining([
        { kind: 'corner', from: 2, to: 8, swap: true },
        { kind: 'edge', from: 3, to: 5, swap: true },
      ]),
    );
    expect(arrows).toHaveLength(2);
    const ua = PLL_CASES.find((c) => c.n === 1)!;
    const cycle = pieceArrows(caseFromAlgorithm(yellowUp, ua.alg), ua.alg);
    expect(cycle).toHaveLength(3);
    expect(cycle.every((a) => a.kind === 'edge' && !a.swap)).toBe(true);
  });

  it('draws arrows for every PLL case, including ones that turn the whole cube', () => {
    for (const c of PLL_CASES) {
      const arrows = pieceArrows(caseFromAlgorithm(yellowUp, c.alg), c.alg);
      expect(arrows.length, `PLL ${c.n}`).toBeGreaterThan(0);
    }
  });
});
