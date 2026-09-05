import type { ClassId, Stats } from "../core/types";
export interface JewelDefinition {
  id: string;
  name: string;
  icon: string;
  color: string;
  requiredLevel: number;
  effectsByClass: Partial<
    Record<
      ClassId,
      {
        description: string;
        stats?: Partial<Stats>;
        replace?: Record<string, string>;
        status?: "burn" | "slow";
      }
    >
  >;
  globalEffects: Partial<Stats>;
}
export const jewelRegistry: Record<string, JewelDefinition> = {
  fire: {
    id: "fire",
    name: "Joia da Brasa",
    icon: "◆",
    color: "#e59762",
    requiredLevel: 1,
    globalEffects: {},
    effectsByClass: {
      fighter: {
        description:
          "Fire Jewel • Ruptura torna-se Talho de brasa: fogo + Burn.",
        replace: { heavy: "flame" },
      },
      mage: {
        description: "Dano de fogo +35%; ataques aplicam Burn.",
        stats: { fire: 0.35 },
        status: "burn",
      },
    },
  },
  fortune: {
    id: "fortune",
    name: "Joia da Fortuna",
    icon: "◆",
    color: "#d6bd73",
    requiredLevel: 1,
    globalEffects: { coins: 0.05 },
    effectsByClass: {
      tank: {
        description: "Fortune Jewel • 25% mais moedas nos abates próximos.",
        stats: { coins: 0.2 },
      },
    },
  },
  frost: {
    id: "frost",
    name: "Joia da Geada",
    icon: "◆",
    color: "#a0d5dd",
    requiredLevel: 1,
    globalEffects: { armor: 3 },
    effectsByClass: {
      shooter: { description: "Projéteis aplicam lentidão.", status: "slow" },
    },
  },
  storm: {
    id: "storm",
    name: "Joia da Tormenta",
    icon: "◆",
    color: "#b6add8",
    requiredLevel: 1,
    globalEffects: { cooldown: 0.12 },
    effectsByClass: {},
  },
  stone: {
    id: "stone",
    name: "Joia da Rocha",
    icon: "◆",
    color: "#adbd95",
    requiredLevel: 1,
    globalEffects: { health: 0.18, armor: 5 },
    effectsByClass: {},
  },
};
