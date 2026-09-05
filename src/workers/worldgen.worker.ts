import { generateChunk } from "../world/generation/WorldGenerator";
self.onmessage = (
  event: MessageEvent<{
    seed: string;
    version: number;
    cx: number;
    cy: number;
  }>,
) => {
  const { seed, cx, cy, version } = event.data;
  self.postMessage(generateChunk(seed, cx, cy, version));
};
