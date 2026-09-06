import type { BiomeId, Poi } from "../core/types";
export interface PoiDefinition {
  name: string; kind: Poi["kind"]; biomes: BiomeId[]; radius: number;
  danger: number; safe: boolean; loot?: string; npc?: string; discoveryXp: number;
  pieces: { texture: string; x: number; y: number; scale?: number }[];
}
const all: BiomeId[] = ["plains","forest","desert","swamp","ice","mountain"];
const land: BiomeId[] = ["plains","forest","mountain"];
export const poiRegistry: Record<string,PoiDefinition> = {
  waystation: {name:"Posto de viajantes",kind:"merchant",biomes:land,radius:5,danger:0,safe:true,npc:"traveler",discoveryXp:20,pieces:[{texture:"merchant",x:1,y:1},{texture:"campfire",x:-2,y:0},{texture:"crate",x:2,y:-2}]},
  camp: {name:"Acampamento habitado",kind:"shrine",biomes:land,radius:5,danger:0,safe:true,npc:"explorer",discoveryXp:20,pieces:[{texture:"tent",x:1,y:0},{texture:"campfire",x:-1,y:1},{texture:"bedroll",x:-2,y:0}]},
  abandoned: {name:"Acampamento abandonado",kind:"chest",biomes:all,radius:4,danger:0,safe:false,loot:"travel",discoveryXp:15,pieces:[{texture:"bedroll",x:0,y:0},{texture:"crate",x:1,y:1},{texture:"campfire",x:-1,y:0}]},
  watchtower: {name:"Torre de vigília",kind:"ruin",biomes:["plains","desert","mountain"],radius:5,danger:2,safe:false,loot:"hunter",discoveryXp:25,pieces:[{texture:"watchtower",x:0,y:0},{texture:"crate",x:2,y:1}]},
  ritual: {name:"Círculo ritual",kind:"elite",biomes:["swamp","forest","ice"],radius:5,danger:3,safe:false,loot:"arcane",discoveryXp:30,pieces:[{texture:"shrine",x:0,y:0},{texture:"ritualStone",x:2,y:0},{texture:"ritualStone",x:-2,y:0},{texture:"ritualStone",x:0,y:2},{texture:"ritualStone",x:0,y:-2}]},
  largeRuin: {name:"Pátio esquecido",kind:"ruin",biomes:all,radius:6,danger:2,safe:false,loot:"stone",discoveryXp:30,pieces:[{texture:"ruin",x:-2,y:0},{texture:"ruin",x:2,y:0,scale:.8},{texture:"crate",x:0,y:2}]},
  graveyard: {name:"Jardim dos ausentes",kind:"shrine",biomes:["forest","swamp","ice"],radius:5,danger:0,safe:true,npc:"hermit",discoveryXp:25,pieces:[{texture:"gravestone",x:-1,y:0},{texture:"gravestone",x:1,y:1},{texture:"gravestone",x:0,y:-2},{texture:"shrine",x:2,y:-1,scale:.6}]},
  den: {name:"Toca territorial",kind:"nest",biomes:all,radius:4,danger:2,safe:false,loot:"wild",discoveryXp:20,pieces:[{texture:"nest",x:0,y:0},{texture:"rock-med",x:-2,y:0,scale:2}]},
  overlook: {name:"Mirante dos ventos",kind:"shrine",biomes:["mountain","plains","ice"],radius:4,danger:0,safe:true,npc:"explorer",discoveryXp:40,pieces:[{texture:"waystone",x:0,y:0},{texture:"bedroll",x:2,y:0}]},
  wreck: {name:"Carroça partida",kind:"chest",biomes:["plains","desert","forest"],radius:4,danger:0,safe:false,loot:"travel",npc:"survivor",discoveryXp:15,pieces:[{texture:"wagon",x:0,y:0},{texture:"crate",x:2,y:0}]},
};
export const poiDefinition = (p: Poi) => p.variant ? poiRegistry[p.variant] : undefined;
export const safePoi = (p: Poi) => poiDefinition(p)?.safe ?? (p.kind === "merchant" || p.kind === "shrine");
