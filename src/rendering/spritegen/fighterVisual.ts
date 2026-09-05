import type { CharacterVisualDefinition } from "./types";

/**
 * Lutador v2 — aventureiro/guerreiro inicial.
 * Paleta dessaturada compatível com o cenário (prados, pedra, madeira):
 * túnica terracota como a screenshot, aço fosco, couro gasto, pele quente.
 */
export const fighterVisual: CharacterVisualDefinition = {
  // Refinamento v2: dessaturação ~10% + compressão de contraste ~8%
  // (valores resultantes do pipeline em scripts/spritegen/fighter-idle.mjs).
  id: "fighter",
  skin: {
    base: { r: 213, g: 180, b: 147 },
    shade: { r: 181, g: 146, b: 114 },
    light: { r: 231, g: 205, b: 175 },
  },
  hair: {
    base: { r: 57, g: 47, b: 41 },
    shade: { r: 41, g: 33, b: 29 },
    light: { r: 85, g: 70, b: 60 },
  },
  cloth: {
    base: { r: 158, g: 87, b: 67 },
    shade: { r: 126, g: 66, b: 51 },
    light: { r: 184, g: 112, b: 87 },
  },
  armor: {
    base: { r: 155, g: 163, b: 167 },
    shade: { r: 115, g: 123, b: 128 },
    light: { r: 204, g: 210, b: 214 },
  },
  leather: {
    base: { r: 90, g: 71, b: 56 },
    shade: { r: 70, g: 55, b: 42 },
    light: { r: 114, g: 92, b: 73 },
  },
  steel: {
    base: { r: 197, g: 203, b: 207 },
    shade: { r: 153, g: 160, b: 165 },
    light: { r: 229, g: 235, b: 237 },
  },
};
