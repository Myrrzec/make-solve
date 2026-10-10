import { useCallback, useState } from 'react';
import { FACE_OFFSET } from '../cube/geometry';
import { FACE_NAME, FACE_NAME_ACC } from '../cube/names';
import type { CubeColor, FaceId } from '../cube/types';
import { FACES } from '../cube/types';
import type { AppContext, AppEvent } from '../workflow/appMachine';
import { ColorPalette } from '../ui/ColorPalette';
import { NetMap } from '../ui/NetMap';

interface Props {
  ctx: AppContext;
  dispatch: (e: AppEvent) => void;
}

const ROTATION_TEXT = { 1: 'на 90° по часовой стрелке', 2: 'на 180°', 3: 'на 90° против часовой стрелки' } as const;

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
        <div className="eyebrow">Проверка</div>
        <h1>Такой кубик не может существовать</h1>
        <p>Скорее всего, одна или две клетки распознаны неверно. Исправьте их здесь или пересмотрите фото, затем проверьте снова.</p>
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
              ? 'Красной рамкой обведены клетки, которые стоит проверить первыми. Нажмите на клетку, чтобы сменить цвет.'
              : `Выбрана клетка на грани «${FACE_NAME[FACES[Math.floor(selected / 9)]]}». Выберите цвет.`}
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
              <h3>Похоже, грань снята повёрнутой</h3>
              <p>
                Если повернуть {FACE_NAME_ACC[s.face]} грань{' '}
                {ROTATION_TEXT[s.quarters]}, кубик станет правильным.
              </p>
              <div style={{ marginTop: 10 }}>
                <button type="button" className="btn small" onClick={() => dispatch({ type: 'ROTATE_FACE', face: s.face, quarters: s.quarters })}>
                  Повернуть и проверить
                </button>
              </div>
            </div>
          ))}
          {validation.rotationFix && (
            <div className="card issue" style={{ borderLeftColor: 'var(--accent)' }}>
              <h3>Похоже, несколько граней сняты повёрнутыми</h3>
              <p>
                Если повернуть {validation.rotationFix.map((t) => `${FACE_NAME_ACC[t.face]} ${ROTATION_TEXT[t.quarters]}`).join(', ')}, кубик станет правильным.
              </p>
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="btn small"
                  onClick={() => {
                    for (const t of validation.rotationFix!) dispatch({ type: 'ROTATE_FACE', face: t.face, quarters: t.quarters });
                  }}
                >
                  Повернуть и проверить
                </button>
              </div>
            </div>
          )}
          <div className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
            <div className="small muted">Пересмотреть фото граней:</div>
            <div className="row">
              {(faces.length < 6 ? faces : FACES).map((f: FaceId) => (
                <button key={f} type="button" className="btn small" onClick={() => dispatch({ type: 'GOTO_FACE', face: f })}>
                  {FACE_NAME[f]}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="btn primary" onClick={() => dispatch({ type: 'VALIDATE' })}>
            Проверить снова
          </button>
        </div>
      </div>
    </main>
  );
}
