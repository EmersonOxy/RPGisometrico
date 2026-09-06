import type { Engine } from "../core/Engine";
import { classRegistry } from "../data/classes";
import { abilityRegistry } from "../data/abilities";
import { passiveRegistry } from "../data/passives";
import { activeAbilities } from "../progression/Character";
import { icon, gem, portrait } from "./Icons";
import { esc } from "./Components";
import { PanZoom, type ViewTransform } from "./PanZoom";
import { bindingLabel, type InputAction } from "../core/InputManager";
import { skillNodeRegistry, branchNames } from "../data/skillTree";
import { learnedNode, skillRequirement, unlockedAbilities } from "../progression/SkillTree";
export function skillTreeView(e: Engine) {
  const c=e.selected, cls=classRegistry[c.classId], active=activeAbilities(c);
  const nodes=Object.values(skillNodeRegistry).filter(n=>n.classId===c.classId);
  const xy=(n:typeof nodes[number])=>({x:190+n.branch*350,y:250+n.tier*140});
  const lines=nodes.flatMap(n=>n.prerequisites.map(id=>{
    const p=xy(skillNodeRegistry[id]),q=xy(n);
    return '<path class="'+(learnedNode(c,n.id)?'learned':'')+'" d="M'+p.x+' '+p.y+' L'+q.x+' '+q.y+'"/>';
  })).join('');
  const options=unlockedAbilities(c);
  const slots=active.map((id,i)=>'<label>'+bindingLabel(e.meta.settings,('ABILITY_'+(i+1)) as InputAction)+'<select data-loadout-slot="'+i+'" '+(!e.canChangeLoadout()?'disabled':'')+'>'+options.map(a=>'<option value="'+a+'" '+((c.loadout??cls.abilities)[i]===a?'selected':'')+'>'+esc(abilityRegistry[a].name)+'</option>').join('')+'</select></label>').join('');
  return '<section class="tree-book"><header class="screen-heading"><div><small>O caminho de '+cls.name+'</small><h2>Disciplinas do errante</h2></div><div class="skill-points"><b>'+c.points+'</b><span>pontos disponíveis</span></div></header><div class="loadout-bar">'+slots+'</div><p class="loadout-rule">Quatro habilidades equipadas · troca fora de combate · os tempos de recarga são preservados.</p><div class="tree-viewport" tabindex="0" aria-label="Árvore de habilidades, arraste para navegar"><div class="tree-world expanded-tree"><svg class="tree-connections" viewBox="0 0 1100 1000" aria-hidden="true">'+lines+'</svg>'+
  active.map((id,i)=>'<button class="skill-node equipped" style="left:'+(160+i*260)+'px;top:65px" data-action="node" data-id="'+id+'" data-tip="ability:'+id+'"><span class="node-medallion">'+icon(id)+'</span><b>'+abilityRegistry[id].name+'</b><small>'+bindingLabel(e.meta.settings,('ABILITY_'+(i+1)) as InputAction)+' · Equipada</small></button>').join('')+
  branchNames[c.classId].map((name,i)=>'<span class="discipline-branch" style="left:'+(190+i*350)+'px;top:160px">'+name+'</span>').join('')+
  nodes.map(n=>{
    const pos=xy(n), learned=learnedNode(c,n.id),reason=skillRequirement(c,n.id);
    const name=n.ability?abilityRegistry[n.ability].name:n.passive?passiveRegistry[n.passive].name:n.name;
    return '<button class="skill-node '+(n.passive?'passive ':'')+(learned?'unlocked':reason==='ready'?'available':'locked')+'" style="left:'+pos.x+'px;top:'+pos.y+'px" data-action="'+(n.passive?'passive':'skill')+'" data-id="'+(n.passive??n.id)+'" data-tip="skill:'+n.id+'"><span class="node-medallion">'+icon(n.ability??n.passive??'mastery')+(learned?'<i class="node-mark">✓</i>':'')+'</span><b>'+name+'</b><small>'+(learned?'Aprendido':reason==='ready'?n.cost+' ponto(s)':reason)+'</small></button>';
  }).join('')+
  '<button class="skill-node mastery '+(c.points?'available':'locked')+'" style="left:550px;top:935px" data-action="mastery" data-tip="mastery:"><span class="node-medallion">'+icon('mastery')+'</span><b>Maestria</b><small>'+c.mastery+' graus · 1 ponto</small></button><button class="skill-node jewel-gated '+(c.jewels.includes('fire')?'unlocked':'locked')+'" style="left:900px;top:935px" data-action="node" data-id="flame" data-tip="jewel:fire"><span class="node-medallion">'+gem('fire')+'</span><b>'+(c.classId==='fighter'?'Talho de brasa':'Vínculo da brasa')+'</b><small>Requer Joia da Brasa</small></button></div></div><footer class="screen-footer"><span>Arraste para explorar · roda para ampliar · '+bindingLabel(e.meta.settings,'SKILLS')+' ou Esc para fechar</span><div><button data-action="tree-zoom" data-id="out">−</button><button data-action="tree-home">Recentrar</button><button data-action="tree-zoom" data-id="in">+</button></div></footer></section>';
}
export class SkillTreeView {
  pan: PanZoom;
  constructor(root: HTMLElement, state: ViewTransform) {
    const viewport = root.querySelector<HTMLElement>(".tree-viewport")!,
      world = root.querySelector<HTMLElement>(".tree-world")!;
    const apply = () => {
      const fit = Math.min(
        viewport.clientWidth / 1130,
        viewport.clientHeight / 1030,
      );
      world.style.transform =
        "translate(" +
        state.x +
        "px," +
        state.y +
        "px) scale(" +
        state.zoom * fit +
        ")";
    };
    this.pan = new PanZoom(viewport, state, apply, 0.6, 2.1);
    apply();
  }
  destroy() {
    this.pan.destroy();
  }
}
