import type { Chunk, Point } from "../core/types";
import { balance } from "../data/balance";
import { chunkAt, chunkKey } from "./WorldCoordinates";
import { generateChunk, sampleTile } from "./generation/WorldGenerator";
import { defaultWorldSettings } from "../data/worldSettings";
export class ChunkManager {
  chunks = new Map<string, Chunk>();
  pending = new Set<string>();
  private worker?: Worker;
  private center = { x: 0, y: 0 };
  private disposed = false;
  constructor(
    public seed: string,
    private onLoad: (chunk: Chunk) => void,
    private onUnload: (key: string) => void,
    private version = 2,
    public settings = defaultWorldSettings,
  ) {
    try {
      if (typeof Worker !== "undefined") {
        this.worker = new Worker(
          new URL("../workers/worldgen.worker.ts", import.meta.url),
          { type: "module" },
        );
        this.worker.onmessage = (e: MessageEvent<Chunk>) => this.accept(e.data);
        this.worker.onerror = () => {
          this.worker?.terminate();
          this.worker = undefined;
          for (const key of [...this.pending]) {
            const [cx, cy] = key.split(",").map(Number);
            this.accept(generateChunk(seed, cx, cy, this.version, this.settings));
          }
        };
      }
    } catch {
      this.worker = undefined;
    }
  }
  private accept(chunk: Chunk) {
    this.pending.delete(chunk.key);
    if (
      this.disposed ||
      Math.max(
        Math.abs(chunk.cx - this.center.x),
        Math.abs(chunk.cy - this.center.y),
      ) > balance.preloadRadius
    )
      return;
    this.chunks.set(chunk.key, chunk);
    this.onLoad(chunk);
  }
  update(position: Point) {
    this.center = chunkAt(position.x, position.y);
    const r = balance.preloadRadius;
    for (let radius = 0; radius <= r; radius++)
      for (let y = -radius; y <= radius; y++)
        for (let x = -radius; x <= radius; x++) {
          if (Math.max(Math.abs(x), Math.abs(y)) !== radius) continue;
          const cx = this.center.x + x,
            cy = this.center.y + y,
            key = chunkKey(cx, cy);
          if (this.chunks.has(key) || this.pending.has(key)) continue;
          this.pending.add(key);
          if (this.worker)
            this.worker.postMessage({
              seed: this.seed,
              cx,
              cy,
              version: this.version,
              settings: this.settings,
            });
          else
            setTimeout(() => {
              if (!this.disposed)
                this.accept(generateChunk(this.seed, cx, cy, this.version, this.settings));
            }, 0);
        }
    for (const [key, c] of this.chunks)
      if (
        Math.max(
          Math.abs(c.cx - this.center.x),
          Math.abs(c.cy - this.center.y),
        ) > r
      ) {
        this.chunks.delete(key);
        this.onUnload(key);
      }
  }
  cell = (x: number, y: number) => {
    const c = chunkAt(x, y),
      chunk = this.chunks.get(chunkKey(c.x, c.y));
    return (
      chunk?.tiles[
        (y - c.y * balance.chunkSize) * balance.chunkSize +
          x -
          c.x * balance.chunkSize
      ] ?? sampleTile(this.seed, x, y, undefined, this.version, this.settings)
    );
  };
  destroy() {
    this.disposed = true;
    this.worker?.terminate();
    this.chunks.clear();
  }
}
