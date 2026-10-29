# Make Solve

Show a Rubik's Cube to your camera (or upload six photos) and get a step-by-step solution on an interactive 3D cube. Two methods: a beginner layer-by-layer method and CFOP (Friedrich) with full one-look OLL and PLL.

**Live: [solve.makeworks.dev](https://solve.makeworks.dev)**

## What it does

- **Camera input.** The detector finds the cube face in the frame however small it is, fits a 3×3 grid and reads only those cells. It handles stickerless cubes, where same-colored pieces merge into bars and blocks, and faces shown sideways are turned back automatically. Frames are analysed in the browser and never leave it.
- **Photo input.** Upload one photo per face, drag the four corners onto the face, and every cell is sampled through a perspective transform. Every color can be corrected by hand.
- **Validation.** Before solving, the cube is checked for color counts, impossible pieces, mirrored corners, twisted corners, flipped edges and permutation parity, with plain-language explanations and the suspicious cells highlighted.
- **Beginner method.** White cross on top, flip, white corners with the sexy move (R U R' U'), middle layer, yellow cross, cross edges, corner placement and corner twisting.
- **CFOP.** Optimal cross on the bottom, F2L pairs inserted straight into their slots, then one-look OLL (57 cases) and PLL (21 cases). The case cards name every shape, show the top layer with arrows for PLL, and jump to any move.
- **Playback.** 3D animation of every move, forward and back, autoplay, an adjustable speed, and explanations either in words or in notation.
- **Formula reference.** Every OLL, PLL and beginner formula in one place.
- **Light and dark themes.**

## Built with

| Layer | Tools |
| --- | --- |
| App | React, TypeScript, Vite |
| 3D | Three.js |
| Tests | Vitest (66 tests: cube math, validation, both solvers, every OLL/PLL case, the detector on synthetic frames) |
| Hosting | Cloudflare Pages |

## How it works

**The math model is the source of truth.** The cube is 54 stickers; every move, slice, wide turn and cube rotation is generated from one geometry function shared by the math and the 3D view, so the two can never disagree. After each animation the 3D pieces snap back home and are repainted from the model, so floating-point drift never builds up.

**Solvers prove their own output.** Each phase checks its goal and the full solution is replayed on the scanned cube before it is shown. A wrong solution is never displayed.

**Last-layer tables are verified, not trusted.** Every OLL and PLL formula is run backwards from a solved cube to generate its case; tests check that all 57 and 21 cases are different, that no formula breaks the first two layers, and that every case is recognised under any turn of the top.

## Run locally

```bash
npm install
npm run dev
npm test
```
