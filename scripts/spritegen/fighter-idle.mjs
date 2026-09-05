// Lutador v2 — IDLE 8 direções × 6 frames, célula 264×264, fundo transparente.
// Infra (rasterizador, paleta, PNG): ./lib.mjs (compartilhada com concepts.mjs).
// Espec: src/rendering/spritegen/*.ts | Padrão: pés ancorados em GY, sem sombra/anel/barra.
// Uso: node scripts/spritegen/fighter-idle.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SKIN, HAIR, CLOTH, ARMOR, LEATH, STEEL,
  SKIN_D, HAIR_D, CLOTH_D, ARMOR_D, LEATH_D, STEEL_D,
  DARK, GRIP,
  fb, poly, ellipse, limb, thickLine, blit, encodePNG,
} from "./lib.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CELL = 264, COLS = 6, ROWS = 8, CX = 132, GY = 232;

// ---------- rig (== src/rendering/spritegen/rig.ts) ----------
const V = (x, y) => [Math.round(x), Math.round(y)];
const breathe = (t) => Math.sin((t / 6) * Math.PI * 2);
const keyS = () => ({
  head: V(CX, 93), neck: V(CX, 116), shoC: V(CX, 126), hipC: V(CX, 170),
  f: { s: V(160, 128), e: V(167, 156), h: V(169, 174), hp: V(146, 172), k: V(148, 200), ft: V(150, 230) },
  b: { s: V(104, 128), e: V(97, 158), h: V(95, 176), hp: V(118, 172), k: V(116, 200), ft: V(114, 230) },
  face: "front", prof: 0, tip: V(191, 224), base: V(169, 174), front: true,
});
const keyN = () => ({
  head: V(CX, 93), neck: V(CX, 116), shoC: V(CX, 126), hipC: V(CX, 170),
  f: { s: V(104, 128), e: V(97, 158), h: V(96, 176), hp: V(118, 172), k: V(116, 200), ft: V(114, 230) },
  b: { s: V(160, 128), e: V(167, 156), h: V(168, 174), hp: V(146, 172), k: V(148, 200), ft: V(150, 230) },
  face: "back", prof: 0, tip: V(189, 222), base: V(168, 174), front: false,
});
const keyE = () => ({
  head: V(CX + 8, 93), neck: V(CX + 4, 116), shoC: V(CX + 2, 126), hipC: V(CX, 170),
  f: { s: V(148, 128), e: V(157, 156), h: V(161, 172), hp: V(142, 172), k: V(146, 200), ft: V(150, 230) },
  b: { s: V(118, 130), e: V(111, 158), h: V(109, 174), hp: V(122, 172), k: V(120, 200), ft: V(116, 230) },
  face: "profile", prof: 1, tip: V(187, 221), base: V(161, 172), front: true,
});
const keySE = () => ({
  head: V(CX + 5, 93), neck: V(CX + 2, 116), shoC: V(CX + 1, 126), hipC: V(CX, 170),
  f: { s: V(156, 128), e: V(164, 156), h: V(167, 173), hp: V(144, 172), k: V(147, 200), ft: V(149, 230) },
  b: { s: V(108, 129), e: V(101, 157), h: V(99, 175), hp: V(120, 172), k: V(118, 200), ft: V(115, 230) },
  face: "front34", prof: 1, tip: V(190, 223), base: V(167, 173), front: true,
});
const keyNE = () => ({
  head: V(CX + 5, 93), neck: V(CX + 2, 116), shoC: V(CX + 1, 126), hipC: V(CX, 170),
  f: { s: V(108, 129), e: V(101, 157), h: V(100, 175), hp: V(120, 172), k: V(118, 200), ft: V(115, 230) },
  b: { s: V(156, 128), e: V(164, 156), h: V(165, 173), hp: V(144, 172), k: V(147, 200), ft: V(149, 230) },
  face: "back34", prof: 1, tip: V(188, 221), base: V(165, 173), front: false,
});
const MX = (p) => V(2 * CX - p[0], p[1]);
const mirror = (k, face, prof) => {
  const m = (o) => ({ s: MX(o.s), e: MX(o.e), h: MX(o.h), hp: MX(o.hp), k: MX(o.k), ft: MX(o.ft) });
  return {
    head: MX(k.head), neck: MX(k.neck), shoC: MX(k.shoC), hipC: MX(k.hipC),
    f: m(k.b), b: m(k.f), face, prof, tip: MX(k.tip), base: MX(k.base), front: k.front,
  };
};
const KEYS = [keyN, keyNE, keyE, keySE, keyS,
  () => mirror(keySE(), "front34", -1), () => mirror(keyE(), "profile", -1), () => mirror(keyNE(), "back34", -1)];

function poseFor(dir, frame) {
  const k = KEYS[dir](), b = breathe(frame);
  const lift = Math.round(b * 3), torso = Math.round(b * 2), handB = Math.round(b * 1);
  const L = (p, dy) => V(p[0], p[1] + dy);
  return {
    dir, face: k.face, prof: k.prof, swordFront: k.front,
    head: L(k.head, lift), neck: L(k.neck, torso), shoC: L(k.shoC, torso), hipC: k.hipC,
    f: { s: L(k.f.s, torso), e: L(k.f.e, torso), h: L(k.f.h, torso + handB), hp: k.f.hp, k: k.f.k, ft: k.f.ft },
    b: { s: L(k.b.s, torso), e: L(k.b.e, torso), h: L(k.b.h, torso), hp: k.b.hp, k: k.b.k, ft: k.b.ft },
    tip: V(k.tip[0], k.tip[1] + Math.round(b * 2)), base: L(k.base, torso + handB),
  };
}

// ---------- personagem ----------
function drawSword(f, ox, oy, p, behind) {
  const B = [p.base[0] + ox, p.base[1] + oy], T = [p.tip[0] + ox, p.tip[1] + oy];
  const dx = T[0] - B[0], dy = T[1] - B[1], len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const gx = B[0] + (dx / len) * 8, gy = B[1] + (dy / len) * 8; // guarda logo abaixo da mão
  const steel = behind ? STEEL.s : STEEL.b, light = behind ? STEEL.b : STEEL.l;
  // lâmina afunilada (mais larga: espada proporcional ao corpo)
  poly(f, [
    [gx + nx * 6.5, gy + ny * 6.5], [gx - nx * 6.5, gy - ny * 6.5],
    [T[0] - nx * 1.5, T[1] - ny * 1.5], [T[0] + nx * 1.5, T[1] + ny * 1.5],
  ], steel);
  thickLine(f, gx, gy, T[0], T[1], 3, light); // fio/highlight
  poly(f, [[gx + nx * 12, gy + ny * 12], [gx - nx * 12, gy - ny * 12],
    [gx - nx * 12 + dx / len * 5, gy - ny * 12 + dy / len * 5],
    [gx + nx * 12 + dx / len * 5, gy + ny * 12 + dy / len * 5]], behind ? ARMOR.s : ARMOR.b); // guarda
  thickLine(f, B[0] - (dx / len) * 10, B[1] - (dy / len) * 10, gx, gy, 6, GRIP); // cabo através da mão
  ellipse(f, B[0] - (dx / len) * 12, B[1] - (dy / len) * 12, 4, 4, behind ? ARMOR.s : ARMOR.l); // pomo
}

function drawLeg(f, ox, oy, j, toeDir, back = false) {
  const CLO = back ? CLOTH_D : CLOTH, ARM = back ? ARMOR_D : ARMOR, LEA = back ? LEATH_D : LEATH;
  // coxa (calça) + sombra interna
  limb(f, j.hp[0] + ox, j.hp[1] + oy, j.k[0] + ox, j.k[1] + oy, 14, 11, CLO.s);
  limb(f, j.hp[0] + ox - 2, j.hp[1] + oy, j.k[0] + ox - 2, j.k[1] + oy, 9, 7, CLO.b);
  // virilha: sombra de oclusão entre as pernas (coesão do quadril)
  poly(f, [[j.hp[0] + ox - 2, j.hp[1] + oy - 6], [j.hp[0] + ox + 8, j.hp[1] + oy - 6],
    [j.k[0] + ox + 4, j.k[1] + oy - 14], [j.k[0] + ox - 4, j.k[1] + oy - 14]], CLO.s);
  // greva escurecida joelho->tornozelo (leitura do jogo: pernas escuras)
  const ax = j.k[0] + ox, ay = j.k[1] + oy;
  const anx = ax + (j.ft[0] - j.k[0]) * 0.4, any = ay + (j.ft[1] - j.k[1]) * 0.72;
  limb(f, ax, ay, anx, any, 12, 10, ARM.s);
  limb(f, ax - 2, ay, anx - 2, any, 6, 5, ARM.b);
  if (!back) thickLine(f, ax - 4, ay + 3, anx - 4, any, 2, ARM.l);
  // bota: cano alto + pé apontado p/ frente
  const fx = j.ft[0] + ox, fy = j.ft[1] + oy;
  poly(f, [[fx - 8, fy - 13], [fx + 8, fy - 13], [fx + 7, fy], [fx - 7, fy]], LEA.b);
  if (!back) poly(f, [[fx - 8, fy - 13], [fx - 1, fy - 13], [fx - 2, fy], [fx - 7, fy]], LEA.l);
  poly(f, [[fx - 7 + toeDir * 2, fy - 5], [fx + 7 + toeDir * 2, fy - 5], [fx + 10 * toeDir + 5, fy - 1], [fx - 7, fy]], LEA.s);
  poly(f, [[fx - 7, fy - 2], [fx + 10 * toeDir + 5, fy - 2], [fx + 10 * toeDir + 5, fy], [fx - 7, fy]], [58, 44, 34]);
  if (!back) ellipse(f, fx + toeDir * 3, fy - 8, 4.5, 2.2, LEA.l); // highlight peito do pé
}

function drawArm(f, ox, oy, j, sleeve, back = false) {
  const CLO = back ? CLOTH_D : CLOTH, SKN = back ? SKIN_D : SKIN, LEA = back ? LEATH_D : LEATH;
  limb(f, j.s[0] + ox, j.s[1] + oy, j.e[0] + ox, j.e[1] + oy, 14, 11, sleeve);
  if (!back) limb(f, j.s[0] + ox - 2, j.s[1] + oy, j.e[0] + ox - 2, j.e[1] + oy, 8, 7, CLOTH.l);
  else limb(f, j.s[0] + ox - 2, j.s[1] + oy, j.e[0] + ox - 2, j.e[1] + oy, 8, 7, CLOTH_D.b);
  limb(f, j.e[0] + ox, j.e[1] + oy, j.h[0] + ox, j.h[1] + oy, 10, 9, SKN.b); // antebraço
  if (!back) { // rim light só no braço frontal (luz de NW)
    const dx = j.h[0] - j.e[0], dy = j.h[1] - j.e[1], len = Math.hypot(dx, dy) || 1;
    thickLine(f, j.e[0] + ox - 3, j.e[1] + oy, j.h[0] + ox - 3, j.h[1] + oy, 2, SKN.l);
  }
  poly(f, [ // braçadeira couro
    [j.e[0] + ox - 5, j.e[1] + oy + 2], [j.e[0] + ox + 5, j.e[1] + oy + 2],
    [j.e[0] + ox + 6 + (j.h[0] - j.e[0]) * 0.35, j.e[1] + oy + 8 + (j.h[1] - j.e[1]) * 0.35],
    [j.e[0] + ox - 4 + (j.h[0] - j.e[0]) * 0.35, j.e[1] + oy + 8 + (j.h[1] - j.e[1]) * 0.35],
  ], LEA.b);
}
function drawHand(f, ox, oy, j, back = false, grip = null) {
  const SKN = back ? SKIN_D : SKIN;
  ellipse(f, j.h[0] + ox, j.h[1] + oy, 6, 7, SKN.b); // mão SOBRE o cabo
  if (!back) ellipse(f, j.h[0] + ox - 1, j.h[1] + oy - 1, 3.5, 4, SKN.l);
  if (grip && !back) { // dedos envolvendo o cabo
    thickLine(f, j.h[0] + ox - 4, j.h[1] + oy - 2, j.h[0] + ox + 4, j.h[1] + oy - 2, 2, SKN.s);
    thickLine(f, j.h[0] + ox - 4, j.h[1] + oy + 2, j.h[0] + ox + 4, j.h[1] + oy + 2, 2, SKN.s);
  }
}

function drawHead(f, ox, oy, p) {
  const hx = p.head[0] + ox, hy = p.head[1] + oy;
  const back = p.face === "back" || p.face === "back34";
  // massa de cabelo traseira (sempre; maior nas vistas de costas)
  const wBack = back ? 20 : 16;
  poly(f, [[hx - wBack, hy - 8], [hx + wBack, hy - 8], [hx + wBack - 3, hy + 16],
    [hx + wBack - 8, hy + 22], [hx - wBack + 8, hy + 22], [hx - wBack + 3, hy + 16]], HAIR.s);
  poly(f, [[hx - wBack + 5, hy - 6], [hx - wBack + 9, hy - 6], [hx - wBack + 7, hy + 18], [hx - wBack + 2, hy + 18]], HAIR.b);
  if (!back) {
    if (p.face === "profile") {
      const s = p.prof;
      poly(f, [[hx - 14, hy - 13], [hx + 12, hy - 13], [hx + 14, hy - 2],
        [hx + 12, hy + 11], [hx, hy + 18], [hx - 11, hy + 11], [hx - 15, hy - 2]], SKIN.b);
      poly(f, [[hx + 12 * s, hy - 1], [hx + 19 * s, hy + 4], [hx + 12 * s, hy + 9]], SKIN.b); // nariz
      poly(f, [[hx + 12 * s, hy + 2], [hx + 19 * s, hy + 4], [hx + 12 * s, hy + 7]], SKIN.s);
      poly(f, [[hx - 14, hy - 13], [hx - 3, hy - 13], [hx - 3, hy + 18], [hx - 11, hy + 11], [hx - 15, hy - 2]], SKIN.s);
      poly(f, [[hx + 2, hy - 1], [hx + 6, hy - 1], [hx + 6, hy + 3], [hx + 2, hy + 3]], DARK); // olho
      poly(f, [[hx - 13, hy - 15], [hx + 12, hy - 15], [hx + 10, hy - 10], [hx - 11, hy - 10]], SKIN.l);
    } else {
      const dx = p.face === "front34" ? p.prof * 4 : 0;
      poly(f, [[hx - 14, hy - 13], [hx + 14, hy - 13], [hx + 16, hy - 2],
        [hx + 11, hy + 11], [hx, hy + 18], [hx - 11, hy + 11], [hx - 16, hy - 2]], SKIN.b);
      poly(f, [[hx + dx * 0.4, hy - 13], [hx + 14, hy - 13], [hx + 16, hy - 2],
        [hx + 11, hy + 11], [hx + dx * 0.4 + 5, hy + 14]], SKIN.s); // plano sombra
      poly(f, [[hx - 12, hy - 12], [hx + 1, hy - 12], [hx + 1, hy - 6], [hx - 12, hy - 6]], SKIN.l); // luz testa
      poly(f, [[hx - 8 + dx, hy - 1], [hx - 4 + dx, hy - 1], [hx - 4 + dx, hy + 3], [hx - 8 + dx, hy + 3]], DARK);
      poly(f, [[hx + 4 + dx, hy - 1], [hx + 8 + dx, hy - 1], [hx + 8 + dx, hy + 3], [hx + 4 + dx, hy + 3]], DARK);
      poly(f, [[hx - 9 + dx, hy - 4], [hx - 3 + dx, hy - 4], [hx - 3 + dx, hy - 3], [hx - 9 + dx, hy - 3]], HAIR.b);
      poly(f, [[hx + 3 + dx, hy - 4], [hx + 9 + dx, hy - 4], [hx + 9 + dx, hy - 3], [hx + 3 + dx, hy - 3]], HAIR.b);
      poly(f, [[hx - 3 + dx, hy + 7], [hx + 3 + dx, hy + 7], [hx + 1 + dx, hy + 10]], SKIN.s); // nariz
      thickLine(f, hx - 3 + dx, hy + 13, hx + 3 + dx, hy + 13, 1.5, [150, 110, 88]); // boca
    }
  } else if (p.face === "back34") {
    ellipse(f, hx - p.prof * 15, hy + 2, 3, 4.5, SKIN.b); // orelha lateral
  }
  // capacete de cabelo: topo com tufos low-poly + mechas (sem costeletas isoladas)
  poly(f, [[hx - 18, hy - 9], [hx - 13, hy - 24], [hx - 7, hy - 19], [hx - 1, hy - 28],
    [hx + 5, hy - 19], [hx + 11, hy - 25], [hx + 16, hy - 15], [hx + 18, hy - 9],
    [hx + 13, hy - 13], [hx - 13, hy - 13]], HAIR.b);
  poly(f, [[hx - 13, hy - 24], [hx - 7, hy - 19], [hx - 1, hy - 28], [hx - 4, hy - 15], [hx - 11, hy - 16]], HAIR.l);
  poly(f, [[hx - 1, hy - 28], [hx + 5, hy - 19], [hx + 2, hy - 14], [hx - 3, hy - 15]], HAIR.b); // faceta central
  poly(f, [[hx + 5, hy - 19], [hx + 11, hy - 25], [hx + 13, hy - 15], [hx + 6, hy - 14]], HAIR.s);
  poly(f, [[hx - 18, hy - 9], [hx - 14, hy - 9], [hx - 15, hy - 1], [hx - 18, hy - 1]], HAIR.b);
  poly(f, [[hx + 18, hy - 9], [hx + 14, hy - 9], [hx + 15, hy - 1], [hx + 18, hy - 1]], HAIR.s);
}

function drawTorso(f, ox, oy, p) {
  const sL = p.dir <= 4 ? p.b.s : p.f.s; // ombro esquerdo na tela
  const sR = p.dir <= 4 ? p.f.s : p.b.s;
  const scx = p.shoC[0] + ox, scy = p.shoC[1] + oy;
  const hcx = p.hipC[0] + ox, hcy = p.hipC[1] + oy;
  // perspectiva: vistas de perfil/3-4 têm tronco mais estreito
  const narrow = p.face === "profile" ? 0.68 : (p.face === "front34" || p.face === "back34") ? 0.86 : 1;
  const wTop = (Math.abs(sR[0] - sL[0]) / 2 + 5) * narrow;
  // pescoço curto embutido: trapézio de pano liga nuca aos ombros (sem coluna isolada)
  poly(f, [[p.neck[0] + ox - 7, p.neck[1] + oy - 5], [p.neck[0] + ox + 7, p.neck[1] + oy - 5],
    [scx + wTop - 2, scy + 1], [scx - wTop + 2, scy + 1]], CLOTH.s);
  poly(f, [[p.neck[0] + ox - 5, p.neck[1] + oy - 5], [p.neck[0] + ox + 5, p.neck[1] + oy - 5],
    [scx + 4, scy], [scx - 4, scy]], SKIN.s);
  // gorjal fosco e recolhido sob o queixo (sombra, sem "colar" claro)
  poly(f, [[p.neck[0] + ox - 7, p.neck[1] + oy - 3], [p.neck[0] + ox + 7, p.neck[1] + oy - 3],
    [scx + 7, scy + 3], [scx - 7, scy + 3]], ARMOR_D.b);
  poly(f, [[p.neck[0] + ox - 7, p.neck[1] + oy - 3], [p.neck[0] + ox - 1, p.neck[1] + oy - 3],
    [scx - 1, scy + 3], [scx - 7, scy + 3]], ARMOR.s);
  // sombra de oclusão nas axilas (integra braço ao tronco)
  ellipse(f, sL[0] + ox + 4, sL[1] + oy + 8, 5, 7, CLOTH.s);
  ellipse(f, sR[0] + ox - 4, sR[1] + oy + 8, 5, 7, CLOTH.s);
  // túnica base
  poly(f, [[scx - wTop, scy], [scx + wTop, scy], [hcx + 17, hcy - 4], [hcx - 17, hcy - 4]], CLOTH.s);
  poly(f, [[scx - wTop + 5, scy], [scx + 2, scy], [hcx - 2, hcy - 4], [hcx - 13, hcy - 4]], CLOTH.b);
  poly(f, [[scx - wTop + 3, scy + 2], [scx - wTop + 9, scy + 2], [hcx - 12, hcy - 6], [hcx - 15, hcy - 6]], CLOTH.l);
  // peitoral afunilado (ombro largo -> cintura estreita, menos "tábua")
  const pt = scy + 4, pb = hcy - 10;
  const inTop = 3, inBot = 8; // recuo da placa: maior embaixo = taper
  poly(f, [[scx - wTop + inTop, pt], [scx - 1, pt], [scx - 4, pb], [scx - wTop + inBot, pb]], ARMOR.b);
  poly(f, [[scx + 1, pt], [scx + wTop - inTop, pt], [scx + wTop - inBot, pb], [scx + 4, pb]], ARMOR.s);
  poly(f, [[scx - 2, pt], [scx + 2, pt], [scx + 1, pb], [scx - 1, pb]], ARMOR.l);
  // facets low-poly: quebras tonais sutis nos cantos inferiores da placa
  poly(f, [[scx - wTop + inBot, pb - 9], [scx - wTop + inBot + 8, pb - 9], [scx - wTop + inBot + 5, pb]], ARMOR.s);
  poly(f, [[scx + wTop - inBot, pb - 9], [scx + wTop - inBot - 8, pb - 9], [scx + wTop - inBot - 5, pb]], ARMOR.b);
  poly(f, [[scx - wTop + 5, pt + 7], [scx - 4, pt + 7], [scx - 4, pt + 11], [scx - wTop + 5, pt + 11]], ARMOR.l);
  poly(f, [[scx + 4, pt + 13], [scx + wTop - 5, pt + 13], [scx + wTop - 5, pt + 16], [scx + 4, pt + 16]], ARMOR.b);
  // fauldos (saias metálicas)
  poly(f, [[hcx - 16, hcy - 10], [hcx + 16, hcy - 10], [hcx + 18, hcy - 2], [hcx - 18, hcy - 2]], ARMOR.b);
  poly(f, [[hcx - 16, hcy - 10], [hcx - 1, hcy - 10], [hcx - 2, hcy - 2], [hcx - 18, hcy - 2]], ARMOR.l);
  // cinto + fivela
  poly(f, [[hcx - 18, hcy - 2], [hcx + 18, hcy - 2], [hcx + 18, hcy + 5], [hcx - 18, hcy + 5]], LEATH.s);
  poly(f, [[hcx - 4, hcy - 1], [hcx + 4, hcy - 1], [hcx + 4, hcy + 4], [hcx - 4, hcy + 4]], ARMOR.b);
  poly(f, [[hcx - 4, hcy - 1], [hcx + 4, hcy - 1], [hcx + 4, hcy + 1], [hcx - 4, hcy + 1]], ARMOR.l);
  // saia da túnica: 3 panos com vinco escuro entre eles (volume, sem poluir)
  const sy = hcy + 5, se = hcy + 24;
  poly(f, [[hcx - 15, sy], [hcx + 15, sy], [hcx + 17, se], [hcx - 17, se]], CLOTH.s);
  poly(f, [[hcx - 13, sy], [hcx - 1, sy], [hcx - 3, se], [hcx - 14, se]], CLOTH.b);
  poly(f, [[hcx + 3, sy], [hcx + 13, sy], [hcx + 15, se], [hcx + 5, se]], CLOTH.s);
  poly(f, [[hcx - 1, sy], [hcx + 3, sy], [hcx + 2, se], [hcx - 2, se]], CLOTH.l);
  thickLine(f, hcx - 1, sy + 2, hcx - 3, se - 1, 1.6, CLOTH.s);
  thickLine(f, hcx + 3, sy + 2, hcx + 5, se - 1, 1.6, CLOTH.s);
  poly(f, [[hcx - 9, se - 6], [hcx - 4, se - 6], [hcx - 5, se - 2], [hcx - 10, se - 2]], CLOTH.l); // dobra
  // ombreiras em camadas (cobrem o topo do braço)
  for (const [sx, lag] of [[sL, 0], [sR, 1]]) {
    const px0 = sx[0] + ox, py0 = sx[1] + oy;
    poly(f, [[px0 - 13, py0 - 6], [px0 + 13, py0 - 6], [px0 + 9, py0 + 8], [px0 - 9, py0 + 8]], lag ? ARMOR.s : ARMOR.b);
    poly(f, [[px0 - 13, py0 - 6], [px0 + 13, py0 - 6], [px0 + 11, py0 - 1], [px0 - 11, py0 - 1]], lag ? ARMOR.b : ARMOR.l);
    poly(f, [[px0 - 13, py0 - 6], [px0 - 2, py0 - 6], [px0 - 4, py0], [px0 - 11, py0]], ARMOR.l);
    ellipse(f, px0, py0 - 5, 6, 3.2, ARMOR.l);
  }
}

function drawCharacter(f, ox, oy, p) {
  const toe = p.prof !== 0 ? p.prof : 1;
  // Mão que segura: base da espada acompanha a junta da mão.
  const holdFront = p.swordFront;
  const holdJ = holdFront ? p.f : p.b;
  const swordBaseAt = (j) => Math.hypot(p.base[0] - j.h[0], p.base[1] - j.h[1]) < 2;
  if (!p.swordFront) drawSword(f, ox, oy, p, true);
  drawLeg(f, ox, oy, p.b, p.prof !== 0 ? p.prof : -1, true);
  drawArm(f, ox, oy, p.b, CLOTH_D.s, true);
  if (!p.swordFront && swordBaseAt(p.b)) drawHand(f, ox, oy, p.b, true, true);
  else drawHand(f, ox, oy, p.b, true, false);
  drawTorso(f, ox, oy, p);
  drawHead(f, ox, oy, p);
  drawLeg(f, ox, oy, p.f, toe, false);
  drawArm(f, ox, oy, p.f, CLOTH.b, false);
  if (p.swordFront) {
    drawSword(f, ox, oy, p, false);
    if (swordBaseAt(p.f)) drawHand(f, ox, oy, p.f, false, true);
    else drawHand(f, ox, oy, p.f, false, false);
  } else {
    drawHand(f, ox, oy, p.f, false, false);
  }
  void holdFront; void holdJ;
}

// ---------- main ----------
const sheet = fb(COLS * CELL, ROWS * CELL);
for (let dir = 0; dir < ROWS; dir++) {
  for (let col = 0; col < COLS; col++) {
    const p = poseFor(dir, col);
    drawCharacter(sheet, col * CELL, dir * CELL, p);
  }
}
const outDir = join(ROOT, "assets", "sprite", "player", "lutador", "v2");
const prevDir = join(ROOT, "assets", "spritegen", "preview");
mkdirSync(outDir, { recursive: true });
mkdirSync(prevDir, { recursive: true });
writeFileSync(join(outDir, "lutador_idle_v2.png"), encodePNG(sheet.w, sheet.h, sheet.d));

// preview 8 direções (frame 2 de cada linha) + faixa S completa
const p8 = fb(CELL, ROWS * CELL);
for (let dir = 0; dir < ROWS; dir++) {
  const src = poseFor(dir, 2);
  const cell = fb(CELL, CELL);
  drawCharacter(cell, 0, 0, src);
  p8.d.set(cell.d, dir * CELL * CELL * 4);
}
writeFileSync(join(prevDir, "fighter-idle-8dir.png"), encodePNG(p8.w, p8.h, p8.d));
const rowS = fb(COLS * CELL, CELL);
for (let col = 0; col < COLS; col++) {
  const cell = fb(CELL, CELL);
  drawCharacter(cell, 0, 0, poseFor(4, col));
  cell.d.forEach((v, i) => { /* noop */ });
  for (let y = 0; y < CELL; y++)
    for (let x = 0; x < CELL; x++) {
      const si = (y * CELL + x) * 4, di = (y * rowS.w + col * CELL + x) * 4;
      rowS.d[di] = cell.d[si]; rowS.d[di + 1] = cell.d[si + 1];
      rowS.d[di + 2] = cell.d[si + 2]; rowS.d[di + 3] = cell.d[si + 3];
    }
}
writeFileSync(join(prevDir, "fighter-idle-row-S.png"), encodePNG(rowS.w, rowS.h, rowS.d));
// 2x da faixa S para inspeção
const z2 = fb(rowS.w * 2, rowS.h * 2);
for (let y = 0; y < z2.h; y++)
  for (let x = 0; x < z2.w; x++) {
    const si = ((y >> 1) * rowS.w + (x >> 1)) * 4, di = (y * z2.w + x) * 4;
    z2.d[di] = rowS.d[si]; z2.d[di + 1] = rowS.d[si + 1];
    z2.d[di + 2] = rowS.d[si + 2]; z2.d[di + 3] = rowS.d[si + 3];
  }
writeFileSync(join(prevDir, "fighter-idle-row-S-2x.png"), encodePNG(z2.w, z2.h, z2.d));
console.log("OK sheet", sheet.w + "x" + sheet.h, "->", join(outDir, "lutador_idle_v2.png"));
