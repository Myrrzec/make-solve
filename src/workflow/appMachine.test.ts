import { describe, expect, it } from 'vitest';
import { parseSequence } from '../cube/moveParser';
import { applyMoves, fromFacelets, isSolved, solvedFacelets } from '../cube/state';
import { solveBeginner } from '../solvers/beginner/BeginnerSolver';
import { initialState, transition, type AppEvent, type AppState } from './appMachine';

const run = (events: AppEvent[], from: AppState = initialState()) => events.reduce(transition, from);
const scrambled = fromFacelets(applyMoves(solvedFacelets(), parseSequence("R U2 F' L D B2 R' U")));

describe('app machine', () => {
  it('goes from the first screen to solving', () => {
    const s = run([
      { type: 'SELECT_EXPLANATION', mode: 'beginner' },
      { type: 'SELECT_METHOD', method: 'beginner' },
      { type: 'LOAD_STATE', cells: scrambled.faces },
    ]);
    expect(s.name).toBe('solving');
  });

  it('plays the solution forward and back without changing it', () => {
    let s = run([
      { type: 'SELECT_EXPLANATION', mode: 'beginner' },
      { type: 'SELECT_METHOD', method: 'beginner' },
      { type: 'LOAD_STATE', cells: scrambled.faces },
    ]);
    const solution = solveBeginner(scrambled);
    s = transition(s, { type: 'SOLVED', solution });
    const n = solution.allMoves.length;
    for (let i = 0; i < n; i++) s = transition(s, { type: 'STEP', delta: 1 });
    expect(s.name).toBe('completed');
    expect(isSolved(s.ctx.timeline[s.ctx.cursor])).toBe(true);
    for (let i = 0; i < n; i++) s = transition(s, { type: 'STEP', delta: -1 });
    expect(s.ctx.cursor).toBe(0);
    const before = s.ctx.solution;
    s = transition(s, { type: 'CHANGE_EXPLANATION', mode: 'notation' });
    expect(s.ctx.solution).toBe(before);
  });

  it('sends a broken cube to the validation screen and back after a fix', () => {
    const broken = structuredClone(scrambled.faces);
    const original = broken.F[0];
    broken.F[0] = broken.F[0] === 'red' ? 'orange' : 'red';
    let s = run([
      { type: 'SELECT_EXPLANATION', mode: 'notation' },
      { type: 'SELECT_METHOD', method: 'beginner' },
      { type: 'LOAD_STATE', cells: broken },
    ]);
    expect(s.name).toBe('validation_error');
    s = transition(s, { type: 'SET_CELL', face: 'F', index: 0, color: original });
    s = transition(s, { type: 'VALIDATE' });
    expect(s.name).toBe('solving');
  });

  it('only confirms a face when every cell is set', () => {
    let s = run([
      { type: 'SELECT_EXPLANATION', mode: 'beginner' },
      { type: 'SELECT_METHOD', method: 'beginner' },
      { type: 'MANUAL_ENTRY' },
    ]);
    s = transition(s, { type: 'CONFIRM_FACE' });
    expect(s.ctx.confirmed).toEqual([]);
    for (let i = 0; i < 9; i++) s = transition(s, { type: 'SET_CELL', face: 'U', index: i, color: scrambled.faces.U[i] });
    s = transition(s, { type: 'CONFIRM_FACE' });
    expect(s.ctx.confirmed).toEqual(['U']);
    expect(s.ctx.scan.faceIndex).toBe(1);
  });

  it('builds the cube from camera captures and turns sideways faces back', async () => {
    const { schemeFromFront } = await import('../cube/colorScheme');
    const { rotateMatrix } = await import('../cube/faceMatrix');
    let s = run([
      { type: 'SELECT_EXPLANATION', mode: 'beginner' },
      { type: 'SELECT_METHOD', method: 'beginner' },
      { type: 'CAMERA_SCHEME', scheme: schemeFromFront(scrambled.faces.F[4]) },
    ]);
    expect(s.ctx.cells.R[4]).toBe('red');
    for (const face of ['F', 'R', 'B', 'L', 'U', 'D'] as const) {
      const colors = face === 'U' ? rotateMatrix(scrambled.faces.U, 1) : scrambled.faces[face];
      s = transition(s, { type: 'CAMERA_CAPTURE', capture: { face, source: 'camera', autoColors: colors, confidence: Array(9).fill(1) } });
    }
    s = transition(s, { type: 'VALIDATE' });
    expect(s.name).toBe('solving');
    expect(s.ctx.autoRotated).toEqual([{ face: 'U', quarters: 3 }]);
  });

  it('starts playback with the cube already turned for solving', async () => {
    const { solveCfop } = await import('../solvers/cfop/CfopSolver');
    const { centerColor } = await import('../cube/state');
    let s = run([
      { type: 'SELECT_EXPLANATION', mode: 'notation' },
      { type: 'SELECT_METHOD', method: 'cfop' },
      { type: 'LOAD_STATE', cells: scrambled.faces },
    ]);
    const solution = solveCfop(scrambled);
    expect(solution.allMoves[0].raw).toBe('x2');
    s = transition(s, { type: 'SOLVED', solution });
    expect(s.ctx.setupMoves.map((m) => m.raw)).toEqual(['x2']);
    expect(centerColor(s.ctx.timeline[0], 'D')).toBe('white');
    expect(s.ctx.solution!.allMoves[0].kind).not.toBe('rotation');
    expect(s.ctx.solution!.allMoves.length).toBe(solution.allMoves.length - 1);
    expect(isSolved(s.ctx.timeline[s.ctx.timeline.length - 1])).toBe(true);
  });
});
