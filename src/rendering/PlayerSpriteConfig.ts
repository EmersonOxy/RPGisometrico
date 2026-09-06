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
  /**
   * Pixel-art em baixa resolução (ex.: 32x32) precisa de amostragem
   * NEAREST; sem isso o Phaser filtra linear e a sprite fica embaçada
   * ao ampliar para a altura visual (~78px). Arte HD mantém "linear".
   */
  filter?: "nearest" | "linear";
  /** Source-pixel ground pivots, keyed by 'row:column'. */
  pivots?: Record<string, { x: number; y: number }>;
  referenceHeight?: number;
}
export interface PlayerSpriteConfig {
  height: number;
  portrait: { url: string; width: number; height: number; viewBox: string };
  sheets: Record<SpriteMode, SpriteSheetConfig>;
}

/**
 * PADRÃO para classes (lutador, atirador, feiticeiro e futuras): pixel-art
 * 32x32 com 1 coluna x 8 linhas (uma por direção N, NE, E, SE, S, SW, W, NW),
 * filtro NEAREST e retrato 32x32. Sheets geradas por
 * scripts/spritegen/compose-fighter-shooter.cjs. Coluna única = frame
 * estático por direção; o "walk" reaproveita a mesma arte e o jogo aplica
 * o balanço de marcha procedural.
 */
function pixelCharacter(id: ClassId, base: string, idle: string, walk: string, viewBox = "4 0 24 32"): PlayerSpriteConfig {
  const sheet = (mode: SpriteMode, url: string): SpriteSheetConfig => ({
    key: `${id}-sheet-${mode}`, url, columns: 1,
    rows: 8, directionRows: [0, 1, 2, 3, 4, 5, 6, 7],
    fps: 1, registration: "head", filter: "nearest",
  });
  return {
    height: 78,
    portrait: { url: base, width: 32, height: 32, viewBox },
    sheets: { idle: sheet("idle", idle), walk: sheet("walk", walk) },
  };
}

// Literal URLs allow Vite to include the images in production builds.
export const playerSpriteConfig: Record<ClassId, PlayerSpriteConfig> = {
  fighter: pixelCharacter("fighter",
    new URL("../../assets/sprite/player/lutador/lutador_base.png", import.meta.url).href,
    new URL("../../assets/sprite/player/lutador/lutador_idle.png", import.meta.url).href,
    new URL("../../assets/sprite/player/lutador/lutador_walk.png", import.meta.url).href),
  shooter: pixelCharacter("shooter",
    new URL("../../assets/sprite/player/atirador/atirador_base.png", import.meta.url).href,
    new URL("../../assets/sprite/player/atirador/atirador_idle.png", import.meta.url).href,
    new URL("../../assets/sprite/player/atirador/atirador_walk.png", import.meta.url).href),
  mage: pixelCharacter("mage",
    new URL("../../assets/sprite/player/feiticeiro/feiticeiro_base.png", import.meta.url).href,
    new URL("../../assets/sprite/player/feiticeiro/feiticeiro_idle.png", import.meta.url).href,
    new URL("../../assets/sprite/player/feiticeiro/feiticeiro_walk.png", import.meta.url).href),
  tank: pixelCharacter("tank",
    new URL("../../assets/sprite/player/tank/tank_base.png", import.meta.url).href,
    new URL("../../assets/sprite/player/tank/tank_idle.png", import.meta.url).href,
    new URL("../../assets/sprite/player/tank/tank_walk.png", import.meta.url).href,
    "2 0 28 32"),
};

// Idle animado do lutador: assets/sprite/player/lutador/idle/ tem 8-10 frames
// por direção (frente e costas); cada linha anima só a sua direção.
// Colunas = maior nº de frames (direções curtas ciclam). Se as pastas
// ganharem/perderem frames, ajuste columns aqui (fps 6 ≈ 1,7 s/loop).
playerSpriteConfig.fighter.sheets.idle.columns = 10;
playerSpriteConfig.fighter.sheets.idle.fps = 6;
