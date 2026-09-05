// spritegen — arquitetura reutilizável de sprites vetoriais/procedurais.
// Implementação executável desta fase: scripts/spritegen/fighter-idle.mjs
// (zero dependências, rasterizador próprio + encoder PNG).
// Futuras classes/inimigos reutilizam estes tipos + rig + poses.

/** Ordem das 8 linhas da sheet: N, NE, E, SE, S, SW, W, NW. */
export const DIRECTION_NAMES = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
export type DirectionIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Padrão mestre v2: célula inteira idêntica, pés ancorados. */
export const MASTER_CELL = 264;
export const MASTER_GROUND_Y = 232; // linha dos pés dentro da célula
export const MASTER_CENTER_X = 132;
export const IDLE_COLUMNS = 6;
export const IDLE_ROWS = 8;

export interface RGB { r: number; g: number; b: number; }
export interface Vec { x: number; y: number; }

export interface Material {
  base: RGB;
  shade: RGB;
  light: RGB;
}

export interface CharacterVisualDefinition {
  id: string;
  skin: Material;
  hair: Material;
  cloth: Material;
  armor: Material;
  leather: Material;
  steel: Material;
}

export interface LimbPose {
  shoulder: Vec; elbow: Vec; hand: Vec;
  hip: Vec; knee: Vec; foot: Vec;
}

/** Pose completa de um frame: juntas + flags de visibilidade por direção. */
export interface PoseDefinition {
  direction: DirectionIndex;
  phase: number; // 0..5 (idle)
  head: Vec;
  neck: Vec;
  shoulderC: Vec;
  hipC: Vec;
  front: LimbPose; // lado voltado à câmera
  back: LimbPose;  // lado ocluído
  faceMode: "back" | "back34" | "profile" | "front34" | "front";
  profileSign: -1 | 0 | 1; // +1 rosto para a direita, -1 esquerda
  swordInFront: boolean;
  swordTip: Vec;
  swordBase: Vec;
}

export interface SheetSpec {
  file: string;
  columns: number;
  rows: number;
  cell: number;
}
