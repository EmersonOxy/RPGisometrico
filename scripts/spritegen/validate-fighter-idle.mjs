// Validação programática da sheet idle v2 (dimensões, frames, alfa, clipping, pés).
// Uso: node scripts/spritegen/validate-fighter-idle.mjs (sai 1 se falhar)
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILE = process.argv[2] ? join(ROOT, process.argv[2]) : join(ROOT, "assets", "sprite", "player", "lutador", "v2", "lutador_idle_v2.png");
const CELL = 264, COLS = 6, ROWS = 8;

function crc(buf) {
  const t = crcTable();
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function crcTable() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
}

function parsePNG(buf) {
  let p = 8, w = 0, h = 0, idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString("ascii", p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); }
    if (type === "IDAT") idat.push(data);
    p += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = 1 + w * 4, rgba = Buffer.alloc(w * h * 4);
  let prev = Buffer.alloc(w * 4);
  for (let y = 0; y < h; y++) {
    const f = raw[y * stride];
    const row = Buffer.from(raw.subarray(y * stride + 1, (y + 1) * stride));
    if (f === 1) for (let i = 0; i < row.length; i++) row[i] = (row[i] + (i >= 4 ? row[i - 4] : 0)) & 255;
    else if (f === 2) for (let i = 0; i < row.length; i++) row[i] = (row[i] + prev[i]) & 255;
    else if (f === 3) for (let i = 0; i < row.length; i++) row[i] = (row[i] + ((i >= 4 ? row[i - 4] : 0) + prev[i] >> 1)) & 255;
    else if (f === 4) for (let i = 0; i < row.length; i++) {
      const a = i >= 4 ? row[i - 4] : 0, b = prev[i], c = i >= 4 ? prev[i - 4] : 0;
      const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
      const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      row[i] = (row[i] + pr) & 255;
    }
    row.copy(rgba, y * w * 4); prev = row;
  }
  return { w, h, rgba };
}

const fails = [];
const { w, h, rgba } = parsePNG(readFileSync(FILE));
const ok = (cond, msg) => { console.log((cond ? "PASS " : "FAIL ") + msg); if (!cond) fails.push(msg); };
ok(w === COLS * CELL && h === ROWS * CELL, `dimensões ${w}x${h} === ${COLS * CELL}x${ROWS * CELL}`);
let opaqueTotal = 0;
const feetBands = [];
const CB = 44; // meia-largura da faixa central (pés/botas; exclui a espada lateral)
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    let opaque = 0, topClip = 0, feet = 0, minY = CELL, soleY = 0;
    for (let y = 0; y < CELL; y++) {
      for (let x = 0; x < CELL; x++) {
        const a = rgba[((r * CELL + y) * w + c * CELL + x) * 4 + 3];
        if (a >= 128) {
          opaque++; if (y < minY) minY = y;
          if (y < 4) topClip++;
          if (y >= 224 && y <= 236) feet++;
          // sola: pixel opaco mais baixo dentro da faixa central (pés)
          const gx = c * CELL + x;
          if (Math.abs(gx - (c * CELL + CELL / 2)) <= CB && y > soleY) soleY = y;
        }
      }
    }
    opaqueTotal += opaque;
    if (opaque === 0) fails.push(`célula ${r}:${c} vazia`);
    if (topClip > 0) fails.push(`célula ${r}:${c} encosta no topo (${topClip}px)`);
    if (feet === 0) fails.push(`célula ${r}:${c} sem pixel nos pés (224..236)`);
    if (soleY === 0) fails.push(`célula ${r}:${c} sem sola na faixa central`);
    feetBands.push(soleY);
  }
}
ok(opaqueTotal > 10000, `pixels opacos totais ${opaqueTotal} (>10000)`);
// Sola por direção: a arma pode ultrapassar a linha dos pés; o que importa é
// a consistência dentro de cada linha (o jogo ancora por direção).
const perRow = [];
for (let r = 0; r < ROWS; r++) {
  const band = feetBands.slice(r * COLS, (r + 1) * COLS);
  perRow.push(Math.max(...band) - Math.min(...band));
}
const worst = Math.max(...perRow);
// Tolerância = respiração (±3px) + quantização da grade Q=3 (±6px).
ok(worst <= 12, `sola consistente por direção (pior linha ${worst}px <= 12)`);
ok(fails.length === 0, `0 falhas (${fails.length})`);
if (fails.length) { console.log(fails.join("\n")); process.exit(1); }
console.log("VALID OK");
