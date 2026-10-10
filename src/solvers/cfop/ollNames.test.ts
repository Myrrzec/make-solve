import { describe, expect, it } from 'vitest';
import { parseSequence } from '../../cube/moveParser';
import { applyMoves, centerColor } from '../../cube/state';
import { solvedFacelets } from '../../cube/state';
import { caseFromAlgorithm, firstTwoLayersSolved, lastLayerOriented, matchOll } from './lastLayer';
import { OLL_NAMES } from './ollNames';

const yellowUp = applyMoves(solvedFacelets(), parseSequence('x2'));

describe('OLL names from the video', () => {
  it('maps every named formula to a different sheet case', () => {
    const report: string[] = [];
    const used = new Map<number, string>();
    for (const n of OLL_NAMES) {
      const f = caseFromAlgorithm(yellowUp, n.alg);
      const valid = centerColor(f, 'U') === 'yellow' && firstTwoLayersSolved(f) && !lastLayerOriented(f);
      if (!valid) {
        report.push(`${n.name}: formula does not keep F2L`);
        continue;
      }
      const m = matchOll(f)!;
      if (used.has(m.case.n)) report.push(`${n.name}: same case ${m.case.n} as ${used.get(m.case.n)}`);
      used.set(m.case.n, n.name);
    }
    const missing = Array.from({ length: 57 }, (_, i) => i + 1).filter((k) => !used.has(k));
    if (missing.length) report.push(`no name for sheet cases ${missing.join(', ')}`);
    expect(report).toEqual([]);
  });
});
