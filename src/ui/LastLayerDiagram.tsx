import { COLOR_HEX } from '../cube/names';
import { centerColor, type Facelets } from '../cube/state';
import type { PieceArrow } from '../solvers/cfop/lastLayer';

interface Props {
  facelets: Facelets;
  /** Where top-layer pieces travel (PLL): blue for corners, red for edges. */
  arrows?: PieceArrow[];
  /** OLL shows only top color against gray; PLL shows the real side colors. */
  mode: 'OLL' | 'PLL';
  size?: number;
}

const GRAY = '#b8bab5';
/** Same convention as the PLL sheet: blue arrows move corners, red ones move edges. */
const ARROW = { corner: '#1d4fd6', edge: '#d42a1f' } as const;

/**
 * Top view of the last layer, front at the bottom, like the reference sheets:
 * the 3x3 top face plus the top row of each side face around it.
 */
export function LastLayerDiagram({ facelets: f, mode, size = 120, arrows = [] }: Props) {
  const top = centerColor(f, 'U');
  const paint = (i: number) => (mode === 'OLL' ? (f[i] === top ? COLOR_HEX[top] : GRAY) : COLOR_HEX[f[i]]);
  const cell = size / 4;
  const strip = cell * 0.32;
  const gap = cell * 0.08;
  const o = strip + gap;
  const rects: { x: number; y: number; w: number; h: number; i: number }[] = [];
  for (let k = 0; k < 9; k++) rects.push({ x: o + (k % 3) * cell, y: o + Math.floor(k / 3) * cell, w: cell - gap, h: cell - gap, i: k });
  // Seen from above: back row reads B2 B1 B0, the right column R2 R1 R0 from back to front.
  [47, 46, 45].forEach((i, k) => rects.push({ x: o + k * cell, y: 0, w: cell - gap, h: strip, i }));
  [18, 19, 20].forEach((i, k) => rects.push({ x: o + k * cell, y: o + 3 * cell, w: cell - gap, h: strip, i }));
  [36, 37, 38].forEach((i, k) => rects.push({ x: 0, y: o + k * cell, w: strip, h: cell - gap, i }));
  [11, 10, 9].forEach((i, k) => rects.push({ x: o + 3 * cell, y: o + k * cell, w: strip, h: cell - gap, i }));
  const total = o * 2 + 3 * cell - gap;
  const centerOfCell = (k: number) => ({ x: o + (k % 3) * cell + (cell - gap) / 2, y: o + Math.floor(k / 3) * cell + (cell - gap) / 2 });
  const lines = arrows.map((a) => {
    const p = centerOfCell(a.from);
    const q = centerOfCell(a.to);
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    const ux = (q.x - p.x) / len;
    const uy = (q.y - p.y) / len;
    const trim = cell * 0.22;
    return { ...a, x1: p.x + ux * (a.swap ? trim : trim * 0.6), y1: p.y + uy * (a.swap ? trim : trim * 0.6), x2: q.x - ux * trim, y2: q.y - uy * trim };
  });
  return (
    <svg width={total} height={total} viewBox={`0 0 ${total} ${total}`} role="img" aria-label={`Last layer diagram, ${mode}`}>
      <rect x={strip + gap / 2} y={strip + gap / 2} width={3 * cell + gap} height={3 * cell + gap} rx={4} fill="#1b1c1d" />
      {rects.map((r) => (
        <rect key={r.i} x={r.x} y={r.y} width={r.w} height={r.h} rx={2.5} fill={paint(r.i)} />
      ))}
      {lines.length > 0 && (
        <defs>
          {(['corner', 'edge'] as const).map((kind) => (
            <marker key={kind} id={`head-${kind}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill={ARROW[kind]} />
            </marker>
          ))}
        </defs>
      )}
      {lines.map((l, i) => (
        <g key={i}>
          <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#fff" strokeWidth={cell * 0.14} strokeLinecap="round" opacity={0.85} />
          <line
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke={ARROW[l.kind]}
            strokeWidth={cell * 0.075}
            strokeLinecap="round"
            markerEnd={`url(#head-${l.kind})`}
            markerStart={l.swap ? `url(#head-${l.kind})` : undefined}
          />
        </g>
      ))}
    </svg>
  );
}
