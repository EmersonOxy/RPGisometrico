export type Behavior =
  "chaser" | "kiter" | "charger" | "pack" | "caster" | "guardian";
export interface EnemyVariant {
  /** Tint multiplicado sobre a arte (paleta alternativa). */
  tint: number;
  /** Multiplicador de vida da variante. */
  hpMult: number;
}
export interface EnemyDefinition {
  environment?: { mode: "WANDER" | "PATROL" | "GUARD" | "REST"; radius: number; leash: number; pursuit: number; alert: number; assist: number; rest: number };
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
  /** Paletas alternativas (índice 1..n no spawn; 0 = normal). */
  variants?: EnemyVariant[];
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
    variants: [
      { tint: 0xd07a4a, hpMult: 1.15 },
      { tint: 0x6fa8cf, hpMult: 1.3 },
    ],
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
    variants: [
      { tint: 0x6a6ab0, hpMult: 1.15 },
      { tint: 0xc49a5a, hpMult: 1.3 },
    ],
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
    variants: [
      { tint: 0xc46a4a, hpMult: 1.15 },
      { tint: 0x7a9a5a, hpMult: 1.3 },
    ],
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
    variants: [
      { tint: 0x7a6ab0, hpMult: 1.15 },
      { tint: 0xc46a6a, hpMult: 1.3 },
    ],
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
    variants: [
      { tint: 0xc46a8a, hpMult: 1.15 },
      { tint: 0x6a9a6a, hpMult: 1.3 },
    ],
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
    variants: [
      { tint: 0xc47a4a, hpMult: 1.15 },
      { tint: 0x7a8a9a, hpMult: 1.3 },
    ],
  },
};
const profiles: Record<string, NonNullable<EnemyDefinition["environment"]>> = {
  slime:{mode:"WANDER",radius:3,leash:10,pursuit:10,alert:.6,assist:0,rest:3},
  boar:{mode:"PATROL",radius:5,leash:14,pursuit:11,alert:.5,assist:0,rest:2},
  wolf:{mode:"PATROL",radius:5,leash:20,pursuit:14,alert:.45,assist:7,rest:1.5},
  archer:{mode:"PATROL",radius:4,leash:16,pursuit:12,alert:.8,assist:6,rest:2},
  witch:{mode:"REST",radius:2,leash:12,pursuit:10,alert:1,assist:4,rest:4},
  golem:{mode:"GUARD",radius:2.5,leash:9,pursuit:9,alert:1.1,assist:3,rest:4},
};
for(const [id,definition] of Object.entries(enemyRegistry)) definition.environment=profiles[id];
