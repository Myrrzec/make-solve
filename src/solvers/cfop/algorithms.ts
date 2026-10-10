/**
 * Last layer algorithms for CFOP, yellow on top. This is the two-look set
 * that people learn first: OLL as edges then corners, PLL as corners then
 * edges. Full one-look OLL (57) and PLL (21) can extend these tables later.
 */
export const OLL_EDGES = {
  line: "F R U R' U' F'",
  angle: "Fw R U R' U' Fw'",
} as const;

export const OLL_CORNERS = {
  sune: "R U R' U R U2 R'",
  antisune: "R U2 R' U' R U' R'",
  h: "R U R' U R U' R' U R U2 R'",
  pi: "R U2 R2 U' R2 U' R2 U2 R",
  headlights: "R2 D R' U2 R D' R' U2 R'",
  t: "Rw U R' U' Rw' F R F'",
  bowtie: "F' Rw U R' U' Rw' F R",
} as const;

export const PLL_CORNERS = {
  aa: "R' F R' B2 R F' R' B2 R2",
  ab: "R2 B2 R F R' B2 R F' R",
  y: "F R U' R' U' R U R' F' R U R' U' R' F R F'",
} as const;

export const PLL_EDGES = {
  ua: "R U' R U R U R U' R' U' R2",
  ub: "R2 U R U R' U' R' U' R' U R'",
  h: "M2 U M2 U2 M2 U M2",
  z: "M' U M2 U M2 U M' U2 M2",
} as const;
