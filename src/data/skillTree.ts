import type { ClassId } from "../core/types";
import type { AbilityDefinition } from "./abilities";
import { classRegistry } from "./classes";
import { abilityRegistry } from "./abilities";
import { passiveRegistry } from "./passives";
export type ConditionalSkill = "pressure" | "leech" | "execution" | "distance" | "criticalRefund" | "exposed" | "thermalRefund" | "burnSpread" | "elemental" | "guardResource" | "guardCounter" | "rescue";
export interface SkillNode {
  id:string; classId:ClassId; name:string; description:string; branch:number; tier:number;
  level:number; cost:number; prerequisites:string[];
  ability?:string; passive?:string; condition?:ConditionalSkill;
  upgrade?:{ability:string; changes:Partial<AbilityDefinition>};
  type?: "basic" | "active" | "passive" | "upgrade" | "conditional" | "mastery";
  phase?: "foundation" | "specialization";
  lane?: number;
  prerequisiteMode?: "all" | "any";
  children?: string[];
}
export const branchNames:Record<ClassId,string[]>={fighter:["Técnica","Execução","Pressão","Ímpeto"],shooter:["Perfuração","Armadilhas","Dispersão","Precisão"],mage:["Brasa","Conjuração","Controle","Proteção"],tank:["Vanguarda","Retaliação","Abrigo","Ruptura"]};
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
  const add=(node:Omit<SkillNode,"classId">)=>skillNodeRegistry[node.id]={phase:"specialization",...node,classId:cls.id};
  add({id:`${cls.id}:basic`,name:abilityRegistry[cls.basic].name,description:"Ataque básico da classe. Disponível desde o início.",type:"basic",phase:"foundation",branch:-1,tier:0,level:1,cost:0,prerequisites:[]});
  cls.abilities.forEach((ability,i)=>add({id:`${cls.id}:foundation:${i}`,name:abilityRegistry[ability].name,description:abilityRegistry[ability].description,type:"active",phase:"foundation",branch:-1,tier:i+1,level:i+2,cost:1,prerequisites:[i?`${cls.id}:foundation:${i-1}`:`${cls.id}:basic`],ability}));
  cls.additionalAbilities!.forEach((ability,branch)=>{
    const entry=`${cls.id}:active:${branch}`, root=`${cls.id}:root:${branch}`, improvement=`${cls.id}:upgrade:${branch}`;
    add({id:entry,name:abilityRegistry[ability].name,description:abilityRegistry[ability].description,type:"active",branch,tier:5,level:6,cost:1,prerequisites:[`${cls.id}:foundation:3`],ability});
    // Every branch splits into a passive/functional path and an active upgrade.
    const passive=cls.passives[branch];
    if(passive)add({id:root,name:passiveRegistry[passive].name,description:passiveRegistry[passive].description,type:"passive",branch,tier:6,lane:-1,level:7,cost:1,prerequisites:[entry],passive});
    else add({id:root,name:"Prática fluida",description:"Permite se mover durante a preparação desta habilidade.",type:"upgrade",branch,tier:6,lane:-1,level:7,cost:1,prerequisites:[entry],upgrade:{ability,changes:{canMoveDuringCast:true}}});
    const functional:Record<ClassId,Partial<AbilityDefinition>[]>={fighter:[{executeBelow:.35},{cone:90,handler:"area",target:"DIRECTION",targetMode:"DIRECTION",requiresTarget:false},{radius:4.5,range:4.5},{healthCost:.04}],shooter:[{pierce:true},{radius:2.4},{pierce:true},{windup:.3}],mage:[{pierce:true},{delay:1},{range:13},{duration:5}],tank:[{duration:4},{duration:5},{healFraction:.14},{cone:110,handler:"area",target:"DIRECTION",targetMode:"DIRECTION",requiresTarget:false}]};
    const descriptions:Record<ClassId,string[]>={fighter:["Ferida aberta dobra o dano contra alvos abaixo de 35% da vida.","Execução atinge um cone de 90° orientado pelo jogador.","Talho amplo alcança 4,5 tiles.","Reduz o custo de vida de Fúria de sangue para 4%."],shooter:["Flecha de inverno atravessa inimigos.","Laço de ferro cobre raio de 2,4 tiles.","As flechas de Leque de aço atravessam inimigos.","Reduz a preparação de Tiro paciente para 0,3 s."],mage:["O projétil de brasa atravessa inimigos.","Estrela cadente explode após 1 s.","Lança de inverno alcança 13 tiles.","A guarda pessoal dura 5 s."],tank:["A guarda da investida dura 4 s.","Retaliação permanece ativa por 5 s.","Fôlego comum restaura 14% da vida máxima.","Quebra de linha atinge um cone de 110°. Orientação substitui alvo único."]};
    add({id:improvement,name:"Aperfeiçoar · "+abilityRegistry[ability].name,description:descriptions[cls.id][branch],type:"upgrade",branch,tier:6,lane:1,level:7,cost:1,prerequisites:[entry],upgrade:{ability,changes:functional[cls.id][branch]}});
    const condition=conditions[cls.id][branch];
    if(condition){const [id,name,description]=condition;add({id:`${cls.id}:cap:${branch}`,name,description,type:"conditional",branch,tier:7,level:9,cost:2,prerequisites:[root,improvement],prerequisiteMode:"any",condition:id});}
    else {
      const u=upgrades[cls.id][0];
      add({id:`${cls.id}:cap:3`,name:u.name,description:u.description,type:"mastery",branch,tier:7,level:9,cost:2,prerequisites:[root,improvement],prerequisiteMode:"any",upgrade:{ability:u.ability,changes:u.changes}});
    }
  });
}
for(const n of Object.values(skillNodeRegistry))n.children=Object.values(skillNodeRegistry).filter(child=>child.prerequisites.includes(n.id)).map(child=>child.id);
