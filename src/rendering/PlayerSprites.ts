import type Phaser from "phaser";
import type { Character } from "../core/types";
import { playerSpriteConfig } from "./PlayerSpriteConfig";

export function playerDirection(dx: number, dy: number) {
  const screenX = (dx - dy) * 32, screenY = (dx + dy) * 16;
  return (Math.round((Math.atan2(screenY, screenX) + Math.PI / 2) / (Math.PI / 4)) + 8) % 8;
}

export function playerFrameRect(width: number, height: number, columns: number, row: number, column: number, rows = 8) {
  const x = Math.round(column * width / columns), y = Math.round(row * height / rows);
  return { x, y, width: Math.round((column + 1) * width / columns) - x, height: Math.round((row + 1) * height / rows) - y };
}

type Registration = { x: number; y: number; height: number };
const registrations = new WeakMap<Phaser.Textures.Texture, Map<string, Registration>>();
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

// Read source alpha once at scene creation; never rewrite the supplied PNGs.
// The head is the reference so weapons and alternating feet do not drag the
// character sideways as they would with a full-silhouette centroid.
function bodyAnchor(pixels: ImageData, rect: ReturnType<typeof playerFrameRect>) {
  const alpha = (x: number, y: number) => pixels.data[((rect.y + y) * pixels.width + rect.x + x) * 4 + 3];
  const occupied: number[] = [];
  for (let y = 0; y < rect.height; y++) {
    let count = 0;
    for (let x = 0; x < rect.width; x++) if (alpha(x, y) >= 128) count++;
    if (count >= Math.max(3, rect.width * .025)) occupied.push(y);
  }
  if (!occupied.length) return { x: rect.width / 2, top: 0, height: rect.height };
  const top = occupied[0], height = occupied[occupied.length - 1] + 1 - top;
  let sum = 0, weight = 0;
  for (let y = top; y < Math.min(rect.height, top + Math.max(1, Math.round(height * .18))); y++) {
    for (let x = 0; x < rect.width; x++) if (alpha(x, y) >= 128) { sum += x + .5; weight++; }
  }
  return { x: weight ? sum / weight : rect.width / 2, top, height };
}

export function loadPlayerSheets(scene: Phaser.Scene) {
  for (const config of Object.values(playerSpriteConfig))
    for (const sheet of Object.values(config.sheets)) scene.load.image(sheet.key, sheet.url);
}

export function createPlayerFrames(scene: Phaser.Scene) {
  for (const config of Object.values(playerSpriteConfig)) for (const sheet of Object.values(config.sheets)) {
    if (!scene.textures.exists(sheet.key)) continue;
    const texture = scene.textures.get(sheet.key), source = texture.getSourceImage();
    // NEAREST (= 1, Phaser.Textures.FilterMode.NEAREST) sem importar o
    // Phaser como valor: este módulo também roda nos testes em Node, onde
    // o bundle do Phaser não carrega (window undefined).
    if (sheet.filter === "nearest") texture.setFilter(1 as Phaser.Textures.FilterMode);
    const canvas = document.createElement("canvas");
    canvas.width = source.width; canvas.height = source.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    let pixels: ImageData | undefined;
    if (context && sheet.registration === "head") {
      context.drawImage(source as CanvasImageSource, 0, 0);
      pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    }
    const frames = [];
    for (let row = 0; row < sheet.rows; row++) for (let col = 0; col < sheet.columns; col++) {
      const rect = playerFrameRect(source.width, source.height, sheet.columns, row, col, sheet.rows);
      const name = `${row}:${col}`;
      if (!texture.has(name)) texture.add(name, 0, rect.x, rect.y, rect.width, rect.height);
      frames.push({ name, row, rect, anchor: pixels ? bodyAnchor(pixels, rect) : { x: rect.width / 2, top: 0, height: rect.height } });
    }
    const height = sheet.referenceHeight ?? median(frames.map(f => f.anchor.height));
    const data = new Map<string, Registration>();
    for (const f of frames) {
      // Keep a constant head-to-ground distance per direction, preserving poses
      // and leg movement while cancelling translation inside the source cells.
      const groundDistance = median(frames.filter(other => other.row === f.row).map(other => other.anchor.height));
      const pivot = sheet.pivots?.[f.name];
      data.set(f.name, { x: pivot?.x ?? f.anchor.x, y: pivot?.y ?? f.anchor.top + groundDistance, height });
    }
    registrations.set(texture, data);
  }
}

export function playerFrameRegistration(texture: Phaser.Textures.Texture, frame: Phaser.Textures.Frame) {
  return registrations.get(texture)?.get(String(frame.name)) ?? { x: frame.width / 2, y: frame.height, height: frame.height };
}

export class PlayerAnimation {
  private x: number;
  private y: number;
  private direction: number;
  private elapsed = 0;
  private walking = false;
  constructor(c: Character) {
    this.x = c.x; this.y = c.y;
    this.direction = playerDirection(Math.cos(c.facingAngle ?? 0), Math.sin(c.facingAngle ?? 0));
  }
  update(c: Character, dt: number, paused: boolean, reducedMotion: boolean) {
    const distance = Math.hypot(c.x - this.x, c.y - this.y);
    // Deslize de knockback não é passo voluntário: não vira nem anima andar.
    const knocked = Boolean(c.knockX || c.knockY);
    const moved = !knocked && distance > .0001 && distance < 3;
    if (!paused && c.alive) {
      if (moved) this.direction = playerDirection(c.x - this.x, c.y - this.y);
      else if (c.attackTime > 0) this.direction = playerDirection(Math.cos(c.facingAngle ?? 0), Math.sin(c.facingAngle ?? 0));
      if (this.walking !== moved) { this.walking = moved; this.elapsed = 0; }
      this.elapsed += dt;
    }
    this.x = c.x; this.y = c.y;
    const mode = this.walking && c.alive ? "walk" : "idle";
    const sheet = playerSpriteConfig[c.classId].sheets[mode];
    const column = !c.alive || (reducedMotion && mode === "idle") ? 0 : Math.floor(this.elapsed * sheet.fps) % sheet.columns;
    return { key: sheet.key, frame: `${sheet.directionRows[this.direction]}:${column}`, mode };
  }
}
