import { rotateMatrix } from './faceMatrix';
import { FACE_OFFSET } from './geometry';
import { COLOR_NAME, COLOR_NAME_FEM, COLOR_NAME_GEN_PLURAL, FACE_NAME, pluralRu } from './names';
import { CORNER_FACELETS, CORNER_FACES, EDGE_FACELETS, EDGE_FACES, OPPOSITE } from './pieces';
import type { CubeColor, CubeState, FaceId, PartialCubeState } from './types';
import { COLORS, FACES } from './types';

export type ValidationCode =
  | 'MISSING_CELLS'
  | 'CENTERS_DUPLICATE'
  | 'COLOR_COUNT'
  | 'INVALID_EDGE'
  | 'INVALID_CORNER'
  | 'MIRRORED_CORNER'
  | 'DUPLICATE_EDGE'
  | 'DUPLICATE_CORNER'
  | 'EDGE_FLIP'
  | 'CORNER_TWIST'
  | 'PERMUTATION_PARITY';

export interface ValidationIssue {
  code: ValidationCode;
  title: string;
  message: string;
  /** Global facelet indices worth checking first. */
  suspect: number[];
  /** Faces whose photos are worth re-checking. */
  faces: FaceId[];
}

export interface FaceRotationSuggestion {
  face: FaceId;
  quarters: 1 | 2 | 3;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
  /** Single face rotations that would make the cube valid. */
  rotationSuggestions: FaceRotationSuggestion[];
  /** When no single rotation helps: the one set of rotations that makes the cube valid. */
  rotationFix?: FaceRotationSuggestion[];
  state?: CubeState;
}

/** Cubie-level description in Kociemba order. */
export interface CubieState {
  cp: number[];
  co: number[];
  ep: number[];
  eo: number[];
}

const faceOfIndex = (i: number): FaceId => FACES[Math.floor(i / 9)];
const uniq = <T,>(xs: T[]) => [...new Set(xs)];

function colorList(colors: CubeColor[]): string {
  return colors.map((c) => COLOR_NAME[c]).join(', ');
}

/** Checks everything that does not depend on piece decomposition. */
function checkStructure(state: PartialCubeState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const missing = FACES.flatMap((f) =>
    Array.from({ length: 9 }, (_, i) => i).filter((i) => !state[f] || state[f][i] == null).map((i) => FACE_OFFSET[f] + i),
  );
  if (missing.length > 0) {
    const faces = uniq(missing.map(faceOfIndex));
    issues.push({
      code: 'MISSING_CELLS',
      title: 'Заполнены не все клетки',
      message: `Не хватает ${missing.length} ${pluralRu(missing.length, 'клетки', 'клеток', 'клеток')}. Грани без цвета: ${faces.map((f) => FACE_NAME[f]).join(', ')}.`,
      suspect: missing,
      faces,
    });
    return issues;
  }

  const centers = FACES.map((f) => state[f][4] as CubeColor);
  const dupCenters = FACES.filter((_, i) => centers.indexOf(centers[i]) !== i || centers.lastIndexOf(centers[i]) !== i);
  if (dupCenters.length > 0) {
    issues.push({
      code: 'CENTERS_DUPLICATE',
      title: 'Одинаковые центры',
      message: `У граней ${dupCenters.map((f) => FACE_NAME[f]).join(', ')} центральная клетка одного цвета. У настоящего кубика все шесть центров разные. Скорее всего, одна грань сфотографирована дважды или центр распознан неверно.`,
      suspect: dupCenters.map((f) => FACE_OFFSET[f] + 4),
      faces: dupCenters,
    });
  }

  const counts = new Map<CubeColor, number>(COLORS.map((c) => [c, 0]));
  for (const f of FACES) for (const c of state[f]) counts.set(c as CubeColor, (counts.get(c as CubeColor) ?? 0) + 1);
  const over = COLORS.filter((c) => (counts.get(c) ?? 0) > 9);
  const under = COLORS.filter((c) => (counts.get(c) ?? 0) < 9);
  if (over.length > 0 || under.length > 0) {
    const parts = [...over, ...under].map(
      (c) => `${COLOR_NAME_GEN_PLURAL[c]} ${counts.get(c)}`,
    );
    const suspect = FACES.flatMap((f) =>
      state[f].map((c, i) => (over.includes(c as CubeColor) && i !== 4 ? FACE_OFFSET[f] + i : -1)).filter((i) => i >= 0),
    );
    const hint =
      over.length === 1 && under.length === 1
        ? ` Похоже, одна ${COLOR_NAME_FEM[under[0]]} клетка распознана как ${COLOR_NAME_FEM[over[0]]}.`
        : '';
    issues.push({
      code: 'COLOR_COUNT',
      title: 'Каждого цвета должно быть ровно 9 клеток',
      message: `Сейчас ${parts.join(', ')}.${hint} Подсвечены клетки лишнего цвета: одна из них, скорее всего, ошибочная.`,
      suspect,
      faces: uniq(suspect.map(faceOfIndex)),
    });
  }
  return issues;
}

interface PieceResult {
  issues: ValidationIssue[];
  cubies?: CubieState;
}

function checkPieces(facelets: CubeColor[]): PieceResult {
  const issues: ValidationIssue[] = [];
  const faceOfColor = new Map<CubeColor, FaceId>(FACES.map((f) => [facelets[FACE_OFFSET[f] + 4], f]));
  const toFace = (i: number) => faceOfColor.get(facelets[i]) as FaceId;

  const cp: number[] = [];
  const co: number[] = [];
  CORNER_FACELETS.forEach((stickers, pos) => {
    const faces = stickers.map(toFace);
    const colors = stickers.map((i) => facelets[i]);
    const distinct = new Set(faces).size === 3;
    const hasOpposite = faces.some((a) => faces.includes(OPPOSITE[a]));
    if (!distinct || hasOpposite) {
      issues.push({
        code: 'INVALID_CORNER',
        title: 'Невозможный угол',
        message: `У одного угла цвета ${colorList(colors)}. ${distinct ? 'Противоположные цвета не могут встретиться на одной детали.' : 'Два одинаковых цвета не могут быть на одной детали.'} Ошибка в одной из трёх подсвеченных клеток.`,
        suspect: [...stickers],
        faces: uniq(stickers.map(faceOfIndex)),
      });
      return;
    }
    const ori = faces.findIndex((f) => f === 'U' || f === 'D');
    const ordered = [0, 1, 2].map((k) => faces[(ori + k) % 3]);
    const piece = CORNER_FACES.findIndex((cf) => cf.every((f) => ordered.includes(f)));
    if (CORNER_FACES[piece].some((f, k) => f !== ordered[k])) {
      issues.push({
        code: 'MIRRORED_CORNER',
        title: 'Угол с зеркальным порядком цветов',
        message: `Угол с цветами ${colorList(colors)} существует, но его цвета идут в обратном порядке. Так не бывает на собранном с завода кубике: скорее всего, две клетки этого угла перепутаны или одна грань сфотографирована повёрнутой.`,
        suspect: [...stickers],
        faces: uniq(stickers.map(faceOfIndex)),
      });
      return;
    }
    cp[pos] = piece;
    co[pos] = ori;
  });

  const ep: number[] = [];
  const eo: number[] = [];
  EDGE_FACELETS.forEach((stickers, pos) => {
    const [a, b] = stickers.map(toFace);
    const colors = stickers.map((i) => facelets[i]);
    if (a === b || OPPOSITE[a] === b) {
      issues.push({
        code: 'INVALID_EDGE',
        title: 'Невозможное ребро',
        message: `У одного ребра цвета ${colorList(colors)}. ${a === b ? 'Два одинаковых цвета' : 'Противоположные цвета'} не могут быть на одной детали. Ошибка в одной из двух подсвеченных клеток.`,
        suspect: [...stickers],
        faces: uniq(stickers.map(faceOfIndex)),
      });
      return;
    }
    const piece = EDGE_FACES.findIndex(([x, y]) => (x === a && y === b) || (x === b && y === a));
    ep[pos] = piece;
    eo[pos] = EDGE_FACES[piece][0] === a ? 0 : 1;
  });

  if (issues.length > 0) return { issues };

  const dupCorners = cp.map((p, pos) => (cp.indexOf(p) !== cp.lastIndexOf(p) ? pos : -1)).filter((x) => x >= 0);
  if (dupCorners.length > 0) {
    const missing = CORNER_FACES.filter((_, j) => !cp.includes(j));
    const missingColors = missing.map((fs) => fs.map((f) => COLOR_NAME[facelets[FACE_OFFSET[f] + 4]]).join('-'));
    issues.push({
      code: 'DUPLICATE_CORNER',
      title: 'Два одинаковых угла',
      message: `Один и тот же угол найден дважды, а угла ${missingColors.join(', ')} нет совсем. Проверьте подсвеченные углы: в одном из них цвет распознан неверно.`,
      suspect: dupCorners.flatMap((pos) => [...CORNER_FACELETS[pos]]),
      faces: uniq(dupCorners.flatMap((pos) => CORNER_FACELETS[pos].map(faceOfIndex))),
    });
  }
  const dupEdges = ep.map((p, pos) => (ep.indexOf(p) !== ep.lastIndexOf(p) ? pos : -1)).filter((x) => x >= 0);
  if (dupEdges.length > 0) {
    const missing = EDGE_FACES.filter((_, j) => !ep.includes(j));
    const missingColors = missing.map((fs) => fs.map((f) => COLOR_NAME[facelets[FACE_OFFSET[f] + 4]]).join('-'));
    issues.push({
      code: 'DUPLICATE_EDGE',
      title: 'Два одинаковых ребра',
      message: `Одно и то же ребро найдено дважды, а ребра ${missingColors.join(', ')} нет совсем. Проверьте подсвеченные рёбра.`,
      suspect: dupEdges.flatMap((pos) => [...EDGE_FACELETS[pos]]),
      faces: uniq(dupEdges.flatMap((pos) => EDGE_FACELETS[pos].map(faceOfIndex))),
    });
  }
  if (issues.length > 0) return { issues };
  return { issues, cubies: { cp, co, ep, eo } };
}

function permutationParity(p: number[]): number {
  let parity = 0;
  const seen = new Array(p.length).fill(false);
  for (let i = 0; i < p.length; i++) {
    if (seen[i]) continue;
    let len = 0;
    for (let j = i; !seen[j]; j = p[j]) {
      seen[j] = true;
      len++;
    }
    parity ^= (len - 1) & 1;
  }
  return parity;
}

function checkInvariants(c: CubieState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allFaces = [...FACES];
  if (c.eo.reduce((a, b) => a + b, 0) % 2 !== 0) {
    issues.push({
      code: 'EDGE_FLIP',
      title: 'Одно ребро перевёрнуто',
      message:
        'Все детали на месте, но одно ребро перевёрнуто так, как невозможно получить поворотами граней. Чаще всего это значит, что у какого-то ребра два цвета записаны наоборот. Реже ребро действительно перевернули при разборке кубика.',
      suspect: [],
      faces: allFaces,
    });
  }
  if (c.co.reduce((a, b) => a + b, 0) % 3 !== 0) {
    issues.push({
      code: 'CORNER_TWIST',
      title: 'Один угол повёрнут на месте',
      message:
        'Все детали на месте, но один угол повёрнут так, как невозможно получить поворотами граней. Обычно это ошибка в цвете одной угловой клетки. Реже угол действительно выкручен на кубике.',
      suspect: [],
      faces: allFaces,
    });
  }
  if (permutationParity(c.cp) !== permutationParity(c.ep)) {
    issues.push({
      code: 'PERMUTATION_PARITY',
      title: 'Две детали поменялись местами',
      message:
        'Детали правильные, но расставлены так, как не бывает у кубика, который крутили только по граням: будто две детали поменяли местами. Проверьте, не перепутаны ли цвета у двух рёбер или двух углов.',
      suspect: [],
      faces: allFaces,
    });
  }
  return issues;
}

function validateComplete(state: PartialCubeState): { issues: ValidationIssue[]; structureOk: boolean } {
  const structure = checkStructure(state);
  if (structure.some((i) => i.code === 'MISSING_CELLS' || i.code === 'CENTERS_DUPLICATE')) {
    return { issues: structure, structureOk: false };
  }
  const facelets = FACES.flatMap((f) => state[f] as CubeColor[]);
  const pieces = checkPieces(facelets);
  const issues = [...structure, ...pieces.issues];
  if (issues.length === 0 && pieces.cubies) issues.push(...checkInvariants(pieces.cubies));
  return { issues, structureOk: structure.length === 0 };
}

export function validateCube(state: PartialCubeState): ValidationResult {
  const { issues, structureOk } = validateComplete(state);
  if (issues.length === 0) {
    return {
      ok: true,
      issues: [],
      rotationSuggestions: [],
      state: { faces: Object.fromEntries(FACES.map((f) => [f, state[f] as CubeColor[]])) as Record<FaceId, CubeColor[]> },
    };
  }
  const rotationSuggestions: FaceRotationSuggestion[] = [];
  if (structureOk) {
    for (const face of FACES) {
      for (const quarters of [1, 2, 3] as const) {
        const candidate = { ...state, [face]: rotateMatrix(state[face], quarters) };
        if (validateComplete(candidate).issues.length === 0) rotationSuggestions.push({ face, quarters });
      }
    }
  }
  const rotationFix = structureOk && rotationSuggestions.length === 0 ? findRotationFix(state) : undefined;
  return { ok: false, issues, rotationSuggestions, rotationFix };
}

/**
 * Faces shown to a camera are easy to hold sideways. Tries every combination
 * of face turns and returns the smallest one that makes the cube valid, but
 * only when it is the only one of that size, so the guess is safe.
 */
function findRotationFix(state: PartialCubeState): FaceRotationSuggestion[] | undefined {
  const found: FaceRotationSuggestion[][] = [];
  for (let code = 1; code < 4 ** 6; code++) {
    const turns: FaceRotationSuggestion[] = [];
    let c = code;
    for (const face of FACES) {
      const q = c % 4;
      c = Math.floor(c / 4);
      if (q) turns.push({ face, quarters: q as 1 | 2 | 3 });
    }
    const candidate = { ...state };
    for (const t of turns) candidate[t.face] = rotateMatrix(state[t.face], t.quarters);
    if (validateComplete(candidate).issues.length === 0) found.push(turns);
  }
  if (found.length === 0) return undefined;
  const fewest = Math.min(...found.map((f) => f.length));
  const best = found.filter((f) => f.length === fewest);
  return best.length === 1 ? best[0] : undefined;
}

export function toCubies(state: CubeState): CubieState {
  const pieces = checkPieces(FACES.flatMap((f) => state.faces[f]));
  if (!pieces.cubies) throw new Error('State has invalid pieces');
  return pieces.cubies;
}
