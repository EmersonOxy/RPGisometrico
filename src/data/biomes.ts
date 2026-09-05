import type { BiomeId } from "../core/types";
export interface BiomeDefinition {
  id: BiomeId;
  name: string;
  color: number;
  edge: number;
  vegetation: number;
  danger: number;
  enemyPool: string[];
  ambientColor: string;
  fogColor: number;
}
export const biomeRegistry: Record<BiomeId, BiomeDefinition> = {
  plains: {
    id: "plains",
    name: "Prados de Urze",
    color: 0x647a53,
    edge: 0x546948,
    vegetation: 0.07,
    danger: 0,
    enemyPool: ["slime", "boar", "wolf"],
    ambientColor: "#829267",
    fogColor: 0xadb29a,
  },
  forest: {
    id: "forest",
    name: "Bosque do Sussurro",
    color: 0x3d624c,
    edge: 0x355342,
    vegetation: 0.19,
    danger: 0,
    enemyPool: ["wolf", "slime", "archer"],
    ambientColor: "#587f64",
    fogColor: 0x698e7a,
  },
  desert: {
    id: "desert",
    name: "Dunas de Ocre",
    color: 0xa99064,
    edge: 0x957e57,
    vegetation: 0.045,
    danger: 1,
    enemyPool: ["archer", "boar", "golem"],
    ambientColor: "#b6a17c",
    fogColor: 0xc5b78d,
  },
  swamp: {
    id: "swamp",
    name: "Várzea Esquecida",
    color: 0x4c6864,
    edge: 0x405c59,
    vegetation: 0.13,
    danger: 1,
    enemyPool: ["witch", "slime", "wolf"],
    ambientColor: "#698b80",
    fogColor: 0x88a49a,
  },
  ice: {
    id: "ice",
    name: "Altos da Geada",
    color: 0xa5bbb7,
    edge: 0x8da6a4,
    vegetation: 0.06,
    danger: 1,
    enemyPool: ["wolf", "witch", "golem"],
    ambientColor: "#bfd0c8",
    fogColor: 0xd2dfd9,
  },
  mountain: {
    id: "mountain",
    name: "Espinha de Pedra",
    color: 0x808779,
    edge: 0x6f766a,
    vegetation: 0.12,
    danger: 2,
    enemyPool: ["golem", "boar", "archer"],
    ambientColor: "#9b9e90",
    fogColor: 0xa6b1aa,
  },
};
