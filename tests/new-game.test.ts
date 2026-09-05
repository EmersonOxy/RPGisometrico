import {describe,it,expect} from "vitest";
import {freshGame,newRun} from "../src/core/Run";
import {defaultMeta} from "../src/persistence/SaveRepository";
import {Engine} from "../src/core/Engine";
import {EventBus} from "../src/core/EventBus";
import {classUnlockDefaults} from "../src/progression/ClassUnlocks";
import {applySandbox} from "../src/ui/SandboxView";
describe("Nova jornada e classes",()=>{
  it("rejeita valores inválidos no sandbox sem alteração parcial",()=>{
    const meta=defaultMeta(),e=new Engine(newRun("sandbox","fighter",meta),meta,new EventBus(),async()=>{});
    try {expect(()=>applySandbox(e,{silver:999,level:NaN})).toThrow();expect(meta.silver).toBe(45);expect(e.selected.level).toBe(1);}finally{e.destroy();}
  });
  it("sandbox impede dano ao grupo e não grava autosave",async()=>{
    const meta=defaultMeta();let writes=0;const e=new Engine(newRun("sandbox","fighter",meta),meta,new EventBus(),async()=>{writes++;});
    try {e.sandboxActive=true;e.debugOptions.godMode=true;const hp=e.selected.hp;e.combat.hit("enemy",e.selected,1000);expect(e.selected.hp).toBe(hp);await e.save();expect(writes).toBe(0);expect(e.saveStatus).toContain("Sandbox");}finally{e.destroy();}
  });
  it("reinicia progresso e preserva somente preferências",()=>{
    const old=defaultMeta();old.silver=9999;old.gold=99;old.unlockedClasses=["tank","mage"];old.statistics={runs:25,kills:300};old.tutorials={move:true};old.settings.volume=.13;old.classUnlockRequirements={mage:{level:1,silver:0}};
    const fresh=freshGame("new",old);
    expect(fresh.meta.silver).toBe(45);expect(fresh.meta.gold).toBe(2);expect(fresh.meta.unlockedClasses).toEqual(["fighter"]);expect(fresh.meta.tutorials).toEqual({});expect(fresh.meta.classUnlockRequirements).toBeUndefined();expect(fresh.meta.settings.volume).toBe(.13);
    expect(fresh.run.party).toHaveLength(1);expect(fresh.run.party[0].level).toBe(1);expect(fresh.run.inventory).toEqual([]);expect(fresh.run.targetQueue).toEqual([]);expect(fresh.run.commandSelection).toEqual([]);expect(old.silver).toBe(9999);
  });
  for(const cls of ["shooter","tank","mage"] as const)it(`${cls}: exige nível e prata, compra apenas uma vez`,()=>{
    const meta=defaultMeta(),e=new Engine(newRun("classes","fighter",meta),meta,new EventBus(),async()=>{}),rule=classUnlockDefaults[cls];
    try{
      e.shop.active="shop";meta.silver=1000;
      expect(()=>e.shop.unlock(cls)).toThrow(/nível/);expect(meta.silver).toBe(1000);
      e.selected.level=rule.level;meta.silver=rule.silver-1;
      expect(()=>e.shop.unlock(cls)).toThrow(/Prata/);expect(meta.unlockedClasses).not.toContain(cls);
      meta.silver=rule.silver;e.shop.unlock(cls);expect(meta.silver).toBe(0);expect(meta.unlockedClasses).toContain(cls);e.shop.unlock(cls);expect(meta.silver).toBe(0);
    }finally{e.destroy();}
  });
});
