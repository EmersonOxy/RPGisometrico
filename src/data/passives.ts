import type { Stat } from "../core/types";
export interface PassiveDefinition {
  id: string;
  name: string;
  description: string;
  stat: Stat;
  value: number;
}
export const passiveRegistry: Record<string, PassiveDefinition> =
  Object.fromEntries(
    [
      ["momentum", "Embalo", "Dano sustentado +8%.", "damage", 0.08],
      ["duelist", "Duelista", "Chance crítica +6%.", "crit", 0.06],
      ["tenacity", "Tenacidade", "Armadura +4.", "armor", 4],
      ["precision", "Precisão", "Chance crítica +8%.", "crit", 0.08],
      ["hunter", "Caçador", "Dano +10%.", "damage", 0.1],
      ["lightfoot", "Passos leves", "Movimento +8%.", "speed", 0.08],
      ["affinity", "Afinidade", "Regeneração +4/s.", "regen", 4],
      ["conductor", "Condutor", "Dano elemental +10%.", "damage", 0.1],
      ["concentration", "Concentração", "Recargas -8%.", "cooldown", 0.08],
      ["fortitude", "Fortitude", "Vida +20%.", "health", 0.2],
      ["guardian", "Guardião", "Regeneração +3/s.", "regen", 3],
      ["immovable", "Imóvel", "Armadura +8.", "armor", 8],
    ].map(([id, name, description, stat, value]) => [
      id,
      { id, name, description, stat, value } as PassiveDefinition,
    ]),
  );
