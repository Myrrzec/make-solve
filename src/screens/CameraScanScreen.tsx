import { useCallback, useEffect, useRef, useState } from 'react';
import { schemeFromFront } from '../cube/colorScheme';
import { FACE_OFFSET } from '../cube/geometry';
import { COLOR_HEX, COLOR_NAME, FACE_NAME } from '../cube/names';
import type { CubeColor, FaceId } from '../cube/types';
import { FACES } from '../cube/types';
import { CameraError, toCapture, type CameraFrameInfo, type LiveCameraInputProvider } from '../input/LiveCameraInputProvider';
import { squareToQuad } from '../recognition/recognition';
import { ColorPalette } from '../ui/ColorPalette';
import { NetMap } from '../ui/NetMap';
import type { AppContext, AppEvent } from '../workflow/appMachine';

interface Props {
  ctx: AppContext;
  dispatch: (e: AppEvent) => void;
  camera: LiveCameraInputProvider;
}

/** Order in which the screen suggests the remaining faces. Any order is accepted. */
const NEXT_ORDER: FaceId[] = ['R', 'B', 'L', 'U', 'D'];

function holdHint(face: FaceId, scheme: Record<FaceId, CubeColor>): string {
  const c = (f: FaceId) => COLOR_NAME[scheme[f]];
  switch (face) {
    case 'U':
      return `Tilt the top of the cube toward the camera: the ${c('U')} center faces the camera, the ${c('F')} center is at the bottom.`;
    case 'D':
      return `Tilt the bottom of the cube toward the camera: the ${c('D')} center faces the camera, the ${c('F')} center is at the top.`;
    default:
      return `Turn the whole cube so the ${c(face)} center faces the camera. Keep the ${c('U')} center on top.`;
  }
}

export function CameraScanScreen({ ctx, dispatch, camera }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [frame, setFrame] = useState<CameraFrameInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [debug, setDebug] = useState(false);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  const start = useCallback(async () => {
    setError(null);
    setStarting(true);
    try {
      camera.attach(videoRef.current!);
      await camera.start();
    } catch (err) {
      setError(err instanceof CameraError ? err.message : 'Could not turn on the camera.');
    } finally {
      setStarting(false);
    }
  }, [camera]);

  useEffect(() => {
    start();
    const offFrame = camera.onFrame(setFrame);
    const offStable = camera.onStableFace((s) => {
      const current = ctxRef.current;
      const center = s.detection.colors[4];
      let scheme = current.scheme;
      if (!scheme) {
        scheme = schemeFromFront(center);
        dispatch({ type: 'CAMERA_SCHEME', scheme });
      }
      const face = FACES.find((f) => scheme![f] === center);
      if (!face) return;
      if (current.confirmed.includes(face)) {
        setNotice(`This face is already captured: ${FACE_NAME[face]}.`);
        return;
      }
      dispatch({ type: 'CAMERA_CAPTURE', capture: toCapture(face, s) });
      setNotice(`Captured: ${FACE_NAME[face]} face.`);
    });
    return () => {
      offFrame();
      offStable();
      camera.stop();
    };
  }, [camera, dispatch, start]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 1800);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    camera.setDebug(debug);
  }, [camera, debug]);

  useEffect(() => {
    const canvas = previewRef.current;
    if (!debug || !canvas || !frame?.preview) return;
    canvas.width = frame.width;
    canvas.height = frame.height;
    canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(frame.preview), frame.width, frame.height), 0, 0);
  }, [debug, frame]);

  const saveFrame = () => {
    const a = document.createElement('a');
    a.href = camera.frameDataUrl();
    a.download = `kubik-kadr-${Date.now()}.png`;
    a.click();
  };

  const pick = useCallback(
    (color: CubeColor) => {
      if (selected === null) return;
      const face = FACES[Math.floor(selected / 9)];
      dispatch({ type: 'SET_CELL', face, index: selected - FACE_OFFSET[face], color });
    },
    [selected, dispatch],
  );

  const scheme = ctx.scheme;
  const next = scheme ? NEXT_ORDER.find((f) => !ctx.confirmed.includes(f)) : 'F';
  const allDone = FACES.every((f) => ctx.confirmed.includes(f));
  const det = frame?.detection;

  return (
    <main className="page">
      <div className="head-row">
        <div className="page-head">
          <div className="eyebrow">Step 3 of 3 · camera · {ctx.confirmed.length} of 6 captured</div>
          <h1>Show the cube to the camera</h1>
          <p>The cube can be small in the frame: the camera finds the face on its own and reads only its cells. Hold the face steady for a second.</p>
        </div>
        <div className="row">
          <button type="button" className="btn small" onClick={() => dispatch({ type: 'SET_SCAN_MODE', mode: 'photo' })}>
            Upload photos instead
          </button>
        </div>
      </div>

      <div className="camera-layout">
        <div className="card camera-stage">
          <div className="camera-box">
            <video ref={videoRef} className="camera-video" muted playsInline />
            {frame && (
              <svg className="camera-overlay" viewBox={`0 0 ${frame.width} ${frame.height}`} preserveAspectRatio="xMidYMid slice">
                {det && <DetectionOverlay detection={det} stability={frame.stability} />}
              </svg>
            )}
            {starting && !error && <div className="camera-msg">Starting the camera…</div>}
            {error && (
              <div className="camera-msg">
                <div className="error-box" role="alert">
                  {error}
                </div>
                <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
                  <button type="button" className="btn primary" onClick={start}>
                    Turn on camera
                  </button>
                  <button type="button" className="btn" onClick={() => dispatch({ type: 'SET_SCAN_MODE', mode: 'photo' })}>
                    Upload photos
                  </button>
                </div>
              </div>
            )}
            {notice && <div className="camera-toast">{notice}</div>}
          </div>
          <div className="camera-status">
            <div className="progress" style={{ flex: 1 }}>
              <div style={{ width: `${(frame?.stability ?? 0) * 100}%` }} />
            </div>
            <span className="small muted">{det ? 'Face found, hold steady' : 'Looking for a cube face'}</span>
          </div>
          <div className="row">
            <button type="button" className="btn small" aria-pressed={debug} onClick={() => setDebug((d) => !d)}>
              {debug ? 'Hide camera view' : 'What the camera sees'}
            </button>
            <button type="button" className="btn small" onClick={saveFrame} disabled={!frame}>
              Save frame
            </button>
          </div>
          {debug && (
            <div className="camera-debug">
              <canvas ref={previewRef} />
              <p className="small muted">
                This is how the camera splits the frame into colors. Each sticker should be a separate patch of its own color. If a green sticker
                comes out black or white, save the frame and send it over.
                {det && <> Read now: {det.colors.map((c) => COLOR_NAME[c]).join(', ')}.</>}
              </p>
            </div>
          )}
        </div>

        <div className="side">
          <div className="card now">
            {allDone ? (
              <>
                <div className="label">All six faces captured</div>
                <p className="big-text">Look over the net, then run the cube check.</p>
                <p className="hint">If a cell is wrong, click it and pick a color.</p>
                <button type="button" className="btn primary" style={{ marginTop: 12 }} onClick={() => dispatch({ type: 'VALIDATE' })}>
                  Check the cube
                </button>
              </>
            ) : !scheme ? (
              <>
                <div className="label">First face</div>
                <p className="big-text">Show any side face to the camera, with the white center on top.</p>
                <p className="hint">This face becomes the front. The other centers are filled in from the standard color scheme.</p>
              </>
            ) : (
              next && (
                <>
                  <div className="label">Next: {FACE_NAME[next]} face</div>
                  <p className="big-text">
                    <span className="swatch-dot" style={{ background: COLOR_HEX[scheme[next]] }} />
                    {COLOR_NAME[scheme[next]][0].toUpperCase() + COLOR_NAME[scheme[next]].slice(1)} center
                  </p>
                  <p className="hint">{holdHint(next, scheme)}</p>
                  <p className="hint small">Faces can be shown in any order: each one is recognized by its center.</p>
                </>
              )
            )}
          </div>

          <div className="card" style={{ padding: 16, display: 'grid', gap: 12, justifyItems: 'start' }}>
            <NetMap
              cells={ctx.cells}
              cellSize={20}
              selected={selected}
              showLetters
              onCellClick={(face, i) => setSelected(FACE_OFFSET[face] + i)}
            />
            {selected !== null && <ColorPalette onPick={pick} />}
            <div className="captured">
              {(['F', 'R', 'B', 'L', 'U', 'D'] as FaceId[]).map((f) => (
                <div key={f} className="captured-row">
                  <span className="swatch-dot" style={{ background: scheme ? COLOR_HEX[scheme[f]] : '#c9cbc6' }} />
                  <span>{FACE_NAME[f]}</span>
                  <span className="small muted" style={{ marginLeft: 'auto' }}>
                    {ctx.confirmed.includes(f) ? 'done' : 'waiting'}
                  </span>
                  {ctx.confirmed.includes(f) && (
                    <button type="button" className="btn quiet small" onClick={() => dispatch({ type: 'CAMERA_RESET_FACE', face: f })}>
                      Retake
                    </button>
                  )}
                </div>
              ))}
            </div>
            {scheme && (
              <button type="button" className="link small" onClick={() => dispatch({ type: 'CAMERA_RESET_ALL' })}>
                Start capture over
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function DetectionOverlay({ detection, stability }: { detection: NonNullable<CameraFrameInfo['detection']>; stability: number }) {
  const map = squareToQuad(detection.quad);
  const outline = detection.quad.map((p) => `${p.x},${p.y}`).join(' ');
  const lines = [1, 2].flatMap((k) => [
    [map(k / 3, 0), map(k / 3, 1)],
    [map(0, k / 3), map(1, k / 3)],
  ]);
  const r = detection.pitch * 0.13;
  return (
    <g>
      <polygon points={outline} fill="none" stroke="#fff" strokeWidth={4} />
      <polygon points={outline} fill="none" stroke={stability >= 1 ? '#0f6b5c' : '#17191a'} strokeWidth={2} />
      {lines.map(([a, b], i) => (
        <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fff" strokeWidth={1.2} strokeDasharray="4 3" />
      ))}
      {detection.colors.map((c, i) => {
        const p = map(((i % 3) + 0.5) / 3, (Math.floor(i / 3) + 0.5) / 3);
        return <circle key={i} cx={p.x} cy={p.y} r={r} fill={COLOR_HEX[c]} stroke="#fff" strokeWidth={2} />;
      })}
    </g>
  );
}
