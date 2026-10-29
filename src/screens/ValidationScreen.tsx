import { useCallback, useState } from 'react';
import { FACE_OFFSET } from '../cube/geometry';
import { FACE_NAME, FACE_TITLE } from '../cube/names';
import type { CubeColor, FaceId } from '../cube/types';
import { FACES } from '../cube/types';
import type { AppContext, AppEvent } from '../workflow/appMachine';
import { ColorPalette } from '../ui/ColorPalette';
import { NetMap } from '../ui/NetMap';

interface Props {
  ctx: AppContext;
  dispatch: (e: AppEvent) => void;
}

const ROTATION_TEXT = { 1: '90° clockwise', 2: '180°', 3: '90° counterclockwise' } as const;

export function ValidationScreen({ ctx, dispatch }: Props) {
  const validation = ctx.validation!;
  const [selected, setSelected] = useState<number | null>(null);
  const suspect = new Set(validation.issues.flatMap((i) => i.suspect));
  const faces = [...new Set(validation.issues.flatMap((i) => i.faces))];

  const pick = useCallback(
    (color: CubeColor) => {
      if (selected === null) return;
      const face = FACES[Math.floor(selected / 9)];
      dispatch({ type: 'SET_CELL', face, index: selected - FACE_OFFSET[face], color });
    },
    [selected, dispatch],
  );

  return (
    <main className="page">
      <div className="page-head">
        <div className="eyebrow">Check</div>
        <h1>This cube cannot exist</h1>
        <p>Most likely one or two cells were read wrong. Fix them here or review the photos, then check again.</p>
      </div>
      <div className="validation">
        <div className="card" style={{ padding: 24, display: 'grid', gap: 18, justifyItems: 'start' }}>
          <NetMap
            cells={ctx.cells}
            cellSize={30}
            highlight={suspect}
            selected={selected}
            showLetters
            onCellClick={(face, i) => setSelected(FACE_OFFSET[face] + i)}
          />
          <p className="small muted">
            {selected === null
              ? 'Cells outlined in red are worth checking first. Click a cell to change its color.'
              : `Selected a cell on the ${FACE_NAME[FACES[Math.floor(selected / 9)]]} face. Pick a color.`}
          </p>
          <div style={{ width: 360 }}>
            <ColorPalette onPick={pick} disabled={selected === null} />
          </div>
        </div>
        <div className="issues">
          {validation.issues.map((issue, i) => (
            <div key={i} className="card issue">
              <h3>{issue.title}</h3>
              <p>{issue.message}</p>
            </div>
          ))}
          {validation.rotationSuggestions.map((s) => (
            <div key={`${s.face}${s.quarters}`} className="card issue" style={{ borderLeftColor: 'var(--accent)' }}>
              <h3>Looks like a face was captured rotated</h3>
              <p>
                Turning the {FACE_NAME[s.face]} face{' '}
                {ROTATION_TEXT[s.quarters]} makes the cube valid.
              </p>
              <div style={{ marginTop: 10 }}>
                <button type="button" className="btn small" onClick={() => dispatch({ type: 'ROTATE_FACE', face: s.face, quarters: s.quarters })}>
                  Rotate and check
                </button>
              </div>
            </div>
          ))}
          {validation.rotationFix && (
            <div className="card issue" style={{ borderLeftColor: 'var(--accent)' }}>
              <h3>Looks like several faces were captured rotated</h3>
              <p>
                Turning {validation.rotationFix.map((t) => `the ${FACE_NAME[t.face]} face ${ROTATION_TEXT[t.quarters]}`).join(', ')} makes the cube valid.
              </p>
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="btn small"
                  onClick={() => {
                    for (const t of validation.rotationFix!) dispatch({ type: 'ROTATE_FACE', face: t.face, quarters: t.quarters });
                  }}
                >
                  Rotate and check
                </button>
              </div>
            </div>
          )}
          <div className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
            <div className="small muted">Review face photos:</div>
            <div className="row">
              {(faces.length < 6 ? faces : FACES).map((f: FaceId) => (
                <button key={f} type="button" className="btn small" onClick={() => dispatch({ type: 'GOTO_FACE', face: f })}>
                  {FACE_TITLE[f]}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="btn primary" onClick={() => dispatch({ type: 'VALIDATE' })}>
            Check again
          </button>
        </div>
      </div>
    </main>
  );
}
