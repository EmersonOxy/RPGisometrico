import type { ClassId } from "../core/types";
export interface ClassDefinition {
  id: ClassId;
  name: string;
  subtitle: string;
  resource: string;
  color: number;
  icon: string;
  health: number;
  armor: number;
  damage: number;
  speed: number;
  range: number;
  basic: string;
  abilities: string[];
  additionalAbilities?: string[];
  passives: string[];
}
export const classRegistry: Record<ClassId, ClassDefinition> = {
  fighter: {
    id: "fighter",
    name: "Lutador",
    subtitle: "A lâmina que abre o caminho",
    resource: "Vigor",
    color: 0xb96e4e,
    icon: "⚔",
    health: 1.15,
    armor: 6,
    damage: 1.15,
    speed: 3.6,
    range: 1.65,
    basic: "slash",
    abilities: ["heavy", "charge", "whirl", "fury"],
    additionalAbilities: ["rend","execute","cleave","bloodrush"],
    passives: ["momentum", "duelist", "tenacity"],
  },
  shooter: {
    id: "shooter",
    name: "Atirador",
    subtitle: "Entre a distância e o silêncio",
    resource: "Foco",
    color: 0x9cbb81,
    icon: "➶",
    health: 0.85,
    armor: 2,
    damage: 1,
    speed: 3.9,
    range: 7,
    basic: "arrow",
    abilities: ["pierce", "volley", "retreat", "trap"],
    additionalAbilities: ["pin","snare","fan","snipe"],
    passives: ["precision", "hunter", "lightfoot"],
  },
  mage: {
    id: "mage",
    name: "Feiticeiro",
    subtitle: "O eco de uma antiga tempestade",
    resource: "Mana",
    color: 0x9aa7d0,
    icon: "✧",
    health: 0.8,
    armor: 1,
    damage: 1.1,
    speed: 3.4,
    range: 6,
    basic: "bolt",
    abilities: ["arcane", "nova", "chain", "blink"],
    additionalAbilities: ["fireball","meteor","frostlance","ward"],
    passives: ["affinity", "conductor", "concentration"],
  },
  tank: {
    id: "tank",
    name: "Bastião",
    subtitle: "Onde os outros encontram abrigo",
    resource: "Ímpeto",
    color: 0xd0b77d,
    icon: "⛨",
    health: 1.7,
    armor: 18,
    damage: 0.8,
    speed: 3.05,
    range: 1.7,
    basic: "bash",
    abilities: ["taunt", "guard", "slam", "protect"],
    additionalAbilities: ["shieldrush","riposte","rally","sunder"],
    passives: ["fortitude", "guardian", "immovable"],
  },
};
