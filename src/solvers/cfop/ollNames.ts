/**
 * Names of the OLL shapes as the Kubik TV video on all 57 OLL formulas
 * calls them, translated to English (youtube.com/watch?v=hIVfbIvBUt8). Each entry keeps the formula
 * as it is described in the video; tests map it onto the sheet numbering, so
 * a name can never be attached to the wrong case silently.
 */
export interface OllName {
  group: string;
  name: string;
  /** The formula as shown in the video. */
  alg: string;
  /** Second in the video where the formula is shown. */
  at: number;
}

export const OLL_NAMES: OllName[] = [
  { group: 'T shapes', name: 'T with a dot', alg: "F R U R' U' F'", at: 90 },
  { group: 'T shapes', name: 'T through the front', alg: "R U R' U' R' F R F'", at: 105 },
  { group: 'Cross', name: 'fish', alg: "R U R' U R U2 R'", at: 124 },
  { group: 'Cross', name: 'anti-fish', alg: "R U2 R' U' R U' R'", at: 146 },
  { group: 'Cross', name: 'helicopter (eyes plus ears)', alg: "R U2 R' U' R U R' U' R U' R'", at: 173 },
  { group: 'Cross', name: 'eyes', alg: "R2 D R' U2 R D' R' U2 R'", at: 203 },
  { group: 'Cross', name: 'double eyes', alg: "R U2 R2 U' R2 U' R2 U2 R", at: 239 },
  { group: 'Cross', name: 'ears', alg: "r U R' U' r' F R F'", at: 263 },
  { group: 'Cross', name: 'figure eight', alg: "F' r U R' U' r' F R", at: 289 },
  { group: 'Corners oriented', name: 'letter H', alg: "R U R' U' M' U R U' r'", at: 319 },
  { group: 'Corners oriented', name: 'snake', alg: "r U R' U' r' R U R U' R'", at: 343 },
  { group: 'Corners oriented', name: 'snowflake', alg: "M U R U R' U' M2 U R U' r'", at: 373 },
  { group: 'Dots', name: 'dot in a corridor', alg: "R U2 R2 F R F' U2 R' F R F'", at: 409 },
  { group: 'Dots', name: 'dot with a block', alg: "F R U R' U' F' f R U R' U' f'", at: 440 },
  { group: 'Dots', name: 'arrow', alg: "f R U R' U' f' U F R U R' U' F'", at: 466 },
  { group: 'Dots', name: 'arrow, second', alg: "f R U R' U' f' U' F R U R' U' F'", at: 492 },
  { group: 'Dots', name: 'Mickey Mouse with a beard', alg: "R U2 R2 F R F' U2 M' U R U' r'", at: 518 },
  { group: 'Dots', name: 'Mickey Mouse with sideburns', alg: "M U R U R' U' M' R' F R F'", at: 561 },
  { group: 'Dots', name: 'diagonal', alg: "R U R' U R' F R F' U2 R' F R F'", at: 589 },
  { group: 'Lines', name: 'line', alg: "F U R U' R' U R U' R' F'", at: 619 },
  { group: 'Lines', name: 'line in a corridor', alg: "R U2 R2 U' R U' R' U2 F R F'", at: 638 },
  { group: 'Lines', name: 'line with double eyes', alg: "r U r' U R U' R' U R U' R' r U' r'", at: 669 },
  { group: 'Lines', name: 'line, eyes and ears', alg: "R' F' U' F U' R U R' U R", at: 705 },
  { group: 'L shapes', name: 'letter L', alg: "r U r' R U R' U' r U' r'", at: 738 },
  { group: 'L shapes', name: 'lid', alg: "r' U' r R' U' R U r' U r", at: 769 },
  { group: 'L shapes', name: 'L hook', alg: "F U R U' R2 F' R U R U' R'", at: 800 },
  { group: 'L shapes', name: 'L hook, second', alg: "R' F R U R' F' R F U' F'", at: 830 },
  { group: 'Brackets', name: 'bracket with a block', alg: "R' U' R' F R F' U R", at: 863 },
  { group: 'Brackets', name: 'bracket without blocks', alg: "F R U R' U' R' F' r U R U' r'", at: 889 },
  { group: 'Propellers', name: 'propeller', alg: "R' F R U R' U' F' U R", at: 920 },
  { group: 'Propellers', name: 'propeller, second', alg: "R U R' F' U' F U R U2 R'", at: 940 },
  { group: 'Squares', name: 'front square', alg: "r U2 R' U' R U' r'", at: 968 },
  { group: 'Squares', name: 'back square', alg: "r' U2 R U R' U r", at: 991 },
  { group: 'Ties', name: 'tie with blocks', alg: "F R U' R' U' R U R' F'", at: 1015 },
  { group: 'Ties', name: 'tie without blocks', alg: "R U2 R2 F R F' R U2 R'", at: 1045 },
  { group: 'M shapes', name: 'M with a block', alg: "R U R' U R U' R' U' R' F R F'", at: 1087 },
  { group: 'M shapes', name: 'M, block in front', alg: "L' U' L U' L' U L U L F' L' F", at: 1113 },
  { group: 'Y shapes', name: 'Y', alg: "R U R' U' R' F R2 U R' U' F'", at: 1145 },
  { group: 'Y shapes', name: 'Y, second', alg: "R U R' U R' F R F' R U2 R'", at: 1175 },
  { group: 'Lightning bolts', name: 'lightning with a block', alg: "r U R' U R U2 r'", at: 1203 },
  { group: 'Lightning bolts', name: 'lightning, block on the side', alg: "R U2 R' U2 R' F R F'", at: 1229 },
  { group: 'Lightning bolts', name: 'lightning without blocks', alg: "F R U R' U' F' U F R U R' U' F'", at: 1253 },
  { group: 'Lightning bolts', name: 'lightning through the front', alg: "r U R' U R' F R F' R U2 r'", at: 1283 },
  { group: 'P shapes', name: 'P', alg: "F U R U' R' F'", at: 1317 },
  { group: 'P shapes', name: 'P, second', alg: "R' U' F U R U' R' F' R", at: 1335 },
  { group: 'P shapes', name: 'P, third', alg: "R' U' F' U F R", at: 1357 },
  { group: 'P shapes', name: 'P, fourth', alg: "R U B' U' R' U R B R'", at: 1381 },
  { group: 'Roosters', name: 'rooster', alg: "R U R' U R U2 R' F R U R' U' F'", at: 1415 },
  { group: 'Roosters', name: 'rooster with a changed fish', alg: "R' U' R U' R' U2 R F R U R' U' F'", at: 1438 },
  { group: 'Roosters', name: 'rooster with a sexy move', alg: "R U R' U' R U' R' F' U' F R U R'", at: 1467 },
  { group: 'Roosters', name: 'rooster with a block', alg: "F R' F R2 U' R' U' R U R' F2", at: 1490 },
  { group: 'Stealth', name: 'stealth', alg: "F R U R' U' R U R' U' F'", at: 1531 },
  { group: 'Stealth', name: 'stealth with a P', alg: "F U R U' R' F' R U R' U R U2 R'", at: 1553 },
  { group: 'Stealth', name: 'stealth, three and two', alg: "r U' r2 U r2 U r2 U' r", at: 1577 },
  { group: 'Stealth', name: 'stealth, two and three', alg: "r' U r2 U' r2 U' r2 U r'", at: 1609 },
  { group: 'Stealth', name: 'stealth, three and one', alg: "r U R' U R U' R' U R U2 r'", at: 1649 },
  { group: 'Stealth', name: 'stealth, last', alg: "r' U' R U' R' U R U' R' U2 r", at: 1683 },
];
