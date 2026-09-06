import { composition } from "./Composition";
import type { BiomeId, Chunk, Poi, Tile } from "../../core/types";
import { at, SeededRandom } from "../../utils/SeededRandom";
import { biomeRegistry } from "../../data/biomes";
import { balance, regionLevel } from "../../data/balance";
import { biomeScales, defaultWorldSettings, type WorldGenerationSettings } from "../../data/worldSettings";
import { poiRegistry, poiDefinition } from "../../data/pois";
import { populateChunk } from "./Population";
import { ambientSpawns } from "./AmbientGeneration";
const smooth = (t: number) => t * t * (3 - 2 * t);
function noise(seed: string, x: number, y: number, scale: number) {
  x /= scale;
  y /= scale;
  const ix = Math.floor(x),
    iy = Math.floor(y),
    fx = smooth(x - ix),
    fy = smooth(y - iy);
  const a = at(seed, ix, iy) * (1 - fx) + at(seed, ix + 1, iy) * fx,
    b = at(seed, ix, iy + 1) * (1 - fx) + at(seed, ix + 1, iy + 1) * fx;
  return a * (1 - fy) + b * fy;
}
export function fields(seed: string, x: number, y: number, settings = defaultWorldSettings) {
  const blend = smooth(Math.min(1, Math.hypot(x, y) / 55));
  const sample = (tag: string) => {
    const raw =
      noise(seed + tag, x, y, 85 * biomeScales[settings.biomeScale]) * 0.72 + noise(seed + tag, x, y, 29 * biomeScales[settings.biomeScale]) * 0.28;
    const origin =
      tag === ":moisture" ? 0.43 : tag === ":elevation" ? 0.52 : 0.5;
    return origin * (1 - blend) + raw * blend;
  };
  return {
    elevation: sample(":elevation"),
    moisture: sample(":moisture"),
    temperature: sample(":temperature"),
    wildness: sample(":wildness"),
  };
}
export function sampleBiome(seed: string, x: number, y: number, settings = defaultWorldSettings): BiomeId {
  const f = fields(seed, x, y, settings);
  if (f.temperature < 0.31) return "ice";
  if (f.elevation > 0.68) return "mountain";
  if (f.moisture > 0.62 && f.elevation < 0.49) return "swamp";
  if (f.temperature > 0.55 && f.moisture < 0.46) return "desert";
  if (f.moisture > 0.49) return "forest";
  return "plains";
}
export function poisFor(seed: string, cx: number, cy: number, version = 2, settings = defaultWorldSettings): Poi[] {
  if (cx === 0 && cy === 0)
    return [
      { id: "origin:merchant", kind: "merchant", x: 4, y: 2 },
      { id: "origin:chest", kind: "chest", x: 9, y: 1 },
      { id: "origin:shrine", kind: "shrine", x: 1, y: 9 },
    ];
  const macro = version >= 3 ? 2 : 3,
    mx = Math.floor(cx / macro),
    my = Math.floor(cy / macro),
    r = new SeededRandom(seed + ":poi:" + mx + "," + my);
  const px = mx * macro + r.int(0, macro - 1),
    py = my * macro + r.int(0, macro - 1);
  if (cx !== px || cy !== py) return [];
  const x = cx * balance.chunkSize + r.int(4, balance.chunkSize - 5),
    y = cy * balance.chunkSize + r.int(6, 25);
  if (version >= 3) {
    const biome = sampleBiome(seed, x, y, settings);
    const candidates = Object.entries(poiRegistry).filter(([,p]) => p.biomes.includes(biome) && (Math.hypot(x,y)>45 || p.safe));
    // Some biomes have no safe site near the starting area.
    if (!candidates.length) return [];
    const [variant, def] = r.pick(candidates);
    // Keep footprints inside their owning chunk and away from adjacent sites.
    const px = cx * 32 + Math.max(7, Math.min(24, x-cx*32));
    const py = cy * 32 + Math.max(7, Math.min(24, y-cy*32));
    return [{id:`site:${mx},${my}`, x:px, y:py, kind:def.kind, variant}];
  }
  return [
    {
      id: "poi:" + mx + "," + my,
      x,
      y,
      kind: r.pick([
        "merchant",
        "shrine",
        "ruin",
        "chest",
        "nest",
        "elite",
      ] as const),
    },
  ];
}
export function sampleTile(
  seed: string,
  x: number,
  y: number,
  pois?: Poi[],
  version = 2,
  settings: WorldGenerationSettings = defaultWorldSettings,
): Tile {
  const biome = sampleBiome(seed, x, y, settings),
    b = biomeRegistry[biome];
  const nearby =
    pois ??
    poisFor(
      seed,
      Math.floor(x / balance.chunkSize),
      Math.floor(y / balance.chunkSize),
      version, settings,
    );
  const clear =
    Math.hypot(x, y) < balance.safeRadius ||
    nearby.some((p) => Math.hypot(x - p.x, y - p.y) < (poiDefinition(p)?.radius ?? 3)) ||
    Math.abs(y) < 1 ||
    Math.abs(x) < 1;
  const comp = composition(seed, x, y);
  const n = at(seed + ":vegetation", x, y);
  const threshold = b.vegetation * (version >= 2 ? comp.density : 1);
  const open = clear || (version >= 2 && (comp.trail || comp.clearing));
  return {
    x,
    y,
    biome,
    blocked: !open && n < threshold,
    decor: open ? 0 : n < threshold ? 1 : n < 0.3 ? 2 : n < 0.37 ? 3 : 0,
    cost: biome === "swamp" ? 1.3 : biome === "mountain" ? 1.2 : 1,
    variant: Math.floor(at(seed + ":terrain", x, y) * 5),
  };
}
export function generateChunk(
  seed: string,
  cx: number,
  cy: number,
  version = 2,
  settings: WorldGenerationSettings = defaultWorldSettings,
): Chunk {
  const pois = poisFor(seed, cx, cy, version, settings),
    tiles: Tile[] = [],
    spawns: Chunk["spawns"] = [];
  for (let y = 0; y < balance.chunkSize; y++)
    for (let x = 0; x < balance.chunkSize; x++)
      tiles.push(
        sampleTile(
          seed,
          cx * balance.chunkSize + x,
          cy * balance.chunkSize + y,
          pois,
          version,
          settings,
        ),
      );
  if (version >= 3) {
    const chunk: Chunk = {key:cx+","+cy,cx,cy,tiles,pois,spawns};
    const nearbyPois: Poi[] = [];
    for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++)
      nearbyPois.push(...poisFor(seed,cx+dx,cy+dy,version,settings));
    populateChunk(seed, chunk, settings, nearbyPois);
    chunk.ambient = ambientSpawns(seed, chunk);
    return chunk;
  }
  const r = new SeededRandom(seed + ":enemy:" + cx + "," + cy);
  for (let i = 0; i < 12; i++) {
    const x = cx * balance.chunkSize + r.int(2, balance.chunkSize - 3) + 0.5,
      y = cy * balance.chunkSize + r.int(2, 29) + 0.5;
    if (
      Math.hypot(x, y) < 11 ||
      pois.some((p) => Math.hypot(x - p.x, y - p.y) < 4) ||
      sampleTile(seed, Math.floor(x), Math.floor(y), pois, version).blocked
    )
      continue;
    const b = biomeRegistry[sampleBiome(seed, x, y)];
    spawns.push({
      id: "spawn:" + cx + "," + cy + ":" + i,
      x,
      y,
      definition: r.pick(b.enemyPool),
      level: regionLevel(x, y, b.danger),
      elite: r.next() < 0.06,
    });
  }
  if (cx === 0 && cy === 0) {
    for (let i = 0; i < 3; i++)
      spawns.push({
        id: "first:" + i,
        x: 12 + i * 2,
        y: 2,
        definition: i === 2 ? "boar" : "slime",
        level: 1,
        elite: false,
      });
  }
  for (const p of pois)
    if (p.kind === "elite" || p.kind === "nest")
      spawns.push({
        id: p.id + ":guard",
        x: p.x + 1,
        y: p.y,
        definition: "golem",
        level: regionLevel(p.x, p.y),
        elite: true,
      });
  return { key: cx + "," + cy, cx, cy, tiles, pois, spawns };
}
