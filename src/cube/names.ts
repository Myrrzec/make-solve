import type { CubeColor, FaceId } from './types';

export const COLOR_NAME: Record<CubeColor, string> = {
  white: 'white',
  yellow: 'yellow',
  red: 'red',
  orange: 'orange',
  blue: 'blue',
  green: 'green',
};

/** Used before "face": "the top face". */
export const FACE_NAME: Record<FaceId, string> = {
  U: 'top',
  R: 'right',
  F: 'front',
  D: 'bottom',
  L: 'left',
  B: 'back',
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

/** Keyboard shortcut letters for the color picker (digits, so they work on any keyboard layout). */
export const COLOR_KEY: Record<CubeColor, string> = {
  white: '1',
  yellow: '2',
  red: '3',
  orange: '4',
  blue: '5',
  green: '6',
};

/** Capitalized, for buttons and labels: "Top". */
export const FACE_TITLE: Record<FaceId, string> = {
  U: 'Top',
  R: 'Right',
  F: 'Front',
  D: 'Bottom',
  L: 'Left',
  B: 'Back',
};
