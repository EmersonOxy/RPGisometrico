import type { ClassId, Slot, Stats } from "../core/types";
export interface ItemBase {
  id: string;
  name: string;
  slot: Slot;
  tags: string[];
  classes?: ClassId[];
  stats: Partial<Stats>;
}
export const itemBaseRegistry: Record<string, ItemBase> = {
  sword: {
    id: "sword",
    name: "Lâmina de vigília",
    slot: "weapon",
    tags: ["MELEE", "PHYSICAL"],
    classes: ["fighter", "tank"],
    stats: { damage: 5 },
  },
  bow: {
    id: "bow",
    name: "Arco de freixo",
    slot: "weapon",
    tags: ["PROJECTILE", "PHYSICAL"],
    classes: ["shooter"],
    stats: { damage: 6 },
  },
  staff: {
    id: "staff",
    name: "Cajado de âmbar",
    slot: "weapon",
    tags: ["MAGIC", "FIRE"],
    classes: ["mage"],
    stats: { damage: 6 },
  },
  shield: {
    id: "shield",
    name: "Escudo de ardósia",
    slot: "offhand",
    tags: ["DEFENSIVE"],
    stats: { armor: 6 },
  },
  coat: {
    id: "coat",
    name: "Manto de viajante",
    slot: "armor",
    tags: ["DEFENSIVE"],
    stats: { health: 15, armor: 3 },
  },
  ring: {
    id: "ring",
    name: "Anel de cobre",
    slot: "ring",
    tags: ["MAGIC"],
    stats: { regen: 1 },
  },
};
export const rarityNames = ["Comum", "Refinado", "Raro", "Épico", "Relíquia"];
export const rarityColors = [
  "#c7c4b5",
  "#9eb78b",
  "#8eb9d6",
  "#c4a2d9",
  "#dfba72",
];
