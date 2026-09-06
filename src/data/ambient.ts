import type { BiomeId } from "../core/types";
export interface AmbientDefinition {
  name: string; kind: "fauna" | "npc"; biomes: BiomeId[]; speed: number; radius: number;
  flying?: boolean; flee: number; texture: string; color: number; dialogue?: string[];
}
export const ambientRegistry: Record<string,AmbientDefinition> = {
  deer:{name:"Cervo de urze",kind:"fauna",biomes:["plains","forest"],speed:1.1,radius:5,flee:4,texture:"deer",color:0xb9956b},
  hare:{name:"Lebre pálida",kind:"fauna",biomes:["plains","ice","mountain"],speed:1.7,radius:4,flee:3,texture:"hare",color:0xd5d5bc},
  fox:{name:"Raposa das dunas",kind:"fauna",biomes:["desert","forest"],speed:1.4,radius:6,flee:5,texture:"fox",color:0xc38b52},
  raven:{name:"Corvo do véu",kind:"fauna",biomes:["forest","swamp","desert","ice","mountain","plains"],speed:2,radius:8,flee:3,flying:true,texture:"raven",color:0x596977},
  traveler:{name:"Viajante",kind:"npc",biomes:["plains","forest"],speed:.8,radius:3,flee:0,texture:"ambient-npc",color:0xd0b278,dialogue:["Siga as clareiras. O silêncio também faz parte da viagem.","As torres antigas ainda têm guardas. Observe antes de entrar."]},
  explorer:{name:"Exploradora",kind:"npc",biomes:["mountain","plains","ice"],speed:1,radius:4,flee:0,texture:"ambient-npc",color:0x83b2a1,dialogue:["Registrei um ponto de interesse adiante. Procure marcos de pedra.","A escala das regiões muda cada jornada; o atlas guarda o que você viu."]},
  hermit:{name:"Eremita",kind:"npc",biomes:["forest","swamp"],speed:.5,radius:2,flee:0,texture:"ambient-npc",color:0xa9a4c5,dialogue:["Até uma gosma tem seu território. Afaste-se e ela voltará para casa.","Frio sobre brasa abre até a couraça mais grossa."]},
  survivor:{name:"Sobrevivente",kind:"npc",biomes:["plains","desert"],speed:.6,radius:2,flee:0,texture:"ambient-npc",color:0xca967e,dialogue:["Perdi a carroça, mas escapei da patrulha. Ainda é uma boa troca.","Não corra de uma matilha em direção a outra toca."]},
};
