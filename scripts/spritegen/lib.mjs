// spritegen/lib.mjs — infra compartilhada: rasterizador + paleta + PNG.
// Zero dependências (só node:fs / node:zlib / node:path).
// Usada por fighter-idle.mjs (IDLE v2) e concepts.mjs (variantes A/B/C).
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

// ---------- cor ----------
export function desat(c, amt = 0.1) {
  const g = (c[0] + c[1] + c[2]) / 3;
  return c.map((v) => Math.round(v + (g - v) * amt));
}
export function comp(mat, amt = 0.08) {
  const mid = mat.b.map((v, i) => Math.round((v + mat.s[i] + mat.l[i]) / 3));
  const pull = (c) => c.map((v, i) => Math.round(v + (mid[i] - v) * amt));
  return { b: mat.b, s: pull(mat.s), l: pull(mat.l) };
}
export function M(b, s, l) {
  const m = comp({ b: desat(b), s: desat(s), l: desat(l) });
  return { b: m.b, s: m.s, l: m.l };
}
export function darkMat(m, f = 0.84) {
  const d = (c) => c.map((v) => Math.round(v * f));
  return { b: d(m.b), s: d(m.s), l: d(m.l) };
}
// Paleta mestre do Lutador (valores finais refinados).
export const SKIN = M([217, 180, 143], [183, 143, 107], [236, 207, 175]);
export const HAIR = M([58, 47, 40], [40, 32, 27], [88, 72, 60]);
export const CLOTH = M([164, 85, 63], [128, 62, 46], [192, 112, 84]);
export const ARMOR = M([154, 163, 168], [110, 119, 125], [207, 214, 218]);
export const LEATH = M([92, 71, 54], [70, 53, 40], [118, 94, 72]);
export const STEEL = M([196, 203, 207], [148, 157, 163], [232, 238, 240]);
export const SKIN_D = darkMat(SKIN), HAIR_D = darkMat(HAIR), CLOTH_D = darkMat(CLOTH);
export const ARMOR_D = darkMat(ARMOR), LEATH_D = darkMat(LEATH), STEEL_D = darkMat(STEEL);
export const DARK = desat([43, 35, 32]);
export const GRIP = desat([74, 58, 44]);

// ---------- framebuffer ----------
export function fb(w, h) { return { w, h, d: new Uint8ClampedArray(w * h * 4) }; }
export function px(f, x, y, c, a = 255) {
  x |= 0; y |= 0;
  if (x < 0 || y < 0 || x >= f.w || y >= f.h || a <= 0) return;
  const i = (y * f.w + x) * 4, sa = a / 255, da = 1 - sa;
  f.d[i] = c[0] * sa + f.d[i] * da;
  f.d[i + 1] = c[1] * sa + f.d[i + 1] * da;
  f.d[i + 2] = c[2] * sa + f.d[i + 2] * da;
  f.d[i + 3] = Math.min(255, a + f.d[i + 3] * da);
}
export function poly(f, pts, c, a = 255) {
  const n = pts.length;
  if (n < 3) return;
  let y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  y0 = Math.max(0, Math.ceil(y0)); y1 = Math.min(f.h - 1, Math.floor(y1));
  for (let y = y0; y <= y1; y++) {
    const xs = [];
    for (let i = 0; i < n; i++) {
      const [x0, yy0] = pts[i], [x1, yy1] = pts[(i + 1) % n];
      if ((yy0 <= y && yy1 > y) || (yy1 <= y && yy0 > y)) {
        xs.push(x0 + ((y - yy0) / (yy1 - yy0)) * (x1 - x0));
      }
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.max(0, Math.ceil(xs[k])), xb = Math.min(f.w - 1, Math.floor(xs[k + 1]));
      for (let x = xa; x <= xb; x++) px(f, x, y, c, a);
    }
  }
}
export function ellipse(f, cx, cy, rx, ry, c, a = 255) {
  for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(f.h - 1, Math.ceil(cy + ry)); y++) {
    for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(f.w - 1, Math.ceil(cx + rx)); x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) px(f, x, y, c, a);
    }
  }
}
export function limb(f, ax, ay, bx, by, w0, w1, c) {
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  poly(f, [
    [ax + nx * w0 / 2, ay + ny * w0 / 2], [ax - nx * w0 / 2, ay - ny * w0 / 2],
    [bx - nx * w1 / 2, by - ny * w1 / 2], [bx + nx * w1 / 2, by + ny * w1 / 2],
  ], c);
}
export function thickLine(f, x0, y0, x1, y1, w, c, a = 255) {
  const len = Math.hypot(x1 - x0, y1 - y0) || 1, steps = Math.ceil(len);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    ellipse(f, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w / 2, w / 2, c, a);
  }
}

// ---------- PNG ----------
// Copia a célula (sw×sh) de src para dst.
export function blit(dst, dx, dy, src) {
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const si = (y * src.w + x) * 4, di = ((dy + y) * dst.w + dx + x) * 4;
      dst.d[di] = src.d[si]; dst.d[di + 1] = src.d[si + 1];
      dst.d[di + 2] = src.d[si + 2]; dst.d[di + 3] = src.d[si + 3];
    }
}
// Redução por média (pré-visualização em escala de gameplay).
export function downscale(src, factor) {
  const w = Math.max(1, Math.round(src.w * factor)), h = Math.max(1, Math.round(src.h * factor));
  const out = fb(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      const x0 = Math.floor(x / factor), x1 = Math.min(src.w - 1, Math.ceil((x + 1) / factor));
      const y0 = Math.floor(y / factor), y1 = Math.min(src.h - 1, Math.ceil((y + 1) / factor));
      for (let sy = y0; sy <= y1; sy++)
        for (let sx = x0; sx <= x1; sx++) {
          const i = (sy * src.w + sx) * 4;
          r += src.d[i]; g += src.d[i + 1]; b += src.d[i + 2]; a += src.d[i + 3]; n++;
        }
      const di = (y * w + x) * 4;
      out.d[di] = r / n; out.d[di + 1] = g / n; out.d[di + 2] = b / n; out.d[di + 3] = a / n;
    }
  return out;
}
const CRC_T = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_T[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const td = Buffer.from(type), len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([td, Buffer.from(data)]);
  const cd = Buffer.alloc(4); cd.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, cd]);
}
export function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0;
    Buffer.from(rgba.slice(y * w * 4, (y + 1) * w * 4)).copy(raw, y * (1 + w * 4) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]);
}
export function writePNG(path, frame) {
  writeFileSync(path, encodePNG(frame.w, frame.h, frame.d));
}
