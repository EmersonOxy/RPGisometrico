import type { Item } from "../core/types";
import { itemBaseRegistry } from "../data/items";
import { affixRegistry } from "../data/affixes";
import { SeededRandom } from "../utils/SeededRandom";
export function generateItem(
  seed: string,
  level: number,
  baseId?: string,
  forcedRarity?: number,
): Item {
  const r = new SeededRandom(seed),
    base = itemBaseRegistry[baseId ?? r.pick(Object.values(itemBaseRegistry).filter(b=>(b.minLevel??1)<=level).map(b=>b.id))];
  if(!base)throw Error("Item-base desconhecido");
  const roll = r.next(),
    rarity =
      forcedRarity ??
      (roll < 0.01
        ? 4
        : roll < 0.06
          ? 3
          : roll < 0.23
            ? 2
            : roll < 0.6
              ? 1
              : 0);
  const stats = { ...base.stats };
  for (const k of Object.keys(stats) as (keyof typeof stats)[])
    stats[k] = (stats[k] ?? 0) * (1 + 0.1 * Math.sqrt(Math.max(0, ["crit","cooldown","speed","fire","coins"].includes(k)?Math.min(20,level)-1:level-1)));
  const affixes: string[] = [];
  let candidates = Object.values(affixRegistry).filter(
    (a) =>
      a.slots.includes(base.slot) &&
      a.minLevel <= level &&
      (!a.tags.length || a.tags.some((t) => base.tags.includes(t))),
  );
  for (let i = 0; i < rarity && candidates.length; i++) {
    const total = candidates.reduce((s, a) => s + a.weight, 0);
    let roll = r.next() * total;
    const affix =
      candidates.find((a) => (roll -= a.weight) < 0) ?? candidates[0];
    affixes.push(affix.id);
    stats[affix.stat] =
      (stats[affix.stat] ?? 0) + affix.value * (1 + 0.06 * Math.sqrt(level));
    candidates = candidates.filter((a) => a.id !== affix.id);
  }
  return {
    id: "item:" + seed,
    baseId: base.id,
    name: base.name + (affixes[0] ? " " + affixRegistry[affixes[0]].name : ""),
    slot: base.slot,
    rarity,
    level,
    requiredLevel: Math.max(1, base.minLevel??1, level - 2),
    stats,
    affixes,
    tags: base.tags,
    value: 4 + rarity * 6 + level,
  };
}
