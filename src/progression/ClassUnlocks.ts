import type { ClassId, MetaProgress, RunState } from "../core/types";

export const classUnlockDefaults: Record<ClassId, { level: number; silver: number }> = {
  fighter: { level: 1, silver: 0 },
  shooter: { level: 3, silver: 100 },
  tank: { level: 5, silver: 200 },
  mage: { level: 7, silver: 300 },
};
export function classRequirement(meta: MetaProgress, id: ClassId) {
  return meta.classUnlockRequirements?.[id] ?? classUnlockDefaults[id];
}
export function playerLevel(run: RunState) {
  return Math.max(run.stats.highestLevel, ...run.party.map(c => c.level));
}
