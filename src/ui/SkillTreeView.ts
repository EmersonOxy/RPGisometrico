import type { Engine } from "../core/Engine";
import { classRegistry } from "../data/classes";
import { abilityRegistry } from "../data/abilities";
import { passiveRegistry } from "../data/passives";
import { icon } from "./Icons";
import { esc } from "./Components";
import { PanZoom, type ViewTransform } from "./PanZoom";
import { bindingLabel, type InputAction } from "../core/InputManager";
import { skillNodeRegistry, branchNames, type SkillNode } from "../data/skillTree";
import { learnedNode, skillRequirement, effectiveAbility } from "../progression/SkillTree";
import { skillPosition, skillConnection, treeLayout } from "./SkillTreeLayout";
export const skillTypeNames={basic:"Ataque básico",active:"Habilidade ativa",passive:"Passiva",upgrade:"Melhoria funcional",conditional:"Passiva condicional",mastery:"Maestria"};
export function skillDetails(e:Engine,n:SkillNode) {
  const a=n.ability?effectiveAbility(e.selected,n.ability):undefined;
  const effect=a?'<dl class="skill-facts"><div><dt>Dano</dt><dd>'+Math.round(a.damage*100)+'% do ataque</dd></div><div><dt>Recurso</dt><dd>'+a.cost+'</dd></div><div><dt>Recarga</dt><dd>'+a.cooldown+' s</dd></div><div><dt>Alcance</dt><dd>'+a.range+' tiles</dd></div><div><dt>Preparação</dt><dd>'+a.windup+' s</dd></div>'+(a.radius?'<div><dt>Raio</dt><dd>'+a.radius+' tiles</dd></div>':'')+(a.status?'<div><dt>Efeito</dt><dd>'+esc(({burn:'Queimadura',slow:'Lentidão',bleed:'Sangramento',stun:'Atordoamento',guard:'Guarda',armorBreak:'Armadura reduzida',fury:'Ímpeto',leech:'Roubo de vida',riposte:'Retaliação'} as Record<string,string>)[a.status]??a.status)+' · '+(a.status==='stun'?.8:a.duration??4)+' s</dd></div>':'')+'</dl>':'';
  const labels:Record<string,string>={damage:"Multiplicador de dano",cooldown:"Recarga (s)",range:"Alcance (tiles)",radius:"Raio (tiles)",duration:"Duração (s)",delay:"Atraso (s)",windup:"Preparação (s)",pierce:"Atravessa inimigos",healthCost:"Fração de vida consumida",healFraction:"Fração de vida restaurada",executeBelow:"Limiar de execução",cone:"Cone (graus)",canMoveDuringCast:"Movimento durante preparo",handler:"Comportamento",target:"Alvo",targetMode:"Orientação",requiresTarget:"Exige alvo",selfStatus:"Efeito pessoal",count:"Quantidade"};
  const format=(v:unknown)=>v===true?'Sim':v===false?'Não':v===undefined?'—':({DIRECTION:'Direção do cursor',TARGET:'Alvo único',SELF:'Próprio personagem',area:'Área',guard:'Guarda'} as Record<string,string>)[String(v)]??String(v);
  const changes=n.upgrade?'<p>Modifica <b>'+esc(abilityRegistry[n.upgrade.ability].name)+'</b>.</p><dl class="skill-facts">'+Object.entries(n.upgrade.changes).map(([k,v])=>'<div><dt>'+esc(labels[k]??k)+'</dt><dd>'+esc(format((abilityRegistry[n.upgrade!.ability] as unknown as Record<string,unknown>)[k]))+' → '+esc(format(v))+'</dd></div>').join('')+'</dl>':'';
  return '<small class="node-kind">'+skillTypeNames[n.type??'passive']+'</small><h3>'+esc(a?.name??n.name)+'</h3><p>'+esc(a?.description??n.description)+'</p>'+effect+changes+'<p class="skill-requirements">Nível '+n.level+' · '+n.cost+' ponto'+(n.cost===1?'':'s')+'</p><p>Requer '+(n.prerequisiteMode==='any'?'um destes caminhos: ':'')+(n.prerequisites.map(id=>esc(skillNodeRegistry[id].name)).join(n.prerequisiteMode==='any'?' ou ':' → ')||'apenas pertencer à classe')+'.</p>';
}
export function skillTreeView(e:Engine, replaceAbility?: string) {
  const c=e.selected,cls=classRegistry[c.classId],nodes=Object.values(skillNodeRegistry).filter(n=>n.classId===c.classId);
  const selected=nodes.find(n=>n.id===c.treeSelection)??nodes.find(n=>skillRequirement(c,n.id)==='ready')??nodes.find(n=>!learnedNode(c,n.id))??nodes[0];
  c.treeSelection=selected.id;
  const related=new Set<string>([selected.id,...selected.children??[]]);
  const parents=(n:SkillNode)=>{for(const id of n.prerequisites){if(related.has(id))continue;related.add(id);parents(skillNodeRegistry[id]);}};parents(selected);
  const can=e.canChangeLoadout(),reason=skillRequirement(c,selected.id),learned=learnedNode(c,selected.id);
  const loadout=[c.loadout?.[0]??"",c.loadout?.[1]??"",c.loadout?.[2]??"",c.loadout?.[3]??""];
  const slotKey=(i:number)=>bindingLabel(e.meta.settings,('ABILITY_'+(i+1)) as InputAction);
  const abilityName=(id:string)=>effectiveAbility(c,id)?.name??abilityRegistry[id]?.name??id;
  const combatRule='Em combate: aprendizagem e troca bloqueadas. Aguarde 5 s sem ações hostis e o fim das ameaças.';
  const slotGrid=(replacing:boolean)=>'<div class="loadout-dock'+(replacing?' replacing':'')+'"><h4>Carregamento</h4><div class="loadout-slots">'+[0,1,2,3].map(i=>{
    const id=loadout[i];
    return '<button class="loadout-slot'+(!id?' empty':'')+(replaceAbility&&id===replaceAbility?' current':'')+'" data-action="tree-slot" data-id="'+i+'" aria-label="Slot '+esc(slotKey(i)+(id?': '+abilityName(id):' vazio'))+'"><kbd>'+esc(slotKey(i))+'</kbd>'+(id?'<span class="slot-icon">'+icon(id)+'</span>':'')+'<span class="slot-name">'+(id?esc(abilityName(id)):'Vazio')+'</span></button>';
  }).join('')+'</div></div>';
  const lines=nodes.flatMap(n=>n.prerequisites.map(id=>'<path class="'+(learnedNode(c,n.id)&&learnedNode(c,id)?'learned ':'')+(related.has(n.id)&&related.has(id)?'related':'')+'" d="'+skillConnection(skillNodeRegistry[id],n)+'"/>')).join('');
  const buttons=nodes.map(n=>{
    const p=skillPosition(n),known=learnedNode(c,n.id),why=skillRequirement(c,n.id);
    const slot=n.ability?loadout.indexOf(n.ability):-1,equipped=slot>=0;
    const modified=!!n.upgrade&&!!n.upgrade.ability&&loadout.includes(n.upgrade.ability);
    const state=(known||equipped)?'Aprendido':why==='ready'?'Disponível · '+n.cost+' ponto(s)':why;
    return '<button class="skill-node '+(known?'unlocked':why==='ready'?'available':'locked')+' type-'+n.type+(equipped?' equipped':'')+(n.id===selected.id?' chosen':'')+(related.has(n.id)?' related':'')+'" style="left:'+p.x+'px;top:'+p.y+'px" data-action="tree-select" data-id="'+n.id+'" data-tip="skill:'+n.id+'" aria-pressed="'+(n.id===selected.id)+'" aria-label="'+esc(n.name+' · '+state+(equipped?' · equipada em '+slotKey(slot):''))+'"><span class="node-medallion">'+icon(n.ability??n.passive??(n.type==='basic'?cls.basic:'mastery'))+(known?'<i class="node-mark">✓</i>':'')+(equipped?'<i class="slot-badge">'+esc(slotKey(slot))+'</i>':'')+'</span><b>'+esc(n.name.replace('Aperfeiçoar · ','Aperfeiçoar: '))+'</b><small>'+esc(state)+(modified?' · altera slot':'')+'</small></button>';
  }).join('');
  const replacing=replaceAbility===selected.ability;
  let actionHtml='';
  if(!learned) {
    actionHtml='<button class="skill-learn" data-action="skill" data-id="'+selected.id+'" '+(reason!=='ready'||!can?'disabled':'')+'>Aprender · '+selected.cost+' ponto(s)</button>'+(!can?'<p class="equip-blocked">'+combatRule+'</p>':'');
  } else if(selected.ability) {
    const ab=selected.ability,slot=loadout.indexOf(ab);
    if(replacing) {
      actionHtml='<p class="replace-prompt">Substituir qual habilidade?</p>';
    } else if(slot>=0) {
      actionHtml='<p class="equip-status">✓ Aprendido · equipada em <b>'+esc(slotKey(slot))+'</b></p><div class="skill-equip-actions"><button data-action="tree-replace" data-id="'+esc(ab)+'" '+(!can?'disabled':'')+'>Trocar slot</button><button class="linklike" data-action="tree-unequip" data-id="'+esc(ab)+'" '+(!can?'disabled':'')+'>Remover</button></div>';
    } else {
      actionHtml='<p class="equip-status">✓ Aprendido</p><button class="skill-equip" data-action="tree-equip" data-id="'+esc(ab)+'" '+(!can?'disabled':'')+'>Equipar</button><p class="equip-hint">ou pressione '+[0,1,2,3].map(slotKey).join(' · ')+'</p>'+(!can?'<p class="equip-blocked">'+combatRule+'</p>':'');
    }
  }
  return '<section class="tree-book organic-book"><header class="screen-heading"><div><small>'+cls.name+' · nível '+c.level+'</small><h2>Trilhas de disciplina</h2></div><div class="skill-points"><b>'+c.points+'</b><span>pontos disponíveis</span></div></header><div class="tree-workspace"><div class="tree-viewport" tabindex="0" aria-label="Árvore de habilidades; arraste para navegar"><div class="tree-world organic-tree" data-focus="'+selected.id+'"><svg class="tree-connections" viewBox="0 0 '+treeLayout.width+' '+treeLayout.height+'" aria-hidden="true">'+lines+'</svg>'+branchNames[c.classId].map((name,i)=>'<span class="organic-branch" style="left:'+(235+i*455)+'px;top:665px"><small>CAMINHO '+(i+1)+'</small>'+name+'</span>').join('')+'<span class="foundation-label" style="left:1090px;top:930px">01 · Fundamentos<br><small>Uma habilidade por vez.<br>Níveis 2 a 5.</small></span>'+buttons+'</div><div class="tree-map-note">Trilha aprendida — · seleção em tinta escura</div></div><aside class="skill-inspector" aria-live="polite">'+skillDetails(e,selected)+'<p class="skill-state">'+(learned?'✓ Aprendido':esc(reason==='ready'?'Disponível para aprender':reason))+'</p>'+actionHtml+slotGrid(replacing)+'<div class="skill-relatives">'+selected.prerequisites.map(id=>'<button data-action="tree-select" data-id="'+id+'">← '+esc(skillNodeRegistry[id].name)+'</button>').join('')+'</div></aside></div><footer class="screen-footer"><span>Arraste · roda para zoom · '+bindingLabel(e.meta.settings,'SKILLS')+' ou Esc para fechar</span><div><button data-action="tree-zoom" data-id="out" aria-label="Reduzir árvore">−</button><button data-action="tree-home">Meu caminho</button><button data-action="tree-all">Visão geral</button><button data-action="tree-zoom" data-id="in" aria-label="Ampliar árvore">+</button></div></footer></section>';
}
export class SkillTreeView {
  pan:PanZoom;
  private observer:ResizeObserver;
  constructor(private root:HTMLElement,private state:ViewTransform) {
    const viewport=root.querySelector<HTMLElement>('.tree-viewport')!,world=root.querySelector<HTMLElement>('.tree-world')!;
    const apply=()=>{world.style.transform='translate('+state.x+'px,'+state.y+'px) scale('+state.zoom+')';};
    this.pan=new PanZoom(viewport,state,apply,.3,1.5);
    if(state.x===0&&state.y===0)this.home();else apply();
    this.observer=new ResizeObserver(apply);this.observer.observe(viewport);
  }
  home() {
    const viewport=this.root.querySelector<HTMLElement>('.tree-viewport')!,id=this.root.querySelector<HTMLElement>('.tree-world')!.dataset.focus!;
    const p=skillPosition(skillNodeRegistry[id]);this.state.zoom=.8;
    this.state.x=viewport.clientWidth/2-p.x*this.state.zoom;this.state.y=viewport.clientHeight*.53-p.y*this.state.zoom;this.pan.zoom(1);
  }
  overview() {
    const viewport=this.root.querySelector<HTMLElement>('.tree-viewport')!;
    this.state.zoom=Math.max(.3,Math.min(viewport.clientWidth/treeLayout.width,viewport.clientHeight/treeLayout.height)*.96);
    this.state.x=(viewport.clientWidth-treeLayout.width*this.state.zoom)/2;this.state.y=(viewport.clientHeight-treeLayout.height*this.state.zoom)/2;this.pan.zoom(1);
  }
  destroy(){this.pan.destroy();this.observer.disconnect();}
}
