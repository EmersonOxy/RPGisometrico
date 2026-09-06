import type { Character, Item, MetaProgress } from "../core/types";
import { classRegistry } from "../data/classes";
import { abilityRegistry } from "../data/abilities";
import { passiveRegistry } from "../data/passives";
import { jewelRegistry } from "../data/jewels";
import { rarityColors, rarityNames } from "../data/items";
import { activeAbilities, statsFor } from "../progression/Character";
import { balance } from "../data/balance";
export const esc = (s: unknown) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export const slotNames = {
  weapon: "Arma",
  offhand: "Mão secundária",
  armor: "Armadura",
  ring: "Anel",
};
const statNames: Record<string, string> = {
  damage: "Dano",
  health: "Vida",
  armor: "Armadura",
  speed: "Movimento",
  crit: "Crítico",
  fire: "Fogo",
  regen: "Regen.",
  cooldown: "Recarga",
  coins: "Moedas",
};
export const statLabel = (key: string, n: number) =>
  esc(statNames[key] ?? key) +
  " " +
  (["crit", "fire", "cooldown", "coins", "speed"].includes(key)
    ? Math.round(n * 100) + "%"
    : n.toFixed(1));
export function itemCard(
  item: Item,
  c: Character,
  action = "equip",
  price?: number,
) {
  const old = c.equipment[item.slot];
  const comparison = Object.entries(item.stats)
    .map(([k, v]) => {
      const delta = v - (old?.stats[k as keyof typeof item.stats] ?? 0);
      return (
        '<span class="' +
        (delta >= 0 ? "positive" : "negative") +
        '">' +
        (delta >= 0 ? "+" : "") +
        delta.toFixed(1) +
        " " +
        esc(statNames[k] ?? k) +
        "</span>"
      );
    })
    .join(" · ");
  return (
    '<article class="item-card" style="--rarity:' +
    rarityColors[item.rarity] +
    '"><div class="item-icon">◇</div><div><strong>' +
    esc(item.name) +
    "</strong><small>" +
    rarityNames[item.rarity] +
    " · " +
    slotNames[item.slot] +
    " · ilvl " +
    item.level +
    " · requer nv. " +
    item.requiredLevel +
    "</small><p>" +
    Object.entries(item.stats)
      .map(([k, v]) => statLabel(k, v))
      .join(" · ") +
    "</p><small>" +
    esc(item.tags.join(" / ")) +
    " · venda " +
    item.value +
    " prata</small><small>" +
    comparison +
    '</small></div><button data-action="' +
    action +
    '" data-id="' +
    esc(action === "buy" ? item.baseId : item.id) +
    '">' +
    (price ? price + " prata" : action === "sell" ? "Vender" : "Equipar") +
    "</button></article>"
  );
}
export function inventoryPanel(c: Character, items: Item[], jewels: string[]) {
  return (
    '<p class="eyebrow">PERTENCES DA EXPEDIÇÃO</p><h2>O que levamos conosco</h2><p>' +
    esc(c.name) +
    " · " +
    items.length +
    "/" +
    balance.inventorySize +
    ' espaços</p><div class="equipment">' +
    Object.entries(slotNames)
      .map(
        ([slot, name]) =>
          '<button data-action="unequip" data-id="' +
          slot +
          '"><small>' +
          name +
          "</small><b>" +
          esc(
            c.equipment[slot as keyof typeof c.equipment]?.name ?? "— Vazio —",
          ) +
          "</b></button>",
      )
      .join("") +
    '</div><h3>Receptáculos</h3><div class="jewel-row">' +
    c.jewels
      .map(
        (id) =>
          '<button class="jewel" data-action="unjewel" data-id="' +
          id +
          '" title="Remover joia"><span style="color:' +
          jewelRegistry[id].color +
          '">◆</span>' +
          jewelRegistry[id].name +
          " ×</button>",
      )
      .join("") +
    (c.jewels.length < (c.level >= 15 ? 2 : 1)
      ? '<span class="empty-socket">◇ Receptáculo vazio</span>'
      : "") +
    '</div><p class="muted">Segundo receptáculo no nível 15. Remova uma joia para trocar.</p>' +
    jewels
      .map((id) => {
        const j = jewelRegistry[id];
        return (
          '<article class="item-card"><div class="item-icon" style="color:' +
          j.color +
          '">◆</div><div><strong>' +
          j.name +
          "</strong><small>" +
          esc(
            j.effectsByClass[c.classId]?.description ??
              Object.entries(j.globalEffects)
                .map(([k, v]) => statLabel(k, v))
                .join(" · "),
          ) +
          '</small></div><button data-action="jewel" data-id="' +
          id +
          '">Inserir</button></article>'
        );
      })
      .join("") +
    "<h3>Equipamentos</h3>" +
    (items.length
      ? items.map((i) => itemCard(i, c)).join("")
      : '<p class="empty">Ainda há espaço para histórias. Abra o baú a leste ou enfrente os espinheiros.</p>')
  );
}
export function skillsPanel(c: Character) {
  return (
    '<p class="eyebrow">DISCIPLINA & DESCOBERTA</p><h2>' +
    classRegistry[c.classId].name +
    "</h2><p>Nível " +
    c.level +
    " · <b>" +
    c.points +
    ' pontos disponíveis</b></p><div class="skill-grid">' +
    activeAbilities(c)
      .map((id, i) => {
        const a = abilityRegistry[id];
        if(!a)return '<article><small>Slot '+(i+1)+'</small><h3>Vazio</h3><p>Desbloqueie uma habilidade na árvore.</p></article>';
        return (
          '<article><span class="skill-icon">' +
          a.icon +
          "</span><small>" +
          ["Q", "W", "E", "R"][i] +
          " · nv. " +
          a.level +
          "</small><h3>" +
          a.name +
          "</h3><p>" +
          a.description +
          "</p><small>" +
          a.cost +
          " recurso · " +
          a.cooldown +
          " s</small></article>"
        );
      })
      .join("") +
    "</div><h3>Talentos</h3>" +
    classRegistry[c.classId].passives
      .map((id) => {
        const p = passiveRegistry[id],
          learned = c.passives.includes(id);
        return (
          '<div class="talent"><div><b>' +
          p.name +
          "</b><small>" +
          p.description +
          '</small></div><button data-action="passive" data-id="' +
          id +
          '" ' +
          (learned || !c.points ? "disabled" : "") +
          ">" +
          (learned ? "Aprendido" : "1 ponto") +
          "</button></div>"
        );
      })
      .join("") +
    '<div class="talent"><div><b>Maestria • ' +
    c.mastery +
    '</b><small>Dano crescente com retornos decrescentes. Sem limite de nível.</small></div><button data-action="mastery" ' +
    (!c.points ? "disabled" : "") +
    ">1 ponto</button></div>" +
    (!c.jewels.includes("fire") && c.classId === "fighter"
      ? '<p class="locked">◇ Talho de brasa • requer Joia da Brasa • nível 1<br>Corte físico e fogo que aplica queimadura.</p>'
      : "")
  );
}
export function settingsPanel(meta: MetaProgress) {
  return (
    '<p class="eyebrow">À SUA MANEIRA</p><h2>Configurações</h2><label class="setting"><input data-setting="sound" type="checkbox" ' +
    (meta.settings.sound ? "checked" : "") +
    '> Sons de combate</label><label class="setting">Volume <input data-setting="volume" type="range" min="0" max="1" step=".05" value="' +
    meta.settings.volume +
    '"></label><label class="setting"><input data-setting="damageNumbers" type="checkbox" ' +
    (meta.settings.damageNumbers ? "checked" : "") +
    '> Números de dano</label><label class="setting"><input data-setting="wasd" type="checkbox" ' +
    (meta.settings.wasd ? "checked" : "") +
    '> Movimento WASD (habilidades passam para Z/X/C/V)</label><label class="setting">Clique direito <select data-setting="secondary">' +
    [0, 1, 2, 3]
      .map(
        (i) =>
          '<option value="' +
          i +
          '" ' +
          (meta.settings.secondary === i ? "selected" : "") +
          ">Habilidade " +
          (i + 1) +
          "</option>",
      )
      .join("") +
    '</select></label><p class="muted">Clique para mover/atacar · roda para zoom · Espaço para pausa tática.</p>'
  );
}
export function characterPortrait(
  c: Character,
  index: number,
  selected: boolean,
) {
  const s = statsFor(c),
    cls = classRegistry[c.classId];
  return (
    '<button class="portrait ' +
    (selected ? "selected" : "") +
    '" data-action="select" data-id="' +
    index +
    '"><span class="portrait-art" style="--class:#' +
    cls.color.toString(16) +
    '">' +
    cls.icon +
    '</span><span class="portrait-info"><b>' +
    cls.name +
    " <em>" +
    c.level +
    '</em></b><span class="bar"><i style="width:' +
    Math.max(0, (c.hp / s.health) * 100) +
    '%"></i></span><span class="bar resource"><i style="width:' +
    c.resource +
    '%"></i></span><small>' +
    Math.ceil(c.hp) +
    " / " +
    Math.ceil(s.health) +
    " <kbd>" +
    (index + 1) +
    "</kbd></small></span></button>"
  );
}
