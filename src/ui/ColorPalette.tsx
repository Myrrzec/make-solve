import { useEffect } from 'react';
import { COLOR_HEX, COLOR_KEY, COLOR_NAME } from '../cube/names';
import type { CubeColor } from '../cube/types';
import { COLORS } from '../cube/types';

interface Props {
  onPick: (color: CubeColor) => void;
  disabled?: boolean;
}

/** Six swatches plus number keys 1 to 6. */
export function ColorPalette({ onPick, disabled }: Props) {
  useEffect(() => {
    if (disabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey) return;
      const color = COLORS.find((c) => COLOR_KEY[c] === e.key);
      if (color) {
        e.preventDefault();
        onPick(color);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPick, disabled]);

  return (
    <div className="palette" role="group" aria-label="Выбор цвета">
      {COLORS.map((c) => (
        <button key={c} type="button" className="swatch" onClick={() => onPick(c)} disabled={disabled}>
          <i style={{ background: COLOR_HEX[c] }} />
          {COLOR_NAME[c]}
          <kbd>{COLOR_KEY[c]}</kbd>
        </button>
      ))}
    </div>
  );
}
