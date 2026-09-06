import Phaser from "phaser";
import { patchNoise, composition } from "../world/generation/Composition";
import type { Engine } from "../core/Engine";
import { worldToIso, chunkAt } from "../world/WorldCoordinates";
import { biomeRegistry } from "../data/biomes";
import { balance } from "../data/balance";
import { poiDefinition } from "../data/pois";
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
          // Pedras pixel-art: varia entre grande/média/pequenas por posição.
          const rockTex = ["rock-big", "rock-med", "rock-small-a", "rock-small-b"][
            Math.abs((t.x * 7 + t.y * 11) % 4)
          ];
          const tex =
            t.biome === "desert"
              ? "cactus"
              : t.biome === "ice"
                ? "pine"
                : t.biome === "mountain"
                  ? rockTex
                  : t.variant < 3
                    ? "tree" + (t.variant % 3)
                    : rockTex;
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
          if (tex.startsWith("rock-")) obj.setScale(2);
          objects.push(obj);
        }
      }
      const textureKey = "ground:" + key;
      const canvas = document.createElement("canvas");
      canvas.width = tw * n;
      canvas.height = th * (n + 1);
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      const origin = worldToIso({ x: c.cx * n, y: c.cy * n });
      // Vegetação rasteira (assets/sprite/vegetation + pedrinhas), assada no
      // chão. Cada bioma tem seu pool ponderado [textura, peso]: pesos
      // baixos = aparições raras (girassol/abóbora são acentos).
      const UNDERGROWTH: Record<string, [string, number][]> = {
        plains: [["veg-grass", 5], ["veg-bush-small", 3], ["veg-bush-med", 3], ["veg-sunflower", 1], ["veg-pumpkin", 1]],
        forest: [["veg-grass", 5], ["veg-bush-small", 4], ["veg-bush-med", 4], ["veg-sunflower", 1], ["veg-pumpkin", 1]],
        desert: [["veg-grass", 4], ["veg-bush-small", 2], ["rock-small-a", 2], ["rock-small-b", 1]],
        swamp: [["veg-grass", 5], ["veg-bush-small", 3], ["veg-bush-med", 2], ["veg-pumpkin", 1]],
        ice: [["veg-grass", 3], ["veg-bush-small", 1], ["rock-small-a", 1]],
        mountain: [["veg-grass", 3], ["veg-bush-small", 2], ["rock-small-a", 2], ["rock-small-b", 2]],
      };
      const SPRITE_SIZE: Record<string, number> = {
        "veg-grass": 32, "veg-bush-small": 32, "veg-bush-med": 56,
        "veg-sunflower": 60, "veg-pumpkin": 48,
        "rock-small-a": 32, "rock-small-b": 32,
      };
      const vegImgs = new Map<string, { img: CanvasImageSource; size: number }>();
      for (const [k, size] of Object.entries(SPRITE_SIZE))
        if (this.scene.textures.exists(k))
          vegImgs.set(k, { img: this.scene.textures.get(k).getSourceImage() as CanvasImageSource, size });
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

        if (t.decor === 2 || t.decor === 3) {
          const pool = UNDERGROWTH[t.biome] ?? UNDERGROWTH.plains;
          const total = pool.reduce((n, [, w]) => n + w, 0);
          let roll = Math.abs((t.x * 5 + t.y * 7 + t.decor) % total);
          let key = pool[0][0];
          for (const [k, w] of pool) {
            if (roll < w) { key = k; break; }
            roll -= w;
          }
          const veg = vegImgs.get(key);
          if (veg) {
            const jx = ((t.x * 3 + t.y * 5) % 9) - 4;
            ctx.drawImage(veg.img, x - veg.size / 2 + jx, y + 22 - veg.size, veg.size, veg.size);
          }
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
                          : "rock-med";
        const sprite = this.scene.add
          .image(pos.x, pos.y, tex)
          .setOrigin(0.5, 0.86)
          .setDepth(pos.y);
        if (tex.startsWith("rock-")) sprite.setScale(2);
        objects.push(sprite);
        const site=poiDefinition(p);
        if(site) {
          sprite.setTexture(site.pieces[0].texture).setScale(site.pieces[0].scale??1);
          for(const piece of site.pieces.slice(1)) {
            const at=worldToIso({x:p.x+piece.x,y:p.y+piece.y});
            objects.push(this.scene.add.image(at.x,at.y,piece.texture).setOrigin(.5,.86).setScale(piece.scale??1).setDepth(at.y));
          }
        }
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
        if(site)label.setText(site.name);
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
