// px-idle.mjs — IDLE v4: base A + reforços de B (espada, botas, pernas).
// 8 direções × 6 frames, 264×264, grade 6×8. Rig: ./px-concepts.mjs
// Saída: assets/sprite/player/lutador/v4/lutador_idle_v4.png (+ previews)
// Uso: node scripts/spritegen/px-idle.mjs
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fb, blit, downscale, writePNG } from "./lib.mjs";
import { CELL } from "./px.mjs";
import { VP, DIR8, drawPx } from "./px-concepts.mjs";

// Fusão A+B: linguagem da A, presença da B (sem virar bloco pesado).
VP.AB = {
  ...VP.A,
  legW: 23,
  boot: [27, 20],
  swordW: 18,
  swordLen: 68,
};

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const COLS = 6;
const outDir = join(ROOT, "assets", "sprite", "player", "lutador", "v4");
const prevDir = join(ROOT, "assets", "spritegen", "preview-v4");
mkdirSync(outDir, { recursive: true });
mkdirSync(prevDir, { recursive: true });

const sheet = fb(COLS * CELL, DIR8.length * CELL);
DIR8.forEach((dir, r) => {
  for (let c = 0; c < COLS; c++) {
    const cell = fb(CELL, CELL);
    drawPx(cell, 0, 0, "AB", dir, c);
    blit(sheet, c * CELL, r * CELL, cell);
  }
});
writePNG(join(outDir, "lutador_idle_v4.png"), sheet);

const p8 = fb(CELL, DIR8.length * CELL);
DIR8.forEach((dir, r) => {
  const cell = fb(CELL, CELL);
  drawPx(cell, 0, 0, "AB", dir, 2);
  blit(p8, 0, r * CELL, cell);
});
writePNG(join(prevDir, "fighter-v4-8dir.png"), p8);
const rowS = fb(COLS * CELL, CELL);
for (let c = 0; c < COLS; c++) {
  const cell = fb(CELL, CELL);
  drawPx(cell, 0, 0, "AB", "S", c);
  blit(rowS, c * CELL, 0, cell);
}
writePNG(join(prevDir, "fighter-v4-row-S.png"), rowS);
writePNG(join(prevDir, "fighter-v4-row-S-2x.png"), downscale(rowS, 2));
console.log("OK v4 sheet", sheet.w + "x" + sheet.h);
