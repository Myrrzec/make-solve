import { rotateMatrix } from './faceMatrix';
import { FACE_OFFSET } from './geometry';
import { COLOR_NAME, FACE_NAME } from './names';
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
      title: 'Some cells are empty',
      message: `${missing.length} ${missing.length === 1 ? 'cell is' : 'cells are'} missing a color. Faces to fill in: ${faces.map((f) => FACE_NAME[f]).join(', ')}.`,
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
      title: 'Duplicate centers',
      message: `The ${dupCenters.map((f) => FACE_NAME[f]).join(', ')} faces have centers of the same color. A real cube has six different centers. Most likely one face was captured twice or a center was read wrong.`,
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
      (c) => `${counts.get(c)} ${COLOR_NAME[c]}`,
    );
    const suspect = FACES.flatMap((f) =>
      state[f].map((c, i) => (over.includes(c as CubeColor) && i !== 4 ? FACE_OFFSET[f] + i : -1)).filter((i) => i >= 0),
    );
    const hint =
      over.length === 1 && under.length === 1
        ? ` Looks like one ${COLOR_NAME[under[0]]} cell was read as ${COLOR_NAME[over[0]]}.`
        : '';
    issues.push({
      code: 'COLOR_COUNT',
      title: 'Each color needs exactly 9 cells',
      message: `Right now: ${parts.join(', ')}.${hint} Cells of the extra color are highlighted; one of them is probably wrong.`,
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
        title: 'Impossible corner',
        message: `A corner has the colors ${colorList(colors)}. ${distinct ? 'Opposite colors never meet on one piece.' : 'One piece cannot have the same color twice.'} One of the three highlighted cells is wrong.`,
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
        title: 'Corner with mirrored colors',
        message: `The ${colorList(colors)} corner exists, but its colors go in reverse order. That never happens on a factory cube: most likely two cells of this corner are swapped, or a face was captured rotated.`,
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
        title: 'Impossible edge',
        message: `An edge has the colors ${colorList(colors)}. ${a === b ? 'The same color twice' : 'Opposite colors'} cannot be on one piece. One of the two highlighted cells is wrong.`,
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
      title: 'Two identical corners',
      message: `The same corner appears twice, and the ${missingColors.join(', ')} corner is missing. Check the highlighted corners: one of them has a wrong color.`,
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
      title: 'Two identical edges',
      message: `The same edge appears twice, and the ${missingColors.join(', ')} edge is missing. Check the highlighted edges.`,
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
      title: 'One edge is flipped',
      message:
        'All pieces are there, but one edge is flipped in a way face turns can never produce. Usually the two colors of some edge are entered the wrong way round. Less often the edge really was flipped when the cube was taken apart.',
      suspect: [],
      faces: allFaces,
    });
  }
  if (c.co.reduce((a, b) => a + b, 0) % 3 !== 0) {
    issues.push({
      code: 'CORNER_TWIST',
      title: 'One corner is twisted',
      message:
        'All pieces are there, but one corner is twisted in a way face turns can never produce. Usually one corner cell has a wrong color. Less often the corner really was twisted on the cube.',
      suspect: [],
      faces: allFaces,
    });
  }
  if (permutationParity(c.cp) !== permutationParity(c.ep)) {
    issues.push({
      code: 'PERMUTATION_PARITY',
      title: 'Two pieces are swapped',
      message:
        'The pieces are valid, but arranged in a way a cube turned only by its faces can never be, as if two pieces were swapped. Check whether the colors of two edges or two corners got mixed up.',
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
