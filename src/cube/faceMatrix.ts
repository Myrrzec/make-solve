/** Rotates a 3x3 row-major matrix by 90° clockwise `quarters` times. The center stays put. */
export function rotateMatrix<T>(cells: T[], quarters = 1): T[] {
  let out = cells.slice();
  for (let q = 0; q < ((quarters % 4) + 4) % 4; q++) {
    const prev = out;
    out = prev.map((_, i) => {
      const r = Math.floor(i / 3);
      const c = i % 3;
      return prev[(2 - c) * 3 + r];
    });
  }
  return out;
}
