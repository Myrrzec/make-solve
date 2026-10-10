import type { FaceId } from '../cube/types';

export interface ScanStep {
  face: FaceId;
  title: string;
  /** Whole-cube turn from the home position, in notation. */
  turn: string;
  howToHold: string;
  topEdge: string;
  leftEdge: string;
}

/**
 * Every photo starts from the home position (pick a face to look at you and
 * keep it) and returns there afterwards, so mistakes never pile up.
 */
export const SCAN_SEQUENCE: ScanStep[] = [
  {
    face: 'U',
    title: 'Верхняя грань',
    turn: "x'",
    howToHold: 'Наклоните кубик верхом к себе, чтобы верхняя грань смотрела на вас.',
    topEdge: 'задняя грань',
    leftEdge: 'левая грань',
  },
  {
    face: 'R',
    title: 'Правая грань',
    turn: 'y',
    howToHold: 'Поверните весь кубик влево, чтобы правая грань оказалась перед вами.',
    topEdge: 'верхняя грань',
    leftEdge: 'передняя грань',
  },
  {
    face: 'F',
    title: 'Передняя грань',
    turn: '',
    howToHold: 'Держите кубик в исходном положении: передняя грань смотрит на вас.',
    topEdge: 'верхняя грань',
    leftEdge: 'левая грань',
  },
  {
    face: 'D',
    title: 'Нижняя грань',
    turn: 'x',
    howToHold: 'Наклоните кубик верхом от себя, чтобы нижняя грань смотрела на вас.',
    topEdge: 'передняя грань',
    leftEdge: 'левая грань',
  },
  {
    face: 'L',
    title: 'Левая грань',
    turn: "y'",
    howToHold: 'Поверните весь кубик вправо, чтобы левая грань оказалась перед вами.',
    topEdge: 'верхняя грань',
    leftEdge: 'задняя грань',
  },
  {
    face: 'B',
    title: 'Задняя грань',
    turn: 'y2',
    howToHold: 'Разверните весь кубик задней гранью к себе.',
    topEdge: 'верхняя грань',
    leftEdge: 'правая грань',
  },
];

export const SCAN_ORDER: FaceId[] = SCAN_SEQUENCE.map((s) => s.face);
