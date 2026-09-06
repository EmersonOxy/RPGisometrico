import { afterEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { Engine } from "../src/core/Engine";
import { EventBus } from "../src/core/EventBus";
import { newRun } from "../src/core/Run";
import { defaultMeta, migrateSave, SaveRepository } from "../src/persistence/SaveRepository";
import { createCharacter } from "../src/progression/Character";
import { learnSkill, equipAbility } from "../src/progression/SkillTree";
import { classRegistry } from "../src/data/classes";
import { defaultWorldSettings, worldSettings, populationBalance } from "../src/data/worldSettings";
import { generateChunk, poisFor } from "../src/world/generation/WorldGenerator";
import { encounterCandidate } from "../src/world/generation/Population";
import { ChunkManager } from "../src/world/ChunkManager";
import { eligibleLootItems, rollEnemyLoot, rollPoiLoot } from "../src/loot/LootSystem";
import { lootTableRegistry } from "../src/data/lootTables";
import { itemBaseRegistry } from "../src/data/items";
import { SeededRandom } from "../src/utils/SeededRandom";
import { isStunned } from "../src/combat/DamageSystem";
import type { Enemy, Poi } from "../src/core/types";

const cleanup: (()=>void)[]=[];
afterEach(()=>cleanup.splice(0).forEach(fn=>fn()));
function setup() {
  const meta=defaultMeta(), run=newRun("urze-7","fighter",meta);
  const e=new Engine(run,meta,new EventBus(),async()=>{});
  cleanup.push(()=>e.destroy()); e.random.next=()=>1;
  return e;
}
function target(e:Engine):Enemy {
  const t:Enemy={id:"regression-enemy",definition:"slime",x:20,y:0,home:{x:20,y:0},level:1,hp:1000,maxHp:1000,elite:false,modifier:"swift",statuses:[],path:[],threat:{},state:"IDLE",timer:0,aiTime:0,attackTime:0};
  e.enemies.set(t.id,t);return t;
}
describe("Correções após atualização de sprites e combate",()=>{
  it("gera a região inicial sem sortear POI vazio",()=>{
    for(const seed of ["urze-7","qa","seed-pass4"])
      for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++)
        expect(()=>generateChunk(seed,x,y,3)).not.toThrow();
  },15000);
  it("conclui o carregamento assíncrono de todos os chunks iniciais",async()=>{
    const w=new ChunkManager("urze-7",()=>{},()=>{},3);
    cleanup.push(()=>w.destroy());w.update({x:0,y:0});
    await expect.poll(()=>w.pending.size).toBe(0);
    expect(w.chunks.size).toBeGreaterThan(1);
  });
  it("mantém geração determinística em todas as escalas e dificuldades",()=>{
    for(const biomeScale of ["compact","standard","wide"] as const)
      for(const difficulty of ["explorer","normal","veteran","brutal"] as const){
        const s=worldSettings({biomeScale,difficulty});
        expect(generateChunk("qa",-1,1,3,s)).toEqual(generateChunk("qa",-1,1,3,s));
      }
  },15000);
  it("hordas e encontros vizinhos mantêm distância e orçamento",()=>{
    const settings=worldSettings({difficulty:"brutal",threatDensity:"high"});
    const centers:{x:number;y:number}[]=[];let hordes=0;
    for(let y=-4;y<=4;y++)for(let x=-4;x<=4;x++){
      const c=generateChunk("qa",x,y,3,settings);
      expect(c.spawns.reduce((sum,s)=>sum+(s.populationCost??1),0)).toBeLessThanOrEqual(c.populationBudget!);
      const groups=new Set(c.spawns.map(s=>s.encounterId).filter(id=>id?.startsWith("horde:")||id?.startsWith("encounter:")));
      expect(groups.size).toBeLessThanOrEqual(1);
      if(!groups.size)continue;
      if([...groups][0]!.startsWith("horde:"))hordes++;
      const center=encounterCandidate("qa",x,y);centers.push(center);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)
        for(const p of poisFor("qa",x+dx,y+dy,3,settings))
          expect(Math.hypot(p.x-center.x,p.y-center.y)).toBeGreaterThanOrEqual(populationBalance.encounterSpacing);
    }
    expect(hordes).toBeGreaterThan(0);
    for(let i=0;i<centers.length;i++)for(let j=i+1;j<centers.length;j++)
      expect(Math.hypot(centers[i].x-centers[j].x,centers[i].y-centers[j].y)).toBeGreaterThanOrEqual(populationBalance.encounterSpacing);
  },15000);
  it("aplica golpes simultâneos de personagens diferentes e seus efeitos",()=>{
    const e=setup(),t=target(e),ally=createCharacter("shooter","ally");e.run.party.push(ally);
    e.combat.hit(e.selected.id,t,20);const hp=t.hp;
    e.combat.hit(ally.id,t,20,"slow");expect(t.hp).toBeLessThan(hp);
    expect(t.statuses.some(s=>s.id==="slow")).toBe(true);
  });
  it("três projéteis da mesma rajada causam três impactos",()=>{
    const e=setup(),t=target(e);
    for(let i=0;i<3;i++)e.projectiles.push({id:i,source:e.selected.id,x:20,y:0,target:{x:24,y:0},speed:12,remaining:2,damage:20,friendly:true,pierce:false,hit:[],color:0xffffff});
    e.combat.update(.01);expect(t.hp).toBe(940);expect(e.projectiles).toHaveLength(0);
  });
  it("mantém proteção breve dos personagens e permite dano periódico",()=>{
    const e=setup(),c=e.selected;
    e.combat.hit("foe",c,10);const hp=c.hp;e.combat.hit("foe",c,10);expect(c.hp).toBe(hp);
    e.combat.hit("foe",c,10,undefined,0xffffff,true);expect(c.hp).toBeLessThan(hp);
    const before=c.hp;e.run.stats.seconds+=.41;e.combat.hit("foe",c,10);expect(c.hp).toBeLessThan(before);
  });
  it("choque térmico funciona com dois impactos no mesmo instante",()=>{
    const e=setup(),t=target(e);e.combat.hit(e.selected.id,t,20,"slow");e.combat.hit(e.selected.id,t,20,"burn");
    expect(t.statuses.some(s=>s.id==="armorBreak")).toBe(true);
    expect(t.statuses.some(s=>s.id==="burn"||s.id==="slow")).toBe(false);
  });
  it("stagger expirado não bloqueia ações",()=>{
    expect(isStunned({statuses:[{id:"stagger",remaining:0,tick:0,power:1,source:"x"}]})).toBe(false);
  });
  it("migra saves antigos preservando mapa, inventário, deltas e passivas",()=>{
    const e=setup(),r=structuredClone(e.run);delete r.worldSettings;delete r.worldVersion;
    const c=r.party[0];delete c.loadout;delete c.skillNodes;delete c.skillTreeVersion;c.passives=[classRegistry.fighter.passives[0]];
    r.deltas["dead:old"]=true;
    const s=migrateSave({schemaVersion:4,meta:e.meta,run:r});
    expect(s.run?.worldVersion).toBe(1);expect(s.run?.worldSettings).toEqual(defaultWorldSettings);
    expect(s.run?.seed).toBe("urze-7");expect(s.run?.deltas["dead:old"]).toBe(true);
    expect(s.run?.party[0].loadout).toEqual(classRegistry.fighter.abilities);
    expect(s.run?.party[0].passives).toEqual(c.passives);
  });
  it("repara slots duplicados, bloqueados e de outra classe sem mover os válidos",()=>{
    const e=setup(),c=e.selected;c.loadout=["missing",classRegistry.fighter.abilities[1],classRegistry.fighter.abilities[1],"meteor"];
    c.skillNodes=["invalid","mage:active:0"];delete c.skillTreeVersion;
    const s=migrateSave({schemaVersion:4,meta:e.meta,run:e.run}).run!.party[0];
    expect(s.loadout).toHaveLength(4);expect(new Set(s.loadout).size).toBe(4);
    expect(s.loadout![1]).toBe(classRegistry.fighter.abilities[1]);expect(s.skillNodes).toHaveLength(4);
  });
  it("IndexedDB preserva configuração e habilidade desbloqueada/equipada",async()=>{
    const e=setup(),c=e.selected;c.level=8;c.points=10;
    for(let i=0;i<4;i++)learnSkill(c,"fighter:foundation:"+i);learnSkill(c,"fighter:active:0");equipAbility(c,"rend",2);
    e.run.worldSettings=worldSettings({difficulty:"brutal",biomeScale:"wide",threatDensity:"low"});
    const db=new SaveRepository("update-regression");cleanup.push(()=>db.close());await db.save(e.meta,e.run);
    const s=await db.load();expect(s.schemaVersion).toBe(6);
    expect(s.run?.worldSettings).toEqual(e.run.worldSettings);expect(s.run?.party[0].loadout).toEqual(c.loadout);
    expect(s.run?.party[0].skillNodes).toEqual(c.skillNodes);
  });
  it("rejeita configurações inválidas e saves futuros explicitamente",()=>{
    expect(()=>worldSettings({difficulty:"toString" as never})).toThrow();
    expect(()=>migrateSave({schemaVersion:7})).toThrow("Save de versão mais recente");
  });
  it("loot de nível 1 não sorteia bases de níveis superiores",()=>{
    for(const id of Object.keys(lootTableRegistry)){
      const pool=eligibleLootItems(id,1,"plains");expect(pool.length).toBeGreaterThan(0);
      for(const base of pool)expect(itemBaseRegistry[base].minLevel??1).toBeLessThanOrEqual(1);
    }
    const e=setup(),t=target(e);t.elite=true;t.biome="plains";
    for(let i=0;i<30;i++)for(const d of rollEnemyLoot(t,"qa",new SeededRandom(String(i))))
      if(d.item)expect(d.item.requiredLevel).toBe(1);
  });
  it("bioma limita itens temáticos mantendo identidade da família",()=>{
    expect(eligibleLootItems("hunter",10,"forest")).toContain("axe");
    expect(eligibleLootItems("hunter",10,"desert")).not.toContain("axe");
    expect(eligibleLootItems("arcane",10,"forest")).not.toContain("sword");
  });
  it("achados de POI são determinísticos e usam a tabela do local",()=>{
    const poi:Poi={id:"ritual:test",x:100,y:100,kind:"elite",variant:"ritual"};
    for(let i=0;i<20;i++){
      const drops=rollPoiLoot(poi,String(i),8,"forest");
      expect(drops).toEqual(rollPoiLoot(poi,String(i),8,"forest"));
      for(const d of drops)if(d.item)expect(lootTableRegistry.arcane.items).toContain(d.item.baseId);
    }
  });
  it("NPC distante conversa automaticamente ao chegar",()=>{
    const e=setup(),c=e.selected;
    const npc={id:"npc:test",definition:"traveler",kind:"npc" as const,biome:"plains" as const,x:c.x+6,y:c.y,home:{x:c.x+6,y:c.y},state:"REST" as const,timer:100,step:0};
    e.ambient.set(npc.id,npc);e.interact(npc.id);expect(e.orders.get(c.id)?.poi).toBe(npc.id);
    c.x=npc.x-1;c.path=[];e.update(.01);expect(e.run.deltas[npc.id+":met"]).toBe(true);expect(e.orders.has(c.id)).toBe(false);
  });
  it("Explorar escolhe o alvo mais próximo sem NPC bloquear o mercador",()=>{
    const e=setup();e.world.chunks.set("0,0",generateChunk(e.run.seed,0,0,3));
    e.ambient.set("nearby-npc",{id:"nearby-npc",definition:"traveler",kind:"npc",biome:"plains",x:2,y:2,home:{x:2,y:2},state:"REST",timer:100,step:0});
    e.command({type:"ping",kind:"investigate",point:{x:4,y:2}});
    expect(e.orders.get(e.selected.id)?.poi).toBe("origin:merchant");
    e.command({type:"ping",kind:"investigate",point:{x:2,y:2}});
    expect(e.orders.get(e.selected.id)?.poi).toBe("nearby-npc");
  });
});
