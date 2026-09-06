export type Difficulty = "explorer" | "normal" | "veteran" | "brutal";
export interface WorldGenerationSettings {
  biomeScale: "compact" | "standard" | "wide";
  difficulty: Difficulty;
  threatDensity: "low" | "normal" | "high";
}
export const defaultWorldSettings: WorldGenerationSettings = { biomeScale: "standard", difficulty: "normal", threatDensity: "normal" };
export const biomeScales = { compact: .5, standard: 1, wide: 2.4 };
export const threatDensities = { low: .6, normal: 1, high: 1.35 };
export const difficultyRegistry = {
  explorer: { name: "Explorador", health: .85, damage: .7, perception: .85, alert: 1.4, elite: .025, budget: .9, reward: .9, horde: { chance: 0, min: 0, max: 0 } },
  normal: { name: "Normal", health: 1, damage: 1, perception: 1, alert: 1, elite: .06, budget: 1, reward: 1, horde: { chance: .07, min: 3, max: 4 } },
  veteran: { name: "Veterano", health: 1.15, damage: 1.25, perception: 1.1, alert: .8, elite: .1, budget: 1.05, reward: 1.1, horde: { chance: .14, min: 4, max: 6 } },
  brutal: { name: "Brutal", health: 1.3, damage: 1.5, perception: 1.2, alert: .6, elite: .14, budget: 1.1, reward: 1.2, horde: { chance: .22, min: 6, max: 9 } },
};
export const populationBalance = { maxChunkBudget: 8, encounterSpacing: 23, safeRadius: 11, activeRadius: 30, maxActiveEnemies: 64, maxAmbient: 48, ambientRadius: 26, ambientTick: 1.5 };
export function worldSettings(value?: Partial<WorldGenerationSettings>): WorldGenerationSettings {
  const s = { ...defaultWorldSettings, ...value };
  if (!(s.biomeScale in biomeScales) || !(s.difficulty in difficultyRegistry) || !(s.threatDensity in threatDensities)) throw Error("Configuração de expedição inválida");
  return s;
}
