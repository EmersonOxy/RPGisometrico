// IDLE v3 — Lutador base VARIANTE B. 8 direções × 6 frames, 264×264, 6×8.
// Rig/desenho: ./b-rig.mjs | Infra: ./lib.mjs
// Saída: assets/sprite/player/lutador/v3/lutador_idle_v3.png (+ previews)
// Uso: node scripts/spritegen/fighter-idle-b.mjs
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fb, blit, downscale, writePNG } from "./lib.mjs";
import { CELL, DIR8, drawB } from "./b-rig.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const COLS = 6;
const outDir = join(ROOT, "assets", "sprite", "player", "lutador", "v3");
const prevDir = join(ROOT, "assets", "spritegen", "preview-v3");
mkdirSync(outDir, { recursive: true });
mkdirSync(prevDir, { recursive: true });

const sheet = fb(COLS * CELL, DIR8.length * CELL);
DIR8.forEach((dir, r) => {
  for (let c = 0; c < COLS; c++) {
    const cell = fb(CELL, CELL);
    drawB(cell, 0, 0, dir, c);
    blit(sheet, c * CELL, r * CELL, cell);
  }
});
writePNG(join(outDir, "lutador_idle_v3.png"), sheet);

const p8 = fb(CELL, DIR8.length * CELL);
DIR8.forEach((dir, r) => {
  const cell = fb(CELL, CELL);
  drawB(cell, 0, 0, dir, 2);
  blit(p8, 0, r * CELL, cell);
});
writePNG(join(prevDir, "fighter-v3-8dir.png"), p8);
const rowS = fb(COLS * CELL, CELL);
for (let c = 0; c < COLS; c++) {
  const cell = fb(CELL, CELL);
  drawB(cell, 0, 0, "S", c);
  blit(rowS, c * CELL, 0, cell);
}
writePNG(join(prevDir, "fighter-v3-row-S.png"), rowS);
writePNG(join(prevDir, "fighter-v3-row-S-2x.png"), downscale(rowS, 2));
console.log("OK v3 sheet", sheet.w + "x" + sheet.h);
