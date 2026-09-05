export const balance = {
  targetQueueLimit: 8,
  targetMissingGrace: 5,
  tileWidth: 64,
  tileHeight: 32,
  chunkSize: 32,
  renderRadius: 1,
  preloadRadius: 2,
  zoomMin: 0.7,
  zoomMax: 1.4,
  zoom: 1.12,
  characterScale: 1.2,
  inputBuffer: 0.15,
  heldMoveInterval: 0.09,
  aiTick: 0.25,
  autosave: 6,
  maxParty: 4,
  inventorySize: 36,
  secondJewelLevel: 15,
  recruitSilver: 35,
  reviveSilver: 25,
  unlockGold: 2,
  safeRadius: 8,
  pickupRadius: 1.5,
};
export const bindings = {
  abilities: ["KeyQ", "KeyW", "KeyE", "KeyR"],
  inventory: "KeyI",
  skills: "KeyK",
  map: "KeyM",
  tactical: "Space",
  debug: "F3",
};
export const discovery = {
  cellsPerChunk: 16, // 16x16 cells per 32x32 chunk -> 2x2 tiles per cell
  tileSize: 2,
  radius: 11, // camera visible range in world units
};

export const statFormulas = {
  vitalityHealthBonus: (points: number, level: number) =>
    Math.round(points * (16 + level * 1.2)),
  armorReduction: (armorRating: number, level: number) => {
    const k = 35 + level * 2.5;
    return Math.min(0.75, armorRating / (armorRating + k));
  },
  speedBonus: (points: number) => {
    // Soft cap diminishing returns on movement speed
    return Math.min(2.5, Math.log1p(points * 0.18) * 1.4);
  },
  resourceBonus: (points: number) => points * 15,
  luckMultiplier: (points: number) => 1 + Math.min(0.6, Math.log1p(points * 0.12) * 0.35),
  charismaDiscount: (points: number) => Math.min(0.25, points * 0.025),
};

export const xpRequiredForLevel = (level: number) =>
  Math.floor(55 + 30 * level + 8 * Math.pow(level, 1.35));
export const baseHealthForLevel = (level: number) => 110 + 18 * (level - 1);
export const baseDamageForLevel = (level: number) =>
  14 + 3 * Math.pow(Math.max(0, level - 1), 0.85);

export function regionalVariance(cx: number, cy: number): number {
  const hash = Math.sin(cx * 12.9898 + cy * 78.233) * 43758.5453;
  const norm = hash - Math.floor(hash);
  return Math.round((norm - 0.5) * 3); // -1 to +1
}

export const regionLevel = (x: number, y: number, danger = 0, anomaly = 0) => {
  const dist = Math.hypot(x, y);
  const chunkDist = dist / 32;
  if (chunkDist < 1.5) return 1; // Safe spawn area
  const base = 1 + Math.floor(Math.pow(chunkDist, 1.1) * 1.1);
  const variance = regionalVariance(Math.floor(x / 32), Math.floor(y / 32));
  return Math.max(1, base + danger + Math.floor(anomaly * 2) + variance);
};
