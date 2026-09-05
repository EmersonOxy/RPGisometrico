export type EnemySpriteMode = "idle" | "walk";

export interface EnemySpriteSheetConfig {
  key: string;
  url: string;
  columns: number;
  rows: number;
  fps: number;
}

export interface EnemySpriteEntry {
  idle: EnemySpriteSheetConfig;
  walk?: EnemySpriteSheetConfig;
  /** Visual scale relative to player (player = 1.0). Controls final render size. */
  scale: number;
  /** Anchor X (0-1). 0.5 = center. */
  anchorX: number;
  /** Anchor Y (0-1). Maps to feet/ground contact point in the sprite cell. */
  anchorY: number;
  /**
   * Maps game direction index (0=N,1=NE,2=E,3=SE,4=S,5=SW,6=W,7=NW)
   * to sprite sheet row index. Only set when the sheet has reversed or
   * non-standard row ordering. Omit for standard [0,1,2,3,4,5,6,7].
   */
  directionMap?: number[];
}

function sheet(
  id: string,
  mode: EnemySpriteMode,
  url: string,
  columns: number,
  rows: number,
  fps: number,
): EnemySpriteSheetConfig {
  return { key: `${id}-sheet-${mode}`, url, columns, rows, fps };
}

export const enemySpriteConfig: Record<string, EnemySpriteEntry> = {
  golem: {
    idle: sheet("golem", "idle",
      new URL("../../assets/sprite/enemy/golem de musgo/golem_idle.png", import.meta.url).href,
      4, 8, 4),
    walk: sheet("golem", "walk",
      new URL("../../assets/sprite/enemy/golem de musgo/golem_walk.png", import.meta.url).href,
      4, 8, 10),
    scale: 1.4,
    anchorX: 0.5,
    anchorY: 1.0,
  },
  wolf: {
    idle: sheet("wolf", "idle",
      new URL("../../assets/sprite/enemy/lobisomen/lobisomen_idle.png", import.meta.url).href,
      6, 8, 4),
    walk: sheet("wolf", "walk",
      new URL("../../assets/sprite/enemy/lobisomen/lobisomen_walk.png", import.meta.url).href,
      4, 8, 10),
    scale: 1.1,
    anchorX: 0.5,
    anchorY: 0.99,
  },
  boar: {
    idle: sheet("boar", "idle",
      new URL("../../assets/sprite/enemy/javali zumbi/javali_zumbi.png", import.meta.url).href,
      4, 8, 4),
    scale: 1.1,
    anchorX: 0.5,
    anchorY: 1.0,
    directionMap: [4, 5, 6, 7, 0, 1, 2, 3],
  },
  witch: {
    idle: sheet("witch", "idle",
      new URL("../../assets/sprite/enemy/mago sombrio/mago_sombrio.png", import.meta.url).href,
      4, 8, 4),
    scale: 1.0,
    anchorX: 0.5,
    anchorY: 0.96,
  },
  slime: {
    idle: sheet("slime", "idle",
      new URL("../../assets/sprite/enemy/slime/slime.png", import.meta.url).href,
      4, 8, 4),
    scale: 0.8,
    anchorX: 0.5,
    anchorY: 0.90,
    directionMap: [4, 5, 6, 7, 0, 1, 2, 3],
  },
};
