import type { Slot, Stat } from "../core/types";
export interface AffixDefinition {
  id: string;
  name: string;
  slots: Slot[];
  tags: string[];
  minLevel: number;
  stat: Stat;
  value: number;
  weight: number;
}
export const affixRegistry: Record<string, AffixDefinition> =
  Object.fromEntries(
    [
      {
        id: "vital",
        name: "da seiva",
        slots: ["armor", "ring", "offhand"],
        tags: [],
        stat: "health",
        value: 14,
      },
      {
        id: "iron",
        name: "de ferro",
        slots: ["armor", "offhand"],
        tags: ["DEFENSIVE"],
        stat: "armor",
        value: 4,
      },
      {
        id: "swift",
        name: "do vento",
        slots: ["armor", "ring"],
        tags: [],
        stat: "speed",
        value: 0.05,
      },
      {
        id: "keen",
        name: "do falcão",
        slots: ["weapon", "ring"],
        tags: [],
        stat: "crit",
        value: 0.04,
      },
      {
        id: "ember",
        name: "da brasa",
        slots: ["weapon"],
        tags: ["MELEE", "MAGIC"],
        stat: "fire",
        value: 0.22,
      },
      {
        id: "piercing",
        name: "da mira",
        slots: ["weapon"],
        tags: ["PROJECTILE"],
        stat: "damage",
        value: 4,
      },
      {
        id: "flow",
        name: "da nascente",
        slots: ["ring", "weapon"],
        tags: ["MAGIC"],
        stat: "regen",
        value: 2,
      },
      {
        id: "haste",
        name: "da aurora",
        slots: ["ring"],
        tags: [],
        stat: "cooldown",
        value: 0.06,
      },
      {
        id: "lucky",
        name: "do achado",
        slots: ["ring"],
        tags: [],
        stat: "coins",
        value: 0.1,
      },
    ].map((x) => [x.id, { ...x, minLevel: 1, weight: 1 } as AffixDefinition]),
  );
