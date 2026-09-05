import { balance, discovery } from "../data/balance";

export class DiscoveryMask {
  readonly cellsPerChunk = discovery.cellsPerChunk; // 16
  readonly cellSize = balance.chunkSize / discovery.cellsPerChunk; // 2 tiles per cell
  private masks = new Map<string, Uint32Array>(); // key -> Uint32Array of 8 (256 bits)

  constructor(serialized?: Record<string, number[]>, legacyDiscovered?: string[]) {
    if (serialized) {
      for (const [key, arr] of Object.entries(serialized)) {
        const u32 = new Uint32Array(8);
        for (let i = 0; i < Math.min(8, arr.length); i++) {
          u32[i] = arr[i] >>> 0;
        }
        this.masks.set(key, u32);
      }
    }
    // Legacy migration: if no mask exists but legacy chunks are discovered
    if (legacyDiscovered && legacyDiscovered.length > 0) {
      for (const key of legacyDiscovered) {
        if (!this.masks.has(key)) {
          const u32 = new Uint32Array(8);
          u32.fill(0xffffffff);
          this.masks.set(key, u32);
        }
      }
    }
  }

  isCellDiscovered(cx: number, cy: number, lx: number, ly: number): boolean {
    const key = `${cx},${cy}`;
    const mask = this.masks.get(key);
    if (!mask) return false;
    if (lx < 0 || lx >= this.cellsPerChunk || ly < 0 || ly >= this.cellsPerChunk) {
      return false;
    }
    const bitIndex = ly * this.cellsPerChunk + lx;
    const arrayIndex = bitIndex >> 5;
    const bitOffset = bitIndex & 31;
    return (mask[arrayIndex] & (1 << bitOffset)) !== 0;
  }

  isWorldPointDiscovered(worldX: number, worldY: number): boolean {
    const cx = Math.floor(worldX / balance.chunkSize);
    const cy = Math.floor(worldY / balance.chunkSize);
    const inChunkX = worldX - cx * balance.chunkSize;
    const inChunkY = worldY - cy * balance.chunkSize;
    const lx = Math.floor(inChunkX / this.cellSize);
    const ly = Math.floor(inChunkY / this.cellSize);
    return this.isCellDiscovered(cx, cy, lx, ly);
  }

  /**
   * Discovers cells around (worldX, worldY) in a circular pattern with subtle organic feathering.
   * Crosses chunk boundaries seamlessly.
   */
  discoverAround(
    worldX: number,
    worldY: number,
    radius = discovery.radius,
  ): { newlyTouchedChunks: string[]; cellCount: number } {
    const newlyTouchedChunks = new Set<string>();
    let cellCount = 0;

    const minWX = worldX - radius - 1;
    const maxWX = worldX + radius + 1;
    const minWY = worldY - radius - 1;
    const maxWY = worldY + radius + 1;

    const minCX = Math.floor(minWX / balance.chunkSize);
    const maxCX = Math.floor(maxWX / balance.chunkSize);
    const minCY = Math.floor(minWY / balance.chunkSize);
    const maxCY = Math.floor(maxWY / balance.chunkSize);

    for (let cy = minCY; cy <= maxCY; cy++) {
      for (let cx = minCX; cx <= maxCX; cx++) {
        const key = `${cx},${cy}`;
        let mask = this.masks.get(key);
        if (!mask) {
          mask = new Uint32Array(8);
          this.masks.set(key, mask);
          newlyTouchedChunks.add(key);
        }

        const chunkBaseX = cx * balance.chunkSize;
        const chunkBaseY = cy * balance.chunkSize;

        for (let ly = 0; ly < this.cellsPerChunk; ly++) {
          for (let lx = 0; lx < this.cellsPerChunk; lx++) {
            const cellCenterX = chunkBaseX + (lx + 0.5) * this.cellSize;
            const cellCenterY = chunkBaseY + (ly + 0.5) * this.cellSize;

            const dx = cellCenterX - worldX;
            const dy = cellCenterY - worldY;
            const dist = Math.hypot(dx, dy);

            // Subtle deterministic edge variation (feathering)
            const angle = Math.atan2(dy, dx);
            const noise =
              Math.sin(angle * 3 + cellCenterX * 0.15) * 0.4 +
              Math.cos(angle * 5 + cellCenterY * 0.2) * 0.3;
            const effectiveRadius = radius + noise;

            if (dist <= effectiveRadius) {
              const bitIndex = ly * this.cellsPerChunk + lx;
              const arrayIndex = bitIndex >> 5;
              const bitOffset = bitIndex & 31;
              const bit = 1 << bitOffset;

              if ((mask[arrayIndex] & bit) === 0) {
                mask[arrayIndex] |= bit;
                cellCount++;
                newlyTouchedChunks.add(key);
              }
            }
          }
        }
      }
    }

    return {
      newlyTouchedChunks: Array.from(newlyTouchedChunks),
      cellCount,
    };
  }

  serialize(): Record<string, number[]> {
    const result: Record<string, number[]> = {};
    for (const [key, mask] of this.masks) {
      result[key] = Array.from(mask);
    }
    return result;
  }

  getChunkMask(cx: number, cy: number): Uint32Array | undefined {
    return this.masks.get(`${cx},${cy}`);
  }

  getChunkBitfield(cx: number, cy: number): Uint32Array | undefined {
    return this.getChunkMask(cx, cy);
  }

  isDiscovered(worldX: number, worldY: number): boolean {
    return this.isWorldPointDiscovered(worldX, worldY);
  }

  static deserialize(serialized?: Record<string, number[]>): DiscoveryMask {
    return new DiscoveryMask(serialized);
  }

  hasChunk(cx: number, cy: number): boolean {
    return this.masks.has(`${cx},${cy}`);
  }
}
