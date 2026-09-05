// b-rig.mjs — VARIANTE B promovida a base oficial do Lutador (IDLE v3).
// Corpo compacto e robusto, 8 direções (N,NE,E,SE,S,SW,W,NW), respiração sutil.
// Congelado de concepts.mjs (variante B) + extensões: SW/W/NW, frames 0..5,
// rosto levemente suavizado (mandíbula chanfrada, olhos menores).
// Infra: ./lib.mjs
import {
  SKIN, HAIR, CLOTH, ARMOR, LEATH, STEEL,
  SKIN_D, HAIR_D, CLOTH_D, ARMOR_D, LEATH_D, STEEL_D,
  DARK, GRIP, poly, ellipse, limb, thickLine,
} from "./lib.mjs";

export const CELL = 264, CX = 132, GY = 232;
const V = (x, y) => [Math.round(x), Math.round(y)];

const P = {
  headY: 92, headW: 44, headH: 40, neckY: 112,
  shoY: 130, shoW: 108, hipY: 166, hipW: 58,
  armW: [21, 16], handR: 8.5, legW: [23, 18], bootH: 17, bootW: 23,
  sword: { half: 9.5, len: 48, guard: 28 },
};
const DF = {
  N:  { fw: 1.0, fx: 0, face: "back", prof: 0 },
  NE: { fw: 0.88, fx: 0.35, face: "back34", prof: 1 },
  E:  { fw: 0.6, fx: 1, face: "profile", prof: 1 },
  SE: { fw: 0.88, fx: 0.35, face: "front34", prof: 1 },
  S:  { fw: 1.0, fx: 0, face: "front", prof: 0 },
  SW: { fw: 0.88, fx: -0.35, face: "front34", prof: -1 },
  W:  { fw: 0.6, fx: -1, face: "profile", prof: -1 },
  NW: { fw: 0.88, fx: -0.35, face: "back34", prof: -1 },
};
const SV = {
  N: [0.4, 1], NE: [0.45, 1], E: [0.6, 0.9], SE: [0.55, 1],
  S: [0.5, 1], SW: [-0.55, 1], W: [-0.6, 0.9], NW: [-0.45, 1],
};
export const DIR8 = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
export const breathe = (t) => Math.sin((t / 6) * Math.PI * 2);

export function poseB(dir, frame = 2) {
  const d = DF[dir], b = breathe(frame);
  const lift = Math.round(b * 2), torso = Math.round(b * 1.5);
  const shoHW = (P.shoW * d.fw) / 2, hipHW = (P.hipW * d.fw) / 2;
  const shift = d.fx * 10;
  const L = (p, dy) => V(p[0], p[1] + dy);
  const shoR0 = V(CX + shoHW + shift, P.shoY), shoL0 = V(CX - shoHW + shift, P.shoY);
  const hipR0 = V(CX + hipHW + shift * 0.5, P.hipY), hipL0 = V(CX - hipHW + shift * 0.5, P.hipY);
  const f0 = {
    s: shoR0, e: V(shoR0[0] + 5 + d.fx * 6, P.shoY + 30),
    h: V(shoR0[0] + 7 + d.fx * 8, P.shoY + 48),
    hp: hipR0, k: V(hipR0[0] + 2, P.hipY + 30), ft: V(hipR0[0] + 4, GY - 2),
  };
  const b0 = {
    s: shoL0, e: V(shoL0[0] - 4, P.shoY + 32),
    h: V(shoL0[0] - 5, P.shoY + 50),
    hp: hipL0, k: V(hipL0[0] - 2, P.hipY + 30), ft: V(hipL0[0] - 4, GY - 2),
  };
  const f = { s: L(f0.s, torso), e: L(f0.e, torso), h: L(f0.h, torso + lift), hp: f0.hp, k: f0.k, ft: f0.ft };
  const bk = { s: L(b0.s, torso), e: L(b0.e, torso), h: L(b0.h, torso), hp: b0.hp, k: b0.k, ft: b0.ft };
  const behind = dir === "N" || dir === "NE" || dir === "NW";
  const hold = behind ? bk : f;
  const sv = SV[dir], sl = Math.hypot(sv[0], sv[1]);
  const tip = V(hold.h[0] + (sv[0] / sl) * P.sword.len, hold.h[1] + (sv[1] / sl) * P.sword.len + lift);
  return {
    d, dir, frame, behind, hold, f, b: bk,
    head: V(CX + shift + d.fx * 4, P.headY + lift),
    shoL: L(shoL0, torso), shoR: L(shoR0, torso),
    tip, base: V(hold.h[0], hold.h[1]),
  };
}

function swordB(f, ox, oy, p) {
  const B = [p.base[0] + ox, p.base[1] + oy], T = [p.tip[0] + ox, p.tip[1] + oy];
  const dx = T[0] - B[0], dy = T[1] - B[1], len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len, hw = P.sword.half;
  const ST = p.behind ? STEEL_D : STEEL;
  const gx = B[0] + (dx / len) * 9, gy = B[1] + (dy / len) * 9;
  thickLine(f, B[0] - (dx / len) * 10, B[1] - (dy / len) * 10, gx, gy, 7, GRIP);
  poly(f, [[gx + nx * P.sword.guard / 2, gy + ny * P.sword.guard / 2],
    [gx - nx * P.sword.guard / 2, gy - ny * P.sword.guard / 2],
    [gx - nx * P.sword.guard / 2 + dx / len * 5, gy - ny * P.sword.guard / 2 + dy / len * 5],
    [gx + nx * P.sword.guard / 2 + dx / len * 5, gy + ny * P.sword.guard / 2 + dy / len * 5]],
    p.behind ? ARMOR_D.b : ARMOR.b);
  poly(f, [[gx + nx * hw, gy + ny * hw], [gx - nx * hw, gy - ny * hw],
    [T[0] - nx * 1.5, T[1] - ny * 1.5], [T[0] + nx * 2.2, T[1] + ny * 0.5]], ST.b);
  if (!p.behind) thickLine(f, gx, gy, T[0], T[1], 3, ST.l);
  ellipse(f, B[0] - (dx / len) * 12, B[1] - (dy / len) * 12, 4.5, 4.5, p.behind ? ARMOR_D.b : ARMOR.l);
}

function legB(f, ox, oy, j, toe, back) {
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

function armB(f, ox, oy, j, sleeve, back) {
  const CLO = back ? CLOTH_D : CLOTH, SKN = back ? SKIN_D : SKIN, LEA = back ? LEATH_D : LEATH;
  limb(f, j.s[0] + ox, j.s[1] + oy, j.e[0] + ox, j.e[1] + oy, P.armW[0], P.armW[1], sleeve);
  limb(f, j.e[0] + ox, j.e[1] + oy, j.h[0] + ox, j.h[1] + oy, P.armW[1], P.armW[1] - 1, SKN.b);
  if (!back) thickLine(f, j.e[0] + ox - 3, j.e[1] + oy, j.h[0] + ox - 3, j.h[1] + oy, 2.5, SKN.l);
  poly(f, [[j.e[0] + ox - 6, j.e[1] + oy + 1], [j.e[0] + ox + 6, j.e[1] + oy + 1],
    [j.e[0] + ox + 7, j.e[1] + oy + 9], [j.e[0] + ox - 7, j.e[1] + oy + 9]], LEA.b);
  ellipse(f, j.h[0] + ox, j.h[1] + oy, P.handR, P.handR + 1, SKN.b);
  if (!back) ellipse(f, j.h[0] + ox - 1, j.h[1] + oy - 1, P.handR - 2.5, P.handR - 2, SKN.l);
}

function headB(f, ox, oy, p) {
  const hx = p.head[0] + ox, hy = p.head[1] + oy, hw = P.headW / 2, hh = P.headH / 2;
  const back = p.d.face === "back" || p.d.face === "back34";
  // cabelo cropped: topo + nuca curta (massa, não tampa)
  poly(f, [[hx - hw - 2, hy - hh + 8], [hx + hw + 2, hy - hh + 8], [hx + hw - 2, hy - hh - 6],
    [hx - hw + 4, hy - hh - 10], [hx - hw - 2, hy - hh - 2]], HAIR.b);
  poly(f, [[hx - hw + 4, hy - hh - 10], [hx + hw - 2, hy - hh - 6], [hx + 2, hy - hh - 2], [hx - hw + 2, hy - hh - 4]], HAIR.l);
  if (!back) {
    // mandíbula chanfrada (suavizada, sem perder robustez)
    poly(f, [[hx - hw, hy - hh + 6], [hx + hw, hy - hh + 6], [hx + hw - 2, hy + hh - 6],
      [hx + hw - 7, hy + hh - 1], [hx - hw + 7, hy + hh - 1], [hx - hw + 2, hy + hh - 6]], SKIN.b);
    poly(f, [[hx + 2, hy - hh + 6], [hx + hw, hy - hh + 6], [hx + hw - 2, hy + hh - 6], [hx + 2, hy + hh - 1]], SKIN.s);
    poly(f, [[hx - 2, hy - 2], [hx + 2, hy - 2], [hx + 2, hy + 14], [hx - 2, hy + 14]], ARMOR.b); // nasal
    poly(f, [[hx - hw + 7, hy - 1], [hx - hw + 11.5, hy - 1], [hx - hw + 11.5, hy + 2.5], [hx - hw + 7, hy + 2.5]], DARK);
    poly(f, [[hx + hw - 11.5, hy - 1], [hx + hw - 7, hy - 1], [hx + hw - 7, hy + 2.5], [hx + hw - 11.5, hy + 2.5]], DARK);
  } else {
    poly(f, [[hx - hw, hy - 4], [hx + hw, hy - 4], [hx + hw - 2, hy + 12], [hx - hw + 2, hy + 12]], HAIR.s);
  }
}

function torsoB(f, ox, oy, p) {
  const scx = (p.shoL[0] + p.shoR[0]) / 2 + ox, scy = P.shoY + oy;
  const hcx = (p.f.hp[0] + p.b.hp[0]) / 2 + ox, hcy = P.hipY + oy;
  const wTop = Math.abs(p.shoR[0] - p.shoL[0]) / 2 + 6;
  poly(f, [[scx - 8, P.neckY + oy - 4], [scx + 8, P.neckY + oy - 4], [scx + 10, scy + 2], [scx - 10, scy + 2]], ARMOR_D.b);
  // peito barril: trapézio largo + placa única + avental
  poly(f, [[scx - wTop - 4, scy - 4], [scx + wTop + 4, scy - 4], [hcx + 26, hcy], [hcx - 26, hcy]], ARMOR.b);
  poly(f, [[scx + 2, scy - 4], [scx + wTop + 4, scy - 4], [hcx + 26, hcy], [hcx + 2, hcy]], ARMOR.s);
  poly(f, [[scx - wTop + 2, scy], [scx - 4, scy], [hcx - 10, hcy - 6], [hcx - 22, hcy - 6]], ARMOR.l);
  poly(f, [[hcx - 22, hcy], [hcx + 22, hcy], [hcx + 24, hcy + 26], [hcx - 24, hcy + 26]], LEATH.b);
  poly(f, [[hcx - 22, hcy], [hcx - 2, hcy], [hcx - 3, hcy + 26], [hcx - 24, hcy + 26]], LEATH.l);
  poly(f, [[hcx - 24, hcy + 2], [hcx + 24, hcy + 2], [hcx + 24, hcy + 8], [hcx - 24, hcy + 8]], LEATH.s);
  poly(f, [[hcx - 6, hcy + 3], [hcx + 6, hcy + 3], [hcx + 6, hcy + 7], [hcx - 6, hcy + 7]], STEEL.b);
  for (const sx of [p.shoL[0] + ox, p.shoR[0] + ox]) {
    poly(f, [[sx, scy - 18], [sx + 17, scy - 2], [sx, scy + 10], [sx - 17, scy - 2]], ARMOR.b);
    poly(f, [[sx, scy - 18], [sx + 17, scy - 2], [sx + 2, scy - 2], [sx, scy - 14]], ARMOR.l);
    poly(f, [[sx, scy - 2], [sx + 17, scy - 2], [sx, scy + 10]], ARMOR.s);
  }
}

export function drawB(f, ox, oy, dir, frame = 2) {
  const p = poseB(dir, frame);
  const toe = p.d.prof !== 0 ? p.d.prof : 1;
  if (p.behind) swordB(f, ox, oy, p);
  legB(f, ox, oy, p.b, p.d.prof !== 0 ? p.d.prof : -1, true);
  armB(f, ox, oy, p.b, CLOTH_D.b, true);
  torsoB(f, ox, oy, p);
  headB(f, ox, oy, p);
  legB(f, ox, oy, p.f, toe, false);
  armB(f, ox, oy, p.f, CLOTH.b, false);
  if (!p.behind) swordB(f, ox, oy, p);
  ellipse(f, p.hold.h[0] + ox, p.hold.h[1] + oy, P.handR, P.handR + 1, p.behind ? SKIN_D.b : SKIN.b);
}
