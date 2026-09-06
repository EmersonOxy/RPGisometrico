import type { Character, ClassId, Stats } from "../core/types";
import { classRegistry } from "../data/classes";
import { jewelRegistry } from "../data/jewels";
import { passiveRegistry } from "../data/passives";
import {
  baseDamageForLevel,
  baseHealthForLevel,
  xpRequiredForLevel,
  statFormulas,
} from "../data/balance";
export function createCharacter(
  classId: ClassId,
  id: string,
  x = 0.5,
  y = 0.5,
  level = 1,
): Character {
  const baseStatsByClass: Record<ClassId, Record<import("../core/types").StatPointType, number>> = {
    fighter: { vitality: 2, armor: 1, speed: 2, mana: 0, luck: 0, charisma: 1 },
    shooter: { vitality: 1, armor: 0, speed: 2, mana: 1, luck: 2, charisma: 0 },
    mage: { vitality: 1, armor: 0, speed: 1, mana: 3, luck: 1, charisma: 0 },
    tank: { vitality: 3, armor: 2, speed: 0, mana: 1, luck: 0, charisma: 0 },
  };
  const c: Character = {
    id,
    classId,
    name: classRegistry[classId].name,
    level,
    xp: 0,
    hp: 1,
    resource: 100,
    x,
    y,
    alive: true,
    points: 1,
    mastery: 0,
    passives: [],
    skillNodes: [],
    loadout: [...classRegistry[classId].abilities],
    equipment: {},
    jewels: [],
    cooldowns: {},
    statuses: [],
    path: [],
    facing: 1,
    facingAngle: 0,
    partyOrder: "follow",
    statPoints: 1,
    allocatedStats: { ...baseStatsByClass[classId] },
    attackTime: 0,
    aiTime: 0,
  };
  c.hp = statsFor(c).health;
  return c;
}
export function jewelModifiers(c: Character) {
  const out: Partial<Stats> = {};
  for (const id of c.jewels) {
    const j = jewelRegistry[id];
    if (!j) continue;
    for (const source of [
      j.globalEffects,
      j.effectsByClass[c.classId]?.stats ?? {},
    ])
      for (const [k, v] of Object.entries(source))
        out[k as keyof Stats] = (out[k as keyof Stats] ?? 0) + v;
  }
  return out;
}
export function statsFor(c: Character): Stats {
  const cls = classRegistry[c.classId],
    j = jewelModifiers(c);
  const s: Stats = {
    damage: baseDamageForLevel(c.level) * cls.damage,
    health: baseHealthForLevel(c.level) * cls.health,
    armor: cls.armor,
    speed: cls.speed,
    crit: 0.06,
    fire: 0,
    regen: 8,
    cooldown: 0,
    coins: 1,
  };
  for (const item of Object.values(c.equipment))
    if (item)
      for (const [k, v] of Object.entries(item.stats)) s[k as keyof Stats] += v;
  const modifiers = { ...j };
  for (const id of c.passives) {
    const p = passiveRegistry[id];
    if (p) modifiers[p.stat] = (modifiers[p.stat] ?? 0) + p.value;
  }
  for (const [k, v] of Object.entries(modifiers)) {
    const key = k as keyof Stats;
    if (["health", "damage", "speed"].includes(k)) s[key] *= 1 + v;
    else s[key] += v;
  }
  const allocated = c.allocatedStats ?? {
    vitality: 0,
    armor: 0,
    speed: 0,
    mana: 0,
    luck: 0,
    charisma: 0,
  };
  s.health += statFormulas.vitalityHealthBonus(allocated.vitality, c.level);
  s.armor += allocated.armor * 10;
  s.speed += statFormulas.speedBonus(allocated.speed);
  s.coins *= statFormulas.luckMultiplier(allocated.luck);
  s.damage *= 1 + 0.5 * (1 - Math.exp(-c.mastery / 40));
  if (c.statuses.some((s) => s.id === "fury")) s.speed *= 1.3;
  return s;
}
export function activeAbilities(c: Character) {
  return (c.loadout ?? classRegistry[c.classId].abilities).slice(0,4).map((id) => {
    for (const j of c.jewels)
      id = jewelRegistry[j]?.effectsByClass[c.classId]?.replace?.[id] ?? id;
    return id;
  });
}
export function addExperience(c: Character, amount: number) {
  c.xp += amount;
  let levels = 0;
  while (c.xp >= xpRequiredForLevel(c.level)) {
    c.xp -= xpRequiredForLevel(c.level);
    c.level++;
    c.points++;
    c.statPoints = (c.statPoints ?? 0) + 1;
    levels++;
  }
  if (levels) c.hp = statsFor(c).health;
  return levels;
}
export function coinMultiplier(
  party: Character[],
  point: { x: number; y: number },
) {
  return Math.max(
    1,
    ...party
      .filter((c) => c.alive && Math.hypot(c.x - point.x, c.y - point.y) < 14)
      .map((c) => statsFor(c).coins),
  );
}
