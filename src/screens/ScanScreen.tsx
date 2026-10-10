import { useCallback, useEffect, useRef, useState } from 'react';
import { FACE_NAME } from '../cube/names';
import type { CubeColor } from '../cube/types';
import type { ImageUploadInputProvider } from '../input/ImageUploadInputProvider';
import { ImageReadError } from '../recognition/recognition';
import { currentFace, type AppContext, type AppEvent } from '../workflow/appMachine';
import { SCAN_SEQUENCE } from '../workflow/scanSequence';
import { ColorPalette } from '../ui/ColorPalette';
import { FaceMatrix } from '../ui/FaceMatrix';
import { NetMap } from '../ui/NetMap';
import { QuadEditor } from '../ui/QuadEditor';

interface Props {
  ctx: AppContext;
  dispatch: (e: AppEvent) => void;
  provider: ImageUploadInputProvider;
  onTryExample: (kind?: 'scramble' | 'f2l') => void;
}

export function ScanScreen({ ctx, dispatch, provider, onTryExample }: Props) {
  const face = currentFace(ctx);
  const step = SCAN_SEQUENCE[ctx.scan.faceIndex];
  const capture = ctx.captures[face];
  const [selected, setSelected] = useState<number | null>(null);
  const [over, setOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => setSelected(null), [face]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    dispatch({ type: 'IMAGE_READING' });
    try {
      const result = await provider.provideFile(face, file);
      dispatch({ type: 'IMAGE_LOADED', capture: result });
    } catch (err) {
      const e = err instanceof ImageReadError ? err : new ImageReadError('read', 'Не получилось прочитать фото.');
      dispatch({ type: 'IMAGE_FAILED', kind: e.kind === 'read' ? 'read' : 'unsupported', message: e.message });
    }
  };

  const pick = useCallback(
    (color: CubeColor) => {
      if (selected === null) return;
      dispatch({ type: 'SET_CELL', face, index: selected, color });
      if (selected < 8) setSelected(selected + 1);
    },
    [selected, face, dispatch],
  );

  const reviewing = ctx.scan.state === 'reviewing_face';
  const complete = ctx.cells[face].every((c) => c !== null);
  const isLast = ctx.confirmed.length >= 5 && !ctx.confirmed.includes(face);

  return (
    <main className="page">
      <div className="head-row">
        <div className="page-head">
          <div className="eyebrow">Шаг 3 из 3 · фото {ctx.scan.faceIndex + 1} из 6</div>
          <h1>{step.title}</h1>
          <p>Загрузите фото одной грани. Подгоните рамку по углам грани и проверьте цвета.</p>
        </div>
        <div style={{ display: 'grid', gap: 10, justifyItems: 'end' }}>
        {!ctx.scan.returnToValidation && (
          <button type="button" className="btn small" onClick={() => dispatch({ type: 'SET_SCAN_MODE', mode: 'camera' })}>
            Снять камерой
          </button>
        )}
        <div className="card net-corner">
          <div className="label">Развёртка</div>
          <NetMap
            cells={ctx.cells}
            cellSize={11}
            activeFace={face}
            onFaceClick={(f) => {
              if (f !== face && (ctx.confirmed.includes(f) || ctx.cells[f].some((c) => c !== null))) dispatch({ type: 'GOTO_FACE', face: f });
            }}
          />
        </div>
        </div>
      </div>
      <div className="scan">
        <div>
          <div className="card steps">
            {SCAN_SEQUENCE.map((s, i) => {
              const done = ctx.confirmed.includes(s.face);
              const active = i === ctx.scan.faceIndex;
              const reachable = done || ctx.cells[s.face].some((c) => c !== null);
              return (
                <button
                  key={s.face}
                  type="button"
                  className={`step${active ? ' active' : ''}${done ? ' done' : ''}`}
                  disabled={!reachable || active}
                  onClick={() => dispatch({ type: 'GOTO_FACE', face: s.face })}
                >
                  <span className="letter">{s.face}</span>
                  {s.title}
                  <span className="state">{done ? 'готово' : active ? 'сейчас' : ''}</span>
                </button>
              );
            })}
          </div>
          <div className="card hold">
            <h3>Как держать кубик</h3>
            <p>{step.howToHold}</p>
            <p className="small muted">
              На фото сверху должна быть {step.topEdge}, слева {step.leftEdge}.
              {step.turn && (
                <>
                  {' '}
                  Перехват: <span className="notation-chip">{step.turn}</span>
                </>
              )}
            </p>
            <p className="warn">
              Поворачивайте только весь кубик. Слои между фотографиями не крутите. После снимка верните кубик в исходное положение.
            </p>
          </div>
          <div style={{ marginTop: 14 }}>
            <button type="button" className="link small" onClick={() => onTryExample('scramble')}>
              Попробовать на примере без фото
            </button>
            <br />
            <button type="button" className="link small" onClick={() => onTryExample('f2l')}>
              Пример: первые два слоя уже собраны
            </button>
          </div>
        </div>

        <div className="card photo">
          {(ctx.scan.state === 'image_read_error' || ctx.scan.state === 'unsupported_image') && (
            <div className="error-box" role="alert">
              {ctx.scan.error}
            </div>
          )}
          {ctx.scan.state === 'reading_image' && (
            <div className="center-screen">
              <div className="spinner" />
              <p className="muted">Читаю фото</p>
            </div>
          )}
          {reviewing && capture?.source === 'upload' && capture.imageUrl && capture.quad && capture.imageSize ? (
            <>
              <QuadEditor
                imageUrl={capture.imageUrl}
                imageSize={capture.imageSize}
                quad={capture.quad}
                onChange={(quad) => dispatch({ type: 'CAPTURE_UPDATED', capture: provider.recapture(face, quad, capture.imageUrl!) })}
              />
              <div className="photo-foot">
                <span>Перетащите четыре угла рамки точно на углы грани. Цвета пересчитаются сами.</span>
                <button type="button" className="btn small" onClick={() => dispatch({ type: 'RETAKE' })}>
                  Другое фото
                </button>
              </div>
            </>
          ) : reviewing && capture?.source === 'camera' && capture.imageUrl ? (
            <>
              <div className="quad-wrap">
                <img src={capture.imageUrl} alt="Кадр с камеры" style={{ transform: 'scaleX(-1)' }} />
              </div>
              <div className="photo-foot">
                <span>Кадр, снятый камерой. Исправьте цвета справа, если что-то распознано неверно.</span>
              </div>
            </>
          ) : reviewing && capture?.source === 'manual' ? (
            <div className="dropzone">
              <div>
                <div className="big">Ручной ввод</div>
                <p className="hint">
                  Выберите клетку справа и нажмите цвет. Клетки идут слева направо и сверху вниз, как на фото этой грани.
                </p>
                <div style={{ marginTop: 14 }}>
                  <button type="button" className="btn small" onClick={() => dispatch({ type: 'RETAKE' })}>
                    Загрузить фото вместо этого
                  </button>
                </div>
              </div>
            </div>
          ) : (
            ctx.scan.state !== 'reading_image' && (
              <div
                className={`dropzone${over ? ' over' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(true);
                }}
                onDragLeave={() => setOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(false);
                  handleFile(e.dataTransfer.files[0]);
                }}
              >
                <div>
                  <div className="big">Фото грани: {FACE_NAME[face]}</div>
                  <p className="hint">
                    Снимайте прямо, при ровном свете, чтобы грань занимала большую часть кадра. Фото обрабатывается только на вашем компьютере.
                  </p>
                  <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
                    <button type="button" className="btn primary" onClick={() => fileInput.current?.click()}>
                      Выбрать фото
                    </button>
                    <button type="button" className="btn" onClick={() => dispatch({ type: 'MANUAL_ENTRY' })}>
                      Ввести цвета вручную
                    </button>
                  </div>
                  <p className="hint small" style={{ marginTop: 10 }}>
                    или перетащите файл сюда
                  </p>
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    handleFile(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </div>
            )
          )}
        </div>

        <div className="card review">
          <h3>Цвета грани {face}</h3>
          <FaceMatrix
            face={face}
            cells={ctx.cells[face]}
            confidence={capture?.confidence}
            locked={ctx.locked[face]}
            selected={selected}
            onSelect={setSelected}
          />
          <p className="small muted">
            {selected === null
              ? 'Нажмите на клетку, чтобы исправить цвет. Точкой отмечены клетки, в которых распознавание не уверено.'
              : `Клетка ${selected + 1}: выберите цвет или нажмите 1 до 6.`}
          </p>
          <ColorPalette onPick={pick} disabled={selected === null} />
          <div className="row">
            <button type="button" className="btn small" onClick={() => dispatch({ type: 'ROTATE_FACE', face, quarters: 3 })}>
              ↺ Повернуть
            </button>
            <button type="button" className="btn small" onClick={() => dispatch({ type: 'ROTATE_FACE', face, quarters: 1 })}>
              Повернуть ↻
            </button>
          </div>
          <button type="button" className="btn primary" disabled={!complete} onClick={() => dispatch({ type: 'CONFIRM_FACE' })}>
            {ctx.scan.returnToValidation ? 'Сохранить и проверить кубик' : isLast ? 'Подтвердить и проверить кубик' : 'Подтвердить грань'}
          </button>
          {ctx.scan.faceIndex === 0 && !reviewing && (
            <button type="button" className="btn quiet small" onClick={() => dispatch({ type: 'BACK' })}>
              Назад к выбору метода
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
