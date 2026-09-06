import {describe,it,expect,afterEach} from "vitest";
import "fake-indexeddb/auto";
import {createCharacter,activeAbilities,addExperience} from "../src/progression/Character";
import {learnSkill,skillRequirement,unlockedAbilities,equipAbility,effectiveAbility} from "../src/progression/SkillTree";
import {classRegistry} from "../src/data/classes";
import {skillNodeRegistry} from "../src/data/skillTree";
import {abilityRegistry} from "../src/data/abilities";
import {migrateSave,defaultMeta,SaveRepository} from "../src/persistence/SaveRepository";
import {newRun} from "../src/core/Run";
import {Engine} from "../src/core/Engine";
import {EventBus} from "../src/core/EventBus";
import {xpRequiredForLevel} from "../src/data/balance";
import {skillPosition,skillConnection} from "../src/ui/SkillTreeLayout";
import type {ClassId} from "../src/core/types";
const cleanup:(()=>void)[]=[];afterEach(()=>cleanup.splice(0).forEach(f=>f()));
for(const cls of Object.keys(classRegistry) as ClassId[])describe(cls+" · trilhas",()=>{
  it("nasce apenas com ataque básico e zero pontos",()=>{
    const c=createCharacter(cls,"new");expect(activeAbilities(c)).toEqual(["","","",""]);expect(unlockedAbilities(c)).toEqual([]);expect(c.points).toBe(0);
    expect(abilityRegistry[classRegistry[cls].basic]).toBeDefined();
    expect(()=>learnSkill(c,cls+":foundation:0")).toThrow(/nível/);
  });
  it("aprende kit em sequência sem equipar automaticamente",()=>{
    const c=createCharacter(cls,"learn");
    for(let i=0;i<4;i++){
      addExperience(c,xpRequiredForLevel(c.level));
      const ready=Object.values(skillNodeRegistry).filter(n=>n.classId===cls&&skillRequirement(c,n.id)==="ready");
      expect(ready.map(n=>n.id)).toEqual([cls+":foundation:"+i]);
      learnSkill(c,ready[0].id);expect(c.points).toBe(0);
    }
    expect(unlockedAbilities(c)).toEqual(classRegistry[cls].abilities);expect(c.loadout).toEqual(["","","",""]);expect(c.skillPointsSpent).toBe(4);
    addExperience(c,xpRequiredForLevel(c.level));
    expect(Object.values(skillNodeRegistry).filter(n=>n.classId===cls&&skillRequirement(c,n.id)==="ready")).toHaveLength(4);
  });
  it("ramos se subdividem e maestria aceita uma das escolhas, cobrando uma vez",()=>{
    const c=createCharacter(cls,"build",0,0,12);c.points=30;
    for(let i=0;i<4;i++)learnSkill(c,cls+":foundation:"+i);
    learnSkill(c,cls+":active:0");learnSkill(c,cls+":upgrade:0");learnSkill(c,cls+":cap:0");
    const before=c.points;expect(()=>learnSkill(c,cls+":cap:0")).toThrow("Aprendido");expect(c.points).toBe(before);
    expect(()=>learnSkill(c,cls+":upgrade:1")).toThrow(/anterior/);
    const n=skillNodeRegistry[cls+":upgrade:0"];
    expect(effectiveAbility(c,n.upgrade!.ability)).toMatchObject(n.upgrade!.changes);
  });
  it("slots fixos permitem equipar, trocar e esvaziar sem limpar recarga",()=>{
    const c=createCharacter(cls,"slots",0,0,10);c.points=10;
    for(let i=0;i<4;i++)learnSkill(c,cls+":foundation:"+i);
    const [a,b]=classRegistry[cls].abilities;c.cooldowns[a]=4;
    equipAbility(c,a,0);equipAbility(c,b,1);equipAbility(c,a,1);expect(c.loadout?.slice(0,2)).toEqual([b,a]);
    equipAbility(c,"",1);expect(c.loadout?.[1]).toBe("");expect(c.cooldowns[a]).toBe(4);
    expect(()=>equipAbility(c,classRegistry[cls].additionalAbilities![0],2)).toThrow();
    expect(()=>equipAbility(c,a,4)).toThrow();
  });
  it("layout tem tronco único, quatro saídas e curvas sem sobrepor nós",()=>{
    const nodes=Object.values(skillNodeRegistry).filter(n=>n.classId===cls);
    expect(skillNodeRegistry[cls+":foundation:3"].children).toHaveLength(4);
    for(const n of nodes){
      for(const id of n.prerequisites){expect(skillNodeRegistry[id].classId).toBe(cls);expect(skillConnection(skillNodeRegistry[id],n)).toContain(" C ");}
      for(const other of nodes){if(other.id===n.id)continue;const p=skillPosition(n),q=skillPosition(other);expect(Math.hypot(p.x-q.x,p.y-q.y)).toBeGreaterThan(110);}
    }
  });
});
describe("integração das trilhas",()=>{
  it("joia modifica habilidade aprendida, nunca preenche slot vazio",()=>{
    const c=createCharacter("fighter","gem");c.jewels=["fire"];expect(activeAbilities(c)[0]).toBe("");
    c.level=2;c.points=1;learnSkill(c,"fighter:foundation:0");equipAbility(c,"heavy",0);expect(activeAbilities(c)[0]).toBe("flame");
  });
  it("comandos antigos não contornam pré-requisitos e combate bloqueia trocas",()=>{
    const m=defaultMeta(),e=new Engine(newRun("tree","fighter",m),m,new EventBus(),async()=>{});cleanup.push(()=>e.destroy());
    const c=e.selected;c.points=20;e.command({type:"passive",id:"momentum"});expect(c.passives).toEqual([]);e.command({type:"mastery"});expect(c.mastery).toBe(0);
    c.level=2;c.combatUntil=10;e.command({type:"skill",id:"fighter:foundation:0"});expect(c.skillNodes).toEqual([]);
    c.combatUntil=0;e.command({type:"skill",id:"fighter:foundation:0"});e.command({type:"loadout",id:"heavy",slot:0});c.combatUntil=10;e.command({type:"loadout",id:"",slot:0});expect(c.loadout?.[0]).toBe("heavy");
  });
  it("migração conserva kit antigo e devolve custo das melhorias redesenhadas uma vez",()=>{
    const m=defaultMeta(),r=newRun("old","fighter",m),c=r.party[0];delete c.skillTreeVersion;delete c.loadout;delete c.skillPointsSpent;
    c.skillNodes=["fighter:root:0","fighter:active:0","fighter:upgrade:0"];c.passives=["momentum"];c.points=3;
    const saved=migrateSave({schemaVersion:5,meta:m,run:r});
    expect(c.loadout).toEqual(classRegistry.fighter.abilities);expect(unlockedAbilities(c)).toContain("rend");expect(c.points).toBe(4);expect(c.passives).toEqual(["momentum"]);
    migrateSave(saved);expect(c.points).toBe(4);
  });
  it("save de nova jornada não recebe habilidades grátis",async()=>{
    const db=new SaveRepository("organic-tree-empty");cleanup.push(()=>db.close());const m=defaultMeta(),r=newRun("new","mage",m);
    await db.save(m,r);const saved=await db.load();expect(saved.run?.party[0].loadout).toEqual(["","","",""]);expect(saved.run?.party[0].skillNodes).toEqual([]);
  });
  it("salva progresso parcial, slots vazios, seleção e pontos gastos",async()=>{
    const db=new SaveRepository("organic-tree-partial");cleanup.push(()=>db.close());const m=defaultMeta(),r=newRun("partial","fighter",m),c=r.party[0];
    addExperience(c,xpRequiredForLevel(1));learnSkill(c,"fighter:foundation:0");equipAbility(c,"heavy",2);c.treeSelection="fighter:foundation:1";
    await db.save(m,r);const saved=(await db.load()).run!.party[0];expect(saved.loadout).toEqual(["","","heavy",""]);expect(saved.treeSelection).toBe(c.treeSelection);expect(saved.skillPointsSpent).toBe(1);expect(saved.points).toBe(0);
  });
});
