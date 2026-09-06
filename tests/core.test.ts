import { giveTestKit } from "./skill-fixtures";
import { describe, it, expect, afterEach } from "vitest";
import "fake-indexeddb/auto";
import {
  sampleBiome,
  generateChunk,
  sampleTile,
} from "../src/world/generation/WorldGenerator";
import { chunkAt, worldToIso, isoToWorld } from "../src/world/WorldCoordinates";
import { xpRequiredForLevel } from "../src/data/balance";
import {
  createCharacter,
  addExperience,
  activeAbilities,
  coinMultiplier,
} from "../src/progression/Character";
import { generateItem } from "../src/loot/ItemGenerator";
import { affixRegistry } from "../src/data/affixes";
import {
  SaveRepository,
  defaultMeta,
  migrateSave,
} from "../src/persistence/SaveRepository";
import { newRun, killCharacter } from "../src/core/Run";
import { findPath, lineWalkable } from "../src/world/navigation/AStar";
import { classRegistry } from "../src/data/classes";
import { abilityRegistry } from "../src/data/abilities";
describe("Mundo determinístico", () => {
  it("01 mesma seed + coordenada gera mesmo bioma e chunk", () => {
    expect(generateChunk("urze", -2, 3)).toEqual(generateChunk("urze", -2, 3));
    expect(sampleBiome("urze", 240, 10)).toBe(sampleBiome("urze", 240, 10));
  });
  it("02 seeds diferentes produzem variação", () => {
    expect(generateChunk("A", 2, 2)).not.toEqual(generateChunk("B", 2, 2));
    const a = [],
      b = [];
    for (let x = -300; x < 300; x += 30) {
      a.push(sampleBiome("A", x, 90));
      b.push(sampleBiome("B", x, 90));
    }
    expect(a).not.toEqual(b);
  });
  it("03 chunks negativos usam floor", () => {
    expect(chunkAt(-0.1, -32.1)).toEqual({ x: -1, y: -2 });
    expect(generateChunk("A", -1, -1).tiles[0]).toMatchObject({
      x: -32,
      y: -32,
    });
  });
  it("projeção 2:1 faz round-trip", () => {
    const p = { x: -4.5, y: 8.2 },
      q = isoToWorld(worldToIso(p));
    expect(q.x).toBeCloseTo(p.x);
    expect(q.y).toBeCloseTo(p.y);
  });
  it("origem e POIs são caminháveis", () => {
    const c = generateChunk("A", 0, 0);
    expect(sampleTile("A", 0, 0).blocked).toBe(false);
    for (const p of c.pois)
      expect(sampleTile("A", p.x, p.y).blocked).toBe(false);
    expect(c.spawns.every((s) => Math.hypot(s.x, s.y) > 8)).toBe(true);
  });
  it("todos os seis biomas surgem em campos contínuos", () => {
    const ids = new Set();
    for (let x = -900; x <= 900; x += 30)
      for (let y = -900; y <= 900; y += 30)
        ids.add(sampleBiome("urze-7", x, y));
    expect(ids.size).toBe(6);
  });
});
describe("Progressão e loot", () => {
  it("04 XP cresce monotonicamente", () => {
    for (let i = 1; i < 10000; i++)
      expect(xpRequiredForLevel(i + 1)).toBeGreaterThan(xpRequiredForLevel(i));
  });
  it("05 não existe level cap", () => {
    const c = createCharacter("fighter", "c", 0, 0, 10000);
    addExperience(c, xpRequiredForLevel(c.level));
    expect(c.level).toBe(10001);
  });
  it("06 nenhum affix incompatível", () => {
    for (let i = 0; i < 500; i++) {
      const item = generateItem("item" + i, 1 + (i % 20), undefined, 4);
      for (const id of item.affixes) {
        const a = affixRegistry[id];
        expect(a.slots).toContain(item.slot);
        expect(
          !a.tags.length || a.tags.some((t) => item.tags.includes(t)),
        ).toBe(true);
      }
    }
  });
  it("07 Fire Jewel habilita Talho de brasa e Burn", () => {
    const c = createCharacter("fighter", "c");
    giveTestKit(c); c.jewels = ["fire"];
    expect(activeAbilities(c)[0]).toBe("flame");
    expect(abilityRegistry[activeAbilities(c)[0]].status).toBe("burn");
  });
  it("08 Fortune Tank altera moeda em 25%", () => {
    const c = createCharacter("tank", "c");
    expect(coinMultiplier([c], c)).toBe(1);
    c.jewels = ["fortune"];
    expect(coinMultiplier([c], c)).toBe(1.25);
  });
  it("quatro classes têm básico, quatro ativas e três passivas", () => {
    expect(Object.keys(classRegistry)).toHaveLength(4);
    for (const cls of Object.values(classRegistry)) {
      expect(abilityRegistry[cls.basic]).toBeDefined();
      expect(cls.abilities).toHaveLength(4);
      expect(cls.passives).toHaveLength(3);
      for (const a of cls.abilities) expect(abilityRegistry[a]).toBeDefined();
    }
  });
});
describe("Persistência e morte", () => {
  const repos: SaveRepository[] = [];
  const repo = () => {
    const r = new SaveRepository("test-" + Math.random());
    repos.push(r);
    return r;
  };
  afterEach(() => repos.splice(0).forEach((r) => r.close()));
  it("09 prata e ouro round-trip IndexedDB", async () => {
    const r = repo(),
      m = defaultMeta();
    m.silver = 128;
    m.gold = 7;
    await r.save(m, null);
    expect((await r.load()).meta).toMatchObject({ silver: 128, gold: 7 });
  });
  it("10 morte individual preserva meta e seleciona sobrevivente", () => {
    const m = defaultMeta(),
      r = newRun("a", "fighter", m);
    r.party.push(createCharacter("tank", "second"));
    killCharacter(r, r.selected);
    expect(m.silver).toBe(45);
    expect(m.gold).toBe(2);
    expect(r.ended).toBe(false);
    expect(r.selected).toBe("second");
  });
  it("11 wipe encerra run e preserva meta", async () => {
    const db = repo(),
      m = defaultMeta(),
      r = newRun("a", "fighter", m);
    killCharacter(r, r.selected);
    await db.save(m, r);
    const loaded = await db.load();
    expect(loaded.run).toBeNull();
    expect(loaded.meta.silver).toBe(m.silver);
    expect(loaded.meta.unlockedClasses).toContain("fighter");
  });
  it("12 unlock persiste entre runs", async () => {
    const db = repo(),
      m = defaultMeta();
    m.unlockedClasses = ["fighter", "tank"];
    await db.save(m, null);
    const save = await db.load();
    expect(newRun("b", "tank", save.meta).party[0].classId).toBe("tank");
  });
  it("14 migra schema anterior simulado", () => {
    const s = migrateSave({
      schemaVersion: 1,
      wallet: { silver: 42, gold: 3 },
      unlockedClasses: ["tank"],
      run: null,
    });
    expect(s.schemaVersion).toBe(6);
    expect(s.meta.gold).toBe(3);
    expect(s.meta.unlockedClasses).toContain("tank");
  });
  it("gravações concorrentes mantêm a mais recente", async () => {
    const db = repo(),
      m = defaultMeta();
    const first = db.save(m, null);
    m.silver = 99;
    const last = db.save(m, null);
    await Promise.all([first, last]);
    expect((await db.load()).meta.silver).toBe(99);
  });
});
describe("Navegação", () => {
  it("13 A* evita blocked cells", () => {
    const cell = (x: number, y: number) => ({
      blocked: x === 2 && y >= -2 && y <= 2,
      cost: 1,
    });
    const path = findPath({ x: 0, y: 0 }, { x: 4, y: 0 }, cell);
    expect(path.length).toBeGreaterThan(0);
    for (const p of path)
      expect(cell(Math.floor(p.x), Math.floor(p.y)).blocked).toBe(false);
  });
  it("sem corner cutting nem smoothing por canto fechado", () => {
    const cell = (x: number, y: number) => ({
      blocked: (x === 1 && y === 0) || (x === 0 && y === 1),
      cost: 1,
    });
    expect(lineWalkable({ x: 0.5, y: 0.5 }, { x: 1.5, y: 1.5 }, cell)).toBe(
      false,
    );
    const path = findPath({ x: 0.5, y: 0.5 }, { x: 1.5, y: 1.5 }, cell);
    expect(path.length).toBeGreaterThan(1);
  });
  it("destino bloqueado não produz caminho", () => {
    expect(
      findPath({ x: 0, y: 0 }, { x: 1, y: 1 }, () => ({
        blocked: true,
        cost: 1,
      })),
    ).toEqual([]);
  });
});
