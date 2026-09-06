import type { Chunk, Point, Poi } from "../../core/types";
import { SeededRandom, at } from "../../utils/SeededRandom";
import { biomeRegistry } from "../../data/biomes";
import { enemyRegistry } from "../../data/enemies";
import { poiDefinition, safePoi } from "../../data/pois";
import { difficultyRegistry, populationBalance as limits, threatDensities, type WorldGenerationSettings } from "../../data/worldSettings";
import { regionLevel } from "../../data/balance";

// One deterministic territorial candidate per chunk. Neighbor arbitration is
// independent of streaming order; no runtime RNG is consumed by population.
export function encounterCandidate(seed: string, cx: number, cy: number) {
  const r = new SeededRandom(`${seed}:territory:${cx},${cy}`);
  return {x:cx*32+r.int(8,24)+.5,y:cy*32+r.int(8,24)+.5,priority:r.next(),occupied:r.next()};
}
export function populateChunk(seed: string, chunk: Chunk, settings: WorldGenerationSettings, nearbyPois: Poi[] = chunk.pois) {
  const {cx,cy,pois,tiles} = chunk, difficulty = difficultyRegistry[settings.difficulty];
  const candidate = encounterCandidate(seed,cx,cy);
  const b = biomeRegistry[tiles[16*32+16].biome];
  const danger = pois.reduce((n,p)=>n+(poiDefinition(p)?.danger ?? (p.kind==="nest" || p.kind==="elite" ? 2 : 0)),0);
  chunk.populationBudget = Math.min(limits.maxChunkBudget, Math.max(2, Math.floor((3+b.danger+Math.min(2,Math.hypot(cx,cy)/8)+danger)*threatDensities[settings.threatDensity]*difficulty.budget)));
  let spent = 0;
  const safe = (p: Point) => Math.hypot(p.x,p.y) < limits.safeRadius || nearbyPois.some(site=>safePoi(site) && Math.hypot(site.x-p.x,site.y-p.y)<8);
  const free = (p: Point) => {
    const x=Math.floor(p.x)-cx*32,y=Math.floor(p.y)-cy*32;
    return x>=1 && x<31 && y>=1 && y<31 && !tiles[y*32+x].blocked && !safe(p);
  };
  const addGroup = (center: Point, id: string, count: number, pool: string[], variant?: string, forceElite=false) => {
    const r=new SeededRandom(seed+":"+id), definition=r.pick(pool);
    const palettes = enemyRegistry[definition].variants ?? [];
    for(let i=0;i<count;i++) {
      const elite=(forceElite && i===0) || r.next()<difficulty.elite;
      const cost=elite?2:1;
      if(spent+cost>chunk.populationBudget!) break;
      for(let attempt=0;attempt<12;attempt++) {
        const angle=r.next()*Math.PI*2, radius=i===0&&attempt===0?0:1+r.next()*2;
        const p={x:center.x+Math.cos(angle)*radius,y:center.y+Math.sin(angle)*radius};
        if(!free(p) || chunk.spawns.some(s=>Math.hypot(s.x-p.x,s.y-p.y)<1.1)) continue;
        const level=regionLevel(p.x,p.y,b.danger);
        const enemyVariant=palettes.length>0 && r.next()<0.12+Math.min(0.25,level*0.03)
          ? 1+Math.floor(r.next()*palettes.length) : 0;
        chunk.spawns.push({...p,id:`${id}:${i}`,encounterId:id,definition,level,elite,variant:enemyVariant,populationCost:cost,biome:b.id,poiVariant:variant});
        spent+=cost; break;
      }
    }
  };
  if(cx===0 && cy===0) {
    // Existing introductory encounter remains reachable beyond the safe camp.
    chunk.populationBudget=Math.max(3,chunk.populationBudget);
    for(let i=0;i<3;i++) chunk.spawns.push({id:`first:${i}`,x:12+i*2,y:2,definition:i===2?"boar":"slime",level:1,elite:false,encounterId:"intro",populationCost:1,biome:"plains"});
    return;
  }
  for(const p of pois) {
    const def=poiDefinition(p);
    if(!def?.danger) continue;
    const pool=def.loot==="arcane"?["witch"]:def.loot==="stone"?["golem"]:def.loot==="hunter"?["archer"]:b.enemyPool;
    addGroup(p,p.id+":encounter",Math.min(4,def.danger+1),pool,p.variant,p.kind==="elite");
  }
  // Hordes use the same territory arbitration as ordinary encounters, so
  // their spacing does not depend on which neighboring chunk loads first.
  const horde=difficulty.horde;
  const hr=new SeededRandom(`${seed}:horde:${cx},${cy}`);
  const isHorde=hr.next()<horde.chance;
  const chance=Math.min(.8,(.38+b.danger*.06)*threatDensities[settings.threatDensity]);
  if((!isHorde && candidate.occupied>chance) || nearbyPois.some(p=>Math.hypot(p.x-candidate.x,p.y-candidate.y)<limits.encounterSpacing)) return;
  if(Math.hypot(candidate.x-14,candidate.y-2)<limits.encounterSpacing) return;
  for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) {
    if(!dx&&!dy)continue;
    const other=encounterCandidate(seed,cx+dx,cy+dy);
    if(other.priority<candidate.priority && Math.hypot(other.x-candidate.x,other.y-candidate.y)<limits.encounterSpacing) return;
  }
  if(isHorde) addGroup(candidate,`horde:${cx},${cy}`,horde.min+Math.floor(hr.next()*(horde.max-horde.min+1)),b.enemyPool);
  else addGroup(candidate,`encounter:${cx},${cy}`,1+Math.floor(at(seed+":group",cx,cy)*3),b.enemyPool);
}
