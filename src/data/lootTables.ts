export interface LootTable {
  items: string[];
  jewels: string[];
  itemChance: number;
  jewelChance: number;
  silver: number;
}
export const lootTableRegistry: Record<string, LootTable> = {
  wild: {
    items: ["sword", "coat", "ring"],
    jewels: ["fire", "frost"],
    itemChance: 0.55,
    jewelChance: 0.12,
    silver: 7,
  },
  hunter: {
    items: ["bow", "coat", "ring"],
    jewels: ["fortune", "storm"],
    itemChance: 0.55,
    jewelChance: 0.12,
    silver: 8,
  },
  arcane: {
    items: ["staff", "ring", "coat"],
    jewels: ["fire", "storm", "frost"],
    itemChance: 0.6,
    jewelChance: 0.2,
    silver: 9,
  },
  stone: {
    items: ["shield", "coat", "sword"],
    jewels: ["stone", "fortune"],
    itemChance: 0.8,
    jewelChance: 0.2,
    silver: 12,
  },
};
