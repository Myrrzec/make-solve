import type { CubeColor, FaceId } from '../cube/types';
import { detectFace, segmentationPreview, type FaceDetection } from '../recognition/cubeDetector';
import type { ColorReferences } from '../recognition/recognition';
import type { CubeInputProvider, FaceCapture } from './CubeInputProvider';

/** Width of the frame the detector looks at. Small enough for ~10 checks a second. */
const ANALYSIS_WIDTH = 640;
/** Same colors this many checks in a row before a face counts as captured. */
const STABLE_FRAMES = 5;
const INTERVAL_MS = 90;

export interface CameraFrameInfo {
  detection: FaceDetection | null;
  /** 0..1: how close the current face is to being captured. */
  stability: number;
  width: number;
  height: number;
  /** Segmentation preview, only while the debug view is on. */
  preview?: Uint8ClampedArray;
}

export interface StableFace {
  detection: FaceDetection;
  snapshotUrl: string;
  width: number;
  height: number;
}

export class CameraError extends Error {
  constructor(
    public kind: 'denied' | 'missing' | 'unsupported' | 'other',
    message: string,
  ) {
    super(message);
  }
}

/**
 * Reads faces from the live camera. Frames are analysed locally in the
 * browser; nothing is recorded or sent anywhere.
 */
export class LiveCameraInputProvider implements CubeInputProvider {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private canvas = document.createElement('canvas');
  private timer = 0;
  private frameListeners = new Set<(info: CameraFrameInfo) => void>();
  private stableListeners = new Set<(face: StableFace) => void>();
  private history: string[] = [];
  private paused = false;
  private debug = false;

  constructor(private references: () => ColorReferences) {}

  attach(video: HTMLVideoElement) {
    this.video = video;
    if (this.stream) video.srcObject = this.stream;
  }

  async start(): Promise<void> {
    if (this.stream) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new CameraError('unsupported', 'Этот браузер не даёт доступ к камере. Откройте сайт в Chrome, Safari или Firefox.');
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
    } catch (err) {
      const name = (err as DOMException).name;
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        throw new CameraError('denied', 'Доступ к камере запрещён. Разрешите его в настройках браузера для этого сайта и нажмите «Включить камеру» ещё раз.');
      }
      if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        throw new CameraError('missing', 'Камера не найдена. Подключите камеру или загрузите фото граней.');
      }
      throw new CameraError('other', 'Не получилось включить камеру. Возможно, она занята другим приложением.');
    }
    if (this.video) {
      this.video.srcObject = this.stream;
      await this.video.play().catch(() => {});
    }
    this.loop();
  }

  /** Stops reacting while the user looks at a captured face. */
  setPaused(paused: boolean) {
    this.paused = paused;
    this.history = [];
  }

  setDebug(on: boolean) {
    this.debug = on;
  }

  /** The last analysed frame as a PNG, for sending to whoever tunes the detector. */
  frameDataUrl(): string {
    return this.canvas.toDataURL('image/png');
  }

  onFrame(fn: (info: CameraFrameInfo) => void) {
    this.frameListeners.add(fn);
    return () => this.frameListeners.delete(fn);
  }

  onStableFace(fn: (face: StableFace) => void) {
    this.stableListeners.add(fn);
    return () => this.stableListeners.delete(fn);
  }

  /** Resolves with the next steady face whose center has the expected color. */
  getFace(face: FaceId, signal?: AbortSignal, expectedCenter?: CubeColor): Promise<FaceCapture> {
    return new Promise((resolve, reject) => {
      const off = this.onStableFace((s) => {
        if (expectedCenter && s.detection.colors[4] !== expectedCenter) return;
        off();
        resolve(toCapture(face, s));
      });
      signal?.addEventListener('abort', () => {
        off();
        reject(new DOMException('Aborted', 'AbortError'));
      });
    });
  }

  private loop() {
    const tick = () => {
      this.timer = window.setTimeout(tick, INTERVAL_MS);
      this.analyse();
    };
    tick();
  }

  private analyse() {
    const video = this.video;
    if (!video || video.readyState < 2 || video.videoWidth === 0) return;
    const scale = ANALYSIS_WIDTH / video.videoWidth;
    const width = ANALYSIS_WIDTH;
    const height = Math.round(video.videoHeight * scale);
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(video, 0, 0, width, height);
    const frame = ctx.getImageData(0, 0, width, height);
    const detection = this.paused ? null : detectFace(frame, this.references());

    const key = detection ? detection.colors.join(',') : '';
    if (key && this.history[this.history.length - 1] === key) this.history.push(key);
    else this.history = key ? [key] : [];
    const stability = Math.min(1, this.history.length / STABLE_FRAMES);
    const preview = this.debug ? segmentationPreview(frame) : undefined;
    for (const fn of this.frameListeners) fn({ detection, stability, width, height, preview });

    if (detection && this.history.length === STABLE_FRAMES) {
      const snapshotUrl = this.canvas.toDataURL('image/jpeg', 0.85);
      for (const fn of this.stableListeners) fn({ detection, snapshotUrl, width, height });
    }
  }

  async stop(): Promise<void> {
    window.clearTimeout(this.timer);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.video) this.video.srcObject = null;
    this.history = [];
  }
}

export function toCapture(face: FaceId, s: StableFace): FaceCapture {
  return {
    face,
    source: 'camera',
    imageUrl: s.snapshotUrl,
    imageSize: { width: s.width, height: s.height },
    quad: s.detection.quad,
    samples: s.detection.samples,
    autoColors: s.detection.colors,
    confidence: s.detection.confidence,
  };
}
