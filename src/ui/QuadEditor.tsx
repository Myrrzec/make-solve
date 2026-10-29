import { useRef, useState } from 'react';
import { isConvexQuad, squareToQuad, type Point, type Quad } from '../recognition/recognition';

interface Props {
  imageUrl: string;
  imageSize: { width: number; height: number };
  quad: Quad;
  /** Called when the user releases a corner. */
  onChange: (quad: Quad) => void;
}

/** Photo with a draggable 4-corner frame and the 3x3 grid drawn in perspective. */
export function QuadEditor({ imageUrl, imageSize, quad, onChange }: Props) {
  const [draft, setDraft] = useState<Quad>(quad);
  const [dragging, setDragging] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [synced, setSynced] = useState(quad);
  if (quad !== synced) {
    setSynced(quad);
    setDraft(quad);
  }

  const toImage = (e: React.PointerEvent): Point => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: Math.min(imageSize.width, Math.max(0, ((e.clientX - rect.left) / rect.width) * imageSize.width)),
      y: Math.min(imageSize.height, Math.max(0, ((e.clientY - rect.top) / rect.height) * imageSize.height)),
    };
  };

  const map = squareToQuad(draft);
  const lines: [Point, Point][] = [];
  for (let k = 1; k < 3; k++) {
    lines.push([map(k / 3, 0), map(k / 3, 1)]);
    lines.push([map(0, k / 3), map(1, k / 3)]);
  }
  const scale = imageSize.width / 600;
  const outline = draft.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="quad-wrap">
      <img src={imageUrl} alt="Uploaded face" draggable={false} />
      <svg
        ref={svgRef}
        viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
        preserveAspectRatio="none"
        onPointerMove={(e) => {
          if (dragging === null) return;
          const next = draft.slice() as Quad;
          next[dragging] = toImage(e);
          if (isConvexQuad(next)) setDraft(next);
        }}
        onPointerUp={() => {
          if (dragging !== null) onChange(draft);
          setDragging(null);
        }}
        onPointerLeave={() => {
          if (dragging !== null) onChange(draft);
          setDragging(null);
        }}
      >
        <polygon points={outline} fill="none" stroke="#fff" strokeWidth={4 * scale} />
        <polygon points={outline} fill="none" stroke="#0f6b5c" strokeWidth={2 * scale} />
        {lines.map(([a, b], i) => (
          <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fff" strokeWidth={1.6 * scale} strokeDasharray={`${6 * scale} ${4 * scale}`} />
        ))}
        {draft.map((p, i) => (
          <circle
            key={i}
            className="quad-handle"
            cx={p.x}
            cy={p.y}
            r={11 * scale}
            fill="#fff"
            stroke="#0f6b5c"
            strokeWidth={3 * scale}
            onPointerDown={(e) => {
              (e.target as Element).setPointerCapture?.(e.pointerId);
              setDragging(i);
            }}
          />
        ))}
      </svg>
    </div>
  );
}
