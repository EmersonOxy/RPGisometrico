export interface LootTable {
  items: string[];
  jewels: string[];
  itemChance: number;
  jewelChance: number;
  silver: number;
}
export const lootTableRegistry: Record<string, LootTable> = {
  wild: {
    items: ["coat", "leather", "fur", "windRing", "buckler", "quickblade"],
    jewels: ["fire", "frost"],
    itemChance: 0.55,
    jewelChance: 0.12,
    silver: 7,
  },
  hunter: {
    items: ["bow", "shortbow", "longbow", "composite", "quiver", "leather", "eagleRing", "sword", "axe"],
    jewels: ["fortune", "storm"],
    itemChance: 0.55,
    jewelChance: 0.12,
    silver: 8,
  },
  arcane: {
    items: ["staff", "wand", "froststaff", "focus", "robes", "ring", "springRing", "rubyRing"],
    jewels: ["fire", "storm", "frost"],
    itemChance: 0.6,
    jewelChance: 0.2,
    silver: 9,
  },
  stone: {
    items: ["shield", "towerShield", "plate", "mail", "mace", "defender", "ironRing", "greatsword"],
    jewels: ["stone", "fortune"],
    itemChance: 0.8,
    jewelChance: 0.2,
    silver: 12,
  },
};
lootTableRegistry.travel={items:["sword","coat","ring","shortbow","leather","windRing","buckler"],jewels:["fortune","stone"],itemChance:.6,jewelChance:.06,silver:12};
