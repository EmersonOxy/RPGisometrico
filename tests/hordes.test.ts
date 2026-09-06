import { describe, it, expect, afterEach } from "vitest";
import { Engine } from "../src/core/Engine";
import { EventBus } from "../src/core/EventBus";
import { defaultMeta } from "../src/persistence/SaveRepository";
import { newRun } from "../src/core/Run";
import { generateChunk } from "../src/world/generation/WorldGenerator";
import { populateChunk } from "../src/world/generation/Population";
import { enemyRegistry } from "../src/data/enemies";
import type { Chunk } from "../src/core/types";

const engines: Engine[] = [];
afterEach(() => engines.splice(0).forEach((e) => e.destroy()));

function populated(seed: string, difficulty: "explorer" | "brutal") {
  const out = [];
  for (let cx = -2; cx <= 2; cx++) for (let cy = -2; cy <= 2; cy++) {
    if (cx === 0 && cy === 0) continue;
    const chunk = generateChunk(seed, cx, cy);
    chunk.pois = [];
    chunk.spawns = [];
    populateChunk(seed, chunk, { biomeScale: "standard", difficulty, threatDensity: "normal" });
    out.push(chunk);
  }
  return out;
}

describe("Hordas por dificuldade", () => {
  it("explorador nunca tem horda; brutal agrupa mesma definição", () => {
    const plain = populated("qa", "explorer");
    expect(plain.flatMap((c) => c.spawns).some((s) => s.encounterId?.startsWith("horde:"))).toBe(false);
    const hard = populated("qa", "brutal");
    const hordes = new Map<string, typeof hard[0]["spawns"]>();
    for (const c of hard) for (const s of c.spawns) {
      if (!s.encounterId?.startsWith("horde:")) continue;
      if (!hordes.has(s.encounterId)) hordes.set(s.encounterId, []);
      hordes.get(s.encounterId)!.push(s);
    }
    expect(hordes.size).toBeGreaterThan(0);
    for (const members of hordes.values()) {
      expect(members.length).toBeGreaterThanOrEqual(2);
      expect(new Set(members.map((s) => s.definition)).size).toBe(1);
    }
  });
  it("variantes usam paleta válida e escalam a vida ao carregar", () => {
    const hard = populated("qa", "brutal");
    const withVariant = hard.flatMap((c) => c.spawns).filter((s) => s.variant);
    expect(withVariant.length).toBeGreaterThan(0);
    for (const s of withVariant) {
      const palette = enemyRegistry[s.definition].variants ?? [];
      expect(s.variant).toBeGreaterThanOrEqual(1);
      expect(s.variant).toBeLessThanOrEqual(palette.length);
    }
    const m = defaultMeta(), r = newRun("qa", "fighter", m);
    const e = new Engine(r, m, new EventBus(), async () => {});
    engines.push(e);
    const chunk = {
      key: "9,9", cx: 9, cy: 9, tiles: [], pois: [],
      spawns: [
        { id: "v:0", x: e.selected.x + 1, y: e.selected.y, definition: "slime", level: 5, elite: false, variant: 0 },
        { id: "v:1", x: e.selected.x + 2, y: e.selected.y, definition: "slime", level: 5, elite: false, variant: 1 },
      ],
    } as unknown as Chunk;
    e.loaded(chunk);
    const base = 42 * (1 + 0.18 * 4);
    expect(e.enemies.get("v:0")?.maxHp).toBeCloseTo(base);
    expect(e.enemies.get("v:1")?.maxHp).toBeCloseTo(base * 1.15);
    expect(e.enemies.get("v:1")?.variant).toBe(1);
  });
});
