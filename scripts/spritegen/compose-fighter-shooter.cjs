// Compõe sheets 8-direcionais (32xN) a partir de pixel-art 32x32,
// para personagens (assets/sprite/player/<classe>/) e inimigos
// (assets/sprite/enemy/<pasta>/). Sem dependências: só node built-in
// (fs/zlib). Cópia exata de pixels, sem reescala e sem blur — preserva
// o pixel-art 1:1.
//
// PADRÃO PARA NOVAS CLASSES: coloque na pasta da classe (assets/sprite/player/<classe>/)
//   - <prefixo>_base.png (obrigatório p/ personagens, 32x32, vista de frente)
//   - <prefixo>_frente_direita/esquerda.png + <prefixo>_costas_direita/esquerda.png
//     (opcional; sem elas, usa-se a base ou o 1º frame de animação)
//   - <classe>/idle/ com a animação por direção, em dois formatos:
//     pasta <classe>/idle/[idle_]<direcao>/*.png ou arquivos
//     <classe>/idle/idle_<direcao> [(N)].png (direções: frente, costas,
//     esquerda, direita e compostas). Pastas de inimigo seguem
//     <pasta>/<prefixo>_idle_<direcao>/*.png. Direções sem animação usam o
//     frame estático. O walk segue 1 coluna (balanço procedural). Confira
//     as colunas geradas e ajuste columns/fps no *SpriteConfig.
// e registre a classe na tabela CLASSES abaixo. Personagens usam
// pixelCharacter(...) em PlayerSpriteConfig.ts; inimigos usam a entrada
// correspondente em EnemySpriteConfig.ts (com filter: "nearest").
//
// Linhas (N, NE, E, SE, S, SW, W, NW) no modo 4dir estático:
//   N, NE  -> costas_direita
//   E, SE, S -> frente_direita (= base)
//   SW, W  -> frente_esquerda
//   NW     -> costas_esquerda
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.join(__dirname, "..", "..");

function readPNG(p) {
  const b = fs.readFileSync(p);
  if (b.readUInt32BE(0) !== 0x89504e47) throw Error("not png: " + p);
  let pos = 8, W = 0, H = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (pos < b.length) {
    const len = b.readUInt32BE(pos);
    const type = b.toString("ascii", pos + 4, pos + 8);
    const data = b.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") { W = data.readUInt32BE(0); H = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; }
    if (type === "IDAT") idat.push(data);
    pos += 12 + len;
  }
  if (bitDepth !== 8 || colorType !== 6) throw Error(`esperava PNG 8-bit RGBA 32x32, veio ${W}x${H} ct=${colorType} em ${p}`);
  if (W !== 32 || H !== 32) throw Error(`esperava 32x32, veio ${W}x${H} em ${p}`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4, stride = W * bpp;
  const pixels = Buffer.alloc(W * H * 4);
  let pp = 0, prev = Buffer.alloc(stride);
  for (let y = 0; y < H; y++) {
    const filter = raw[pp++];
    const cur = raw.subarray(pp, pp + stride); pp += stride;
    const recon = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? recon[i - bpp] : 0, bb = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = cur[i];
      if (filter === 1) v = (v + a) & 255;
      else if (filter === 2) v = (v + bb) & 255;
      else if (filter === 3) v = (v + ((a + bb) >> 1)) & 255;
      else if (filter === 4) { const pr = paeth(a, bb, c); v = (v + pr) & 255; }
      recon[i] = v;
    }
    prev = recon;
    recon.copy(pixels, y * stride);
  }
  return { W, H, pixels };
}
function paeth(a, b, c) { const p = a + b - c; const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }

const CRC_TABLE = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(buf) { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function writePNG(W, H, pixels) {
  const stride = W * 4;
  const raw = Buffer.alloc((stride + 1) * H);
  for (let y = 0; y < H; y++) { raw[y * (stride + 1)] = 0; pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

function bbox(pixels, W, H) {
  let minX = W, minY = H, maxX = -1, maxY = -1, opaque = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (pixels[(y * W + x) * 4 + 3] > 10) {
      opaque++;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY, opaque };
}

function compose(root, dir, prefix, prefs) {
  const baseDir = path.join(ROOT, "assets", root, dir);
  const base = path.join(baseDir, `${prefix}_base.png`);
  const strip = (name) => name.toLowerCase()
    .replace(new RegExp(`^${prefix}_idle_`), "")
    .replace(/^idle_/, "")
    .replace(new RegExp(`^${prefix}_`), "");
  let baseImg;
  if (fs.existsSync(base)) {
    baseImg = readPNG(base);
    const bb = bbox(baseImg.pixels, 32, 32);
    console.log(`bbox ${dir}/${prefix}_base: x[${bb.minX}..${bb.maxX}] y[${bb.minY}..${bb.maxY}] opacos=${bb.opaque}`);
    const want = { minX: 4, maxX: 27 };
    if (bb.minX < want.minX || bb.maxX > want.maxX)
      console.warn(`AVISO: ${prefix}_base sai do viewBox padrão "4 0 24 32" — ajuste o enquadramento ou o viewBox`);
  }
  const four = ["frente_direita", "frente_esquerda", "costas_direita", "costas_esquerda"]
    .map((k) => path.join(baseDir, `${prefix}_${k}.png`));
  const STATIC_ROWS = ["costas_direita", "costas_direita", "frente_direita", "frente_direita", "frente_direita", "frente_esquerda", "frente_esquerda", "costas_esquerda"];
  // Estático por linha: 4dir > base > 1º frame de animação (placeholder).
  let staticByKey = null;
  if (four.every((p) => fs.existsSync(p))) {
    staticByKey = Object.fromEntries(four.map((p) => [strip(path.basename(p, ".png")), readPNG(p).pixels]));
    console.log(`modo ${prefix}: 4 direções`);
  } else if (baseImg) {
    console.log(`modo ${prefix}: só base (placeholder nas 8 direções até chegar a arte direcional)`);
  }
  const W = 32, H = 32 * 8;
  // Buffer PNG é por scanline na largura total: célula (row,col) começa em
  // ((row*32 + y) * W*cols + col*32) * 4 para cada linha y da célula.
  const blit = (dest, destCols, pixels, row, col) => {
    for (let y = 0; y < 32; y++)
      pixels.copy(dest, ((row * 32 + y) * W * destCols + col * 32) * 4, y * 32 * 4, (y + 1) * 32 * 4);
  };
  // Idle: animações por direção vindas de <dir>/idle/, em dois formatos:
  //   - pasta: [idle_]<direcao>/*.png (frames em ordem numérica);
  //   - avulso: idle_<direcao> [(N)].png.
  // Cada linha usa a primeira animação existente da sua lista de preferência;
  // linhas sem animação repetem o frame estático. Colunas = maior nº de
  // frames; animações mais curtas ciclam (i % n).
  // Linhas (N, NE, E, SE, S, SW, W, NW).
  const ROW_PREFS = prefs ?? [
    ["costas_direita", "costas"],
    ["costas_direita", "costas"],
    ["direita", "frente_direita"],
    ["frente_direita", "direita", "frente"],
    ["frente", "frente_direita"],
    ["frente_esquerda", "esquerda", "frente"],
    ["esquerda", "frente_esquerda"],
    ["costas_esquerda", "costas"],
  ];
  const numOf = (f) => { const m = f.match(/(\d+)(?=\.[^.]+$)/); return m ? Number(m[1]) : 0; };
  const idleDir = path.join(baseDir, "idle");
  const anims = new Map();
  const addFrame = (key, file) => {
    if (!anims.has(key)) anims.set(key, []);
    anims.get(key).push({ n: numOf(file), file });
  };
  const addDir = (key, folder) => {
    for (const f of fs.readdirSync(folder).filter((f) => f.toLowerCase().endsWith(".png")))
      addFrame(key, path.join(folder, f));
  };
  if (fs.existsSync(idleDir)) {
    for (const entry of fs.readdirSync(idleDir, { withFileTypes: true })) {
      const full = path.join(idleDir, entry.name);
      if (entry.isDirectory()) {
        addDir(strip(entry.name), full);
      } else if (entry.name.toLowerCase().endsWith(".png")) {
        const m = entry.name.match(/^idle_(.+?)(?:\s*\((\d+)\))?\.png$/i);
        if (!m) { console.warn(`ignorado em ${dir}/idle (nome fora do padrão idle_<direcao> [(N)].png): ${entry.name}`); continue; }
        addFrame(strip(m[1]), full);
      }
    }
  }
  // Layout alternativo (ex.: slime): pastas <prefixo>_idle_<direcao>/ na raiz.
  for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const m = entry.name.match(new RegExp(`^${prefix}_idle_(.+)$`, "i"));
    if (m) addDir(strip(entry.name), path.join(baseDir, entry.name));
  }
  for (const [key, list] of anims) {
    list.sort((a, b) => (a.n - b.n) || (a.file < b.file ? -1 : 1));
    anims.set(key, list.map((e) => ({ pixels: readPNG(e.file).pixels })));
  }
  const firstAnim = [...anims.values()].map((l) => l[0]?.pixels).find(Boolean);
  // Estático por linha: 4dir > base > 1º frame de animação.
  const order = STATIC_ROWS.map((key) =>
    staticByKey?.[key] ?? baseImg?.pixels ?? firstAnim ??
    (() => { throw Error(`sem arte para ${prefix} (nem 4dir, base ou animação)`); })());
  // Walk: sempre 1 coluna (frame estático por direção + balanço procedural).
  const walkOut = Buffer.alloc(W * H * 4);
  order.forEach((pixels, row) => blit(walkOut, 1, pixels, row, 0));
  const walkDest = path.join(baseDir, `${prefix}_walk.png`);
  fs.writeFileSync(walkDest, writePNG(W, H, walkOut));
  console.log("OK", path.relative(ROOT, walkDest), "32x256 colunas=1 linhas=8");
  const pick = (row) => {
    for (const k of ROW_PREFS[row]) {
      const anim = anims.get(k);
      if (anim) return { key: k, anim };
    }
    return null;
  };
  const picked = Array.from({ length: 8 }, (_, row) => pick(row));
  const cols = Math.max(1, ...picked.filter(Boolean).map((p) => p.anim.length));
  const idleOut = Buffer.alloc(W * cols * H * 4);
  for (let row = 0; row < 8; row++) {
    const anim = picked[row]?.anim;
    for (let col = 0; col < cols; col++) {
      blit(idleOut, cols, anim ? anim[col % anim.length].pixels : order[row], row, col);
    }
  }
  const idleDest = path.join(baseDir, `${prefix}_idle.png`);
  fs.writeFileSync(idleDest, writePNG(W * cols, H, idleOut));
  const animated = picked.map((p, row) => p ? `${row}:${p.key}x${p.anim.length}` : null).filter(Boolean);
  console.log("OK", path.relative(ROOT, idleDest), `${W * cols}x${H} colunas=${cols} linhas=8` +
    (animated.length ? ` (idle por direção: ${animated.join(", ")})` : ""));
  return { cols };
}

// Tabela no padrão pixel-art: [pasta-base, dir, prefixo, prefs?].
// prefs substitui a lista de preferência padrão das 8 linhas (N..NW).
// Para adicionar classe/inimigo novo, acrescente uma linha e rode:
// node scripts/spritegen/compose-fighter-shooter.cjs
const SLIME_PREFS = [
  ["costas_direita"], ["costas_direita"], ["direita"], ["direita"],
  ["direita"], ["esquerda"], ["esquerda"], ["costas_esquerda"],
];
const CLASSES = [
  ["sprite/player", "lutador", "lutador"],
  ["sprite/player", "atirador", "atirador"],
  ["sprite/player", "feiticeiro", "feiticeiro"],
  ["sprite/player", "tank", "tank"],
  ["sprite/enemy", "slime", "slime", SLIME_PREFS],
];
for (const [root, dir, prefix, prefs] of CLASSES) compose(root, dir, prefix, prefs);
