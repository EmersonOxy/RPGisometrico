import type { Engine } from "../core/Engine";
import { classRegistry } from "../data/classes";
import { abilityRegistry } from "../data/abilities";
import { passiveRegistry } from "../data/passives";
import { activeAbilities } from "../progression/Character";
import { icon, gem, portrait } from "./Icons";
import { esc } from "./Components";
import { PanZoom, type ViewTransform } from "./PanZoom";
import { bindingLabel, type InputAction } from "../core/InputManager";
export function skillTreeView(e: Engine) {
  const c = e.selected,
    cls = classRegistry[c.classId],
    abilities = activeAbilities(c),
    positions = [
      [260, 250],
      [720, 245],
      [260, 490],
      [720, 490],
    ],
    passives = [
      [125, 135],
      [875, 135],
      [115, 615],
    ];
  const lines = positions
    .map(([x, y]) => "M500 365 Q" + x + " 365 " + x + " " + y)
    .concat([
      "M260 250 Q170 245 125 135",
      "M720 245 Q870 250 875 135",
      "M260 490 Q155 505 115 615",
      "M720 490 Q860 490 875 615",
      "M500 365 Q480 220 500 115",
    ]);
  return (
    '<section class="tree-book"><header class="screen-heading"><div><small>O caminho de ' +
    cls.name.toLowerCase() +
    '</small><h2>Disciplinas do errante</h2></div><div class="skill-points"><b>' +
    c.points +
    '</b><span>pontos disponíveis</span></div></header><div class="tree-viewport" tabindex="0" aria-label="Árvore de habilidades, arraste para navegar"><div class="tree-world"><svg class="tree-connections" viewBox="0 0 1000 740" aria-hidden="true">' +
    lines
      .map(
        (d, i) =>
          '<path d="' +
          d +
          '" class="' +
          (i < 4 || c.passives.includes(cls.passives[i - 4]) ? "learned" : "") +
          '"/>',
      )
      .join("") +
    '<circle cx="500" cy="365" r="99" class="core-orbit"/><circle cx="500" cy="365" r="110" class="core-orbit outer"/></svg><div class="tree-core" style="left:500px;top:365px">' +
    portrait(c.classId) +
    "<b>" +
    cls.name +
    "</b><small>Nível " +
    c.level +
    "</small></div>" +
    abilities
      .map((id, i) => {
        const a = abilityRegistry[id],
          [x, y] = positions[i];
        return (
          '<button class="skill-node equipped" style="left:' +
          x +
          "px;top:" +
          y +
          'px" data-action="node" data-id="' +
          id +
          '" data-tip="ability:' +
          id +
          '"><span class="node-medallion">' +
          icon(id) +
          "</span><b>" +
          a.name +
          "</b><small>" +
          bindingLabel(e.meta.settings, `ABILITY_${i + 1}` as InputAction) +
          " · Equipada</small></button>"
        );
      })
      .join("") +
    cls.passives
      .map((id, i) => {
        const p = passiveRegistry[id],
          [x, y] = passives[i],
          learned = c.passives.includes(id);
        return (
          '<button class="skill-node passive ' +
          (learned ? "unlocked" : c.points ? "available" : "locked") +
          '" style="left:' +
          x +
          "px;top:" +
          y +
          'px" data-action="passive" data-id="' +
          id +
          '" data-tip="passive:' +
          id +
          '" ' +
          (!learned && !c.points ? "disabled" : "") +
          '><span class="node-medallion">' +
          icon(id) +
          (learned ? '<i class="node-mark">✓</i>' : "") +
          "</span><b>" +
          p.name +
          "</b><small>" +
          (learned ? "Aprendido" : "1 ponto") +
          "</small></button>"
        );
      })
      .join("") +
    '<button class="skill-node mastery ' +
    (c.points ? "available" : "locked") +
    '" style="left:875px;top:615px" data-action="mastery" data-tip="mastery:"><span class="node-medallion">' +
    icon("mastery") +
    "</span><b>Maestria</b><small>" +
    c.mastery +
    ' graus · 1 ponto</small></button><button class="skill-node jewel-gated ' +
    (c.jewels.includes("fire") ? "unlocked" : "locked") +
    '" style="left:500px;top:115px" data-tip="jewel:fire" data-action="node" data-id="flame"><span class="node-medallion">' +
    gem("fire") +
    (!c.jewels.includes("fire")
      ? '<i class="gate-lock">' + icon("lock") + "</i>"
      : "") +
    "</span><b>" +
    (c.classId === "fighter" ? "Talho de brasa" : "Vínculo da brasa") +
    "</b><small>" +
    (c.jewels.includes("fire") ? "Vínculo ativo" : "Requer Joia da Brasa") +
    `</small></button><span class="branch-label offense">Aço & intenção</span><span class="branch-label motion">Passo & controle</span><span class="branch-label defense">Resistência</span><span class="branch-label mastery-label">Além do horizonte</span></div></div><footer class="screen-footer"><span>Arraste para explorar · roda para ampliar · ${bindingLabel(e.meta.settings, "SKILLS")} ou Esc para fechar</span><div><button data-action="tree-zoom" data-id="out">−</button><button data-action="tree-home">Recentrar</button><button data-action="tree-zoom" data-id="in">+</button></div></footer></section>`
  );
}
export class SkillTreeView {
  pan: PanZoom;
  constructor(root: HTMLElement, state: ViewTransform) {
    const viewport = root.querySelector<HTMLElement>(".tree-viewport")!,
      world = root.querySelector<HTMLElement>(".tree-world")!;
    const apply = () => {
      const fit = Math.min(
        viewport.clientWidth / 1030,
        viewport.clientHeight / 750,
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
