import type { Character, Enemy, StatusId } from "../core/types";
import { statsFor } from "../progression/Character";
export interface DamagePacket {
  source: string;
  target: string;
  baseDamage: number;
  damageTypes: string[];
  abilityId: string;
  critical: boolean;
  tags: string[];
}
export function mitigatedDamage(
  base: number,
  armor: number,
  guard = false,
  critical = false,
) {
  return Math.max(
    1,
    Math.round(
      base *
        (100 / (100 + Math.max(0, armor))) *
        (guard ? 0.35 : 1) *
        (critical ? 1.65 : 1),
    ),
  );
}
export function applyStatus(
  target: Character | Enemy,
  id: StatusId,
  source: string,
  power = 4,
  duration = 4,
) {
  const old = target.statuses.find((s) => s.id === id);
  if (old) {
    old.remaining = Math.max(old.remaining, duration);
    old.power = Math.max(old.power, power);
  } else
    target.statuses.push({ id, remaining: duration, tick: 0, source, power });
}
export function armorFor(target: Character | Enemy) {
  const armor =
    "classId" in target
      ? statsFor(target).armor
      : target.definition === "golem"
        ? 22
        : target.elite && target.modifier === "armored"
          ? 18
          : 2;
  return armor * (target.statuses.some((s) => s.id === "armorBreak") ? 0.5 : 1);
}
