import Phaser from "phaser";
import { patchNoise, composition } from "../world/generation/Composition";
import type { Engine } from "../core/Engine";
import { worldToIso, chunkAt } from "../world/WorldCoordinates";
import { biomeRegistry } from "../data/biomes";
import { balance } from "../data/balance";
export class WorldRenderer {
  private chunks = new Map<string, Phaser.GameObjects.GameObject[]>();
  private crowns = new Map<
    string,
    Array<{ image: Phaser.GameObjects.Image; x: number; y: number }>
  >();
  private textures = new Map<string, string>();
  private poiViews = new Map<string, { chunk: string; sprite: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text }>();
  hitPoi(point: { x: number; y: number }) {
    let hit: string | undefined, depth = -Infinity;
    for (const [id, view] of this.poiViews) {
      const poi = this.e.world.chunks.get(view.chunk)?.pois.find(p => p.id === id);
      if (!poi || !this.e.canInteract(poi)) continue;
      if ((view.sprite.getBounds().contains(point.x, point.y) || view.label.getBounds().contains(point.x, point.y)) && view.sprite.depth > depth) {
        hit = id; depth = view.sprite.depth;
      }
    }
    return hit;
  }
  constructor(
    private scene: Phaser.Scene,
    private e: Engine,
  ) {}
  update() {
    const n = balance.chunkSize,
      tw = balance.tileWidth,
      th = balance.tileHeight;
    const center = chunkAt(this.e.selected.x, this.e.selected.y);
    const subjects = [
      this.e.selected,
      ...[...this.e.enemies.values()].filter(
        (e) => e.id === this.e.hovered?.id || e.id === this.e.selected.target,
      ),
    ].map(worldToIso);
    for (const list of this.crowns.values())
      for (const crown of list) {
        const hidden = subjects.some(
          (p) =>
            p.y < crown.y + 8 &&
            p.y > crown.y - 110 &&
            Math.abs(p.x - crown.x) < 51 &&
            p.y - 35 < crown.y - 30,
        );
        crown.image.alpha = Phaser.Math.Linear(
          crown.image.alpha,
          hidden ? 0.25 : 1,
          0.16,
        );
      }
    for (const [key, c] of this.e.world.chunks) {
      if (
        Math.max(Math.abs(c.cx - center.x), Math.abs(c.cy - center.y)) >
        balance.renderRadius
      )
        continue;
      if (this.chunks.has(key)) continue;
      const objects: Phaser.GameObjects.GameObject[] = [];
      const crowns: Array<{
        image: Phaser.GameObjects.Image;
        x: number;
        y: number;
      }> = [];
      this.crowns.set(key, crowns);
      for (const t of c.tiles) {
        const p = worldToIso(t);
        if (t.blocked) {
          const tex =
            t.biome === "desert"
              ? "cactus"
              : t.biome === "ice"
                ? "pine"
                : t.biome === "mountain"
                  ? "rock"
                  : t.variant < 3
                    ? "tree" + (t.variant % 3)
                    : "rock";
          if (tex.startsWith("tree") || tex === "pine") {
            const v = tex === "pine" ? 3 : Math.abs((t.x * 7 + t.y * 11) % 6),
              scale = 0.8 + (Math.abs(t.x + t.y) % 3) * 0.09;
            const trunk = this.scene.add
                .image(p.x, p.y + 22, "trunk" + v)
                .setOrigin(0.5, 0.9)
                .setDepth(p.y + 22)
                .setScale(scale),
              crown = this.scene.add
                .image(p.x, p.y + 22, "crown" + v)
                .setOrigin(0.5, 0.9)
                .setDepth(p.y + 23)
                .setScale(scale);
            objects.push(trunk, crown);
            crowns.push({ image: crown, x: p.x, y: p.y + 22 });
            continue;
          }
          const obj = this.scene.add
            .image(p.x, p.y + 22, tex)
            .setOrigin(0.5, 0.9)
            .setDepth(p.y + 22);
          if (tex.startsWith("tree")) obj.setScale(0.68 + t.variant * 0.065);
          objects.push(obj);
        }
      }
      const textureKey = "ground:" + key;
      const canvas = document.createElement("canvas");
      canvas.width = tw * n;
      canvas.height = th * (n + 1);
      const ctx = canvas.getContext("2d")!;
      const origin = worldToIso({ x: c.cx * n, y: c.cy * n });
      for (const t of c.tiles) {
        const pos = worldToIso(t),
          x = pos.x - origin.x + (tw * n) / 2,
          y = pos.y - origin.y;
        const b = biomeRegistry[t.biome],
          color = Phaser.Display.Color.ValueToColor(b.color);
        const road = Math.min(
          Math.abs(t.y - Math.sin(t.x / 19) * 3),
          Math.abs(t.x - Math.sin(t.y / 23) * 5),
        );
        color.brighten(
          patchNoise(this.e.run.seed + ":ground", t.x, t.y, 12) * 4 +
            ((this.e.run.worldVersion ?? 1) >= 2
              ? Math.max(0, 1 - road / 3) * 3
              : 0),
        );
        ctx.fillStyle = "#" + color.color.toString(16).padStart(6, "0");
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + tw / 2, y + th / 2);
        ctx.lineTo(x, y + th);
        ctx.lineTo(x - tw / 2, y + th / 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 1.1;
        ctx.stroke();

        if (t.decor === 2) {
          ctx.strokeStyle = t.biome === "desert" ? "#c1ae7a" : "#95a875";
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let i = 0; i < 3; i++) {
            ctx.moveTo(x + i * 4 - 5, y + 19);
            ctx.lineTo(x + i * 4 - 7, y + 14 - i);
          }
          ctx.stroke();
        }
        if (t.decor === 3) {
          ctx.fillStyle = "#b7b697";
          ctx.fillRect(x - 3, y + 15, 3, 2);
          ctx.fillRect(x + 4, y + 21, 2, 2);
        }
      }
      this.scene.textures.addCanvas(textureKey, canvas);
      this.textures.set(key, textureKey);
      objects.push(
        this.scene.add
          .image(origin.x - (tw * n) / 2, origin.y, textureKey)
          .setOrigin(0)
          .setDepth(-100000),
      );
      for (const p of c.pois) {
        const pos = worldToIso(p),
          tex =
            p.kind === "merchant"
              ? "merchant"
              : p.kind === "shrine"
                ? "shrine"
                : p.kind === "chest"
                  ? "chest"
                  : p.kind === "ruin"
                    ? "ruin"
                    : p.kind === "nest"
                      ? "nest"
                      : p.kind === "elite"
                        ? "elite"
                        : "rock";
        const sprite = this.scene.add
          .image(pos.x, pos.y, tex)
          .setOrigin(0.5, 0.86)
          .setDepth(pos.y);
        objects.push(sprite);
        if (p.kind === "merchant" || p.kind === "shrine")
          crowns.push({ image: sprite, x: pos.x, y: pos.y });
        const label = this.scene.add
          .text(
            pos.x,
            pos.y - 92,
            p.kind === "merchant"
              ? "Viajantes"
              : p.kind === "shrine"
                ? "Santuário"
                : p.kind === "chest"
                  ? "Achado"
                  : p.kind === "ruin"
                    ? "Ruína Antiga"
                    : p.kind === "nest"
                      ? "Covil Selvagem"
                      : p.kind === "elite"
                        ? "Desafio de Elite"
                        : p.kind,
            {
              fontFamily: "Georgia",
              fontSize: "12px",
              color: "#e4dcc3",
              backgroundColor: "#263a32cc",
              padding: { x: 7, y: 4 },
            },
          )
          .setOrigin(0.5)
          .setDepth(pos.y + 200);
        objects.push(label);
        this.poiViews.set(p.id, { chunk: key, sprite, label });
      }
      this.chunks.set(key, objects);
    }
    for (const [key, objects] of this.chunks) {
      const [x, y] = key.split(",").map(Number);
      if (
        Math.max(Math.abs(x - center.x), Math.abs(y - center.y)) >
          balance.renderRadius ||
        !this.e.world.chunks.has(key)
      ) {
        objects.forEach((o) => o.destroy());
        this.chunks.delete(key);
        for (const [id, view] of this.poiViews) if (view.chunk === key) this.poiViews.delete(id);
        this.crowns.delete(key);
        const tex = this.textures.get(key);
        if (tex) this.scene.textures.remove(tex);
        this.textures.delete(key);
      }
    }
    for (const [id, view] of this.poiViews) {
      const poi = this.e.world.chunks.get(view.chunk)?.pois.find(p => p.id === id);
      const available = !!poi && this.e.canInteract(poi);
      const highlighted = available && this.e.hovered?.kind === "poi" && this.e.hovered.id === id && this.e.meta.settings.hoverHighlight !== false;
      if (highlighted) view.sprite.setTint(0xffe5a5).setAlpha(1);
      else view.sprite.clearTint();
      view.label.setColor(highlighted ? "#fff1b9" : available ? "#e4dcc3" : "#9aa69b");
      view.label.setBackgroundColor(highlighted ? "#526346ee" : "#263a32cc");
    }
  }
  destroy() {
    for (const objs of this.chunks.values()) objs.forEach((o) => o.destroy());
    this.chunks.clear();
    this.poiViews.clear();
    this.crowns.clear();
    for (const tex of this.textures.values()) this.scene.textures.remove(tex);
  }
}
