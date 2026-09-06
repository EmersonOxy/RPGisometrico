import type Phaser from "phaser";
import type { Enemy } from "../core/types";
import { enemySpriteConfig } from "./EnemySpriteConfig";
import { playerFrameRect } from "./PlayerSprites";
import { silhouetteBounds } from "./SpriteMetrics";

const registrations = new WeakMap<Phaser.Textures.Texture, Map<string, { x: number; y: number; height: number }>>();
export function enemyFrameRegistration(texture: Phaser.Textures.Texture, frame: Phaser.Textures.Frame) {
  return registrations.get(texture)?.get(String(frame.name)) ?? { x: frame.width / 2, y: frame.height, height: frame.height };
}

export function loadEnemySheets(scene: Phaser.Scene) {
  for (const config of Object.values(enemySpriteConfig)) {
    for (const s of [config.idle, config.walk].filter(Boolean)) {
      scene.load.image(s!.key, s!.url);
    }
  }
}

export function createEnemyFrames(scene: Phaser.Scene) {
  for (const [defId, config] of Object.entries(enemySpriteConfig)) {
    for (const s of [config.idle, config.walk].filter(Boolean)) {
      if (!scene.textures.exists(s!.key)) continue;
      const texture = scene.textures.get(s!.key);
      // NEAREST (= 1) sem importar o Phaser como valor: este módulo também
      // roda nos testes em Node, onde o bundle do Phaser não carrega.
      if (s!.filter === "nearest") texture.setFilter(1 as Phaser.Textures.FilterMode);
      const source = texture.getSourceImage();
      const w = source.width;
      const h = source.height;
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context?.drawImage(source as CanvasImageSource, 0, 0);
      const pixels = context?.getImageData(0, 0, w, h);
      const data = new Map<string, { x: number; y: number; height: number }>();
      for (let row = 0; row < s!.rows; row++) {
        for (let col = 0; col < s!.columns; col++) {
          const rect = playerFrameRect(w, h, s!.columns, row, col, s!.rows);
          const name = `${row}:${col}`;
          if (!texture.has(name)) texture.add(name, 0, rect.x, rect.y, rect.width, rect.height);
          data.set(name, pixels ? silhouetteBounds(pixels, rect) : { x: rect.width * config.anchorX, y: rect.height * config.anchorY, height: rect.height });
        }
      }
      const heights = [...data.values()].map(f => f.height).sort((a, b) => a - b);
      const referenceHeight = heights[Math.floor(heights.length / 2)];
      for (const value of data.values()) value.height = referenceHeight;
      registrations.set(texture, data);
    }
  }
}

function enemyDirection(dx: number, dy: number): number {
  const screenX = (dx - dy) * 32;
  const screenY = (dx + dy) * 16;
  return (Math.round((Math.atan2(screenY, screenX) + Math.PI / 2) / (Math.PI / 4)) + 8) % 8;
}

export class EnemyAnimation {
  private x: number;
  private y: number;
  private direction: number;
  private elapsed = 0;
  private walking = false;

  constructor(e: Enemy) {
    this.x = e.x;
    this.y = e.y;
    this.direction = 4;
  }

  update(
    e: Enemy,
    dt: number,
    paused: boolean,
    reducedMotion: boolean,
  ): { key: string; frame: string } | null {
    const config = enemySpriteConfig[e.definition];
    if (!config) return null;

    const dist = Math.hypot(e.x - this.x, e.y - this.y);
    // Deslize de knockback não é passo voluntário: não vira nem anima andar.
    const knocked = Boolean(e.knockX || e.knockY);
    const moved = !knocked && dist > 0.0001 && dist < 3;

    if (!paused && e.hp > 0) {
      if (moved) this.direction = enemyDirection(e.x - this.x, e.y - this.y);
      if (this.walking !== moved) { this.walking = moved; this.elapsed = 0; }
      this.elapsed += dt;
    }

    this.x = e.x;
    this.y = e.y;

    const hasWalk = Boolean(config.walk);
    const mode = this.walking && hasWalk && e.hp > 0 ? "walk" : "idle";
    const s = mode === "walk" ? config.walk! : config.idle;
    const col = e.hp <= 0 || (reducedMotion && mode === "idle")
      ? 0
      : Math.floor(this.elapsed * s.fps) % s.columns;
    const row = config.directionMap ? config.directionMap[this.direction] : this.direction;

    return { key: s.key, frame: `${row}:${col}` };
  }
}
