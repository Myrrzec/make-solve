/**
 * Algorithms of the beginner method, as taught in the reference video
 * (Alex Ti, «Самый лёгкий способ»). Kept as data so the set is easy to review.
 */
export const ALG = {
  /** «Пиф-паф». */
  sexy: "R U R' U'",
  /** Inserts the front-top edge into the front-right slot. */
  middleRight: "U R U' R' U' F' U F",
  /** Inserts the front-top edge into the front-left slot. */
  middleLeft: "U' L' U L U F U' F'",
  /** Front face to the right, one пиф-паф, front face back. */
  yellowCross: "F R U R' U' F'",
  /** Matching cross edges held at the back and on the right. */
  yellowEdges: "R U R' U R U2 R' U",
  /** A corner already in place held at the front left. */
  placeCorners: "R U' L' U R' U' L U",
} as const;
