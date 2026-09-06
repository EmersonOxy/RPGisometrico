import type { ClassId } from "../core/types";
import type { AbilityDefinition } from "./abilities";
import { classRegistry } from "./classes";
export type ConditionalSkill = "pressure" | "leech" | "execution" | "distance" | "criticalRefund" | "exposed" | "thermalRefund" | "burnSpread" | "elemental" | "guardResource" | "guardCounter" | "rescue";
export interface SkillNode {
  id:string; classId:ClassId; name:string; description:string; branch:number; tier:number;
  level:number; cost:number; prerequisites:string[];
  ability?:string; passive?:string; condition?:ConditionalSkill;
  upgrade?:{ability:string; changes:Partial<AbilityDefinition>};
}
export const branchNames:Record<ClassId,string[]>={fighter:["Duelista","Berserker","Vanguardista"],shooter:["Precisão","Caçador","Armadilheiro"],mage:["Arcano","Elemental","Tempestade"],tank:["Guardião","Colosso","Comandante"]};
export const skillNodeRegistry:Record<string,SkillNode>={};
const conditions: Record<ClassId,[ConditionalSkill,string,string][]>={
  fighter:[["pressure","Pressão contínua","Três golpes diretos no mesmo inimigo em 3 s quebram sua armadura por 2 s."],["leech","Sobrevivência feroz","Abaixo de 40% da vida, recupera 12% do dano direto causado."],["execution","Última palavra","Golpes diretos contra inimigos abaixo de 30% da vida causam +25% de dano."]],
  shooter:[["distance","Linha de vantagem","Golpes diretos a pelo menos 5 tiles causam +20% de dano."],["criticalRefund","Foco recuperado","Críticos diretos devolvem 8 de recurso."],["exposed","Caça paciente","Golpes diretos em alvos lentos causam +20% de dano."]],
  mage:[["elemental","Ressonância","Golpes diretos contra alvos queimando causam +15% de dano."],["thermalRefund","Ciclo térmico","Choque térmico restaura 10 de recurso e reduz as recargas ativas em 2 s."],["burnSpread","Brasa errante","Ao matar com golpe direto um alvo queimando, espalha queimadura para até dois inimigos a 3 tiles."]],
  tank:[["guardResource","Guarda resoluta","Receber um golpe direto sob guarda devolve 6 de recurso."],["guardCounter","Rebote","Sob guarda, devolve 15% do dano base dos golpes diretos ao agressor."],["rescue","Abrigo vital","Pacto de abrigo também restaura 6% da vida máxima dos aliados."]],
};
const upgrades:Record<ClassId,{ability:string;name:string;description:string;changes:Partial<AbilityDefinition>}[]>={
 fighter:[{ability:"heavy",name:"Ruptura em arco",description:"Ruptura passa a atingir um cone de 90°; mantém o atordoamento.",changes:{handler:"area",target:"DIRECTION",targetMode:"DIRECTION",requiresTarget:false,cone:90}},{ability:"rend",name:"Ferida profunda",description:"Ferida aberta perfura a guarda física: também dobra o dano abaixo de 35% de vida.",changes:{executeBelow:.35}},{ability:"charge",name:"Entrada protegida",description:"Investida concede guarda por 2 s.",changes:{selfStatus:"guard",duration:2}}],
 shooter:[{ability:"volley",name:"Três linhas",description:"Os três projéteis de Três presságios passam a perfurar.",changes:{pierce:true}},{ability:"pin",name:"Frio penetrante",description:"Flecha de inverno passa a perfurar.",changes:{pierce:true}},{ability:"snare",name:"Rede ampla",description:"Laço de ferro cobre raio 2,4 em vez de 1,4.",changes:{radius:2.4}}],
 mage:[{ability:"arcane",name:"Lança atravessadora",description:"Lança astral passa a perfurar.",changes:{pierce:true}},{ability:"meteor",name:"Presságio breve",description:"Estrela cadente explode em 1 s em vez de 1,8 s.",changes:{delay:1}},{ability:"chain",name:"Circuito longo",description:"Fio da tormenta salta para seis alvos em vez de quatro.",changes:{count:6}}],
 tank:[{ability:"protect",name:"Pacto duradouro",description:"Guarda de Pacto de abrigo dura 6 s em vez de 4 s.",changes:{duration:6}},{ability:"slam",name:"Abalo frontal",description:"Abalo alcança 5 tiles num cone de 120°; exige orientar o impacto.",changes:{range:5,cone:120,target:"DIRECTION",targetMode:"DIRECTION",requiresTarget:false}},{ability:"rally",name:"Fôlego renovado",description:"Fôlego comum restaura 14% de vida em vez de 8%.",changes:{healFraction:.14}}],
};
for(const cls of Object.values(classRegistry)) {
  const add=(node:Omit<SkillNode,"classId">)=>skillNodeRegistry[node.id]={...node,classId:cls.id};
  cls.passives.forEach((id,branch)=>add({id:`${cls.id}:root:${branch}`,name:branchNames[cls.id][branch],description:"Talento inicial do ramo.",branch,tier:0,level:1,cost:1,prerequisites:[],passive:id}));
  cls.additionalAbilities!.forEach((ability,i)=>add({id:`${cls.id}:active:${i}`,name:ability,description:"Desbloqueia uma opção para os quatro slots.",branch:i%3,tier:i===3?3:1,level:i===3?5:2,cost:1,prerequisites:[`${cls.id}:root:${i%3}`],ability}));
  upgrades[cls.id].forEach((u,branch)=>add({id:`${cls.id}:upgrade:${branch}`,name:u.name,description:u.description,branch,tier:2,level:3,cost:1,prerequisites:[`${cls.id}:active:${branch}`],upgrade:{ability:u.ability,changes:u.changes}}));
  conditions[cls.id].forEach(([condition,name,description],branch)=>add({id:`${cls.id}:cap:${branch}`,name,description,branch,tier:4,level:6,cost:2,prerequisites:[`${cls.id}:upgrade:${branch}`],condition}));
}
