import type { Engine } from "../core/Engine";
import type { Point, Poi, BiomeId } from "../core/types";
import { sampleBiome } from "../world/generation/WorldGenerator";
import { balance } from "../data/balance";
import { biomeRegistry } from "../data/biomes";
import { reconstructSummary } from "../world/Cartography";
import { icon } from "./Icons";
import { esc } from "./Components";
const mapColors: Record<BiomeId, string> = {
  plains: "#b4b48c",
  forest: "#8d9f7c",
  desert: "#c4b18a",
  swamp: "#94aaa0",
  ice: "#c5d1c5",
  mountain: "#a7aa97",
};
export interface AtlasState {
  x: number;
  y: number;
  zoom: number;
  initialized: boolean;
}
export function atlasMarkup(seed: string) {
  return (
    '<section class="atlas-book"><header class="screen-heading"><div><small>Cadernos dos caminhos</small><h2>Atlas da expedição</h2></div><div class="atlas-tools"><button data-action="atlas-zoom" data-id="out" aria-label="Diminuir mapa">−</button><button data-action="atlas-home">' +
    icon("compass") +
    'Minha posição</button><button data-action="atlas-zoom" data-id="in" aria-label="Ampliar mapa">+</button></div></header><div class="atlas-surface"><canvas id="atlas-canvas" tabindex="0" aria-label="Mapa da expedição, arraste para navegar"></canvas><div class="atlas-caption"><span>Terra incógnita</span><i>As páginas se preenchem<br>sob nossos passos.</i></div><div class="atlas-poi" hidden></div></div><footer class="screen-footer"><div class="map-legend">' +
    icon("compass") +
    " Grupo " +
    icon("merchant") +
    " Viajantes " +
    icon("shrine") +
    " Santuário " +
    icon("chest") +
    ' Achados</div><span>Arraste · roda para zoom · WASD / setas · Home · duplo clique marca</span><button data-action="copy" data-tip="seed:' +
    esc(seed) +
    '">Semente</button></footer></section>'
  );
}
export class AtlasView {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private abort = new AbortController();
  private observer: ResizeObserver;
  private raf = 0;
  private hits: Array<Poi & { sx: number; sy: number }> = [];
  private start?: { x: number; y: number; px: number; py: number };
  private moved = false;
  private selected?: string;
  private coarse = new Map<string, BiomeId>();
  constructor(
    private root: HTMLElement,
    private e: Engine,
    public state: AtlasState,
  ) {
    this.canvas = root.querySelector("#atlas-canvas")!;
    this.ctx = this.canvas.getContext("2d")!;
    if (!state.initialized) {
      state.x = e.selected.x;
      state.y = e.selected.y;
      state.initialized = true;
    }
    this.observer = new ResizeObserver(() => this.draw());
    this.observer.observe(this.canvas);
    const opts = { signal: this.abort.signal };
    this.canvas.addEventListener(
      "pointerdown",
      (ev) => {
        if (ev.button !== 0 && ev.button !== 1) return;
        this.start = { x: ev.clientX, y: ev.clientY, px: state.x, py: state.y };
        this.moved = false;
        this.canvas.setPointerCapture(ev.pointerId);
      },
      opts,
    );
    this.canvas.addEventListener(
      "pointermove",
      (ev) => {
        const rect = this.canvas.getBoundingClientRect(),
          x = ev.clientX - rect.left,
          y = ev.clientY - rect.top;
        if (this.start) {
          const dx = ev.clientX - this.start.x,
            dy = ev.clientY - this.start.y;
          if (Math.hypot(dx, dy) > 4) this.moved = true;
          state.x = this.start.px - dx / state.zoom;
          state.y = this.start.py - dy / state.zoom;
          this.draw();
        } else {
          const poi = this.hits.find(
            (p) => Math.hypot(p.sx - x, p.sy - y) < 18,
          );
          this.canvas.style.cursor = poi ? "pointer" : "grab";
          const tip = root.querySelector<HTMLElement>(".atlas-poi")!;
          tip.hidden = !poi;
          if (poi) {
            tip.textContent = this.poiName(poi);
            tip.style.left = Math.min(x + 15, rect.width - 210) + "px";
            tip.style.top = Math.max(10, y - 40) + "px";
          }
        }
      },
      opts,
    );
    this.canvas.addEventListener(
      "pointerup",
      (ev) => {
        if (!this.moved) {
          const r = this.canvas.getBoundingClientRect();
          const clickWorldX = state.x + (ev.clientX - r.left - r.width / 2) / state.zoom;
          const clickWorldY = state.y + (ev.clientY - r.top - r.height / 2) / state.zoom;
          const poi = this.hits.find(
            (p) =>
              Math.hypot(
                p.sx - ev.clientX + r.left,
                p.sy - ev.clientY + r.top,
              ) < 18,
          );
          if (poi) {
            this.selected = poi.id;
            e.run.marker = { x: poi.x, y: poi.y };
            e.bus.emit("notice", this.poiName(poi) + " marcado no mapa");
          } else {
            e.run.marker = { x: clickWorldX, y: clickWorldY };
            e.bus.emit("notice", `Ponto marcado (${Math.round(clickWorldX)}, ${Math.round(clickWorldY)})`);
          }
          void e.save();
        }
        this.start = undefined;
        this.draw();
      },
      opts,
    );
    this.canvas.addEventListener(
      "contextmenu",
      (ev) => {
        ev.preventDefault();
        e.run.marker = undefined;
        this.selected = undefined;
        e.bus.emit("notice", "Marcador removido");
        this.draw();
      },
      opts,
    );
    this.canvas.addEventListener(
      "dblclick",
      (ev) => {
        const r = this.canvas.getBoundingClientRect();
        e.run.marker = {
          x: state.x + (ev.clientX - r.left - r.width / 2) / state.zoom,
          y: state.y + (ev.clientY - r.top - r.height / 2) / state.zoom,
        };
        void e.save();
        this.draw();
      },
      opts,
    );
    this.canvas.addEventListener(
      "wheel",
      (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const r = this.canvas.getBoundingClientRect(),
          dx = ev.clientX - r.left - r.width / 2,
          dy = ev.clientY - r.top - r.height / 2,
          before = state.zoom;
        this.zoom(Math.exp(-ev.deltaY * 0.001));
        state.x += dx / before - dx / state.zoom;
        state.y += dy / before - dy / state.zoom;
        this.draw();
      },
      { ...opts, passive: false },
    );
    window.addEventListener(
      "keydown",
      (ev) => {
        const d: Record<string, number[]> = {
          KeyW: [0, -1],
          ArrowUp: [0, -1],
          KeyS: [0, 1],
          ArrowDown: [0, 1],
          KeyA: [-1, 0],
          ArrowLeft: [-1, 0],
          KeyD: [1, 0],
          ArrowRight: [1, 0],
        };
        if (d[ev.code]) {
          ev.preventDefault();
          state.x += (d[ev.code][0] * 40) / state.zoom;
          state.y += (d[ev.code][1] * 40) / state.zoom;
          this.draw();
        }
        if (ev.code === "Home") {
          ev.preventDefault();
          this.home();
        }
      },
      opts,
    );
    this.draw();
  }
  private poiName(p: Poi) {
    return (
      {
        merchant: "Acampamento dos viajantes",
        shrine: "Santuário",
        chest: "Baú",
        ruin: "Ruína",
        nest: "Ninho",
        elite: "Encontro de elite",
      }[p.kind] + (this.e.run.deltas[p.id] ? " · explorado" : "")
    );
  }
  zoom(f: number) {
    this.state.zoom = Math.max(0.5, Math.min(18, this.state.zoom * f));
    this.draw();
  }
  home() {
    this.state.x = this.e.selected.x;
    this.state.y = this.e.selected.y;
    this.draw();
  }
  draw() {
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => this.render());
  }
  private render() {
    const r = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(r.width);
    this.canvas.height = Math.round(r.height);
    const w = this.canvas.width,
      h = this.canvas.height,
      ctx = this.ctx,
      s = this.state,
      n = balance.chunkSize;
    ctx.fillStyle = "#cecbb3";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#898e7440";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 38) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + h * 0.23, h);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(w / 2, h / 2);
    this.hits = [];
    let generated = 0,
      more = false;
    const summaries = (this.e.run.cartography ??= {});
    for (const key of this.e.run.discovered) {
      const [cx, cy] = key.split(",").map(Number),
        x = (cx * n - s.x) * s.zoom,
        y = (cy * n - s.y) * s.zoom,
        size = n * s.zoom;
      if (x > w / 2 || y > h / 2 || x + size < -w / 2 || y + size < -h / 2)
        continue;
      let data = summaries[key];
      if (!data) {
        if (s.zoom < 2) {
          let biome = this.coarse.get(key);
          if (!biome) {
            biome = sampleBiome(
              this.e.run.seed,
              cx * n + n / 2,
              cy * n + n / 2,
              this.e.run.worldSettings,
            );
            this.coarse.set(key, biome);
          }
          data = { cells: Array(64).fill(biome), pois: [] };
        } else {
          if (generated++ > 6) {
            more = true;
            continue;
          }
          data = summaries[key] = reconstructSummary(this.e.run.seed, key, this.e.run.worldVersion, this.e.run.worldSettings);
        }
      }
      const cell = size / 8;
      for (let i = 0; i < 64; i++) {
        const lx = (i % 8) * 2;
        const ly = Math.floor(i / 8) * 2;
        const isDisc = this.e.discoveryMask
          ? this.e.discoveryMask.isCellDiscovered(cx, cy, lx, ly) ||
            this.e.discoveryMask.isCellDiscovered(cx, cy, lx + 1, ly) ||
            this.e.discoveryMask.isCellDiscovered(cx, cy, lx, ly + 1) ||
            this.e.discoveryMask.isCellDiscovered(cx, cy, lx + 1, ly + 1)
          : true;

        if (!isDisc) continue;

        const bx = x + (i % 8) * cell,
          by = y + Math.floor(i / 8) * cell;
        ctx.fillStyle = mapColors[data.cells[i]];
        ctx.fillRect(bx, by, cell + 1, cell + 1);
        if (s.zoom > 3 && i % 3 === 0) {
          ctx.strokeStyle = "#50694e66";
          ctx.lineWidth = 1;
          ctx.beginPath();
          const m = cell / 2;
          if (data.cells[i] === "forest") {
            ctx.moveTo(bx + m - 3, by + m + 3);
            ctx.lineTo(bx + m, by + m - 4);
            ctx.lineTo(bx + m + 3, by + m + 3);
            ctx.moveTo(bx + m, by + m);
            ctx.lineTo(bx + m, by + m + 6);
          }
          if (data.cells[i] === "mountain") {
            ctx.moveTo(bx + m - 5, by + m + 4);
            ctx.lineTo(bx + m, by + m - 4);
            ctx.lineTo(bx + m + 5, by + m + 4);
          }
          if (data.cells[i] === "swamp") {
            ctx.moveTo(bx + m - 4, by + m);
            ctx.quadraticCurveTo(bx + m, by + m - 3, bx + m + 5, by + m);
          }
          ctx.stroke();
        }
      }
      for (const p of data.pois) {
        if (this.e.discoveryMask && !this.e.discoveryMask.isWorldPointDiscovered(p.x, p.y)) {
          continue;
        }
        const px = (p.x - s.x) * s.zoom,
          py = (p.y - s.y) * s.zoom;
        ctx.fillStyle = p.id === this.selected ? "#8a543e" : "#485e45";
        ctx.strokeStyle = "#e5dfbd";
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (p.kind === "merchant") {
          ctx.moveTo(px - 8, py + 6);
          ctx.lineTo(px, py - 8);
          ctx.lineTo(px + 8, py + 6);
          ctx.closePath();
        } else if (p.kind === "shrine") {
          ctx.rect(px - 4, py - 7, 8, 14);
          ctx.moveTo(px - 7, py - 2);
          ctx.lineTo(px + 7, py - 2);
        } else if (p.kind === "chest") {
          ctx.rect(px - 6, py - 4.5, 12, 9);
        } else if (p.kind === "ruin") {
          ctx.rect(px - 7, py - 7, 3.5, 14);
          ctx.rect(px + 3.5, py - 7, 3.5, 14);
          ctx.rect(px - 8, py - 7, 16, 3.5);
        } else if (p.kind === "nest") {
          ctx.arc(px, py, 6, 0, 7);
          ctx.moveTo(px - 3, py - 3);
          ctx.lineTo(px + 3, py + 3);
          ctx.moveTo(px + 3, py - 3);
          ctx.lineTo(px - 3, py + 3);
        } else if (p.kind === "elite") {
          ctx.moveTo(px, py - 8);
          ctx.lineTo(px + 7, py);
          ctx.lineTo(px, py + 8);
          ctx.lineTo(px - 7, py);
          ctx.closePath();
        } else {
          ctx.arc(px, py, 5, 0, 7);
        }
        ctx.fill();
        ctx.stroke();
        this.hits.push({ ...p, sx: px + w / 2, sy: py + h / 2 });
      }
      if (size > 170) {
        ctx.fillStyle = "#41553a99";
        ctx.font = "italic 16px Georgia";
        ctx.textAlign = "center";
        ctx.fillText(
          biomeRegistry[data.cells[27]].name,
          x + size / 2,
          y + size * 0.76,
        );
      }
    }
    for (const c of this.e.run.party) {
      if (!c.alive) continue;
      const x = (c.x - s.x) * s.zoom,
        y = (c.y - s.y) * s.zoom;
      const facing = c.facingAngle ?? -Math.PI / 2;
      const isControlled = c.id === this.e.selected.id;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(facing + Math.PI / 2);

      ctx.fillStyle = isControlled ? "#923f32" : "#42654d";
      ctx.strokeStyle = "#eee4bf";
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (isControlled) {
        ctx.moveTo(0, -10);
        ctx.lineTo(7, 8);
        ctx.lineTo(0, 3.5);
        ctx.lineTo(-7, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.moveTo(0, -7.5);
        ctx.lineTo(5.5, 6);
        ctx.lineTo(0, 2.5);
        ctx.lineTo(-5.5, 6);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    }
    if (this.e.run.marker) {
      const p = this.e.run.marker,
        x = (p.x - s.x) * s.zoom,
        y = (p.y - s.y) * s.zoom;
      ctx.strokeStyle = "#8e533d";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y + 9);
      ctx.lineTo(x, y - 12);
      ctx.lineTo(x + 12, y - 8);
      ctx.lineTo(x, y - 3);
      ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.translate(w - 62, 60);
    ctx.strokeStyle = "#596447";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 27, 0, 7);
    ctx.moveTo(0, -35);
    ctx.lineTo(0, 35);
    ctx.moveTo(-35, 0);
    ctx.lineTo(35, 0);
    ctx.stroke();
    ctx.fillStyle = "#596447";
    ctx.font = "15px Georgia";
    ctx.fillText("N", -5, -40);
    ctx.restore();
    if (more) this.draw();
  }
  destroy() {
    cancelAnimationFrame(this.raf);
    this.observer.disconnect();
    this.abort.abort();
  }
}
