import { rotateMatrix } from '../cube/faceMatrix';
import { applyMove, toFacelets, type Facelets } from '../cube/state';
import type { CubeColor, CubeMove, ExplanationMode, FaceId, PartialCubeState, SolutionMethod } from '../cube/types';
import { FACES } from '../cube/types';
import { validateCube, type FaceRotationSuggestion, type ValidationResult } from '../cube/validation';
import type { FaceCapture } from '../input/CubeInputProvider';
import type { Solution } from '../solvers/types';
import { SCAN_ORDER } from './scanSequence';

/** Explicit app states. Scanning sub-states live in `scan`. */
export type AppStateName =
  | 'selecting_explanation'
  | 'selecting_method'
  | 'scanning'
  | 'validation_error'
  | 'solving'
  | 'solver_error'
  | 'solution_ready'
  | 'playing_solution'
  | 'completed';

export type ScanStateName = 'uploading_faces' | 'reading_image' | 'image_read_error' | 'unsupported_image' | 'reviewing_face';

export type ScanMode = 'camera' | 'photo';

export interface AppContext {
  explanationMode: ExplanationMode | null;
  method: SolutionMethod | null;
  scanMode: ScanMode;
  /** Center colors set from the first face shown to the camera. */
  scheme: Record<FaceId, CubeColor> | null;
  /** Faces turned automatically because they were shown sideways. */
  autoRotated: FaceRotationSuggestion[];
  scan: {
    state: ScanStateName;
    faceIndex: number;
    error?: string;
    /** After a re-scan from the validation screen, go back there. */
    returnToValidation: boolean;
  };
  captures: Partial<Record<FaceId, FaceCapture>>;
  cells: PartialCubeState;
  locked: Record<FaceId, boolean[]>;
  confirmed: FaceId[];
  validation: ValidationResult | null;
  solution: Solution | null;
  /** timeline[i] = cube after the first i moves; timeline[0] is the scanned cube. */
  timeline: Facelets[];
  /** Whole-cube rotations from the scanned position to the solving position. */
  setupMoves: CubeMove[];
  cursor: number;
  solverError: string | null;
}

export interface AppState {
  name: AppStateName;
  ctx: AppContext;
}

export type AppEvent =
  | { type: 'SELECT_EXPLANATION'; mode: ExplanationMode }
  | { type: 'SELECT_METHOD'; method: SolutionMethod }
  | { type: 'BACK' }
  | { type: 'IMAGE_READING' }
  | { type: 'IMAGE_LOADED'; capture: FaceCapture }
  | { type: 'IMAGE_FAILED'; kind: 'read' | 'unsupported'; message: string }
  | { type: 'CAPTURE_UPDATED'; capture: FaceCapture }
  | { type: 'MANUAL_ENTRY' }
  | { type: 'SET_CELL'; face: FaceId; index: number; color: CubeColor }
  | { type: 'ROTATE_FACE'; face: FaceId; quarters: number }
  | { type: 'RETAKE' }
  | { type: 'CONFIRM_FACE' }
  | { type: 'GOTO_FACE'; face: FaceId }
  | { type: 'VALIDATE' }
  | { type: 'SOLVED'; solution: Solution }
  | { type: 'SOLVE_FAILED'; message: string }
  | { type: 'RETRY_SOLVE' }
  | { type: 'STEP'; delta: 1 | -1 }
  | { type: 'SEEK'; cursor: number }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'CHANGE_EXPLANATION'; mode: ExplanationMode }
  | { type: 'CHANGE_METHOD'; method: SolutionMethod }
  | { type: 'LOAD_STATE'; cells: PartialCubeState }
  | { type: 'SET_SCAN_MODE'; mode: ScanMode }
  | { type: 'CAMERA_SCHEME'; scheme: Record<FaceId, CubeColor> }
  | { type: 'CAMERA_CAPTURE'; capture: FaceCapture }
  | { type: 'CAMERA_RESET_FACE'; face: FaceId }
  | { type: 'CAMERA_RESET_ALL' }
  | { type: 'RESTART' };

const emptyFaces = <T,>(make: () => T[]): Record<FaceId, T[]> =>
  Object.fromEntries(FACES.map((f) => [f, make()])) as Record<FaceId, T[]>;

export function initialState(): AppState {
  return {
    name: 'selecting_explanation',
    ctx: {
      explanationMode: null,
      method: null,
      scanMode: 'camera',
      scheme: null,
      autoRotated: [],
      scan: { state: 'uploading_faces', faceIndex: 0, returnToValidation: false },
      captures: {},
      cells: emptyFaces(() => Array<CubeColor | null>(9).fill(null)),
      locked: emptyFaces(() => Array<boolean>(9).fill(false)),
      confirmed: [],
      validation: null,
      solution: null,
      timeline: [],
      setupMoves: [],
      cursor: 0,
      solverError: null,
    },
  };
}

export const currentFace = (ctx: AppContext): FaceId => SCAN_ORDER[ctx.scan.faceIndex];

function validateInto(state: AppState): AppState {
  let cells = state.ctx.cells;
  let validation = validateCube(cells);
  let autoRotated: FaceRotationSuggestion[] = [];
  // Camera faces are often held sideways. A single safe fix is applied right away.
  const fix = validation.rotationFix ?? (validation.rotationSuggestions.length === 1 ? validation.rotationSuggestions : undefined);
  if (!validation.ok && state.ctx.scanMode === 'camera' && fix) {
    cells = { ...cells };
    for (const t of fix) cells[t.face] = rotateMatrix(cells[t.face], t.quarters);
    validation = validateCube(cells);
    autoRotated = fix;
  }
  const ctx = { ...state.ctx, cells, validation, autoRotated, solution: null, timeline: [], cursor: 0, solverError: null };
  return { name: validation.ok ? 'solving' : 'validation_error', ctx };
}

function playbackName(ctx: AppContext, playing: boolean): AppStateName {
  if (ctx.solution && ctx.cursor >= ctx.solution.allMoves.length) return 'completed';
  return playing ? 'playing_solution' : 'solution_ready';
}

export function transition(state: AppState, event: AppEvent): AppState {
  const { name, ctx } = state;
  const set = (patch: Partial<AppContext>, next: AppStateName = name): AppState => ({ name: next, ctx: { ...ctx, ...patch } });
  const scan = (patch: Partial<AppContext['scan']>) => ({ ...ctx.scan, ...patch });

  // Events available everywhere.
  switch (event.type) {
    case 'RESTART':
      return { ...initialState(), name: 'selecting_explanation', ctx: { ...initialState().ctx, explanationMode: ctx.explanationMode, method: ctx.method } };
    case 'CHANGE_EXPLANATION':
      return set({ explanationMode: event.mode });
  }

  switch (name) {
    case 'selecting_explanation':
      if (event.type === 'SELECT_EXPLANATION') return set({ explanationMode: event.mode }, 'selecting_method');
      return state;

    case 'selecting_method':
      if (event.type === 'SELECT_METHOD') {
        // Skip scanning when the cube is already known (method change from the solution screen).
        if (ctx.confirmed.length === 6 && ctx.validation?.ok) return { name: 'solving', ctx: { ...ctx, method: event.method } };
        return set({ method: event.method }, 'scanning');
      }
      if (event.type === 'BACK') return set({}, 'selecting_explanation');
      return state;

    case 'scanning': {
      const face = currentFace(ctx);
      switch (event.type) {
        case 'BACK':
          if (ctx.scan.faceIndex === 0 && ctx.scan.state !== 'reviewing_face') return set({}, 'selecting_method');
          return state;
        case 'LOAD_STATE': {
          const cells = event.cells;
          return validateInto({ name, ctx: { ...ctx, cells, confirmed: [...FACES], locked: emptyFaces(() => Array(9).fill(true)) } });
        }
        case 'SET_SCAN_MODE':
          return set({ scanMode: event.mode, scan: scan({ state: ctx.scan.state === 'reviewing_face' ? 'reviewing_face' : 'uploading_faces', error: undefined }) });
        case 'CAMERA_SCHEME': {
          const cells = { ...ctx.cells };
          for (const f of FACES) {
            if (!ctx.confirmed.includes(f)) {
              cells[f] = cells[f].slice();
              cells[f][4] = event.scheme[f];
            }
          }
          return set({ scheme: event.scheme, cells });
        }
        case 'CAMERA_CAPTURE': {
          const f = event.capture.face;
          return set({
            captures: { ...ctx.captures, [f]: event.capture },
            cells: { ...ctx.cells, [f]: event.capture.autoColors.slice() },
            locked: { ...ctx.locked, [f]: Array(9).fill(false) },
            confirmed: ctx.confirmed.includes(f) ? ctx.confirmed : [...ctx.confirmed, f],
          });
        }
        case 'CAMERA_RESET_FACE': {
          const f = event.face;
          const empty: (CubeColor | null)[] = Array(9).fill(null);
          if (ctx.scheme) empty[4] = ctx.scheme[f];
          const captures = { ...ctx.captures };
          delete captures[f];
          return set({ captures, cells: { ...ctx.cells, [f]: empty }, confirmed: ctx.confirmed.filter((x) => x !== f) });
        }
        case 'CAMERA_RESET_ALL':
          return set({
            scheme: null,
            captures: {},
            confirmed: [],
            cells: emptyFaces(() => Array<CubeColor | null>(9).fill(null)),
            locked: emptyFaces(() => Array<boolean>(9).fill(false)),
          });
        case 'VALIDATE':
          if (FACES.some((f) => ctx.cells[f].some((c) => c === null))) return state;
          return validateInto({ name, ctx: { ...ctx, confirmed: [...FACES] } });
        case 'IMAGE_READING':
          return set({ scan: scan({ state: 'reading_image', error: undefined }) });
        case 'IMAGE_FAILED':
          return set({ scan: scan({ state: event.kind === 'unsupported' ? 'unsupported_image' : 'image_read_error', error: event.message }) });
        case 'IMAGE_LOADED':
        case 'CAPTURE_UPDATED': {
          const capture = event.capture;
          const prevLocked = event.type === 'IMAGE_LOADED' ? Array(9).fill(false) : ctx.locked[face];
          const cells = capture.autoColors.map((c, i) => (prevLocked[i] ? ctx.cells[face][i] : c));
          return set({
            captures: { ...ctx.captures, [face]: capture },
            cells: { ...ctx.cells, [face]: cells },
            locked: { ...ctx.locked, [face]: prevLocked },
            scan: scan({ state: 'reviewing_face', error: undefined }),
          });
        }
        case 'MANUAL_ENTRY':
          return set({
            captures: { ...ctx.captures, [face]: { face, source: 'manual', autoColors: Array(9).fill(null), confidence: Array(9).fill(1) } },
            scan: scan({ state: 'reviewing_face', error: undefined }),
          });
        case 'SET_CELL': {
          const cells = ctx.cells[event.face].slice();
          cells[event.index] = event.color;
          const locked = ctx.locked[event.face].slice();
          locked[event.index] = true;
          return set({ cells: { ...ctx.cells, [event.face]: cells }, locked: { ...ctx.locked, [event.face]: locked } });
        }
        case 'ROTATE_FACE':
          return set({
            cells: { ...ctx.cells, [event.face]: rotateMatrix(ctx.cells[event.face], event.quarters) },
            locked: { ...ctx.locked, [event.face]: rotateMatrix(ctx.locked[event.face], event.quarters) },
          });
        case 'RETAKE':
          return set({ scan: scan({ state: 'uploading_faces', error: undefined }) });
        case 'GOTO_FACE': {
          const faceIndex = SCAN_ORDER.indexOf(event.face);
          const hasData = ctx.cells[event.face].some((c) => c !== null) || ctx.captures[event.face];
          return set({ scan: scan({ faceIndex, state: hasData ? 'reviewing_face' : 'uploading_faces', error: undefined }) });
        }
        case 'CONFIRM_FACE': {
          if (ctx.cells[face].some((c) => c === null)) return state;
          const confirmed = ctx.confirmed.includes(face) ? ctx.confirmed : [...ctx.confirmed, face];
          const next = { ...ctx, confirmed };
          const remaining = SCAN_ORDER.findIndex((f) => !confirmed.includes(f));
          if (remaining === -1 || ctx.scan.returnToValidation) {
            if (remaining !== -1) {
              return { name, ctx: { ...next, scan: { ...ctx.scan, faceIndex: remaining, state: 'uploading_faces', returnToValidation: false } } };
            }
            return validateInto({ name, ctx: { ...next, scan: { ...ctx.scan, returnToValidation: false } } });
          }
          const target = SCAN_ORDER[remaining];
          const hasData = ctx.cells[target].some((c) => c !== null);
          return { name, ctx: { ...next, scan: { ...ctx.scan, faceIndex: remaining, state: hasData ? 'reviewing_face' : 'uploading_faces' } } };
        }
      }
      return state;
    }

    case 'validation_error':
      switch (event.type) {
        case 'SET_CELL': {
          const cells = ctx.cells[event.face].slice();
          cells[event.index] = event.color;
          return set({ cells: { ...ctx.cells, [event.face]: cells } });
        }
        case 'ROTATE_FACE':
          return validateInto(set({ cells: { ...ctx.cells, [event.face]: rotateMatrix(ctx.cells[event.face], event.quarters) } }));
        case 'VALIDATE':
          return validateInto(state);
        case 'GOTO_FACE':
          return set(
            { scanMode: 'photo', scan: { faceIndex: SCAN_ORDER.indexOf(event.face), state: 'reviewing_face', returnToValidation: true } },
            'scanning',
          );
      }
      return state;

    case 'solving':
      if (event.type === 'SOLVED') {
        // The opening whole-cube rotations are not animated: the cube is shown
        // already turned and the user is told how to hold it.
        const all = event.solution.allMoves;
        let lead = 0;
        while (lead < all.length && all[lead].kind === 'rotation') lead++;
        const setupMoves = all.slice(0, lead);
        let remaining = lead;
        const phases = event.solution.phases.map((p) => {
          const cut = Math.min(remaining, p.moves.length);
          remaining -= cut;
          return { ...p, moves: p.moves.slice(cut) };
        });
        const solution = { ...event.solution, phases, allMoves: all.slice(lead) };
        const scanned = toFacelets({ faces: ctx.cells as Record<FaceId, CubeColor[]> });
        const timeline = [setupMoves.reduce(applyMove, scanned)];
        for (const m of solution.allMoves) timeline.push(applyMove(timeline[timeline.length - 1], m));
        return set({ solution, setupMoves, timeline, cursor: 0 }, 'solution_ready');
      }
      if (event.type === 'SOLVE_FAILED') return set({ solverError: event.message }, 'solver_error');
      return state;

    case 'solver_error':
      if (event.type === 'RETRY_SOLVE') return set({ solverError: null }, 'solving');
      if (event.type === 'CHANGE_METHOD') return set({ method: event.method, solverError: null }, 'solving');
      if (event.type === 'VALIDATE') return set({}, 'validation_error');
      return state;

    case 'solution_ready':
    case 'playing_solution':
    case 'completed': {
      const n = ctx.solution?.allMoves.length ?? 0;
      const playing = name === 'playing_solution';
      switch (event.type) {
        case 'STEP': {
          const cursor = Math.max(0, Math.min(n, ctx.cursor + event.delta));
          const next = { ...ctx, cursor };
          return { name: playbackName(next, playing && event.delta === 1), ctx: next };
        }
        case 'SEEK': {
          const next = { ...ctx, cursor: Math.max(0, Math.min(n, event.cursor)) };
          return { name: playbackName(next, false), ctx: next };
        }
        case 'PLAY':
          if (ctx.cursor >= n) return state;
          return set({}, 'playing_solution');
        case 'PAUSE':
          return set({}, playbackName(ctx, false));
        case 'CHANGE_METHOD':
          if (event.method === ctx.method) return state;
          return set({ method: event.method, solution: null, timeline: [], cursor: 0 }, 'solving');
      }
      return state;
    }
  }
  return state;
}
