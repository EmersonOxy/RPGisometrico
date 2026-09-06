import type { AmbientSpawn, Chunk } from "../../core/types";
import { ambientRegistry } from "../../data/ambient";
import { poiDefinition } from "../../data/pois";
import { SeededRandom } from "../../utils/SeededRandom";
export function ambientSpawns(seed: string, c: Chunk): AmbientSpawn[] {
  const r=new SeededRandom(`${seed}:ambient:${c.key}`), out:AmbientSpawn[]=[];
  for(const p of c.pois) {
    const npc=poiDefinition(p)?.npc ?? (p.id==="origin:merchant"?"traveler":undefined);
    if(npc) out.push({id:p.id+":npc",kind:"npc",definition:npc,x:p.x-1,y:p.y+1,biome:c.tiles[16*32+16].biome,poiId:p.id});
  }
  const biome=c.tiles[16*32+16].biome;
  const chance=biome==="desert"||biome==="ice"?.22:.65;
  if(r.next()>chance) return out;
  const choices=Object.entries(ambientRegistry).filter(([,d])=>d.kind==="fauna"&&d.biomes.includes(biome));
  const [definition]=r.pick(choices),count=definition==="deer"?2:1;
  const center={x:r.int(4,26),y:r.int(4,26)};
  for(let i=0;i<count;i++) {
    const x=center.x+i*2,y=center.y;
    if(c.tiles[y*32+x].blocked || c.spawns.some(s=>Math.hypot(s.x-(c.cx*32+x),s.y-(c.cy*32+y))<8)) continue;
    out.push({id:`ambient:${c.key}:${i}`,kind:"fauna",definition,x:c.cx*32+x+.5,y:c.cy*32+y+.5,biome});
  }
  return out;
}
