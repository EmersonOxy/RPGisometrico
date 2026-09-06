import { giveTestKit } from "./skill-fixtures";
import { afterEach, describe, it, expect } from "vitest";
import { InputBuffer } from "../src/combat/InputBuffer";
import { Engine } from "../src/core/Engine";
import { EventBus } from "../src/core/EventBus";
import { newRun } from "../src/core/Run";
import { defaultMeta, migrateSave } from "../src/persistence/SaveRepository";
import { bagSlots } from "../src/ui/InventoryView";
import { generateItem } from "../src/loot/ItemGenerator";
import { rollEnemyLoot, mergeCoins } from "../src/loot/LootSystem";
import { SeededRandom } from "../src/utils/SeededRandom";
import {
  generateChunk,
  sampleTile,
} from "../src/world/generation/WorldGenerator";
import { distance } from "../src/world/WorldCoordinates";
import type { Enemy } from "../src/core/types";
const engines: Engine[] = [];
afterEach(() => engines.splice(0).forEach((e) => e.destroy()));
function setup() {
  const meta = defaultMeta(),
    e = new Engine(
      newRun("polish", "fighter", meta),
      meta,
      new EventBus(),
      async () => {},
    );
  engines.push(e); giveTestKit(e.selected);
  return e;
}
const foe: Enemy = {
  id: "loot",
  definition: "slime",
  x: 0,
  y: 0,
  home: { x: 0, y: 0 },
  level: 1,
  hp: 100,
  maxHp: 100,
  elite: false,
  modifier: "swift",
  statuses: [],
  path: [],
  threat: {},
  state: "IDLE",
  timer: 0,
  aiTime: 0,
  attackTime: 0,
};
describe("Controle e continuidade", () => {
  it("buffer retém o último comando por 150 ms e expira", () => {
    const b = new InputBuffer();
    b.put("a", 0, { x: 1, y: 2 });
    b.tick(0.1);
    expect(b.action?.slot).toBe(0);
    b.put("a", 2, undefined);
    b.tick(0.149);
    expect(b.action?.slot).toBe(2);
    b.tick(0.002);
    expect(b.action).toBeUndefined();
  });
  it("habilidade solicitada no fim da recuperação executa sem segundo clique", () => {
    const e = setup(),
      c = e.selected;
    expect(e.combat.request(c, 3)).toBe(true);
    e.combat.update(0.1);
    expect(e.combat.request(c, 2)).toBe(true);
    expect(c.cooldowns.whirl ?? 0).toBe(0);
    e.combat.update(0.14);
    expect(c.cooldowns.whirl).toBeGreaterThan(0);
    expect(e.combat.buffer.action).toBeUndefined();
  });
  it("comando de movimento substitui caminho e cancela ação pendente", () => {
    const e = setup(),
      c = e.selected;
    e.command({ type: "move", point: { x: 3, y: 0 } });
    const before = c.path.at(-1);
    e.combat.buffer.put(c.id, 2, undefined);
    e.command({ type: "move", point: { x: 0, y: 3 } });
    expect(c.path.at(-1)).not.toEqual(before);
    expect(c.path.at(-1)).toEqual({ x: 0, y: 3 });
    expect(e.combat.buffer.action).toBeUndefined();
    expect(e.meta.tutorials.move).toBe(true);
  });
  it("destino bloqueado abandona o caminho anterior", () => {
    const e = setup();
    const old = e.world.cell;
    e.world.cell = (x, y) => ({ ...old(x, y), blocked: x === 3 && y === 3 });
    e.selected.path = [{ x: 2, y: 0 }];
    e.move(e.selected, { x: 3.2, y: 3.2 });
    expect(e.selected.path).toEqual([]);
  });
  it("aproximação encerra na distância de ataque", () => {
    const e = setup(),
      target = { x: 8, y: 0 };
    e.approach(e.selected, target, 7);
    expect(distance(e.selected.path.at(-1)!, target)).toBeCloseTo(6.82);
    e.selected.x = 2;
    e.approach(e.selected, target, 7);
    expect(e.selected.path).toEqual([]);
  });
  it("painel pausado congela movimento, HP e recargas", () => {
    const e = setup();
    e.selected.path = [{ x: 5, y: 0 }];
    e.selected.cooldowns.heavy = 2;
    e.paused = true;
    const before = structuredClone(e.run);
    e.update(1);
    expect(e.run.party).toEqual(before.party);
  });
});
describe("Mochila e recompensa", () => {
  it("mochila vazia produz os 36 espaços renderizáveis", () => {
    const slots = bagSlots([], {});
    expect(slots).toHaveLength(36);
    expect(slots.map(() => 1).reduce((a, b) => a + b, 0)).toBe(36);
  });
  it("layout mantém posições e resolve colisões sem perder itens", () => {
    const a = generateItem("a", 1, "sword"),
      b = generateItem("b", 1, "coat"),
      layout = { [a.id]: 12, [b.id]: 12, obsolete: 3 };
    const slots = bagSlots([a, b], layout);
    expect(slots[12]).toBe(a);
    expect(slots[0]).toBe(b);
    expect(layout.obsolete).toBeUndefined();
    expect(bagSlots([a, b], layout)).toEqual(slots);
  });
  it("vinte inimigos comuns não geram chuva de equipamento", () => {
    const rng = new SeededRandom("twenty-kills"),
      drops = Array.from({ length: 20 }, (_, i) =>
        rollEnemyLoot({ ...foe, id: "kill" + i }, "world", rng),
      ).flat();
    expect(drops.filter((d) => d.kind === "item").length).toBeLessThanOrEqual(
      3,
    );
    expect(drops.length).toBeLessThan(12);
  });
  it("probabilidades de loot permanecem próximas do balanço em 10000 mortes", () => {
    const rng = new SeededRandom("distribution"),
      counts = { silver: 0, gold: 0, item: 0, jewel: 0 };
    for (let i = 0; i < 10000; i++)
      for (const d of rollEnemyLoot(foe, "world", rng)) counts[d.kind]++;
    expect(counts.silver / 10000).toBeCloseTo(0.16, 1);
    expect(counts.item / 10000).toBeGreaterThan(0.04);
    expect(counts.item / 10000).toBeLessThan(0.06);
    expect(counts.jewel / 10000).toBeLessThan(0.005);
    expect(counts.gold / 10000).toBeLessThan(0.01);
  });
  it("elite garante equipamento raro e moedas; moedas próximas se agrupam", () => {
    const drops = rollEnemyLoot(
      { ...foe, elite: true },
      "world",
      new SeededRandom("elite"),
    );
    expect(
      drops.find((d) => d.kind === "item")?.item?.rarity,
    ).toBeGreaterThanOrEqual(2);
    expect(drops.some((d) => d.kind === "silver")).toBe(true);
    const grouped = mergeCoins([
      { id: "a", kind: "silver", amount: 2, x: 0, y: 0 },
      { id: "b", kind: "silver", amount: 3, x: 1, y: 0 },
      { id: "c", kind: "gold", amount: 1, x: 1, y: 0 },
    ]);
    expect(grouped).toHaveLength(2);
    expect(grouped[0].amount).toBe(5);
  });
});
describe("Compatibilidade de mundos", () => {
  it("migra schema 2 preservando carteira, seed, personagem, inventário e deltas", () => {
    const m = defaultMeta(),
      r = newRun("old-world", "fighter", m);
    delete r.worldVersion;
    r.inventory.push(generateItem("legacy", 4, "sword"));
    r.deltas["chest:old"] = true;
    m.silver = 123;
    m.gold = 7;
    const before = structuredClone(r),
      s = migrateSave({ schemaVersion: 2, meta: m, run: r });
    expect(s.schemaVersion).toBe(6);
    expect(s.run?.worldVersion).toBe(1);
    expect(s.run?.party).toEqual(before.party);
    expect(s.run?.inventory).toEqual(before.inventory);
    expect(s.run?.deltas).toEqual(before.deltas);
    expect(s.meta.silver).toBe(123);
    expect(s.meta.gold).toBe(7);
    expect(s.meta.settings.uiScale).toBe(1);
  });
  it("geração de chunk antigo usa a mesma versão em cada célula", () => {
    const chunk = generateChunk("legacy", -2, 1, 1);
    for (const t of chunk.tiles)
      expect(t).toEqual(sampleTile("legacy", t.x, t.y, chunk.pois, 1));
    expect(generateChunk("legacy", -2, 1, 2).tiles).not.toEqual(chunk.tiles);
  });
});
