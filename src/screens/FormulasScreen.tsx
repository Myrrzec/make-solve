import { useMemo, useState } from 'react';
import { parseSequence } from '../cube/moveParser';
import { applyMoves, solvedFacelets } from '../cube/state';
import { ALG } from '../solvers/beginner/algorithms';
import { caseFromAlgorithm, matchOll } from '../solvers/cfop/lastLayer';
import { PLL_CASES } from '../solvers/cfop/lastLayerCases';
import { OLL_NAMES } from '../solvers/cfop/ollNames';
import type { CaseInfo } from '../solvers/types';
import { CaseCard, chunkAlgorithm } from '../ui/CaseCard';

type Tab = 'oll' | 'pll' | 'beginner';

const TABS: { id: Tab; label: string }[] = [
  { id: 'oll', label: 'OLL · 57' },
  { id: 'pll', label: 'PLL · 21' },
  { id: 'beginner', label: 'Beginner method' },
];

/** Formulas of the beginner method in the order of the stages. */
const BEGINNER: { stage: string; title: string; alg: string; how: string }[] = [
  { stage: 'Everywhere', title: 'Sexy move', alg: ALG.sexy, how: 'The base of almost every formula. White corners go in by repeating it.' },
  { stage: 'Middle layer', title: 'Edge to the right', alg: ALG.middleRight, how: 'Edge at the top front, matching the front center, goes into the right slot.' },
  { stage: 'Middle layer', title: 'Edge to the left', alg: ALG.middleLeft, how: 'Same, but the edge goes into the left slot.' },
  { stage: 'Yellow cross', title: 'Front, sexy move, front back', alg: ALG.yellowCross, how: 'Dot, then the L at the back left, then the line held horizontally.' },
  { stage: 'Cross side colors', title: 'Cross edges', alg: ALG.yellowEdges, how: 'Hold the two matching edges at the back and on the right.' },
  { stage: 'Corner placement', title: 'Corners into place', alg: ALG.placeCorners, how: 'Hold a corner that is already in its spot at the front left.' },
  { stage: 'Corner twist', title: 'Sexy move from below', alg: ALG.sexy, how: 'Yellow side down. Repeat the sexy move until yellow faces down, then turn only the bottom layer.' },
];

/** Reference of every formula the app uses, to look things up without solving. */
export function FormulasScreen({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('oll');
  const yellowUp = useMemo(() => applyMoves(solvedFacelets(), parseSequence('x2')), []);

  const oll = useMemo(
    () =>
      OLL_NAMES.map((n) => {
        const facelets = caseFromAlgorithm(yellowUp, n.alg);
        const m = matchOll(facelets);
        const info: CaseInfo = {
          set: 'OLL',
          number: m?.case.n ?? 0,
          name: n.name,
          algorithm: n.alg,
          sheetAlgorithm: m && m.case.alg !== n.alg ? m.case.alg : undefined,
          before: [],
          after: [],
        };
        return { group: n.group, info, facelets };
      }),
    [yellowUp],
  );

  const pll = useMemo(
    () =>
      PLL_CASES.map((c) => {
        const info: CaseInfo = { set: 'PLL', number: c.n, group: c.group, letter: c.letter, name: c.group, algorithm: c.alg, before: [], after: [] };
        return { group: c.group, info, facelets: caseFromAlgorithm(yellowUp, c.alg) };
      }),
    [yellowUp],
  );

  const list = tab === 'oll' ? oll : pll;
  const groups = [...new Set(list.map((x) => x.group))];

  return (
    <main className="page">
      <div className="head-row">
        <div className="page-head">
          <div className="eyebrow">Reference</div>
          <h1>Formulas</h1>
          <p>Every formula the app uses. OLL names follow the Kubik TV video, numbers follow the dedfoma sheets.</p>
        </div>
        <button type="button" className="btn" onClick={onClose}>
          ← Back
        </button>
      </div>

      <div className="segmented formulas-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'beginner' ? (
        <div className="formula-grid">
          {BEGINNER.map((b, i) => (
            <article key={i} className="card beginner-formula">
              <div className="case-step-label">{b.stage}</div>
              <h3>{b.title}</h3>
              <div className="case-alg-row">
                {chunkAlgorithm(b.alg).map((c, k) =>
                  c.trigger ? (
                    <span key={k} className="trigger">
                      <span className="trigger-moves">{c.moves.join(' ')}</span>
                      <span className="trigger-name">{c.trigger}</span>
                    </span>
                  ) : (
                    <span key={k} className="move-chip">
                      {c.moves[0]}
                    </span>
                  ),
                )}
              </div>
              <p className="small muted">{b.how}</p>
            </article>
          ))}
        </div>
      ) : (
        groups.map((g) => (
          <section key={g} className="formula-group">
            <h2>{g[0].toUpperCase() + g.slice(1)}</h2>
            <div className="formula-grid">
              {list
                .filter((x) => x.group === g)
                .map((x) => (
                  <CaseCard key={`${x.info.set}${x.info.number}`} info={x.info} facelets={x.facelets} />
                ))}
            </div>
          </section>
        ))
      )}
    </main>
  );
}
