import { useEffect, useRef } from 'react';
import { moveGeometry } from '../cube/geometry';
import { invertMove } from '../cube/moveParser';
import type { Facelets } from '../cube/state';
import type { CubeMove } from '../cube/types';
import { CubeRenderer } from '../three/CubeRenderer';
import { moveDurationMs } from '../three/timing';

interface Props {
  timeline: Facelets[];
  moves: CubeMove[];
  cursor: number;
  /** Animation speed multiplier, 1 = normal. */
  speed: number;
  /** Increment to replay the last executed move. */
  replayToken: number;
  /** Increment to put the camera back. */
  cameraToken: number;
  showArrow: boolean;
}

/**
 * React adapter: the renderer only ever receives states computed by the math
 * model. A step of +1 or -1 animates; any other jump repaints instantly.
 */
export function CubeView({ timeline, moves, cursor, speed, replayToken, cameraToken, showArrow }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const renderer = useRef<CubeRenderer | null>(null);
  const shown = useRef<number>(cursor);
  const animating = useRef(false);

  useEffect(() => {
    const r = new CubeRenderer(host.current!);
    renderer.current = r;
    r.setFacelets(timeline[cursor] ?? []);
    shown.current = cursor;
    return () => {
      r.dispose();
      renderer.current = null;
    };
    // The renderer lives as long as the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateArrow = () => {
    const r = renderer.current;
    if (!r) return;
    r.showArrow(showArrow && !animating.current && cursor < moves.length ? moveGeometry(moves[cursor]) : null);
  };

  useEffect(() => {
    const r = renderer.current;
    if (!r) return;
    const from = shown.current;
    shown.current = cursor;
    if (from === cursor) {
      r.setFacelets(timeline[cursor]);
      updateArrow();
      return;
    }
    let geometry = null;
    if (cursor === from + 1) geometry = moveGeometry(moves[from]);
    else if (cursor === from - 1) geometry = moveGeometry(invertMove(moves[cursor]));
    if (!geometry) {
      r.finishAnimation();
      r.setFacelets(timeline[cursor]);
      updateArrow();
      return;
    }
    animating.current = true;
    r.showArrow(null);
    r.animate(geometry, timeline[cursor], moveDurationMs(moves[Math.min(from, cursor)], speed)).then(() => {
      animating.current = false;
      if (shown.current === cursor) updateArrow();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, timeline]);

  useEffect(() => {
    updateArrow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArrow]);

  useEffect(() => {
    const r = renderer.current;
    if (!r || replayToken === 0 || cursor === 0) return;
    r.finishAnimation();
    r.setFacelets(timeline[cursor - 1]);
    animating.current = true;
    r.showArrow(null);
    r.animate(moveGeometry(moves[cursor - 1]), timeline[cursor], moveDurationMs(moves[cursor - 1], speed)).then(() => {
      animating.current = false;
      updateArrow();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayToken]);

  useEffect(() => {
    if (cameraToken > 0) renderer.current?.resetCamera();
  }, [cameraToken]);

  return <div ref={host} className="view" />;
}
