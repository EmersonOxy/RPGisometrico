// px.mjs — base raster pixel-like para concepts do Lutador.
// Grade: tudo snap em múltiplos de Q=3px na célula 264 (lógico 88×88).
// Sem curvas suaves, sem AA: só blocos e polígonos chanfrados.
// Luz dominante de NW: claro em cima/esquerda, sombra embaixo/direita.
// Infra de framebuffer/PNG: ./lib.mjs
import { fb, poly, writePNG } from "./lib.mjs";

export const CELL = 264, CX = 132, GY = 231, Q = 3;
export const q = (v) => Math.round(v / Q) * Q;

// Rampas disciplinadas por material (luz NW consistente).
export const SKIN = { l: [232, 201, 163], b: [211, 168, 126], s: [168, 127, 86] };
export const HAIR = { b: [90, 74, 62], s: [66, 53, 44], d: [46, 36, 29] };
export const CLOTH = { l: [186, 120, 92], b: [158, 92, 70], s: [122, 66, 48] };
export const STEEL = { w: [232, 238, 240], l: [203, 211, 215], b: [148, 156, 162], s: [104, 112, 119] };
export const LEATH = { l: [150, 116, 84], b: [122, 92, 64], s: [88, 64, 44] };
export const BLADE = { w: [238, 243, 245], l: [199, 208, 213], b: [147, 156, 163], s: [100, 109, 117] };
export const DARK = [52, 42, 36];
export const GRIP = [96, 74, 54];

// Retângulo em grade (cantos opcionalmente chanfrados em passos de Q).
export function block(f, x, y, w, h, c) {
  poly(f, [[q(x), q(y)], [q(x + w), q(y)], [q(x + w), q(y + h)], [q(x), q(y + h)]], c);
}
export function chamfer(f, x, y, w, h, cut, c) {
  const c0 = q(cut);
  poly(f, [
    [q(x) + c0, q(y)], [q(x + w) - c0, q(y)],
    [q(x + w), q(y) + c0], [q(x + w), q(y + h) - c0],
    [q(x + w) - c0, q(y + h)], [q(x) + c0, q(y + h)],
    [q(x), q(y + h) - c0], [q(x), q(y) + c0],
  ], c);
}
// Polígono livre com snap (massas chanfradas, sem curvas).
export function mass(f, pts, c) {
  poly(f, pts.map(([x, y]) => [q(x), q(y)]), c);
}
export function newCell() { return fb(CELL, CELL); }
export function saveCell(path, cell) { writePNG(path, cell); }
