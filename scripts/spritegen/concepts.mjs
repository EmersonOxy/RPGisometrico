// CONCEPTS — 3 propostas visuais do Lutador (A/B/C), 5 poses estáticas cada.
// S, SE, E, NE, N. Sem animação, sem integração no jogo.
// Infra: ./lib.mjs | Saída: assets/spritegen/concepts/
// Uso: node scripts/spritegen/concepts.mjs
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SKIN, HAIR, CLOTH, ARMOR, LEATH, STEEL,
  SKIN_D, HAIR_D, CLOTH_D, ARMOR_D, LEATH_D, STEEL_D,
  DARK, GRIP, fb, poly, ellipse, limb, thickLine, blit, downscale, writePNG,
} from "./lib.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CELL = 264, CX = 132, GY = 232;
// dirs exibidas: S SE E NE N (linhas 4,3,2,1,0 da convenção N..NW)
const DIRS = ["S", "SE", "E", "NE", "N"];
// fator de largura / deslocamento lateral / rosto por direção
const DF = {
  S:  { fw: 1.0, fx: 0, face: "front", prof: 0 },
  SE: { fw: 0.88, fx: 0.35, face: "front34", prof: 1 },
  E:  { fw: 0.6, fx: 1, face: "profile", prof: 1 },
  NE: { fw: 0.88, fx: 0.35, face: "back34", prof: 1 },
  N:  { fw: 1.0, fx: 0, face: "back", prof: 0 },
};
const V = (x, y) => [Math.round(x), Math.round(y)];

/* ================= VARIANTE A — evolução conservadora =================
   Mesma linguagem da v2, mas: cabeça 1.2x, tronco curto, membros +30%,
   ombreiras redondas grandes, espada larga. */
const A = {
  headY: 96, headW: 38, headH: 42, neckY: 116,
  shoY: 132, shoW: 88, hipY: 170, hipW: 46,
  armW: [17, 13], handR: 7.5, legW: [18, 14], bootH: 15, bootW: 19,
  sword: { half: 7, len: 60, guard: 24 },
  hair: "cap", helmBand: false, asym: false,
};
/* ================= VARIANTE B — low-poly robusta =================
   Compacta e larga: cabeça grande quadrada, peito barril, pernas curtas,
   ombreiras losango maciças, nasal de elmo, espada curta e massiva. */
const B = {
  headY: 92, headW: 44, headH: 40, neckY: 112,
  shoY: 130, shoW: 108, hipY: 166, hipW: 58,
  armW: [21, 16], handR: 8.5, legW: [23, 18], bootH: 17, bootW: 23,
  sword: { half: 9.5, len: 48, guard: 28 },
  hair: "crop", helmBand: true, asym: false,
};
/* ================= VARIANTE C — acabamento do cenário =================
   Formas orgânicas, assimetria sutil (1 ombreira + sacola + cabelo varrido),
   túnica longa com fenda, planos grandes de luz/sombra, espada longa. */
const C = {
  headY: 94, headW: 37, headH: 44, neckY: 115,
  shoY: 132, shoW: 78, hipY: 172, hipW: 44,
  armW: [15, 11], handR: 7.5, legW: [16, 12], bootH: 14, bootW: 18,
  sword: { half: 5.5, len: 68, guard: 22 },
  hair: "sweep", helmBand: false, asym: true,
};
const VARIANTS = { A, B, C };

function poseOf(P, dir) {
  const d = DF[dir];
  const shoHW = (P.shoW * d.fw) / 2, hipHW = (P.hipW * d.fw) / 2;
  const shift = d.fx * 10;
  const shoL = V(CX - shoHW + shift, P.shoY), shoR = V(CX + shoHW + shift, P.shoY);
  const hipL = V(CX - hipHW + shift * 0.5, P.hipY), hipR = V(CX + hipHW + shift * 0.5, P.hipY);
  const f = {
    s: shoR,
    e: V(shoR[0] + 5 + d.fx * 6, P.shoY + 30),
    h: V(shoR[0] + 7 + d.fx * 8, P.shoY + 48),
    hp: hipR, k: V(hipR[0] + 2, P.hipY + 30), ft: V(hipR[0] + 4, GY - 2),
  };
  const b = {
    s: shoL,
    e: V(shoL[0] - 4, P.shoY + 32),
    h: V(shoL[0] - 5, P.shoY + 50),
    hp: hipL, k: V(hipL[0] - 2, P.hipY + 30), ft: V(hipL[0] - 4, GY - 2),
  };
  const head = V(CX + shift + d.fx * 4, P.headY);
  // espada na mão da frente (S/SE/E) ou de trás (NE/N: mão oposta na tela)
  const hold = (dir === "N" || dir === "NE") ? b : f;
  const sv = { S: [0.5, 1], SE: [0.55, 1], E: [0.6, 0.9], NE: [0.45, 1], N: [0.4, 1] }[dir];
  const sl = Math.hypot(sv[0], sv[1]);
  const tip = V(hold.h[0] + (sv[0] / sl) * P.sword.len, hold.h[1] + (sv[1] / sl) * P.sword.len);
  return { d, P, head, shoL, shoR, hipL, hipR, f, b, hold, tip, behind: dir === "N" || dir === "NE" };
}

// ---------- peças ----------
function sword(f, ox, oy, p, behind) {
  const P = p.P, B = [p.hold.h[0] + ox, p.hold.h[1] + oy], T = [p.tip[0] + ox, p.tip[1] + oy];
  const dx = T[0] - B[0], dy = T[1] - B[1], len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len, hw = P.sword.half;
  const ST = behind ? STEEL_D : STEEL;
  const gx = B[0] + (dx / len) * 9, gy = B[1] + (dy / len) * 9;
  thickLine(f, B[0] - (dx / len) * 10, B[1] - (dy / len) * 10, gx, gy, 7, GRIP);
  poly(f, [[gx + nx * P.sword.guard / 2, gy + ny * P.sword.guard / 2],
    [gx - nx * P.sword.guard / 2, gy - ny * P.sword.guard / 2],
    [gx - nx * P.sword.guard / 2 + dx / len * 5, gy - ny * P.sword.guard / 2 + dy / len * 5],
    [gx + nx * P.sword.guard / 2 + dx / len * 5, gy + ny * P.sword.guard / 2 + dy / len * 5]],
    behind ? ARMOR_D.b : ARMOR.b);
  poly(f, [[gx + nx * hw, gy + ny * hw], [gx - nx * hw, gy - ny * hw],
    [T[0] - nx * 1.5, T[1] - ny * 1.5], [T[0] + nx * 2.2, T[1] + ny * 0.5]], ST.b);
  if (!behind) thickLine(f, gx, gy, T[0], T[1], 3, ST.l);
  ellipse(f, B[0] - (dx / len) * 12, B[1] - (dy / len) * 12, 4.5, 4.5, behind ? ARMOR_D.b : ARMOR.l);
}

function legMass(f, ox, oy, P, j, toe, back) {
  const CLO = back ? CLOTH_D : CLOTH, ARM = back ? ARMOR_D : ARMOR, LEA = back ? LEATH_D : LEATH;
  limb(f, j.hp[0] + ox, j.hp[1] + oy, j.k[0] + ox, j.k[1] + oy, P.legW[0], P.legW[1] - 2, CLO.b);
  if (!back) limb(f, j.hp[0] + ox - 3, j.hp[1] + oy, j.k[0] + ox - 3, j.k[1] + oy, P.legW[0] - 8, P.legW[1] - 8, CLO.l);
  const ax = j.k[0] + ox, ay = j.k[1] + oy;
  limb(f, ax, ay, j.ft[0] + ox, j.ft[1] + oy - 8, P.legW[1], P.legW[1] - 2, ARM.b);
  if (!back) limb(f, ax - 3, ay, j.ft[0] + ox - 3, j.ft[1] + oy - 8, 5, 4, ARM.l);
  const fx0 = j.ft[0] + ox, fy0 = j.ft[1] + oy, bw = P.bootW, bh = P.bootH;
  poly(f, [[fx0 - bw / 2, fy0 - bh], [fx0 + bw / 2, fy0 - bh], [fx0 + bw / 2 - 1, fy0], [fx0 - bw / 2, fy0]], LEA.b);
  poly(f, [[fx0 - bw / 2 + toe * 2, fy0 - 6], [fx0 + bw / 2 + toe * 2, fy0 - 6],
    [fx0 + bw / 2 + toe * 6, fy0 - 1], [fx0 - bw / 2, fy0 - 1]], LEA.s);
  if (!back) ellipse(f, fx0 + toe * 3, fy0 - bh + 3, 5, 2.5, LEA.l);
}

function armMass(f, ox, oy, P, j, sleeve, back) {
  const CLO = back ? CLOTH_D : CLOTH, SKN = back ? SKIN_D : SKIN, LEA = back ? LEATH_D : LEATH;
  limb(f, j.s[0] + ox, j.s[1] + oy, j.e[0] + ox, j.e[1] + oy, P.armW[0], P.armW[1], sleeve);
  limb(f, j.e[0] + ox, j.e[1] + oy, j.h[0] + ox, j.h[1] + oy, P.armW[1], P.armW[1] - 1, SKN.b);
  if (!back) thickLine(f, j.e[0] + ox - 3, j.e[1] + oy, j.h[0] + ox - 3, j.h[1] + oy, 2.5, SKN.l);
  poly(f, [[j.e[0] + ox - 6, j.e[1] + oy + 1], [j.e[0] + ox + 6, j.e[1] + oy + 1],
    [j.e[0] + ox + 7, j.e[1] + oy + 9], [j.e[0] + ox - 7, j.e[1] + oy + 9]], LEA.b);
  ellipse(f, j.h[0] + ox, j.h[1] + oy, P.handR, P.handR + 1, SKN.b);
  if (!back) ellipse(f, j.h[0] + ox - 1, j.h[1] + oy - 1, P.handR - 2.5, P.handR - 2, SKN.l);
}

function headMass(f, ox, oy, P, p, variant) {
  const hx = p.head[0] + ox, hy = p.head[1] + oy, hw = P.headW / 2, hh = P.headH / 2;
  const back = p.d.face === "back" || p.d.face === "back34";
  // cabelo como MASSA (silhueta), por variante
  if (P.hair === "crop") {
    poly(f, [[hx - hw - 2, hy - hh + 8], [hx + hw + 2, hy - hh + 8], [hx + hw - 2, hy - hh - 6],
      [hx - hw + 4, hy - hh - 10], [hx - hw - 2, hy - hh - 2]], HAIR.b);
    poly(f, [[hx - hw + 4, hy - hh - 10], [hx + hw - 2, hy - hh - 6], [hx + 2, hy - hh - 2], [hx - hw + 2, hy - hh - 4]], HAIR.l);
  } else if (P.hair === "sweep") {
    const s = variant === "C" ? 1 : 1;
    poly(f, [[hx - hw - 3, hy - hh + 6], [hx + hw + 3, hy - hh + 6], [hx + hw * s + 6, hy + 6],
      [hx + hw * s - 2, hy + 20], [hx - hw - 6, hy + 18], [hx - hw - 6, hy - 2]], HAIR.b);
    poly(f, [[hx - hw + 2, hy - hh - 8], [hx + hw - 6, hy - hh - 10], [hx + hw - 8, hy - 2], [hx - hw, hy - 4]], HAIR.l);
    poly(f, [[hx + hw * s - 2, hy + 2], [hx + hw * s + 6, hy + 6], [hx + hw * s - 2, hy + 20]], HAIR.s);
  } else {
    poly(f, [[hx - hw - 3, hy - hh + 10], [hx - hw + 2, hy - hh - 8], [hx - 4, hy - hh - 4],
      [hx + 2, hy - hh - 12], [hx + 8, hy - hh - 4], [hx + hw - 1, hy - hh - 9],
      [hx + hw + 3, hy - hh + 10], [hx + hw, hy + 4], [hx - hw, hy + 4]], HAIR.b);
    poly(f, [[hx - hw + 2, hy - hh - 8], [hx - 4, hy - hh - 4], [hx - 6, hy - hh + 4], [hx - hw - 1, hy - hh + 2]], HAIR.l);
  }
  if (!back) {
    // rosto: B quadrado largo / C afunilado / A arredondado
    if (variant === "B") {
      poly(f, [[hx - hw, hy - hh + 6], [hx + hw, hy - hh + 6], [hx + hw - 1, hy + hh - 4],
        [hx + hw - 6, hy + hh], [hx - hw + 6, hy + hh], [hx - hw + 1, hy + hh - 4]], SKIN.b);
      poly(f, [[hx + 2, hy - hh + 6], [hx + hw, hy - hh + 6], [hx + hw - 1, hy + hh - 4], [hx + 2, hy + hh]], SKIN.s);
      poly(f, [[hx - 2, hy - 2], [hx + 2, hy - 2], [hx + 2, hy + 14], [hx - 2, hy + 14]], ARMOR.b); // nasal
      poly(f, [[hx - hw + 7, hy - 1], [hx - hw + 12, hy - 1], [hx - hw + 12, hy + 3], [hx - hw + 7, hy + 3]], DARK);
      poly(f, [[hx + hw - 12, hy - 1], [hx + hw - 7, hy - 1], [hx + hw - 7, hy + 3], [hx + hw - 12, hy + 3]], DARK);
    } else if (variant === "C") {
      poly(f, [[hx - hw, hy - hh + 6], [hx + hw, hy - hh + 6], [hx + hw - 2, hy],
        [hx + 5, hy + hh], [hx - 5, hy + hh], [hx - hw + 2, hy]], SKIN.b);
      poly(f, [[hx + 3, hy - hh + 6], [hx + hw, hy - hh + 6], [hx + hw - 2, hy], [hx + 3, hy + hh - 2]], SKIN.s);
      poly(f, [[hx - hw + 6, hy - 2], [hx - hw + 11, hy - 2], [hx - hw + 11, hy + 2], [hx - hw + 6, hy + 2]], DARK);
      if (p.d.face !== "profile")
        poly(f, [[hx + hw - 11, hy - 2], [hx + hw - 6, hy - 2], [hx + hw - 6, hy + 2], [hx + hw - 11, hy + 2]], DARK);
      else poly(f, [[hx + hw - 2, hy + 1], [hx + hw + 5, hy + 5], [hx + hw - 2, hy + 8]], SKIN.b);
    } else {
      ellipse(f, hx, hy + 1, hw, hh, SKIN.b);
      poly(f, [[hx + 2, hy - hh], [hx + hw, hy - hh], [hx + hw - 2, hy + hh], [hx + 2, hy + hh]], SKIN.s);
      ellipse(f, hx - 5, hy - 5, hw - 9, hh - 12, SKIN.l);
      poly(f, [[hx - 9, hy - 2], [hx - 4, hy - 2], [hx - 4, hy + 2], [hx - 9, hy + 2]], DARK);
      poly(f, [[hx + 4, hy - 2], [hx + 9, hy - 2], [hx + 9, hy + 2], [hx + 4, hy + 2]], DARK);
      thickLine(f, hx - 3, hy + hh - 6, hx + 3, hy + hh - 6, 1.6, [150, 110, 88]);
    }
  } else {
    // costas: massa de cabelo fecha a nuca (B curto, C longo assimétrico)
    if (P.hair === "sweep") poly(f, [[hx - hw - 4, hy], [hx + hw + 8, hy], [hx + hw + 2, hy + 26], [hx - hw, hy + 24]], HAIR.s);
    else if (P.hair === "crop") poly(f, [[hx - hw, hy - 4], [hx + hw, hy - 4], [hx + hw - 2, hy + 12], [hx - hw + 2, hy + 12]], HAIR.s);
    else poly(f, [[hx - hw - 2, hy - 2], [hx + hw + 2, hy - 2], [hx + hw - 2, hy + 20], [hx - hw + 2, hy + 20]], HAIR.s);
  }
}

function torsoMass(f, ox, oy, P, p, variant) {
  const scx = (p.shoL[0] + p.shoR[0]) / 2 + ox, scy = P.shoY + oy;
  const hcx = (p.hipL[0] + p.hipR[0]) / 2 + ox, hcy = P.hipY + oy;
  const wTop = Math.abs(p.shoR[0] - p.shoL[0]) / 2 + 6;
  // pescoço absorvido
  poly(f, [[scx - 8, P.neckY + oy - 4], [scx + 8, P.neckY + oy - 4], [scx + 10, scy + 2], [scx - 10, scy + 2]],
    variant === "B" ? ARMOR_D.b : CLOTH.s);
  if (variant === "A") {
    // peitoral curvo + fauldos + saia de tiras
    ellipse(f, scx, scy + 16, wTop, 22, ARMOR.b);
    poly(f, [[scx + 2, scy - 4], [scx + wTop - 2, scy - 2], [scx + wTop - 8, hcy - 8], [scx + 2, hcy - 8]], ARMOR.s);
    ellipse(f, scx - wTop / 2, scy + 10, wTop / 2 - 2, 14, ARMOR.l);
    poly(f, [[hcx - 17, hcy - 8], [hcx + 17, hcy - 8], [hcx + 19, hcy + 1], [hcx - 19, hcy + 1]], ARMOR.s);
    for (let i = -1; i <= 1; i++)
      poly(f, [[hcx + i * 11 - 6, hcy + 1], [hcx + i * 11 + 6, hcy + 1],
        [hcx + i * 12 + 7, hcy + 24], [hcx + i * 12 - 7, hcy + 24]], i === 0 ? CLOTH.b : CLOTH.s);
    poly(f, [[hcx - 19, hcy - 1], [hcx + 19, hcy - 1], [hcx + 19, hcy + 5], [hcx - 19, hcy + 5]], LEATH.s);
    poly(f, [[hcx - 5, hcy], [hcx + 5, hcy], [hcx + 5, hcy + 4], [hcx - 5, hcy + 4]], ARMOR.b);
    // ombreiras redondas grandes
    for (const sx of [p.shoL[0] + ox, p.shoR[0] + ox]) {
      ellipse(f, sx, scy - 2, 15, 12, ARMOR.b);
      ellipse(f, sx - 3, scy - 5, 9, 6, ARMOR.l);
    }
  } else if (variant === "B") {
    // peito barril: trapézio largo + placa única + avental
    poly(f, [[scx - wTop - 4, scy - 4], [scx + wTop + 4, scy - 4], [hcx + 26, hcy], [hcx - 26, hcy]], ARMOR.b);
    poly(f, [[scx + 2, scy - 4], [scx + wTop + 4, scy - 4], [hcx + 26, hcy], [hcx + 2, hcy]], ARMOR.s);
    poly(f, [[scx - wTop + 2, scy], [scx - 4, scy], [hcx - 10, hcy - 6], [hcx - 22, hcy - 6]], ARMOR.l);
    poly(f, [[hcx - 22, hcy], [hcx + 22, hcy], [hcx + 24, hcy + 26], [hcx - 24, hcy + 26]], LEATH.b);
    poly(f, [[hcx - 22, hcy], [hcx - 2, hcy], [hcx - 3, hcy + 26], [hcx - 24, hcy + 26]], LEATH.l);
    poly(f, [[hcx - 24, hcy + 2], [hcx + 24, hcy + 2], [hcx + 24, hcy + 8], [hcx - 24, hcy + 8]], LEATH.s);
    poly(f, [[hcx - 6, hcy + 3], [hcx + 6, hcy + 3], [hcx + 6, hcy + 7], [hcx - 6, hcy + 7]], STEEL.b);
    // ombreiras losango maciças
    for (const sx of [p.shoL[0] + ox, p.shoR[0] + ox]) {
      poly(f, [[sx, scy - 18], [sx + 17, scy - 2], [sx, scy + 10], [sx - 17, scy - 2]], ARMOR.b);
      poly(f, [[sx, scy - 18], [sx + 17, scy - 2], [sx + 2, scy - 2], [sx, scy - 14]], ARMOR.l);
      poly(f, [[sx, scy - 2], [sx + 17, scy - 2], [sx, scy + 10]], ARMOR.s);
    }
  } else {
    // túnica longa assimétrica + 1 ombreira + sacola
    const long = 30; // lado longo
    poly(f, [[scx - wTop, scy], [scx + wTop, scy], [hcx + 15, hcy + 2], [hcx - 15, hcy + 2]], CLOTH.b);
    poly(f, [[scx + 2, scy], [scx + wTop, scy], [hcx + 15, hcy + 2], [hcx + 4, hcy + 2]], CLOTH.s);
    poly(f, [[scx - wTop + 2, scy + 2], [scx - wTop + 10, scy + 2], [hcx - 10, hcy], [hcx - 14, hcy]], CLOTH.l);
    poly(f, [[scx - 12, scy + 4], [scx + 12, scy + 4], [scx + 14, hcy - 4], [scx - 14, hcy - 4]], ARMOR.s);
    poly(f, [[scx - 12, scy + 4], [scx - 1, scy + 4], [scx - 1, hcy - 4], [scx - 14, hcy - 4]], ARMOR.b);
    poly(f, [[hcx - 15, hcy - 2], [hcx + 15, hcy - 2], [hcx + 17, hcy + 6], [hcx - 17, hcy + 6]], LEATH.s);
    poly(f, [[hcx - 16, hcy + 6], [hcx - 2, hcy + 6], [hcx - 4, hcy + long], [hcx - 20, hcy + long]], CLOTH.s);
    poly(f, [[hcx - 2, hcy + 6], [hcx + 14, hcy + 6], [hcx + 12, hcy + 22], [hcx - 4, hcy + 22]], CLOTH.b);
    thickLine(f, hcx - 3, hcy + 8, hcx - 5, hcy + long - 2, 2, CLOTH.s); // fenda
    ellipse(f, hcx + 20, hcy + 2, 7, 8, LEATH.b); // sacola lateral
    ellipse(f, hcx + 20, hcy, 4, 4, LEATH.l);
    const px0 = p.shoR[0] + ox; // ombreira só no lado da espada
    poly(f, [[px0 - 13, scy - 8], [px0 + 13, scy - 8], [px0 + 9, scy + 6], [px0 - 9, scy + 6]], ARMOR.b);
    poly(f, [[px0 - 13, scy - 8], [px0 - 1, scy - 8], [px0 - 3, scy - 1], [px0 - 11, scy - 1]], ARMOR.l);
    ellipse(f, p.shoL[0] + ox, scy - 1, 9, 7, CLOTH.l); // ombro sem armadura
  }
}

function drawVariant(f, ox, oy, variant, dir) {
  const P = VARIANTS[variant], p = poseOf(P, dir);
  const toe = p.d.prof !== 0 ? p.d.prof : 1;
  if (p.behind) sword(f, ox, oy, p, true);
  legMass(f, ox, oy, P, p.b, p.d.prof !== 0 ? p.d.prof : -1, true);
  armMass(f, ox, oy, P, p.b, CLOTH_D.b, true);
  torsoMass(f, ox, oy, P, p, variant);
  headMass(f, ox, oy, P, p, variant);
  legMass(f, ox, oy, P, p.f, toe, false);
  armMass(f, ox, oy, P, p.f, CLOTH.b, false);
  if (!p.behind) sword(f, ox, oy, p, false);
  // mão sobre o cabo
  const SKN = SKIN;
  ellipse(f, p.hold.h[0] + ox, p.hold.h[1] + oy, P.handR, P.handR + 1, p.behind ? SKIN_D.b : SKN.b);
}

// ---------- main ----------
const outDir = join(ROOT, "assets", "spritegen", "concepts");
mkdirSync(outDir, { recursive: true });
const cells = {};
for (const v of Object.keys(VARIANTS)) {
  const strip = fb(CELL * DIRS.length, CELL);
  cells[v] = [];
  DIRS.forEach((dir, i) => {
    const cell = fb(CELL, CELL);
    drawVariant(cell, 0, 0, v, dir);
    cells[v].push(cell);
    blit(strip, i * CELL, 0, cell);
  });
  writePNG(join(outDir, `variant-${v.toLowerCase()}.png`), strip);
}
// comparativo 3×5
const compare = fb(CELL * DIRS.length, CELL * 3);
Object.keys(VARIANTS).forEach((v, r) => {
  cells[v].forEach((cell, i) => blit(compare, i * CELL, r * CELL, cell));
});
writePNG(join(outDir, "compare-abc.png"), compare);
// escala gameplay (~78px de altura do personagem)
const game = downscale(compare, 78 / CELL / 0.63);
writePNG(join(outDir, "gameplay-scale.png"), game);
console.log("OK concepts ->", outDir);
