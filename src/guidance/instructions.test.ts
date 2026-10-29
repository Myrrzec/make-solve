import { describe, expect, it } from 'vitest';
import { FACE_OFFSET } from '../cube/geometry';
import { parseMove, parseSequence } from '../cube/moveParser';
import { applyMove, solvedFacelets } from '../cube/state';
import { explainMove } from './instructions';

describe('instructions', () => {
  it('explains a counterclockwise top turn for beginners', () => {
    const i = explainMove(parseMove("U'"), 'beginner');
    expect(i.primary).toBe('Turn the top face 90° counterclockwise.');
    expect(i.relativeHint).toBe('The front row moves right.');
    expect(i.viewHint).toContain('looking down');
  });

  it('puts notation first in notation mode', () => {
    const i = explainMove(parseMove("U'"), 'notation');
    expect(i.primary).toBe("U'");
  });

  it('describes wide moves, slices and rotations', () => {
    expect(explainMove(parseMove('Rw'), 'beginner').primary).toBe('Turn the two right layers together 90° clockwise.');
    expect(explainMove(parseMove('x'), 'beginner').primary).toBe("Rotate the whole cube in the direction of R. Don't turn any layers.");
    expect(explainMove(parseMove('M'), 'beginner').primary).toContain('the same way as the left face');
  });

  it('adds the center color when the cube is known', () => {
    expect(explainMove(parseMove('F'), 'beginner', { facelets: solvedFacelets() }).primary).toContain('(green)');
  });

  it('explains every parsable move', () => {
    for (const m of parseSequence("U U' U2 R L F B D Rw Lw Uw Dw Fw Bw M M' E S2 x y z' x2")) {
      for (const mode of ['beginner', 'notation'] as const) expect(explainMove(m, mode).primary.length).toBeGreaterThan(0);
    }
  });

  it('matches the relative hint with the actual sticker movement', () => {
    // U: front row goes left, so the old front stickers land on the left face.
    const solved = solvedFacelets();
    const afterU = applyMove(solved, parseMove('U'));
    expect(afterU[FACE_OFFSET.L]).toBe(solved[FACE_OFFSET.F]);
    expect(explainMove(parseMove('U'), 'beginner').relativeHint).toBe('The front row moves left.');
    // R: front column goes up.
    const afterR = applyMove(solved, parseMove('R'));
    expect(afterR[FACE_OFFSET.U + 2]).toBe(solved[FACE_OFFSET.F + 2]);
    expect(explainMove(parseMove('R'), 'beginner').relativeHint).toBe('The front column moves up.');
  });
});
