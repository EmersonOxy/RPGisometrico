import type { BiomeId, ClassId, Slot, Stats } from "../core/types";
export interface ItemBase {
  minLevel?: number;
  biomes?: BiomeId[];
  id: string;
  name: string;
  slot: Slot;
  tags: string[];
  classes?: ClassId[];
  stats: Partial<Stats>;
}
export const itemBaseRegistry: Record<string, ItemBase> = {
  sword: {
    id: "sword",
    name: "Lâmina de vigília",
    slot: "weapon",
    tags: ["MELEE", "PHYSICAL"],
    classes: ["fighter", "tank"],
    stats: { damage: 5 },
  },
  bow: {
    id: "bow",
    name: "Arco de freixo",
    slot: "weapon",
    tags: ["PROJECTILE", "PHYSICAL"],
    classes: ["shooter"],
    stats: { damage: 6 },
  },
  staff: {
    id: "staff",
    name: "Cajado de âmbar",
    slot: "weapon",
    tags: ["MAGIC", "FIRE"],
    classes: ["mage"],
    stats: { damage: 6 },
  },
  shield: {
    id: "shield",
    name: "Escudo de ardósia",
    slot: "offhand",
    tags: ["DEFENSIVE"],
    stats: { armor: 6 },
  },
  coat: {
    id: "coat",
    name: "Manto de viajante",
    slot: "armor",
    tags: ["DEFENSIVE"],
    stats: { health: 15, armor: 3 },
  },
  ring: {
    id: "ring",
    name: "Anel de cobre",
    slot: "ring",
    tags: ["MAGIC"],
    stats: { regen: 1 },
  },
};
export const rarityNames = ["Comum", "Refinado", "Raro", "Épico", "Relíquia"];
const base=(id:string,name:string,slot:Slot,tags:string[],stats:Partial<Stats>,classes?:ClassId[],minLevel=1,biomes?:BiomeId[]):ItemBase=>({id,name,slot,tags,stats,classes,minLevel,biomes});
for(const item of [
  base("greatsword","Espada do crepúsculo","weapon",["MELEE","PHYSICAL","HEAVY"],{damage:10,speed:-.2},["fighter"],3),
  base("axe","Machado de cerne","weapon",["MELEE","PHYSICAL","HEAVY"],{damage:8,crit:.025,armor:-2},["fighter"],2,["forest"]),
  base("quickblade","Lâmina de andorinha","weapon",["MELEE","PHYSICAL","LIGHT"],{damage:3,crit:.07,speed:.15},["fighter"],1,["plains"]),
  base("shortbow","Arco de trilha","weapon",["PROJECTILE","PHYSICAL","LIGHT"],{damage:3,speed:.2,regen:1},["shooter"]),
  base("longbow","Arco de sentinela","weapon",["PROJECTILE","PHYSICAL"],{damage:8,crit:.04,speed:-.1},["shooter"],3,["mountain"]),
  base("composite","Arco de tendões","weapon",["PROJECTILE","PHYSICAL"],{damage:5,cooldown:.06},["shooter"],5,["desert"]),
  base("froststaff","Cajado da geada","weapon",["MAGIC","FROST"],{damage:4,regen:3},["mage"],2,["ice"]),
  base("wand","Vara de fagulhas","weapon",["MAGIC","FIRE"],{damage:3,fire:.2,cooldown:.04},["mage"],3,["swamp"]),
  base("mace","Maça de muralha","weapon",["MELEE","PHYSICAL","DEFENSIVE"],{damage:7,armor:3,speed:-.1},["tank"],2),
  base("defender","Espada de resguardo","weapon",["MELEE","PHYSICAL","DEFENSIVE"],{damage:3,armor:5,regen:1},["tank"]),
  base("leather","Couro de batedor","armor",["DEFENSIVE","LIGHT"],{health:10,speed:.18},undefined,1,["forest","plains"]),
  base("mail","Malha de vigília","armor",["DEFENSIVE"],{armor:7,health:10},undefined,2),
  base("plate","Couraça de granito","armor",["DEFENSIVE","HEAVY"],{armor:13,speed:-.25},undefined,4,["mountain"]),
  base("robes","Vestes da nascente","armor",["MAGIC","LIGHT"],{regen:3,cooldown:.04,health:8},undefined,2,["swamp"]),
  base("fur","Casaco de inverno","armor",["DEFENSIVE"],{health:32,armor:1},undefined,2,["ice"]),
  base("buckler","Broquel do duelista","offhand",["DEFENSIVE","LIGHT"],{armor:3,crit:.04},["fighter","tank"]),
  base("towerShield","Escudo de torre","offhand",["DEFENSIVE","HEAVY"],{armor:11,health:15,speed:-.2},["tank"],3),
  base("quiver","Aljava de caça","offhand",["PROJECTILE","LIGHT"],{crit:.04,regen:1},["shooter"],1,["forest"]),
  base("focus","Foco de quartzo","offhand",["MAGIC"],{damage:2,regen:2,cooldown:.03},["mage"],2,["mountain"]),
  base("rubyRing","Anel de rubi","ring",["MAGIC","FIRE"],{fire:.15,damage:2},undefined,3,["desert"]),
  base("ironRing","Anel de juramento","ring",["DEFENSIVE"],{armor:4,health:10}),
  base("springRing","Anel da fonte","ring",["MAGIC"],{regen:3},undefined,2,["swamp"]),
  base("windRing","Anel dos caminhos","ring",["LIGHT"],{speed:.2,coins:.05},undefined,2,["plains"]),
  base("eagleRing","Anel do horizonte","ring",["PROJECTILE"],{crit:.05,cooldown:.025},undefined,4,["mountain"]),
])itemBaseRegistry[item.id]=item;
export const rarityColors = [
  "#c7c4b5",
  "#9eb78b",
  "#8eb9d6",
  "#c4a2d9",
  "#dfba72",
];
