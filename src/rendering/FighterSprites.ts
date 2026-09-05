// Compatibility for existing imports; all classes share the implementation.
import { playerSpriteConfig } from "./PlayerSpriteConfig";
export const fighterSheets = playerSpriteConfig.fighter.sheets;
export {
  playerDirection as fighterDirection,
  playerFrameRect as fighterFrameRect,
  PlayerAnimation as FighterAnimation,
} from "./PlayerSprites";
