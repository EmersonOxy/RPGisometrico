import type { Character } from "../core/types";
import { classRegistry } from "../data/classes";
import { abilityRegistry } from "../data/abilities";
import { skillNodeRegistry, type ConditionalSkill } from "../data/skillTree";
import { modifiedAbilityId } from "./Character";
export function learnedNode(c:Character,id:string):boolean {
  const n=skillNodeRegistry[id];
  return !!n && n.classId===c.classId && (n.type==="basic" || !!c.skillNodes?.includes(id) || !!n.passive&&c.passives.includes(n.passive));
}
export function skillRequirement(c:Character,id:string) {
  const n=skillNodeRegistry[id];
  if(!n || n.classId!==c.classId)return "Disciplina de outra classe";
  if(learnedNode(c,id))return "Aprendido";
  if(c.level<n.level)return `Requer nível ${n.level}`;
  if(n.prerequisiteMode==="any" ? !n.prerequisites.some(p=>learnedNode(c,p)) : n.prerequisites.some(p=>!learnedNode(c,p)))return n.prerequisiteMode==="any" ? "Aprenda um dos caminhos anteriores" : "Aprenda o nó anterior";
  if(c.points<n.cost)return `Requer ${n.cost} ponto(s)`;
  return "ready";
}
export function learnSkill(c:Character,id:string) {
  const reason=skillRequirement(c,id);if(reason!=="ready")throw Error(reason);
  const n=skillNodeRegistry[id];c.points-=n.cost;(c.skillNodes??=[]).push(id);
  c.skillPointsSpent=(c.skillPointsSpent??0)+n.cost;
  if(n.passive&&!c.passives.includes(n.passive))c.passives.push(n.passive);
}
export function unlockedAbilities(c:Character) {
  return [...new Set(Object.values(skillNodeRegistry).filter(n=>n.ability&&learnedNode(c,n.id)).map(n=>n.ability!))];
}
export function equipAbility(c:Character,id:string,slot:number) {
  if(!Number.isInteger(slot)||slot<0||slot>3||(id!==""&&!unlockedAbilities(c).includes(id)))throw Error("Habilidade ou slot inválido");
  const loadout=Array.from({length:4},(_,i)=>c.loadout?.[i]??"");
  const old=id ? loadout.indexOf(id) : -1;if(old>=0)loadout[old]=loadout[slot];loadout[slot]=id;c.loadout=loadout;
}
export function hasCondition(c:Character,condition:ConditionalSkill) {
  return Object.values(skillNodeRegistry).some(n=>n.condition===condition&&learnedNode(c,n.id));
}
export function effectiveAbility(c:Character,id:string) {
  id=modifiedAbilityId(c,id);
  let a=abilityRegistry[id];if(!a)return a;
  for(const n of Object.values(skillNodeRegistry))if(n.upgrade&&modifiedAbilityId(c,n.upgrade.ability)===id&&learnedNode(c,n.id))a={...a,...n.upgrade.changes};
  return a;
}
