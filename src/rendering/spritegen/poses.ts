import type { DirectionIndex, PoseDefinition } from "./types";
import { poseFor } from "./rig";

/**
 * IDLE v2 — 8 direções × 6 frames = 48 frames.
 * Curva: neutra → inspira → ápice → retorno → relaxa → transição (loop).
 * Implementada em rig.ts (breathe = seno de período 6, pés plantados).
 */
export const IDLE_FRAMES = 6;

export function idlePose(direction: DirectionIndex, frame: number): PoseDefinition {
  return poseFor(direction, ((frame % IDLE_FRAMES) + IDLE_FRAMES) % IDLE_FRAMES);
}
