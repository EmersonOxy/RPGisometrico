// px-concepts.mjs — 3 variantes raster/pixel-like do Lutador (A/B/C × S/SE/E/NE/N).
// Grade Q=3, blocos chanfrados, rampas por material, luz NW. Sem curvas suaves.
// Base: ./px.mjs | Infra: ./lib.mjs | Saída: assets/spritegen/pixel-concepts/
// Uso: node scripts/spritegen/px-concepts.mjs
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fb, blit, downscale, writePNG } from "./lib.mjs";
import {
  CELL, CX, GY, q, SKIN, HAIR, CLOTH, STEEL, LEATH, BLADE, DARK, GRIP,
  block, chamfer, mass, newCell,
} from "./px.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V = (x, y) => [q(x), q(y)];

export const VP = {
  A: { head: [39, 36], shoW: 90, shoY: 132, hipY: 168, armW: 18, legW: 21, boot: [24, 18], swordW: 15, swordLen: 70, pauldron: "round", skirt: "straps", hair: "full" },
  B: { head: [45, 39], shoW: 108, shoY: 130, hipY: 166, armW: 24, legW: 27, boot: [30, 21], swordW: 19, swordLen: 64, pauldron: "block", skirt: "apron", hair: "crop" },
  C: { head: [39, 42], shoW: 78, shoY: 132, hipY: 170, armW: 16, legW: 19, boot: [22, 16], swordW: 14, swordLen: 76, pauldron: "single", skirt: "long", hair: "fringe" },
};
export const DF = {
  S: { fw: 1.0, fx: 0, face: "front", prof: 0 },
  SE: { fw: 0.86, fx: 0.4, face: "front34", prof: 1 },
  E: { fw: 0.58, fx: 1, face: "profile", prof: 1 },
  NE: { fw: 0.86, fx: 0.4, face: "back34", prof: 1 },
  N: { fw: 1.0, fx: 0, face: "back", prof: 0 },
  SW: { fw: 0.86, fx: -0.4, face: "front34", prof: -1 },
  W: { fw: 0.58, fx: -1, face: "profile", prof: -1 },
  NW: { fw: 0.86, fx: -0.4, face: "back34", prof: -1 },
};
export const DIRS = ["S", "SE", "E", "NE", "N"];
export const DIR8 = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const SV = {
  S: [0.5, 1], SE: [0.55, 1], E: [0.62, 0.88], NE: [0.45, 1], N: [0.4, 1],
  SW: [-0.55, 1], W: [-0.62, 0.88], NW: [-0.45, 1],
};
export const breathe = (t) => Math.round(Math.sin((t / 6) * Math.PI * 2));

export function rig(variant, dir, frame = null) {
  const P = VP[variant], d = DF[dir];
  const br = frame === null ? 0 : breathe(frame); // -1..1 (passos de Q)
  const L = (p, k) => V(p[0], p[1] + br * 3 * k);
  const shoHW = (P.shoW * d.fw) / 2, hipHW = 24 * d.fw;
  const sh = d.fx * 12;
  const shoR = L(V(CX + shoHW + sh, P.shoY), 1), shoL = L(V(CX - shoHW + sh, P.shoY), 1);
  const hipR = V(CX + hipHW + sh * 0.5, P.hipY), hipL = V(CX - hipHW + sh * 0.5, P.hipY);
  const mk = (s, e, hp, k, ft) => ({ s, e, h: e, hp, k, ft });
  const F = mk(shoR, L(V(shoR[0] + 6 + d.fx * 9, P.shoY + 42), 1), hipR, V(hipR[0] + 2, P.hipY + 32), V(hipR[0] + 4, GY - 3));
  F.h = L(V(F.e[0] + 3, F.e[1] + 18), 1);
  const B = mk(shoL, L(V(shoL[0] - 6, P.shoY + 44), 1), hipL, V(hipL[0] - 2, P.hipY + 32), V(hipL[0] - 4, GY - 3));
  B.h = L(V(B.e[0] - 3, B.e[1] + 18), 1);
  const head = L(V(CX + sh + d.fx * 6, P.shoY - 27 - P.head[1] / 2 + 6), 1);
  const behind = dir === "N" || dir === "NE" || dir === "NW";
  const hold = behind ? B : F;
  const sv = SV[dir], sl = Math.hypot(sv[0], sv[1]);
  const tip = V(hold.h[0] + (sv[0] / sl) * P.swordLen, hold.h[1] + (sv[1] / sl) * P.swordLen);
  return { P, d, dir, head, shoL, shoR, hipL, hipR, F, B, hold, tip, behind };
}

// ---------- peças ----------
function swordPx(f, ox, oy, r) {
  const P = r.P;
  const B = [r.hold.h[0] + ox, r.hold.h[1] + oy], T = [r.tip[0] + ox, r.tip[1] + oy];
  const dx = T[0] - B[0], dy = T[1] - B[1], len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len, hw = P.swordW / 2;
  const BL = r.behind ? { w: BLADE.b, l: BLADE.b, b: BLADE.s, s: BLADE.s } : BLADE;
  const gx = B[0] + (dx / len) * 12, gy = B[1] + (dy / len) * 12;
  block(f, B[0] - (dx / len) * 12 - 5, B[1] - (dy / len) * 12 - 5, 10, 22, GRIP);
  mass(f, [[gx + nx * (hw + 7), gy + ny * (hw + 7)], [gx - nx * (hw + 7), gy - ny * (hw + 7)],
    [gx - nx * (hw + 5) + dx / len * 6, gy - ny * (hw + 5) + dy / len * 6],
    [gx + nx * (hw + 5) + dx / len * 6, gy + ny * (hw + 5) + dy / len * 6]], r.behind ? STEEL.s : STEEL.b);
  mass(f, [[gx + nx * hw, gy + ny * hw], [gx - nx * hw, gy - ny * hw],
    [T[0] - nx * 2, T[1] - ny * 2], [T[0] + nx * 3, T[1] + ny * 1]], BL.b);
  if (!r.behind) mass(f, [[gx + nx * hw * 0.5, gy + ny * hw * 0.5], [gx - nx * 1, gy - ny * 1],
    [T[0] - nx * 1, T[1] - ny * 1], [T[0] + nx * 2, T[1]]], BL.l);
  block(f, B[0] - (dx / len) * 15 - 5, B[1] - (dy / len) * 15 - 5, 10, 10, r.behind ? STEEL.s : STEEL.l);
}

function legPx(f, ox, oy, r, j, toe, back) {
  const P = r.P, lw = P.legW;
  const CLO = back ? { l: CLOTH.s, b: CLOTH.s, s: CLOTH.s } : CLOTH;
  const ARM = back ? { l: STEEL.s, b: STEEL.s, s: STEEL.s } : { l: LEATH.l, b: LEATH.b, s: LEATH.s };
  block(f, j.hp[0] + ox - lw / 2, j.hp[1] + oy - 6, lw, 40, CLO.b);
  if (!back) block(f, j.hp[0] + ox - lw / 2, j.hp[1] + oy - 6, 6, 40, CLO.l);
  block(f, j.k[0] + ox - (lw - 4) / 2, j.k[1] + oy - 8, lw - 4, 30, back ? STEEL.s : LEATH.b);
  if (!back) block(f, j.k[0] + ox - (lw - 4) / 2, j.k[1] + oy - 8, 6, 30, LEATH.l);
  const [bw, bh] = P.boot;
  const fx0 = j.ft[0] + ox, fy0 = j.ft[1] + oy;
  chamfer(f, fx0 - bw / 2, fy0 - bh, bw, bh, 6, back ? LEATH.s : LEATH.b);
  block(f, fx0 - bw / 2 + toe * 3, fy0 - 9, bw - 6 + toe * 6, 9, back ? LEATH.s : LEATH.s);
  if (!back) block(f, fx0 - bw / 2, fy0 - bh, bw, 6, LEATH.l);
}

function armPx(f, ox, oy, r, j, sleeve, back) {
  const P = r.P, aw = P.armW;
  block(f, j.s[0] + ox - aw / 2, j.s[1] + oy - 4, aw, 34, sleeve);
  if (!back) block(f, j.s[0] + ox - aw / 2, j.s[1] + oy - 4, 6, 34, CLOTH.l);
  block(f, j.e[0] + ox - (aw - 6) / 2, j.e[1] + oy - 4, aw - 6, 24, back ? SKIN.s : SKIN.b);
  if (!back) block(f, j.e[0] + ox - (aw - 6) / 2, j.e[1] + oy - 4, 5, 24, SKIN.l);
  block(f, j.e[0] + ox - (aw - 2) / 2, j.e[1] + oy + 8, aw - 2, 9, back ? LEATH.s : LEATH.b);
  chamfer(f, j.h[0] + ox - 8, j.h[1] + oy - 6, 16, 15, 3, back ? SKIN.s : SKIN.b);
}

function torsoPx(f, ox, oy, r) {
  const P = r.P;
  const scx = (r.shoL[0] + r.shoR[0]) / 2 + ox, scy = P.shoY + oy;
  const hcx = (r.hipL[0] + r.hipR[0]) / 2 + ox, hcy = P.hipY + oy;
  const wTop = Math.abs(r.shoR[0] - r.shoL[0]) / 2 + 6;
  block(f, scx - 9, scy - 16, 18, 14, CLOTH.s); // pescoço absorvido
  if (P.skirt === "straps") {
    mass(f, [[scx - wTop, scy], [scx + wTop, scy], [hcx + 20, hcy - 4], [hcx - 20, hcy - 4]], STEEL.b);
    mass(f, [[scx - wTop, scy], [scx - 4, scy], [hcx - 8, hcy - 4], [hcx - 20, hcy - 4]], STEEL.l);
    mass(f, [[scx + 4, scy], [scx + wTop, scy], [hcx + 20, hcy - 4], [hcx + 8, hcy - 4]], STEEL.s);
    block(f, scx - 3, scy + 2, 6, hcy - scy - 8, STEEL.w);
    for (let i = -1; i <= 1; i++)
      block(f, hcx + i * 14 - 7, hcy - 4, 14, 26, i === 0 ? CLOTH.b : CLOTH.s);
    block(f, hcx - 22, hcy - 4, 44, 8, LEATH.s);
    block(f, hcx - 7, hcy - 4, 14, 8, STEEL.l);
  } else if (P.skirt === "apron") {
    mass(f, [[scx - wTop - 6, scy - 2], [scx + wTop + 6, scy - 2], [hcx + 28, hcy + 2], [hcx - 28, hcy + 2]], STEEL.b);
    mass(f, [[scx - wTop - 6, scy - 2], [scx - 6, scy - 2], [hcx - 12, hcy + 2], [hcx - 28, hcy + 2]], STEEL.l);
    mass(f, [[scx + 6, scy - 2], [scx + wTop + 6, scy - 2], [hcx + 28, hcy + 2], [hcx + 12, hcy + 2]], STEEL.s);
    block(f, scx - 4, scy, 8, hcy - scy, STEEL.w);
    mass(f, [[hcx - 24, hcy + 2], [hcx + 24, hcy + 2], [hcx + 26, hcy + 30], [hcx - 26, hcy + 30]], LEATH.b);
    block(f, hcx - 24, hcy + 2, 10, 28, LEATH.l);
    block(f, hcx - 26, hcy + 8, 52, 7, LEATH.s);
    block(f, hcx - 8, hcy + 8, 16, 7, STEEL.l);
  } else {
    mass(f, [[scx - wTop, scy], [scx + wTop, scy], [hcx + 16, hcy + 4], [hcx - 16, hcy + 4]], CLOTH.b);
    mass(f, [[scx - wTop, scy], [scx - 6, scy], [hcx - 8, hcy + 4], [hcx - 16, hcy + 4]], CLOTH.l);
    mass(f, [[scx + 6, scy], [scx + wTop, scy], [hcx + 16, hcy + 4], [hcx + 8, hcy + 4]], CLOTH.s);
    mass(f, [[scx - 15, scy + 4], [scx + 15, scy + 4], [scx + 17, hcy - 6], [scx - 17, hcy - 6]], STEEL.s);
    mass(f, [[scx - 15, scy + 4], [scx - 2, scy + 4], [scx - 3, hcy - 6], [scx - 17, hcy - 6]], STEEL.b);
    block(f, hcx - 18, hcy - 2, 36, 8, LEATH.s);
    mass(f, [[hcx - 17, hcy + 6], [hcx - 3, hcy + 6], [hcx - 5, hcy + 34], [hcx - 21, hcy + 34]], CLOTH.s);
    mass(f, [[hcx - 3, hcy + 6], [hcx + 15, hcy + 6], [hcx + 13, hcy + 26], [hcx - 5, hcy + 26]], CLOTH.b);
    block(f, hcx - 17, hcy + 6, 6, 28, CLOTH.l);
  }
  // ombreiras
  const stations = P.pauldron === "single" ? [r.shoR[0] + ox] : [r.shoL[0] + ox, r.shoR[0] + ox];
  for (const sx of stations) {
    if (P.pauldron === "round") {
      block(f, sx - 15, scy - 12, 30, 12, STEEL.b);
      block(f, sx - 15, scy - 12, 30, 6, STEEL.l);
      mass(f, [[sx - 15, scy], [sx + 15, scy], [sx + 11, scy + 12], [sx - 11, scy + 12]], STEEL.s);
    } else if (P.pauldron === "block") {
      mass(f, [[sx - 3, scy - 18], [sx + 15, scy - 13], [sx + 12, scy + 8], [sx - 6, scy + 8]], STEEL.b);
      mass(f, [[sx - 3, scy - 18], [sx + 7, scy - 16], [sx + 5, scy - 4], [sx - 3, scy - 6]], STEEL.l);
      mass(f, [[sx + 2, scy - 4], [sx + 15, scy - 13], [sx + 12, scy + 8], [sx + 2, scy + 8]], STEEL.s);
    } else {
      block(f, sx - 13, scy - 10, 26, 10, STEEL.b);
      block(f, sx - 13, scy - 10, 26, 5, STEEL.l);
    }
  }
  if (P.pauldron === "single") block(f, r.shoL[0] + ox - 10, scy - 6, 20, 14, CLOTH.l);
}

function headPx(f, ox, oy, r) {
  const P = r.P, [hw0, hh0] = P.head;
  const hx = r.head[0] + ox, hy = r.head[1] + oy;
  const back = r.d.face === "back" || r.d.face === "back34";
  const hw = hw0 / 2, hh = hh0 / 2;
  if (P.hair === "full") {
    block(f, hx - hw - 3, hy - hh - 9, hw * 2 + 6, 16, HAIR.b);
    block(f, hx - hw - 3, hy - hh - 9, 9, 30, HAIR.s);
    block(f, hx - hw - 3, hy - hh + 7, 9, 22, HAIR.b);
    block(f, hx + hw - 6, hy - hh + 7, 9, 22, HAIR.s);
  } else if (P.hair === "crop") {
    block(f, hx - hw - 1, hy - hh - 7, hw * 2 + 2, 12, HAIR.b);
    block(f, hx - hw - 1, hy - hh - 7, 10, 12, HAIR.s);
  } else {
    block(f, hx - hw - 2, hy - hh - 8, hw * 2 - 4, 13, HAIR.b);
    mass(f, [[hx + 3, hy - hh - 8], [hx + hw + 4, hy - hh - 2], [hx + hw + 8, hy + 10], [hx + hw - 2, hy + 12]], HAIR.b);
    block(f, hx - hw - 2, hy - hh - 8, 8, 13, HAIR.s);
    block(f, hx - hw - 2, hy - hh + 5, 8, 20, HAIR.s);
  }
  if (!back) {
    chamfer(f, hx - hw, hy - hh + 4, hw * 2, hh * 2 - 2, 6, SKIN.b);
    block(f, hx - hw, hy - hh + 4, 8, hh * 2 - 8, SKIN.l);
    block(f, hx + hw - 8, hy - hh + 8, 8, hh * 2 - 10, SKIN.s);
    const ex = r.d.face === "front34" ? r.d.prof * 4 : 0;
    if (r.d.face === "profile") {
      block(f, hx + r.d.prof * 6 - 3, hy - 3, 7, 10, DARK);
      mass(f, [[hx + r.d.prof * (hw - 2), hy + 1], [hx + r.d.prof * (hw + 6), hy + 5], [hx + r.d.prof * (hw - 2), hy + 9]], SKIN.b);
    } else {
      block(f, hx - 11 + ex, hy - 2, 7, 10, DARK);
      block(f, hx + 4 + ex, hy - 2, 7, 10, DARK);
    }
  } else {
    block(f, hx - hw, hy - hh + 6, hw * 2, hh + 8, P.hair === "fringe" ? HAIR.b : HAIR.s);
  }
}

export function drawPx(f, ox, oy, variant, dir, frame = null) {
  const r = rig(variant, dir, frame);
  const toe = r.d.prof !== 0 ? r.d.prof : 1;
  if (r.behind) swordPx(f, ox, oy, r);
  legPx(f, ox, oy, r, r.B, r.d.prof !== 0 ? r.d.prof : -1, true);
  armPx(f, ox, oy, r, r.B, CLOTH.s, true);
  torsoPx(f, ox, oy, r);
  headPx(f, ox, oy, r);
  legPx(f, ox, oy, r, r.F, toe, false);
  armPx(f, ox, oy, r, r.F, CLOTH.b, false);
  if (!r.behind) swordPx(f, ox, oy, r);
  chamfer(f, r.hold.h[0] + ox - 8, r.hold.h[1] + oy - 6, 16, 15, 3, r.behind ? SKIN.s : SKIN.b);
}

// ---------- main (só ao executar este arquivo; importável por px-idle.mjs) ----------
if ((process.argv[1] || "").endsWith("px-concepts.mjs")) {
  const outDir = join(ROOT, "assets", "spritegen", "pixel-concepts");
  mkdirSync(outDir, { recursive: true });
  const cells = {};
  for (const v of ["A", "B", "C"]) {
    const strip = fb(CELL * DIRS.length, CELL);
    cells[v] = [];
    DIRS.forEach((dir, i) => {
      const cell = newCell();
      drawPx(cell, 0, 0, v, dir);
      cells[v].push(cell);
      blit(strip, i * CELL, 0, cell);
    });
    writePNG(join(outDir, `px-${v.toLowerCase()}.png`), strip);
  }
  const compare = fb(CELL * DIRS.length, CELL * 3);
  ["A", "B", "C"].forEach((v, ri) => {
    cells[v].forEach((cell, i) => blit(compare, i * CELL, ri * CELL, cell));
  });
  writePNG(join(outDir, "px-compare.png"), compare);
  writePNG(join(outDir, "px-gameplay.png"), downscale(compare, 78 / CELL / 0.63));
  console.log("OK px-concepts ->", outDir);
}
