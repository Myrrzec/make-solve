import { FACE_OFFSET } from '../cube/geometry';
import { COLOR_HEX, FACE_TITLE } from '../cube/names';
import type { CubeColor, FaceId, PartialCubeState } from '../cube/types';

/** Unfolded cube:      U
 *                  L F R B
 *                      D        */
const LAYOUT: Record<FaceId, [number, number]> = {
  U: [1, 0],
  L: [0, 1],
  F: [1, 1],
  R: [2, 1],
  B: [3, 1],
  D: [1, 2],
};

interface Props {
  cells: PartialCubeState;
  cellSize?: number;
  activeFace?: FaceId;
  highlight?: Set<number>;
  selected?: number | null;
  onCellClick?: (face: FaceId, index: number) => void;
  onFaceClick?: (face: FaceId) => void;
  showLetters?: boolean;
}

const EMPTY = 'var(--cell-empty)';

export function NetMap({ cells, cellSize = 12, activeFace, highlight, selected, onCellClick, onFaceClick, showLetters }: Props) {
  const gap = Math.max(1, Math.round(cellSize / 10));
  const faceGap = Math.max(3, Math.round(cellSize / 3));
  const faceSize = cellSize * 3 + gap * 2;
  const w = faceSize * 4 + faceGap * 3;
  const h = faceSize * 3 + faceGap * 2;
  const r = Math.max(1.5, cellSize / 7);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Cube net">
      {(Object.keys(LAYOUT) as FaceId[]).map((face) => {
        const [fx, fy] = LAYOUT[face];
        const ox = fx * (faceSize + faceGap);
        const oy = fy * (faceSize + faceGap);
        const active = face === activeFace;
        return (
          <g
            key={face}
            onClick={onFaceClick ? () => onFaceClick(face) : undefined}
            style={{ cursor: onFaceClick || onCellClick ? 'pointer' : undefined }}
          >
            <title>{`${FACE_TITLE[face]} face (${face})`}</title>
            {active && (
              <rect x={ox - 3} y={oy - 3} width={faceSize + 6} height={faceSize + 6} rx={r + 2} fill="none" style={{ stroke: 'var(--ink)' }} strokeWidth={2} />
            )}
            {cells[face].map((c: CubeColor | null, i) => {
              const x = ox + (i % 3) * (cellSize + gap);
              const y = oy + Math.floor(i / 3) * (cellSize + gap);
              const index = FACE_OFFSET[face] + i;
              const isHighlighted = highlight?.has(index);
              const isSelected = selected === index;
              return (
                <rect
                  key={i}
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  rx={r}
                  style={{
                    fill: c ? COLOR_HEX[c] : EMPTY,
                    stroke: isSelected ? 'var(--accent)' : isHighlighted ? 'var(--danger)' : 'rgba(0,0,0,0.18)',
                    transition: 'fill 0.25s ease',
                  }}
                  strokeWidth={isSelected || isHighlighted ? Math.max(2, cellSize / 9) : 0.75}
                  onClick={
                    onCellClick
                      ? (e) => {
                          e.stopPropagation();
                          onCellClick(face, i);
                        }
                      : undefined
                  }
                />
              );
            })}
            {showLetters && (
              <text
                x={ox + faceSize / 2}
                y={oy + faceSize / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="ui-monospace, Menlo, monospace"
                fontSize={cellSize * 0.45}
                fontWeight={700}
                fill="rgba(0,0,0,0.45)"
                pointerEvents="none"
              >
                {face}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
