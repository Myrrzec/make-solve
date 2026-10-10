import type { FaceId } from '../cube/types';
import {
  classify,
  decodeImage,
  initialQuad,
  sampleCells,
  type ColorReferences,
  type DecodedImage,
  type Quad,
} from '../recognition/recognition';
import type { CubeInputProvider, FaceCapture } from './CubeInputProvider';

/**
 * Reads faces from photos the user picks. The screen hands files over with
 * `provideFile`; `getFace` resolves once a file for that face is decoded.
 * All processing happens in the browser.
 */
export class ImageUploadInputProvider implements CubeInputProvider {
  private waiting = new Map<FaceId, { resolve: (c: FaceCapture) => void; reject: (e: unknown) => void }>();
  private images = new Map<FaceId, DecodedImage>();

  constructor(private references: () => ColorReferences) {}

  async start() {}

  getFace(face: FaceId, signal?: AbortSignal): Promise<FaceCapture> {
    return new Promise((resolve, reject) => {
      this.waiting.set(face, { resolve, reject });
      signal?.addEventListener('abort', () => {
        this.waiting.delete(face);
        reject(new DOMException('Aborted', 'AbortError'));
      });
    });
  }

  /** Decodes the file and builds the capture with the default frame. Throws ImageReadError. */
  async provideFile(face: FaceId, file: File): Promise<FaceCapture> {
    const image = await decodeImage(file);
    this.images.set(face, image);
    const quad = initialQuad(image.width, image.height);
    const capture = this.capture(face, quad, URL.createObjectURL(file));
    this.waiting.get(face)?.resolve(capture);
    this.waiting.delete(face);
    return capture;
  }

  /** Re-samples after the user moved the frame corners. */
  recapture(face: FaceId, quad: Quad, imageUrl: string): FaceCapture {
    return this.capture(face, quad, imageUrl);
  }

  private capture(face: FaceId, quad: Quad, imageUrl: string): FaceCapture {
    const image = this.images.get(face)!;
    const samples = sampleCells(image, quad);
    const refs = this.references();
    const results = samples.map((s) => classify(s, refs));
    return {
      face,
      source: 'upload',
      imageUrl,
      imageSize: { width: image.width, height: image.height },
      quad,
      samples,
      autoColors: results.map((r) => r.color),
      confidence: results.map((r) => r.confidence),
    };
  }

  async stop() {
    for (const w of this.waiting.values()) w.reject(new DOMException('Stopped', 'AbortError'));
    this.waiting.clear();
    this.images.clear();
  }
}
