import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { applyMoves, fromFacelets, solvedFacelets } from './cube/state';
import { parseSequence } from './cube/moveParser';
import type { CubeColor, FaceId } from './cube/types';
import { ImageUploadInputProvider } from './input/ImageUploadInputProvider';
import { LiveCameraInputProvider } from './input/LiveCameraInputProvider';
import { CameraScanScreen } from './screens/CameraScanScreen';
import { FormulasScreen } from './screens/FormulasScreen';
import type { ColorReferences } from './recognition/recognition';
import { solveInWorker } from './solvers/solveInWorker';
import { ExplanationModeScreen, MethodScreen } from './screens/ChoiceScreens';
import { ScanScreen } from './screens/ScanScreen';
import { SolutionScreen } from './screens/SolutionScreen';
import { ValidationScreen } from './screens/ValidationScreen';
import { initialState, transition, type AppContext } from './workflow/appMachine';

const EXAMPLE_SCRAMBLE = "D2 R' F2 U L2 B' R2 D' F L' U2 B2 R D2 F' L2 U' R2 B";
/** Yellow up, first two layers solved, a mixed last layer. */
const EXAMPLE_F2L = "x2 R U2 R' U' R U' R' U F R U R' U' F' U2 R U R' U' R' F R2 U' R' U' R U R' F'";

function colorReferences(ctx: AppContext): ColorReferences {
  const refs: ColorReferences = {};
  for (const f of ctx.confirmed) {
    const sample = ctx.captures[f]?.samples?.[4];
    const color = ctx.cells[f][4];
    if (sample && color) refs[color] = sample.lab;
  }
  return refs;
}

type Theme = 'auto' | 'light' | 'dark';
const THEME_KEY = 'makesolve.theme';
const THEME_LABEL: Record<Theme, string> = { auto: 'Theme: auto', light: 'Theme: light', dark: 'Theme: dark' };
const NEXT_THEME: Record<Theme, Theme> = { auto: 'light', light: 'dark', dark: 'auto' };

function loadTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === 'light' || t === 'dark') return t;
  } catch {
    // Storage may be blocked; the system theme is used then.
  }
  return 'auto';
}

export function App() {
  const [theme, setTheme] = useState<Theme>(loadTheme);
  useEffect(() => {
    if (theme === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    try {
      if (theme === 'auto') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Not critical.
    }
  }, [theme]);

  const [state, dispatch] = useReducer(transition, undefined, initialState);
  // The formula reference opens over any screen and keeps its state underneath.
  const [formulasOpen, setFormulasOpen] = useState(false);
  const ctxRef = useRef(state.ctx);
  ctxRef.current = state.ctx;
  const provider = useMemo(() => new ImageUploadInputProvider(() => colorReferences(ctxRef.current)), []);
  const camera = useMemo(() => new LiveCameraInputProvider(() => colorReferences(ctxRef.current)), []);

  useEffect(() => {
    if (state.name !== 'solving' || !state.ctx.method) return;
    let cancelled = false;
    const cube = { faces: state.ctx.cells as Record<FaceId, CubeColor[]> };
    solveInWorker(state.ctx.method, cube)
      .then((solution) => !cancelled && dispatch({ type: 'SOLVED', solution }))
      .catch((err: Error) => !cancelled && dispatch({ type: 'SOLVE_FAILED', message: err.message }));
    return () => {
      cancelled = true;
    };
  }, [state.name, state.ctx.method, state.ctx.cells]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.name]);

  const tryExample = (kind: 'scramble' | 'f2l' = 'scramble') => {
    const f = applyMoves(solvedFacelets(), parseSequence(kind === 'f2l' ? EXAMPLE_F2L : EXAMPLE_SCRAMBLE));
    dispatch({ type: 'LOAD_STATE', cells: fromFacelets(f).faces });
  };

  const mode = state.ctx.explanationMode;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src="/favicon.svg" alt="" />
          <span>
            Make <span className="brand-light">Solve</span>
          </span>
        </div>
        <nav className="nav-tabs" aria-label="Sections">
          <button type="button" className={`nav-tab${formulasOpen ? '' : ' on'}`} aria-pressed={!formulasOpen} onClick={() => setFormulasOpen(false)}>
            Solve
          </button>
          <button
            type="button"
            className={`nav-tab${formulasOpen ? ' on' : ''}`}
            aria-pressed={formulasOpen}
            onClick={() => {
              if (state.name === 'playing_solution') dispatch({ type: 'PAUSE' });
              setFormulasOpen(true);
            }}
          >
            Formulas
          </button>
        </nav>
        <div className="spacer" />
        {mode && (
          <div className="segmented" role="group" aria-label="Hint style">
            <button type="button" aria-pressed={mode === 'beginner'} onClick={() => dispatch({ type: 'CHANGE_EXPLANATION', mode: 'beginner' })}>
              In words
            </button>
            <button type="button" aria-pressed={mode === 'notation'} onClick={() => dispatch({ type: 'CHANGE_EXPLANATION', mode: 'notation' })}>
              Notation
            </button>
          </div>
        )}
        <button
          type="button"
          className="btn quiet small theme-toggle"
          onClick={() => setTheme((t) => NEXT_THEME[t])}
          title="Switch theme: auto, light, dark"
        >
          {THEME_LABEL[theme]}
        </button>
        {state.name !== 'selecting_explanation' && (
          <button
            type="button"
            className="btn quiet small"
            onClick={() => {
              if (window.confirm('Start over? Uploaded photos and colors will be cleared.')) dispatch({ type: 'RESTART' });
            }}
          >
            Start over
          </button>
        )}
      </header>

      {formulasOpen && <FormulasScreen onClose={() => setFormulasOpen(false)} />}
      {/* Kept mounted while the reference is open, so the 3D view and playback stay where they were. */}
      <div className="screen" hidden={formulasOpen}>
        {state.name === 'selecting_explanation' && <ExplanationModeScreen onSelect={(m) => dispatch({ type: 'SELECT_EXPLANATION', mode: m })} />}
        {state.name === 'selecting_method' && (
          <MethodScreen onSelect={(m) => dispatch({ type: 'SELECT_METHOD', method: m })} onBack={() => dispatch({ type: 'BACK' })} />
        )}
        {state.name === 'scanning' && state.ctx.scanMode === 'camera' && <CameraScanScreen ctx={state.ctx} dispatch={dispatch} camera={camera} />}
        {state.name === 'scanning' && state.ctx.scanMode === 'photo' && <ScanScreen ctx={state.ctx} dispatch={dispatch} provider={provider} onTryExample={tryExample} />}
        {state.name === 'validation_error' && <ValidationScreen ctx={state.ctx} dispatch={dispatch} />}
        {state.name === 'solving' && (
          <main className="center-screen">
            <div className="spinner" />
            <p className="muted">The cube checks out. Working out the solution.</p>
          </main>
        )}
        {state.name === 'solver_error' && (
          <main className="center-screen">
            <h2>Could not find a solution</h2>
            <p className="muted">{state.ctx.solverError}</p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn primary" onClick={() => dispatch({ type: 'RETRY_SOLVE' })}>
                Try again
              </button>
              {state.ctx.method !== 'beginner' && (
                <button type="button" className="btn" onClick={() => dispatch({ type: 'CHANGE_METHOD', method: 'beginner' })}>
                  Solve with the beginner method
                </button>
              )}
            </div>
          </main>
        )}
        {(state.name === 'solution_ready' || state.name === 'playing_solution' || state.name === 'completed') && (
          <SolutionScreen state={state} dispatch={dispatch} />
        )}
      </div>
    </div>
  );
}
