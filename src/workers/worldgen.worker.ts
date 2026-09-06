import { generateChunk } from "../world/generation/WorldGenerator";
self.onmessage = (
  event: MessageEvent<{
    seed: string;
    version: number;
    settings: import("../data/worldSettings").WorldGenerationSettings;
    cx: number;
    cy: number;
  }>,
) => {
  const { seed, cx, cy, version, settings } = event.data;
  self.postMessage(generateChunk(seed, cx, cy, version, settings));
};
