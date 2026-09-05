import type { ClassId } from "../core/types";

export type SpriteMode = "idle" | "walk";
export interface SpriteSheetConfig {
  key: string;
  url: string;
  columns: number;
  /** Row indices for N, NE, E, SE, S, SW, W, NW. */
  directionRows: number[];
  rows: number;
  fps: number;
  registration: "head" | "cell";
  /** Source-pixel ground pivots, keyed by 'row:column'. */
  pivots?: Record<string, { x: number; y: number }>;
  referenceHeight?: number;
}
export interface PlayerSpriteConfig {
  height: number;
  portrait: { url: string; width: number; height: number; viewBox: string };
  sheets: Record<SpriteMode, SpriteSheetConfig>;
}

function character(id: ClassId, idle: string, walk: string): PlayerSpriteConfig {
  const sheet = (mode: SpriteMode, url: string): SpriteSheetConfig => ({
    key: `${id}-sheet-${mode}`, url, columns: mode === "idle" ? 4 : 6,
    rows: 8, directionRows: [0, 1, 2, 3, 4, 5, 6, 7],
    fps: mode === "idle" ? 4 : 10, registration: "head",
  });
  return {
    height: 78,
    portrait: { url: idle, width: 887, height: 1774, viewBox: "0 887 221.75 221.75" },
    sheets: { idle: sheet("idle", idle), walk: sheet("walk", walk) },
  };
}

// Literal URLs allow Vite to include the images in production builds.
export const playerSpriteConfig: Record<ClassId, PlayerSpriteConfig> = {
  fighter: character("fighter",
    new URL("../../assets/sprite/player/lutador/lutador_idle.png", import.meta.url).href,
    new URL("../../assets/sprite/player/lutador/lutador_walk.png", import.meta.url).href),
  shooter: character("shooter",
    new URL("../../assets/sprite/player/atirador/atirador_idle.png", import.meta.url).href,
    new URL("../../assets/sprite/player/atirador/atirador_walk.png", import.meta.url).href),
  mage: character("mage",
    new URL("../../assets/sprite/player/feiticeiro/feiticeiro_idle.png", import.meta.url).href,
    new URL("../../assets/sprite/player/feiticeiro/feiticeiro_walk.png", import.meta.url).href),
  tank: character("tank",
    new URL("../../assets/sprite/player/tank/tank_idle.png", import.meta.url).href,
    new URL("../../assets/sprite/player/tank/tank_walk.png", import.meta.url).href),
};

// Experimentos de sprites (v2/v3 raster vetorial, v4 pixel-like) preservados e
// isolados em assets/sprite/player/lutador/v2|v3|v4/ + scripts/spritegen/.
// Nenhum é referenciado: o jogo usa a arte original (lutador_idle.png, 4 colunas).
playerSpriteConfig.fighter.portrait = {
  url: new URL("../../assets/sprite/player/lutador/lutador_base.png", import.meta.url).href,
  width: 1246, height: 1262, viewBox: "294 107 633 1073",
};
playerSpriteConfig.shooter.portrait = {
  url: new URL("../../assets/sprite/player/atirador/atirador_base.png", import.meta.url).href,
  width: 1254, height: 1254, viewBox: "334 167 586 994",
};
playerSpriteConfig.mage.portrait = {
  url: new URL("../../assets/sprite/player/feiticeiro/feiticeiro_base.png", import.meta.url).href,
  width: 1254, height: 1254, viewBox: "350 211 533 904",
};
playerSpriteConfig.tank.portrait = {
  url: new URL("../../assets/sprite/player/tank/tank_base.png", import.meta.url).href,
  width: 1254, height: 1254, viewBox: "303 109 656 1112",
};
