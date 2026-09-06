import type { Engine } from "../core/Engine";
import { ambientRegistry } from "../data/ambient";
import { populationBalance } from "../data/worldSettings";
import { SeededRandom } from "../utils/SeededRandom";
import { distance } from "../world/WorldCoordinates";
import { lineWalkable } from "../world/navigation/AStar";
export function tickAmbient(e: Engine, dt: number) {
  for(const a of e.ambient.values()) {
    if(distance(a,e.selected)>populationBalance.ambientRadius)continue;
    const def=ambientRegistry[a.definition];
    a.timer-=dt;
    if(a.timer<=0) {
      const r=new SeededRandom(`${e.run.seed}:${a.id}:${a.step++}`);
      a.timer=populationBalance.ambientTick+r.next()*2;
      const threat=e.run.party.find(c=>c.alive&&distance(c,a)<def.flee) ?? e.nearestEnemy(a,6);
      const flee=def.kind==="fauna"&&threat;
      const angle=flee?Math.atan2(a.y-threat.y,a.x-threat.x):r.next()*Math.PI*2;
      a.state=flee?"FLEE":def.kind==="npc"?"TRAVEL":r.next()<.4?"GRAZE":"WANDER";
      const radius=flee?5:r.next()*def.radius;
      const base=flee?a:a.home;
      const p={x:base.x+Math.cos(angle)*radius,y:base.y+Math.sin(angle)*radius};
      a.destination=a.state!=="GRAZE" && distance(p,a.home)<def.radius*2 && (def.flying||lineWalkable(a,p,e.world.cell))?p:undefined;
    }
    if(a.destination) {
      const d=distance(a,a.destination), step=Math.min(d,dt*def.speed*(a.state==="FLEE"?2.4:1));
      if(d<.05) {a.destination=undefined;a.state="REST";continue;}
      a.x+=(a.destination.x-a.x)/d*step;a.y+=(a.destination.y-a.y)/d*step;
    }
  }
}
