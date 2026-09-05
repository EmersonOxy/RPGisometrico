export type Behavior =
  "chaser" | "kiter" | "charger" | "pack" | "caster" | "guardian";
export interface EnemyDefinition {
  id: string;
  name: string;
  behavior: Behavior;
  health: number;
  damage: number;
  speed: number;
  range: number;
  aggro: number;
  color: number;
  lootTable: string;
}
export const enemyRegistry: Record<string, EnemyDefinition> = {
  slime: {
    id: "slime",
    name: "Gosma Viva",
    behavior: "chaser",
    health: 42,
    damage: 7,
    speed: 2.4,
    range: 1.4,
    aggro: 8,
    color: 0x91a268,
    lootTable: "wild",
  },
  archer: {
    id: "archer",
    name: "Saqueador do véu",
    behavior: "kiter",
    health: 36,
    damage: 8,
    speed: 2.7,
    range: 6,
    aggro: 9,
    color: 0xaf8b68,
    lootTable: "hunter",
  },
  boar: {
    id: "boar",
    name: "Javali de cinza",
    behavior: "charger",
    health: 65,
    damage: 14,
    speed: 2.3,
    range: 1.5,
    aggro: 8,
    color: 0xb9987b,
    lootTable: "wild",
  },
  wolf: {
    id: "wolf",
    name: "Lobo de urze",
    behavior: "pack",
    health: 32,
    damage: 6,
    speed: 3.1,
    range: 1.3,
    aggro: 8,
    color: 0xa0adb2,
    lootTable: "hunter",
  },
  witch: {
    id: "witch",
    name: "Oráculo do lodo",
    behavior: "caster",
    health: 45,
    damage: 14,
    speed: 1.7,
    range: 6,
    aggro: 9,
    color: 0xb5a0c2,
    lootTable: "arcane",
  },
  golem: {
    id: "golem",
    name: "Guardião de basalto",
    behavior: "guardian",
    health: 125,
    damage: 14,
    speed: 1.2,
    range: 1.9,
    aggro: 7,
    color: 0x99a591,
    lootTable: "stone",
  },
};
