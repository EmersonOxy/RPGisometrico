import type { SkillNode } from "../data/skillTree";
export const treeLayout={width:1840,height:1430,nodeWidth:194,step:145};
export function skillPosition(n:SkillNode) {
  if(n.phase==="foundation")return {x:920+Math.sin(n.tier*1.7)*24,y:1330-n.tier*treeLayout.step};
  const center=235+n.branch*455;
  const drift=Math.sin(n.branch*2.1+n.tier)*17;
  return {x:center+(n.lane??0)*108+drift,y:n.tier===5?520+(n.branch%2)*22:n.tier===6?315+(n.lane??0)*14:110+(n.branch%2)*18};
}
export function skillConnection(parent:SkillNode,child:SkillNode) {
  const p=skillPosition(parent),q=skillPosition(child),dy=q.y-p.y;
  const bend=parent.branch===child.branch?14:0;
  return 'M '+p.x+' '+p.y+' C '+(p.x+bend)+' '+(p.y+dy*.44)+', '+(q.x-bend)+' '+(q.y-dy*.4)+', '+q.x+' '+q.y;
}
