import type { Engine } from "../core/Engine";
import { classRequirement } from "../progression/ClassUnlocks";
import { classRegistry } from "../data/classes";
import { statsFor } from "../progression/Character";

export function sandboxView(e: Engine, active: boolean) {
  const number = (id:string, label:string, value:number, max=1000000, min=0) => `<label>${label}<input data-sandbox="${id}" type="number" min="${min}" max="${max}" value="${value}"></label>`;
  const check = (id:string,label:string,value:boolean) => `<label><input data-sandbox="${id}" type="checkbox" ${value?"checked":""}>${label}</label>`;
  return `<section class="sandbox-controls"><h3>Laboratório sandbox</h3><p>${active ? "Experimento ativo · autosave suspenso" : "Aplicar inicia um experimento reversível"}</p>
    ${number("level","Nível do controlado",e.selected.level,100,1)}
    ${number("silver","Prata",e.meta.silver)}${number("gold","Ouro",e.meta.gold)}
    ${number("hp","Vida",Math.ceil(e.selected.hp),100000,1)}${number("resource","Recurso",Math.floor(e.selected.resource),100)}
    ${number("points","Pontos de habilidade",e.selected.points,1000)}${number("statPoints","Pontos de atributo",e.selected.statPoints??0,1000)}
    <label>Velocidade da simulação<select data-sandbox="timeScale">${[.25,.5,1,2,4].map(n=>`<option value="${n}" ${e.debugOptions.timeScale===n?"selected":""}>${n}×</option>`).join("")}</select></label>
    ${check("godMode","Grupo invencível",e.debugOptions.godMode)}${check("freezeEnemies","Congelar IA inimiga",e.debugOptions.freezeEnemies)}
    ${check("noCooldowns","Sem recargas",e.debugOptions.noCooldowns)}${check("unlimitedResource","Recurso infinito",e.debugOptions.unlimitedResource)}
    <details><summary>Requisitos das classes</summary>${(["shooter","tank","mage"] as const).map(id=>`<b>${classRegistry[id].name}</b>${number(id+"Level","Nível mínimo",classRequirement(e.meta,id).level,100,1)}${number(id+"Price","Preço em prata",classRequirement(e.meta,id).silver)}`).join("")}</details>
    <button data-action="sandbox-apply">Aplicar valores</button><button data-action="debug" data-id="heal">Restaurar grupo</button>
    ${active ? '<button data-action="sandbox-discard">Descartar experimento</button><button data-action="sandbox-keep">Incorporar à partida e salvar</button>' : ""}</section>`;
}

export function validateSandbox(values: Record<string, number | boolean>) {
  const limits: Record<string,[number,number]>={level:[1,100],silver:[0,1000000],gold:[0,1000000],hp:[1,100000],resource:[0,100],points:[0,1000],statPoints:[0,1000],timeScale:[.25,4]};
  for(const id of ["shooter","tank","mage"]) { limits[id+"Level"]=[1,100];limits[id+"Price"]=[0,1000000]; }
  for(const [id,[min,max]] of Object.entries(limits)) {
    const value=values[id];
    if(typeof value!=="number" || !Number.isFinite(value) || value<min || value>max || (id!=="timeScale"&&!Number.isInteger(value))) throw Error(`Valor inválido: ${id}`);
  }
}
export function applySandbox(e: Engine, values: Record<string, number | boolean>) {
  validateSandbox(values);
  e.meta.silver=Number(values.silver);e.meta.gold=Number(values.gold);
  e.selected.level=Number(values.level);e.selected.xp=0;
  e.selected.points=Number(values.points);e.selected.statPoints=Number(values.statPoints);
  e.selected.hp=Math.min(Number(values.hp),statsFor(e.selected).health);e.selected.resource=Number(values.resource);
  e.run.stats.highestLevel=Math.max(e.run.stats.highestLevel,e.selected.level);
  e.debugOptions={godMode:!!values.godMode,freezeEnemies:!!values.freezeEnemies,noCooldowns:!!values.noCooldowns,unlimitedResource:!!values.unlimitedResource,timeScale:Number(values.timeScale)};
  e.meta.classUnlockRequirements??={};
  for(const id of ["shooter","tank","mage"] as const) e.meta.classUnlockRequirements[id]={level:Number(values[id+"Level"]),silver:Number(values[id+"Price"])};
}
