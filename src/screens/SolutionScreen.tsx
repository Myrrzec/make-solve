import { useEffect, useMemo, useState } from 'react';
import { formatMove } from '../cube/moveParser';
import { COLOR_NAME, FACE_NAME } from '../cube/names';
import { applyMoves, centerColor } from '../cube/state';
import type { SolutionPhase } from '../solvers/types';
import { CaseCard } from '../ui/CaseCard';
import type { ExplanationMode } from '../cube/types';
import { explainMove } from '../guidance/instructions';
import type { AppEvent, AppState } from '../workflow/appMachine';
import { CubeView } from '../ui/CubeView';
import { moveDurationMs } from '../three/timing';

interface Props {
  state: AppState;
  dispatch: (e: AppEvent) => void;
}

const SPEED_MIN = 0.25;
const SPEED_MAX = 2.5;
const SPEED_KEY = 'rubik.animationSpeed';

function loadSpeed(): number {
  try {
    const v = Number(localStorage.getItem(SPEED_KEY));
    if (v >= SPEED_MIN && v <= SPEED_MAX) return v;
  } catch {
    // Storage can be unavailable; the default works fine.
  }
  return 1;
}

const METHOD_TITLE = { beginner: 'Beginner method', cfop: 'CFOP (Fridrich)' } as const;

export function SolutionScreen({ state, dispatch }: Props) {
  const { ctx, name } = state;
  const solution = ctx.solution!;
  const moves = solution.allMoves;
  const mode: ExplanationMode = ctx.explanationMode ?? 'beginner';
  const [speed, setSpeedState] = useState(loadSpeed);
  const [speedText, setSpeedText] = useState(() => String(loadSpeed()).replace('.', ','));
  const setSpeed = (v: number) => {
    const clamped = Math.round(Math.min(SPEED_MAX, Math.max(SPEED_MIN, v)) * 100) / 100;
    setSpeedState(clamped);
    setSpeedText(String(clamped).replace('.', ','));
    try {
      localStorage.setItem(SPEED_KEY, String(clamped));
    } catch {
      // Not critical.
    }
  };
  const [replay, setReplay] = useState(0);
  const [camera, setCamera] = useState(0);
  const playing = name === 'playing_solution';
  const done = name === 'completed';

  // Phase index for every move.
  const phaseStarts = useMemo(() => {
    const starts: number[] = [];
    let at = 0;
    for (const p of solution.phases) {
      starts.push(at);
      at += p.moves.length;
    }
    return starts;
  }, [solution]);
  const phaseOf = (i: number) => {
    let idx = 0;
    phaseStarts.forEach((s, k) => {
      if (i >= s && solution.phases[k].moves.length > 0) idx = k;
    });
    return idx;
  };
  const currentPhase = done ? solution.phases.length - 1 : phaseOf(ctx.cursor);

  useEffect(() => {
    if (!playing) return;
    // Wait for the move that was just played, then a short pause.
    const t = setTimeout(() => dispatch({ type: 'STEP', delta: 1 }), moveDurationMs(moves[ctx.cursor - 1], speed) + 350);
    return () => clearTimeout(t);
  }, [playing, ctx.cursor, speed, moves, dispatch]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      // Ignore keys while the formula reference covers this screen.
      if (!document.querySelector<HTMLElement>('.stage-3d')?.offsetParent) return;
      if (e.key === 'ArrowRight') dispatch({ type: 'STEP', delta: 1 });
      else if (e.key === 'ArrowLeft') dispatch({ type: 'STEP', delta: -1 });
      else if (e.key === ' ') {
        e.preventDefault();
        dispatch({ type: playing ? 'PAUSE' : 'PLAY' });
      } else return;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch, playing]);

  const move = moves[ctx.cursor];
  const instruction = move ? explainMove(move, mode, { facelets: ctx.timeline[ctx.cursor] }) : null;
  const nextMove = moves[ctx.cursor + 1];
  const phase = solution.phases[currentPhase];
  const lastLayerFocus = phase.id === 'oll' || phase.id === 'pll';

  return (
    <main className="page" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <div className="solution">
        <div className="card stage-3d">
          <CubeView
            timeline={ctx.timeline}
            moves={moves}
            cursor={ctx.cursor}
            speed={speed}
            replayToken={replay}
            cameraToken={camera}
            showArrow={mode === 'beginner' || !playing}
          />
          <div className="overlay-top">
            <div>
              <div className="eyebrow" style={{ marginBottom: 2 }}>
                {METHOD_TITLE[solution.method]}
              </div>
              <div style={{ fontWeight: 600 }}>
                Step {currentPhase + 1} of {solution.phases.length}: {phase.title}
              </div>
            </div>
            <button type="button" className="btn small" onClick={() => setCamera((c) => c + 1)}>
              Reset view
            </button>
          </div>
          <div className="overlay-bottom">
            <button type="button" className="btn" onClick={() => dispatch({ type: 'STEP', delta: -1 })} disabled={ctx.cursor === 0}>
              ← Back
            </button>
            <button type="button" className="btn" onClick={() => setReplay((r) => r + 1)} disabled={ctx.cursor === 0}>
              Replay
            </button>
            <button type="button" className="btn primary" onClick={() => dispatch({ type: 'STEP', delta: 1 })} disabled={done}>
              Next →
            </button>
            <button
              type="button"
              className="btn stable-label"
              onClick={() => dispatch({ type: playing ? 'PAUSE' : 'PLAY' })}
              disabled={done}
              aria-label={playing ? 'Pause' : 'Autoplay'}
            >
              {/* Both labels share one grid cell, so the button keeps the width of the longer one. */}
              <span aria-hidden={playing} className={playing ? 'hidden-label' : undefined}>
                Autoplay
              </span>
              <span aria-hidden={!playing} className={playing ? undefined : 'hidden-label'}>
                Pause
              </span>
            </button>
          </div>
        </div>

        <div className="side">
          {solution.method === 'cfop' && (lastLayerFocus || solution.phases[1]?.skipped) && (
            <LastLayerCard
              phases={solution.phases.filter((p) => p.id === 'oll' || p.id === 'pll')}
              stateAt={(p) => applyMoves(ctx.timeline[phaseStarts[solution.phases.indexOf(p)]], p.caseInfo?.before ?? [])}
              f2lReady={!!solution.phases[1]?.skipped}
              onShow={(p) => dispatch({ type: 'SEEK', cursor: phaseStarts[solution.phases.indexOf(p)] })}
              onSeekIn={(p, offset) => dispatch({ type: 'SEEK', cursor: phaseStarts[solution.phases.indexOf(p)] + offset })}
              currentIn={(p) => {
                const offset = ctx.cursor - phaseStarts[solution.phases.indexOf(p)];
                return offset >= 0 && offset < p.moves.length ? offset : offset >= p.moves.length ? p.moves.length : null;
              }}
            />
          )}
          {ctx.cursor === 0 && (
            <div className="card done-banner">
              <h3>How to hold the cube</h3>
              <p className="small">
                {capitalize(COLOR_NAME[centerColor(ctx.timeline[0], 'U')])} center on top, {COLOR_NAME[centerColor(ctx.timeline[0], 'F')]} center facing you.
                {ctx.setupMoves.length > 0 && (
                  <> From the position you captured the cube in: {ctx.setupMoves.map((m) => explainMove(m, 'beginner').relativeHint).join(' ')}</>
                )}
              </p>
            </div>
          )}
          {ctx.autoRotated.length > 0 && ctx.cursor === 0 && (
            <div className="card done-banner">
              <p className="small">
                Shown sideways and rotated automatically: {ctx.autoRotated.map((t) => `${FACE_NAME[t.face]} face`).join(', ')}. The cube checks out.
              </p>
            </div>
          )}
          {done ? (
            <div className="card done-banner">
              <h3>Cube solved</h3>
              <p className="muted small">
                {moves.length} moves. You can step back through the solution or pick a move on the tape.
              </p>
            </div>
          ) : (
            instruction && (
              <div className="card now">
                <div className="label">
                  Move {ctx.cursor + 1} of {moves.length}
                </div>
                {mode === 'notation' ? (
                  <>
                    <div key={ctx.cursor} className="big-notation">{instruction.notation}</div>
                    <p className="hint">{instruction.secondary}</p>
                  </>
                ) : (
                  <>
                    <div key={ctx.cursor} className="big-text">{instruction.primary}</div>
                    {instruction.relativeHint && <p className="hint">{instruction.relativeHint}</p>}
                    {instruction.viewHint && <p className="hint">{instruction.viewHint}</p>}
                    <div style={{ marginTop: 10 }}>
                      <span className="notation-chip">{instruction.notation}</span>
                    </div>
                  </>
                )}
                <div className="next">
                  {nextMove ? (
                    <>
                      Next move: <b>{formatMove(nextMove)}</b>
                      {mode === 'beginner' && <> · {explainMove(nextMove, 'beginner').primary}</>}
                    </>
                  ) : (
                    'This is the last move.'
                  )}
                </div>
              </div>
            )
          )}

          <div className="card controls">
            <div className="progress" aria-label="Progress">
              <div style={{ width: `${(ctx.cursor / Math.max(1, moves.length)) * 100}%` }} />
            </div>
            <div className="row">
              <span className="small muted">
                Done {ctx.cursor} of {moves.length}
              </span>
              <span className="small muted">Animation speed</span>
            </div>
            <div className="speed">
              <input
                type="range"
                min={SPEED_MIN}
                max={SPEED_MAX}
                step={0.05}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                aria-label="Animation speed"
              />
              <label className="speed-value">
                <input
                  type="text"
                  inputMode="decimal"
                  value={speedText}
                  onChange={(e) => setSpeedText(e.target.value)}
                  onBlur={() => {
                    const v = Number(speedText.replace(',', '.'));
                    if (Number.isFinite(v) && v > 0) setSpeed(v);
                    else setSpeedText(String(speed).replace('.', ','));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    e.stopPropagation();
                  }}
                  aria-label="Speed as a number"
                />
                ×
              </label>
            </div>
          </div>

          <div className="card phases">
            {solution.phases.map((p, k) => {
              const start = phaseStarts[k];
              const doneCount = Math.max(0, Math.min(p.moves.length, ctx.cursor - start));
              const finished = doneCount === p.moves.length && ctx.cursor >= start + p.moves.length && (k < currentPhase || done);
              return (
                <div key={p.id} className={`phase${k === currentPhase && !done ? ' current' : ''}${finished ? ' done' : ''}`}>
                  <div className="phase-head">
                    <span className="num">{k + 1}</span>
                    <span className="title">{p.title}</span>
                    <span className="count">
                      {p.moves.length === 0 ? 'already done' : `${doneCount}/${p.moves.length}`}
                    </span>
                  </div>
                  {k === currentPhase && !done && <p className="phase-desc">{p.description}</p>}
                  {(mode === 'notation' || k === currentPhase) && p.moves.length > 0 && (
                    <div className={`tape${mode === 'notation' ? ' big' : ''}`}>
                      {p.moves.map((m, j) => {
                        const idx = start + j;
                        return (
                          <button
                            key={j}
                            type="button"
                            className={idx < ctx.cursor ? 'done' : idx === ctx.cursor ? 'current' : ''}
                            onClick={() => dispatch({ type: 'SEEK', cursor: idx })}
                            title="Jump to this move"
                          >
                            {formatMove(m)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}

function capitalize(text: string): string {
  return text[0].toUpperCase() + text.slice(1);
}

function LastLayerCard({
  phases,
  stateAt,
  f2lReady,
  onShow,
  onSeekIn,
  currentIn,
}: {
  phases: SolutionPhase[];
  stateAt: (p: SolutionPhase) => ReturnType<typeof applyMoves>;
  f2lReady: boolean;
  onShow: (p: SolutionPhase) => void;
  onSeekIn: (p: SolutionPhase, offset: number) => void;
  currentIn: (p: SolutionPhase) => number | null;
}) {
  return (
    <div className="case-stack">
      <div className="case-stack-label">{f2lReady ? 'The first two layers are already solved. Your last layer:' : 'Last layer'}</div>
      {phases.map((p) =>
        p.caseInfo ? (
          <CaseCard
            key={p.id}
            info={p.caseInfo}
            facelets={stateAt(p)}
            onShow={() => onShow(p)}
            onSeek={(offset) => onSeekIn(p, offset)}
            current={currentIn(p)}
          />
        ) : (
          <div key={p.id} className="card case-skip small muted">
            {p.id === 'oll' ? 'OLL skip: the top is already all yellow.' : p.moves.length ? 'PLL skip: just turn the top into place.' : 'PLL skip: the cube is solved.'}
          </div>
        ),
      )}
    </div>
  );
}
