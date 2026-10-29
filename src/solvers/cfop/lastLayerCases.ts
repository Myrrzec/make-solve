/**
 * One-look last layer tables, numbered as on dedfoma.ru (yellow on top).
 * `alts` are the other algorithms printed for the same case; the first one
 * that is valid is used. Every entry is checked by tests: it must keep the
 * first two layers, and all cases must be different from each other.
 */

export interface LastLayerCase {
  n: number;
  alg: string;
  alts?: string[];
}

export interface PllCase extends LastLayerCase {
  /** Group name used on the sheet. */
  group: string;
  /** International letter name. */
  letter: string;
}

export const OLL_CASES: LastLayerCase[] = [
  { n: 1, alg: "R2' D R' U2 R D' R' U2 R'" },
  { n: 2, alg: "l' U' L U R U' r' F" },
  { n: 3, alg: "l' U' L' U R U' L U x'" },
  { n: 4, alg: "R U R' U R U2' R'" },
  { n: 5, alg: "L' U' L U' L' U2 L" },
  { n: 6, alg: "R U2 R2' U' R2 U' R2' U2' R" },
  { n: 7, alg: "F R U R' U' R U R' U' R U R' U' F'" },
  { n: 8, alg: "x L U' L U2 R' U R U2 L' r'" },
  { n: 9, alg: "R L' U R' U' R' r U R U' x'", alts: ["R U R' U' r R' U R U' r'"] },
  { n: 10, alg: "S R' U' R U R U R U' R' S'" },
  { n: 11, alg: "R U B' l U l' R' U' R' F R F'" },
  { n: 12, alg: "F R U R' U' S R U R' U' f'", alts: ["F R U R' U' F' f R U R' U' f'"] },
  { n: 13, alg: "f R U R' U' f' U' F R U R' U' F'" },
  { n: 14, alg: "f R U R' U' f' U F R U R' U' F'" },
  { n: 15, alg: "R' U2 F R U R' U' y' R2' U2 R B", alts: ["r' R U R U R' U' r R2' F R F'"] },
  { n: 16, alg: "B L U L' U B' U2 B' R B R'", alts: ["r U R' U R U2' r2' U' R U' R' U2 r"] },
  { n: 17, alg: "R U R' U R' F R F' U2 R' F R F'" },
  { n: 18, alg: "R U R' U' R' F R F'" },
  { n: 19, alg: "F R U R' U' F'" },
  { n: 20, alg: "R B' R' U' R U y R U' F'" },
  { n: 21, alg: "L' B L U L' U' y' L' U F" },
  { n: 22, alg: "R U R2' U' R' F R U R U' F'" },
  { n: 23, alg: "B' R' U' R y R U' R' U2 R" },
  { n: 24, alg: "f R U R' U' R U R' U' f'" },
  { n: 25, alg: "R U R' U R d' R U' R' F'" },
  { n: 26, alg: "F R U R' U' x R U' L U R' U' r'" },
  { n: 27, alg: "R' U2 R2 U R' U R U2 y l' U' l" },
  { n: 28, alg: "x' R U' R' F' R U R' x y R' U R" },
  { n: 29, alg: "x' L' U L F L' U' L x y' L U' L'" },
  { n: 30, alg: "r U r' R U R' U' r U' r'" },
  { n: 31, alg: "l' U' l L' U' L U l' U l" },
  { n: 32, alg: "f R U R' U' f'" },
  { n: 33, alg: "f' L' U' L U f" },
  { n: 34, alg: "R d L' d' R' U l U l'" },
  { n: 35, alg: "L' d' R d L U' r' U' r" },
  { n: 36, alg: "R U R' U R U' R' U' R' F R F'" },
  { n: 37, alg: "L' U' L U' L' U L U L F' L' F" },
  { n: 38, alg: "r U R' U R U' R' U R U2' r'" },
  { n: 39, alg: "l' U' L U' L' U L U' L' U2 l" },
  { n: 40, alg: "r' U r2 U' r2' U' r2 U r'" },
  { n: 41, alg: "l U' l2' U l2 U l2' U' l" },
  { n: 42, alg: "F R U R' U' R U R' U' F'" },
  { n: 43, alg: "F' L' U' L U L' U' L U F" },
  { n: 44, alg: "r U2 R' U' R U' r'" },
  { n: 45, alg: "l' U2' L U L' U l" },
  { n: 46, alg: "l U L' U L U2' l'" },
  { n: 47, alg: "r' U' R U' R' U2 r" },
  { n: 48, alg: "F R U R' U' F' U F R U R' U' F'" },
  { n: 49, alg: "F' L' U' L U F U' F' L' U' L U F" },
  { n: 50, alg: "F R U' R' U' R U R' F'" },
  { n: 51, alg: "L U2 L2 B L B' L U2 L'" },
  { n: 52, alg: "L U L' y x' L' U L F' L' U' L x" },
  { n: 53, alg: "R' U' R y' x' R U' R' F R U R' x" },
  { n: 54, alg: "R U' R' U2 R U y R U' R' U' F'" },
  { n: 55, alg: "L' U L U2' L' U' y' L' U L U F" },
  { n: 56, alg: "R2' U R' B' R U' R2' U l U l'" },
  { n: 57, alg: "L2 U' L B L' U L2 U' r' U' r" },
];

export const PLL_CASES: PllCase[] = [
  { n: 1, group: 'edges only', letter: 'Ua', alg: "R2 U R U R' U' R' U' R' U R'" },
  { n: 2, group: 'edges only', letter: 'Ub', alg: "R U' R U R U R U' R' U' R2" },
  {
    n: 3,
    group: 'edges only',
    letter: 'Z',
    alg: "M2' U M2' U M' U2 M2' U2 M' U2",
    alts: ["U R' U' R U' R U R U' R' U R U R2 U' R' U", "R B' R' B F R' B' F' R B R F2 U"],
  },
  { n: 4, group: 'edges only', letter: 'H', alg: "M2' U M2' U2 M2' U M2'", alts: ["R2 L2 D R2 L2 U2 R2 L2 D R2 L2"] },
  { n: 5, group: 'corners only', letter: 'Aa', alg: "l' U R' D2 R U' R' D2 R2" },
  { n: 6, group: 'corners only', letter: 'Ab', alg: "r U' L D2 L' U L D2 L2" },
  { n: 7, group: 'corners only', letter: 'E', alg: "x' R U' R' D R U R' u2' R' U R D R' U' R" },
  { n: 8, group: 'J perms', letter: 'J', alg: "R U2 R' U' R U2 L' U R' U' L" },
  { n: 9, group: 'J perms', letter: 'J', alg: "L' U2 L U L' U2 R U' L U R'" },
  {
    n: 10,
    group: 'R perms',
    letter: 'R',
    alg: "R' U2' R U' x U' L U R' U' L' U x' U' R U'",
    alts: ["F L U L' F L U' F U F U' F' L' F2", "R' U2 R U2 R' F R U R' U' R' F' R2 U'"],
  },
  {
    n: 11,
    group: 'R perms',
    letter: 'R',
    alg: "L U2 L' U x U R' U' L U R U' x' U L' U",
    alts: ["F' R' U' R F' R' U F' U' F' U F R F2", "L U2' L' U2' L F' L' U' L U L F L2' U"],
  },
  { n: 12, group: 'T perm', letter: 'T', alg: "R U R' U' R' F R2 U' R' U' R U R' F'" },
  { n: 13, group: 'F perm', letter: 'F', alg: "R' U R U' R2 F' U' F U R F R' F' R2 U'" },
  { n: 14, group: 'V perm', letter: 'V', alg: "L' U R U' L U L' U R' U' L U2 R U2 R'" },
  { n: 15, group: 'G perms', letter: 'G', alg: "R2' u' R U' R U R' u R2 y R U' R'" },
  { n: 16, group: 'G perms', letter: 'G', alg: "R2' u R' U R' U' R u' R2' y' R' U R" },
  { n: 17, group: 'G perms', letter: 'G', alg: "R' U' R y R2' u R' U R U' R u' R2'" },
  { n: 18, group: 'G perms', letter: 'G', alg: "R U R' y' R2' u' R U' R' U R' u R2" },
  { n: 19, group: 'N perms', letter: 'N', alg: "L U' R U2 L' U R' L U' R U2 L' U R' U'" },
  { n: 20, group: 'N perms', letter: 'N', alg: "R' U L' U2 R U' L R' U L' U2 R U' L U", alts: ["z U' R D' R2' U R' D U' R D' R2' U R' D R"] },
  { n: 21, group: 'Y perm', letter: 'Y', alg: "F R U' R' U' R U R' F' R U R' U' R' F R F'" },
];
