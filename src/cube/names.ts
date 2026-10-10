import type { CubeColor, FaceId } from './types';

export const COLOR_NAME: Record<CubeColor, string> = {
  white: 'белый',
  yellow: 'жёлтый',
  red: 'красный',
  orange: 'оранжевый',
  blue: 'синий',
  green: 'зелёный',
};

export const COLOR_NAME_GEN_PLURAL: Record<CubeColor, string> = {
  white: 'белых',
  yellow: 'жёлтых',
  red: 'красных',
  orange: 'оранжевых',
  blue: 'синих',
  green: 'зелёных',
};

/** Nominative: «верхняя грань». */
export const FACE_NAME: Record<FaceId, string> = {
  U: 'верхняя',
  R: 'правая',
  F: 'передняя',
  D: 'нижняя',
  L: 'левая',
  B: 'задняя',
};

/** Accusative: «поверните верхнюю грань». */
export const FACE_NAME_ACC: Record<FaceId, string> = {
  U: 'верхнюю',
  R: 'правую',
  F: 'переднюю',
  D: 'нижнюю',
  L: 'левую',
  B: 'заднюю',
};

/** Swatch colors used across the UI and the 3D view. */
export const COLOR_HEX: Record<CubeColor, string> = {
  white: '#f4f4f0',
  yellow: '#f2d22e',
  red: '#c8262f',
  orange: '#f07a1a',
  blue: '#1f5fbf',
  green: '#1f9a4c',
};

/** Keyboard shortcut letters for the color picker (Russian-free so they work on any layout via codes). */
export const COLOR_KEY: Record<CubeColor, string> = {
  white: '1',
  yellow: '2',
  red: '3',
  orange: '4',
  blue: '5',
  green: '6',
};

export function pluralRu(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

/** Feminine: «одна оранжевая клетка». */
export const COLOR_NAME_FEM: Record<CubeColor, string> = {
  white: 'белая',
  yellow: 'жёлтая',
  red: 'красная',
  orange: 'оранжевая',
  blue: 'синяя',
  green: 'зелёная',
};
