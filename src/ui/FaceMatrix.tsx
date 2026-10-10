import { useEffect } from 'react';
import { COLOR_HEX, COLOR_NAME } from '../cube/names';
import type { CubeColor, FaceId } from '../cube/types';

interface Props {
  face: FaceId;
  cells: (CubeColor | null)[];
  confidence?: number[];
  locked?: boolean[];
  selected: number | null;
  onSelect: (index: number) => void;
}

const DOUBT = 0.18;

export function FaceMatrix({ face, cells, confidence, locked, selected, onSelect }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selected === null) return;
      const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 };
      if (!(e.key in moves)) return;
      const next = selected + moves[e.key];
      if (next < 0 || next > 8) return;
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && Math.floor(next / 3) !== Math.floor(selected / 3)) return;
      e.preventDefault();
      onSelect(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, onSelect]);

  return (
    <div className="matrix" role="grid" aria-label={`Клетки грани ${face}`}>
      {cells.map((c, i) => {
        const doubtful = c !== null && !locked?.[i] && confidence !== undefined && confidence[i] < DOUBT;
        return (
          <button
            key={i}
            type="button"
            className={`cell${c ? '' : ' empty'}${selected === i ? ' selected' : ''}`}
            style={c ? { background: COLOR_HEX[c] } : undefined}
            onClick={() => onSelect(i)}
            aria-label={`Клетка ${i + 1}: ${c ? COLOR_NAME[c] : 'не задана'}${doubtful ? ', стоит проверить' : ''}`}
            title={doubtful ? 'Распознано неуверенно, проверьте' : undefined}
          >
            {doubtful && <span className="doubt" />}
            {i === 4 && <span className="center-mark">{face}</span>}
          </button>
        );
      })}
    </div>
  );
}
