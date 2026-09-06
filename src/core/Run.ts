import type { ClassId, MetaProgress, RunState } from "./types";
import { createCharacter } from "../progression/Character";
import { hash } from "../utils/SeededRandom";
import { defaultMeta } from "../persistence/SaveRepository";
import { worldSettings, type WorldGenerationSettings } from "../data/worldSettings";
export function freshGame(seed: string, previous: MetaProgress, settings?: WorldGenerationSettings) {
  const meta = defaultMeta();
  meta.settings = structuredClone(previous.settings);
  return { meta, run: newRun(seed, "fighter", meta, settings) };
}
export function newRun(
  seed: string,
  classId: ClassId,
  meta: MetaProgress,
  settings?: WorldGenerationSettings,
): RunState {
  if (!meta.unlockedClasses.length) meta.unlockedClasses.push(classId);
  if (!meta.unlockedClasses.includes(classId))
    throw Error("Classe não desbloqueada");
  meta.statistics.runs++;
  const id = seed + ":" + meta.statistics.runs,
    c = createCharacter(classId, id + ":hero");
  return {
    id,
    seed,
    worldVersion: 3,
    worldSettings: worldSettings(settings),
    cartography: {},
    party: [c],
    selected: c.id,
    inventory: [],
    jewels: [],
    drops: [],
    deltas: {},
    discovered: [],
    rng: hash(id),
    command: "follow",
    commandSelection: [],
    targetQueue: [],
    stats: {
      kills: 0,
      seconds: 0,
      distance: 0,
      highestLevel: 1,
      silver: 0,
      gold: 0,
      biomes: [],
    },
    ended: false,
  };
}
export function killCharacter(run: RunState, id: string) {
  const c = run.party.find((c) => c.id === id);
  if (!c || !c.alive) return;
  c.alive = false;
  c.hp = 0;
  c.path = [];
  if (run.selected === id)
    run.selected = run.party.find((c) => c.alive)?.id ?? id;
  run.ended = !run.party.some((c) => c.alive);
}
