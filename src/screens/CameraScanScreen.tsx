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

const COLOR_NAME_GEN: Record<CubeColor, string> = {
  white: 'белым',
  yellow: 'жёлтым',
  red: 'красным',
  orange: 'оранжевым',
  blue: 'синим',
  green: 'зелёным',
};

function holdHint(face: FaceId, scheme: Record<FaceId, CubeColor>): string {
  const c = (f: FaceId) => COLOR_NAME_GEN[scheme[f]];
  switch (face) {
    case 'U':
      return `Наклоните кубик верхом к камере: в камеру смотрит грань с ${c('U')} центром, грань с ${c('F')} центром внизу.`;
    case 'D':
      return `Наклоните кубик низом к камере: в камеру смотрит грань с ${c('D')} центром, грань с ${c('F')} центром вверху.`;
    default:
      return `Поверните весь кубик, чтобы в камеру смотрела грань с ${c(face)} центром. Грань с ${c('U')} центром держите сверху.`;
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
      setError(err instanceof CameraError ? err.message : 'Не получилось включить камеру.');
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
        setNotice(`Эта грань уже снята: ${FACE_NAME[face]}.`);
        return;
      }
      dispatch({ type: 'CAMERA_CAPTURE', capture: toCapture(face, s) });
      setNotice(`Снято: ${FACE_NAME[face]} грань.`);
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
          <div className="eyebrow">Шаг 3 из 3 · камера · снято {ctx.confirmed.length} из 6</div>
          <h1>Покажите кубик камере</h1>
          <p>Кубик может быть небольшим в кадре: камера сама найдёт грань и смотрит только на её клетки. Держите грань ровно секунду.</p>
        </div>
        <div className="row">
          <button type="button" className="btn small" onClick={() => dispatch({ type: 'SET_SCAN_MODE', mode: 'photo' })}>
            Загрузить фото вместо камеры
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
            {starting && !error && <div className="camera-msg">Включаю камеру…</div>}
            {error && (
              <div className="camera-msg">
                <div className="error-box" role="alert">
                  {error}
                </div>
                <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
                  <button type="button" className="btn primary" onClick={start}>
                    Включить камеру
                  </button>
                  <button type="button" className="btn" onClick={() => dispatch({ type: 'SET_SCAN_MODE', mode: 'photo' })}>
                    Загрузить фото
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
            <span className="small muted">{det ? 'Грань найдена, держите ровно' : 'Ищу грань кубика'}</span>
          </div>
          <div className="row">
            <button type="button" className="btn small" aria-pressed={debug} onClick={() => setDebug((d) => !d)}>
              {debug ? 'Скрыть, что видит камера' : 'Что видит камера'}
            </button>
            <button type="button" className="btn small" onClick={saveFrame} disabled={!frame}>
              Сохранить кадр
            </button>
          </div>
          {debug && (
            <div className="camera-debug">
              <canvas ref={previewRef} />
              <p className="small muted">
                Так камера делит кадр на цвета. Каждая наклейка должна быть отдельным пятном своего цвета. Если зелёная наклейка
                получается чёрной или белой, сохраните кадр и пришлите его.
                {det && <> Сейчас прочитано: {det.colors.map((c) => COLOR_NAME[c]).join(', ')}.</>}
              </p>
            </div>
          )}
        </div>

        <div className="side">
          <div className="card now">
            {allDone ? (
              <>
                <div className="label">Все шесть граней сняты</div>
                <p className="big-text">Проверьте развёртку и запускайте проверку кубика.</p>
                <p className="hint">Если какая-то клетка неверна, нажмите на неё и выберите цвет.</p>
                <button type="button" className="btn primary" style={{ marginTop: 12 }} onClick={() => dispatch({ type: 'VALIDATE' })}>
                  Проверить кубик
                </button>
              </>
            ) : !scheme ? (
              <>
                <div className="label">Первая грань</div>
                <p className="big-text">Покажите в камеру любую боковую грань, белым центром вверх.</p>
                <p className="hint">Эта грань станет передней. Остальные центры я расставлю сам по стандартной схеме цветов.</p>
              </>
            ) : (
              next && (
                <>
                  <div className="label">Следующая: {FACE_NAME[next]} грань</div>
                  <p className="big-text">
                    <span className="swatch-dot" style={{ background: COLOR_HEX[scheme[next]] }} />
                    {COLOR_NAME[scheme[next]]} центр
                  </p>
                  <p className="hint">{holdHint(next, scheme)}</p>
                  <p className="hint small">Грани можно показывать в любом порядке: я узнаю их по центру.</p>
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
                    {ctx.confirmed.includes(f) ? 'снята' : 'ждёт'}
                  </span>
                  {ctx.confirmed.includes(f) && (
                    <button type="button" className="btn quiet small" onClick={() => dispatch({ type: 'CAMERA_RESET_FACE', face: f })}>
                      Переснять
                    </button>
                  )}
                </div>
              ))}
            </div>
            {scheme && (
              <button type="button" className="link small" onClick={() => dispatch({ type: 'CAMERA_RESET_ALL' })}>
                Начать съёмку заново
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
