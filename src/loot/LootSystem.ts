import type { Drop, Enemy } from "../core/types";
import { lootTableRegistry } from "../data/lootTables";
import { enemyRegistry } from "../data/enemies";
import { SeededRandom } from "../utils/SeededRandom";
import { generateItem } from "./ItemGenerator";
export const lootBalance = {
  common: { silver: 0.16, equipment: 0.05, jewel: 0.002, gold: 0.006 },
  champion: { silver: 0.45, equipment: 0.16, jewel: 0.012, gold: 0.025 },
  elite: { silver: 1, equipment: 1, jewel: 0.08, gold: 0.3 },
};
export function rollEnemyLoot(
  enemy: Enemy,
  seed: string,
  rng: SeededRandom,
  multiplier = 1,
): Drop[] {
  const table = lootTableRegistry[enemyRegistry[enemy.definition].lootTable],
    category = enemy.elite
      ? "elite"
      : enemy.definition === "golem"
        ? "champion"
        : "common",
    odds = lootBalance[category],
    drops: Drop[] = [];
  const base = { x: enemy.x, y: enemy.y };
  if (rng.next() < odds.silver)
    drops.push({
      ...base,
      id: enemy.id + ":silver",
      kind: "silver",
      amount: Math.ceil(
        table.silver *
          (1 + 0.1 * enemy.level) *
          (enemy.elite ? 3 : 1) *
          multiplier,
      ),
    });
  if (rng.next() < odds.gold)
    drops.push({
      ...base,
      id: enemy.id + ":gold",
      kind: "gold",
      amount: Math.ceil(multiplier),
    });
  if (rng.next() < odds.equipment)
    drops.push({
      ...base,
      id: enemy.id + ":item",
      kind: "item",
      amount: 1,
      item: generateItem(
        seed + ":loot:" + rng.next(),
        enemy.level,
        rng.pick(table.items),
        enemy.elite ? 2 : undefined,
      ),
    });
  if (rng.next() < odds.jewel)
    drops.push({
      ...base,
      id: enemy.id + ":jewel",
      kind: "jewel",
      amount: 1,
      jewel: rng.pick(table.jewels),
    });
  return drops;
}
export function mergeCoins(drops: Drop[]) {
  const result: Drop[] = [];
  for (const d of drops) {
    if (d.kind === "silver" || d.kind === "gold") {
      const existing = result.find(
        (x) => x.kind === d.kind && Math.hypot(x.x - d.x, x.y - d.y) < 2.5,
      );
      if (existing) {
        existing.amount += d.amount;
        continue;
      }
    }
    result.push(d);
  }
  return result;
}
