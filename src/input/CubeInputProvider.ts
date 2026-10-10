import type { CubeColor, FaceId } from '../cube/types';
import type { CellSample, Quad } from '../recognition/recognition';

/** One face as delivered by an input source. Review and confirmation are shared by all sources. */
export interface FaceCapture {
  face: FaceId;
  source: 'upload' | 'camera' | 'manual';
  /** Object URL of the photo, kept in memory only. */
  imageUrl?: string;
  imageSize?: { width: number; height: number };
  quad?: Quad;
  samples?: CellSample[];
  autoColors: (CubeColor | null)[];
  confidence: number[];
}

/**
 * Common contract for every way of reading the cube. The upload provider is
 * the first implementation; a live camera provider can be added later without
 * touching the cube model, the solvers or the 3D view.
 */
export interface CubeInputProvider {
  start(): Promise<void>;
  getFace(face: FaceId, signal?: AbortSignal): Promise<FaceCapture>;
  stop(): Promise<void>;
}
