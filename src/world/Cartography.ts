import type { BiomeId, Chunk, Poi } from "../core/types";
import { sampleBiome, poisFor } from "./generation/WorldGenerator";
import { balance } from "../data/balance";
export interface MapSummary {
  cells: BiomeId[];
  pois: Poi[];
}
export function summarizeChunk(c: Chunk): MapSummary {
  const cells: BiomeId[] = [];
  const step = balance.chunkSize / 8;
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++)
      cells.push(
        c.tiles[Math.floor(y * step) * balance.chunkSize + Math.floor(x * step)]
          .biome,
      );
  return { cells, pois: c.pois };
}
export function reconstructSummary(seed: string, key: string): MapSummary {
  const [cx, cy] = key.split(",").map(Number),
    cells: BiomeId[] = [];
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++)
      cells.push(
        sampleBiome(
          seed,
          cx * balance.chunkSize + (x * balance.chunkSize) / 8,
          cy * balance.chunkSize + (y * balance.chunkSize) / 8,
        ),
      );
  return { cells, pois: poisFor(seed, cx, cy) };
}
