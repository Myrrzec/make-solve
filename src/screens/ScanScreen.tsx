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
      const e = err instanceof ImageReadError ? err : new ImageReadError('read', 'Could not read the photo.');
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
          <div className="eyebrow">Step 3 of 3 · photo {ctx.scan.faceIndex + 1} of 6</div>
          <h1>{step.title}</h1>
          <p>Upload a photo of one face. Fit the frame to the face corners and check the colors.</p>
        </div>
        <div style={{ display: 'grid', gap: 10, justifyItems: 'end' }}>
        {!ctx.scan.returnToValidation && (
          <button type="button" className="btn small" onClick={() => dispatch({ type: 'SET_SCAN_MODE', mode: 'camera' })}>
            Use the camera
          </button>
        )}
        <div className="card net-corner">
          <div className="label">Cube net</div>
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
                  <span className="state">{done ? 'done' : active ? 'now' : ''}</span>
                </button>
              );
            })}
          </div>
          <div className="card hold">
            <h3>How to hold the cube</h3>
            <p>{step.howToHold}</p>
            <p className="small muted">
              In the photo the {step.topEdge} should be at the top and the {step.leftEdge} on the left.
              {step.turn && (
                <>
                  {' '}
                  Cube turn: <span className="notation-chip">{step.turn}</span>
                </>
              )}
            </p>
            <p className="warn">
              Only rotate the whole cube. Don't turn any layers between photos. After each shot, return the cube to the home position.
            </p>
          </div>
          <div style={{ marginTop: 14 }}>
            <button type="button" className="link small" onClick={() => onTryExample('scramble')}>
              Try an example without photos
            </button>
            <br />
            <button type="button" className="link small" onClick={() => onTryExample('f2l')}>
              Example: first two layers already solved
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
              <p className="muted">Reading the photo</p>
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
                <span>Drag the four frame corners onto the corners of the face. Colors update automatically.</span>
                <button type="button" className="btn small" onClick={() => dispatch({ type: 'RETAKE' })}>
                  Another photo
                </button>
              </div>
            </>
          ) : reviewing && capture?.source === 'camera' && capture.imageUrl ? (
            <>
              <div className="quad-wrap">
                <img src={capture.imageUrl} alt="Camera frame" style={{ transform: 'scaleX(-1)' }} />
              </div>
              <div className="photo-foot">
                <span>Frame from the camera. Fix the colors on the right if anything was read wrong.</span>
              </div>
            </>
          ) : reviewing && capture?.source === 'manual' ? (
            <div className="dropzone">
              <div>
                <div className="big">Manual entry</div>
                <p className="hint">
                  Pick a cell on the right and click a color. Cells go left to right and top to bottom, as in a photo of this face.
                </p>
                <div style={{ marginTop: 14 }}>
                  <button type="button" className="btn small" onClick={() => dispatch({ type: 'RETAKE' })}>
                    Upload a photo instead
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
                  <div className="big">Photo of the {FACE_NAME[face]} face</div>
                  <p className="hint">
                    Shoot straight on in even light, with the face filling most of the frame. The photo is processed only on your computer.
                  </p>
                  <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
                    <button type="button" className="btn primary" onClick={() => fileInput.current?.click()}>
                      Choose photo
                    </button>
                    <button type="button" className="btn" onClick={() => dispatch({ type: 'MANUAL_ENTRY' })}>
                      Enter colors by hand
                    </button>
                  </div>
                  <p className="hint small" style={{ marginTop: 10 }}>
                    or drop a file here
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
          <h3>Colors of face {face}</h3>
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
              ? 'Click a cell to fix its color. A dot marks cells with low confidence.'
              : `Cell ${selected + 1}: pick a color or press 1 to 6.`}
          </p>
          <ColorPalette onPick={pick} disabled={selected === null} />
          <div className="row">
            <button type="button" className="btn small" onClick={() => dispatch({ type: 'ROTATE_FACE', face, quarters: 3 })}>
              ↺ Rotate
            </button>
            <button type="button" className="btn small" onClick={() => dispatch({ type: 'ROTATE_FACE', face, quarters: 1 })}>
              Rotate ↻
            </button>
          </div>
          <button type="button" className="btn primary" disabled={!complete} onClick={() => dispatch({ type: 'CONFIRM_FACE' })}>
            {ctx.scan.returnToValidation ? 'Save and check the cube' : isLast ? 'Confirm and check the cube' : 'Confirm face'}
          </button>
          {ctx.scan.faceIndex === 0 && !reviewing && (
            <button type="button" className="btn quiet small" onClick={() => dispatch({ type: 'BACK' })}>
              Back to method choice
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
