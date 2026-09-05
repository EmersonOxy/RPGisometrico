export type ClassId = "fighter" | "shooter" | "mage" | "tank";
export type BiomeId =
  "plains" | "forest" | "desert" | "swamp" | "ice" | "mountain";
export type Slot = "weapon" | "offhand" | "armor" | "ring";
export type Stat =
  | "damage"
  | "health"
  | "armor"
  | "speed"
  | "crit"
  | "fire"
  | "regen"
  | "cooldown"
  | "coins";
export type Stats = Record<Stat, number>;
export type Point = { x: number; y: number };
export type StatusId =
  "burn" | "slow" | "stun" | "armorBreak" | "guard" | "fury";
export interface Status {
  id: StatusId;
  remaining: number;
  tick: number;
  source: string;
  power: number;
}
export interface Item {
  id: string;
  baseId: string;
  name: string;
  slot: Slot;
  rarity: number;
  level: number;
  requiredLevel: number;
  stats: Partial<Stats>;
  affixes: string[];
  tags: string[];
  value: number;
}
export type PartyOrder =
  | "follow"
  | "hold"
  | "focus"
  | "passive"
  | "aggressive"
  | "regroup";
export type StatPointType =
  | "vitality"
  | "armor"
  | "speed"
  | "mana"
  | "luck"
  | "charisma";

export interface Character extends Point {
  id: string;
  classId: ClassId;
  name: string;
  level: number;
  xp: number;
  hp: number;
  resource: number;
  alive: boolean;
  points: number;
  mastery: number;
  passives: string[];
  equipment: Partial<Record<Slot, Item>>;
  jewels: string[];
  cooldowns: Record<string, number>;
  statuses: Status[];
  path: Point[];
  target?: string;
  facing: number;
  facingAngle?: number;
  partyOrder?: PartyOrder;
  statPoints?: number;
  allocatedStats?: Record<StatPointType, number>;
  attackTime: number;
  aiTime: number;
}
export interface Enemy extends Point {
  id: string;
  definition: string;
  level: number;
  hp: number;
  maxHp: number;
  elite: boolean;
  modifier: "swift" | "armored" | "regenerating";
  statuses: Status[];
  path: Point[];
  target?: string;
  state: string;
  timer: number;
  aiTime: number;
  attackTime: number;
  home: Point;
  threat: Record<string, number>;
}
export interface Drop extends Point {
  id: string;
  kind: "item" | "silver" | "gold" | "jewel";
  amount: number;
  item?: Item;
  jewel?: string;
}
export interface RunStats {
  kills: number;
  seconds: number;
  distance: number;
  highestLevel: number;
  silver: number;
  gold: number;
  biomes: BiomeId[];
}
export interface RunState {
  id: string;
  seed: string;
  worldVersion?: number;
  cartography?: Record<string, import("../world/Cartography").MapSummary>;
  marker?: Point;
  party: Character[];
  selected: string;
  inventory: Item[];
  bagLayout?: Record<string, number>;
  jewels: string[];
  drops: Drop[];
  deltas: Record<string, boolean>;
  discovered: string[];
  discoveryMask?: Record<string, number[]>;
  rng: number;
  command: PartyOrder;
  focusTargetId?: string;
  targetQueue?: string[];
  commandSelection?: string[];
  stats: RunStats;
  ended: boolean;
}
export interface MetaProgress {
  classUnlockRequirements?: Partial<Record<ClassId, {level: number; silver: number}>>;
  silver: number;
  gold: number;
  unlockedClasses: ClassId[];
  settings: {
    sound: boolean;
    volume: number;
    damageNumbers: boolean;
    wasd: boolean;
    secondary: number;
    uiScale: number;
    fontScale: number;
    reducedMotion: boolean;
    quickCast?: boolean;
    movementMode?: "click" | "wasd";
    minimapOrientation?: "north-up" | "rotate";
    minimapSize?: number;
    minimapOpacity?: number;
    hoverHighlight?: boolean;
    highlightIntensity?: "subtle" | "normal" | "strong";
    highlightPalette?: "default" | "colorblind";
    xpDisplay?: "none" | "current-required" | "percent";
    characterIndicator?: "hold" | "always" | "off";
    autoPickup?: boolean;
    alwaysShowLoot?: boolean;
    confirmStats?: boolean;
    autoApproach?: boolean;
    cursorStyle?: "classic" | "quill" | "rune" | "blade" | "system";
    cursorSize?: number;
    radialSlowMo?: "off" | "25" | "50";
    radialHoldDelay?: number;
    lootFeed?: boolean;
    lootFeedDuration?: number;
    groundLootLabels?: "contextual" | "always" | "alt";
    targetQueueNumbers?: boolean;
    clickIndicator?: boolean;
    clickIndicatorIntensity?: "subtle" | "normal";
    worldShadows?: "low" | "medium" | "high";
    uiAnimations?: "full" | "reduced";
    overheadLevel?: boolean;
    overheadResource?: boolean;
    vfxQuality?: "low" | "medium" | "high";
    particles?: boolean;
    screenShake?: boolean;
    fpsCounter?: boolean;
    fpsLimit?: number;
    audioMaster?: number;
    audioMusic?: number;
    audioEffects?: number;
    audioInterface?: number;
    audioAmbient?: number;
    muteMaster?: boolean;
    muteMusic?: boolean;
    muteEffects?: boolean;
    muteInterface?: boolean;
    muteAmbient?: boolean;
    keybindings?: Record<string, string>;
  };
  tutorials: Record<string, boolean>;
  statistics: { runs: number; kills: number };
}
export interface Save {
  schemaVersion: 3 | 4;
  meta: MetaProgress;
  run: RunState | null;
}
export interface Tile {
  x: number;
  y: number;
  biome: BiomeId;
  blocked: boolean;
  cost: number;
  decor: number;
  variant: number;
}
export interface Poi extends Point {
  id: string;
  kind: "merchant" | "shrine" | "ruin" | "chest" | "nest" | "elite";
}
export interface Spawn extends Point {
  id: string;
  definition: string;
  level: number;
  elite: boolean;
}
export interface Chunk {
  key: string;
  cx: number;
  cy: number;
  tiles: Tile[];
  pois: Poi[];
  spawns: Spawn[];
}
export interface Effect extends Point {
  id: number;
  kind:
    | "hit"
    | "ring"
    | "projectile"
    | "danger"
    | "heal"
    | "death"
    | "move"
    | "slash";
  color: number;
  remaining: number;
  duration: number;
  radius: number;
  to?: Point;
  text?: string;
}
export interface Hazard extends Point {
  id: number;
  remaining: number;
  radius: number;
  damage: number;
  source: string;
  friendly: boolean;
  status?: StatusId;
}
export interface Projectile extends Point {
  id: number;
  source: string;
  target: Point;
  enemyTarget?: string;
  speed: number;
  damage: number;
  friendly: boolean;
  pierce: boolean;
  hit: string[];
  remaining: number;
  color: number;
  status?: StatusId;
}
export type Command =
  | { type: "move"; point: Point; silent?: boolean }
  | { type: "target"; id: string }
  | { type: "ability"; slot: number; point?: Point }
  | { type: "select"; index: number }
  | { type: "tactical" }
  | { type: "party"; command: PartyOrder }
  | { type: "memberOrder"; memberId: string; order: PartyOrder }
  | { type: "focusTarget"; id?: string }
  | { type: "targetQueueAdd"; id: string }
  | { type: "targetQueueRemove"; id: string }
  | { type: "targetQueueClear" }
  | { type: "commandSelection"; ids: string[] }
  | { type: "ping"; kind: string; point: Point }
  | { type: "stat"; stat: StatPointType; memberId?: string }
  | { type: "interact"; id: string }
  | { type: "equip"; id: string }
  | { type: "unequip"; slot: Slot }
  | { type: "jewel"; id: string }
  | { type: "unjewel"; id: string }
  | { type: "buy"; id: string }
  | { type: "sell"; id: string }
  | { type: "unlock"; classId: ClassId }
  | { type: "recruit"; classId: ClassId }
  | { type: "mastery" }
  | { type: "passive"; id: string };
