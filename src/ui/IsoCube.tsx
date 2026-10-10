import { COLOR_HEX } from '../cube/names';
import type { CubeColor } from '../cube/types';

interface Props {
  top: CubeColor;
  front: CubeColor;
  right: CubeColor;
  size?: number;
  /** Draws a clockwise (seen from above) arrow on the top face. */
  arrowOnTop?: boolean;
  highlight?: 'top' | 'front' | 'right';
}

const COS = Math.cos(Math.PI / 6);
const SIN = 0.5;

/** Small isometric drawing of the cube from the default viewpoint. */
export function IsoCube({ top, front, right, size = 120, arrowOnTop, highlight }: Props) {
  const s = size / 6.2;
  const project = (x: number, y: number, z: number): [number, number] => [(x - z) * COS * s, (x + z) * SIN * s - y * s];
  const poly = (pts: [number, number, number][]) => pts.map((p) => project(...p).join(',')).join(' ');
  const cells: { pts: [number, number, number][]; color: CubeColor; face: 'top' | 'front' | 'right' }[] = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) {
      cells.push({ face: 'top', color: top, pts: [[c, 3, r], [c + 1, 3, r], [c + 1, 3, r + 1], [c, 3, r + 1]] });
      cells.push({ face: 'front', color: front, pts: [[c, 3 - r, 3], [c + 1, 3 - r, 3], [c + 1, 2 - r, 3], [c, 2 - r, 3]] });
      cells.push({ face: 'right', color: right, pts: [[3, 3 - r, 3 - c], [3, 3 - r, 2 - c], [3, 2 - r, 2 - c], [3, 2 - r, 3 - c]] });
    }
  const shade = { top: 1, front: 0.9, right: 0.78 };

  let arrow: string | null = null;
  let head: string | null = null;
  if (arrowOnTop) {
    const pts: [number, number][] = [];
    const from = (-150 * Math.PI) / 180;
    const to = (95 * Math.PI) / 180;
    for (let i = 0; i <= 30; i++) {
      const t = from + ((to - from) * i) / 30;
      pts.push(project(1.5 + 1.05 * Math.cos(t), 3, 1.5 + 1.05 * Math.sin(t)));
    }
    arrow = 'M' + pts.map((p) => p.join(',')).join(' L');
    const [ex, ey] = pts[pts.length - 1];
    const [px, py] = pts[pts.length - 3];
    const ang = Math.atan2(ey - py, ex - px);
    const hl = s * 0.55;
    const left: [number, number] = [ex - hl * Math.cos(ang - 0.5), ey - hl * Math.sin(ang - 0.5)];
    const rightPt: [number, number] = [ex - hl * Math.cos(ang + 0.5), ey - hl * Math.sin(ang + 0.5)];
    head = `${left.join(',')} ${ex},${ey} ${rightPt.join(',')}`;
  }

  const [minX, minY] = [-3 * COS * s - 4, -3 * s - 4];
  const w = 6 * COS * s + 8;
  const h = 6 * s + 8;
  return (
    <svg width={w} height={h} viewBox={`${minX} ${minY} ${w} ${h}`} aria-hidden="true">
      {cells.map((cell, i) => (
        <polygon
          key={i}
          points={poly(cell.pts)}
          fill={COLOR_HEX[cell.color]}
          stroke="#1b1c1d"
          strokeWidth={s * 0.14}
          strokeLinejoin="round"
          opacity={highlight && highlight !== cell.face ? 0.35 : 1}
          style={{ filter: `brightness(${shade[cell.face]})` }}
        />
      ))}
      {arrow && (
        <g fill="none" stroke="#17191a" strokeWidth={s * 0.22} strokeLinecap="round" strokeLinejoin="round">
          <path d={arrow} />
          <polyline points={head!} />
        </g>
      )}
    </svg>
  );
}
