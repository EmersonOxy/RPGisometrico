import { icon, gem } from "./Icons";
import type { Item, Character } from "../core/types";
import { rarityColors, rarityNames, itemBaseRegistry } from "../data/items";
import { statsFor } from "../progression/Character";
import { jewelRegistry } from "../data/jewels";
export const esc = (s: unknown) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export const slotNames: Record<string, string> = {
  weapon: "Arma",
  offhand: "Mão secundária",
  armor: "Armadura",
  ring: "Anel",
};
export const statNames: Record<string, string> = {
  damage: "Dano",
  health: "Vida",
  armor: "Armadura",
  speed: "Velocidade",
  crit: "Crítico",
  fire: "Fogo",
  regen: "Regeneração",
  cooldown: "Redução de recarga",
  coins: "Moedas",
};
export const value = (key: string, n: number) =>
  ["crit", "fire", "cooldown", "coins"].includes(key)
    ? Math.round(n * 100) + "%"
    : Number(n.toFixed(1)).toString();
export const gameButton = (
  label: string,
  action: string,
  id = "",
  extra = "",
) =>
  '<button class="game-button" data-action="' +
  action +
  '" data-id="' +
  esc(id) +
  '" ' +
  extra +
  ">" +
  label +
  "</button>";
export function itemSlot(
  item: Item | undefined,
  index: number,
  selected = false,
  action = "item-select",
) {
  return (
    '<button class="inventory-slot ' +
    (item ? "occupied" : "empty") +
    (selected ? " chosen" : "") +
    '" ' +
    (item
      ? 'draggable="true" data-item="' +
        esc(item.id) +
        '" data-action="' +
        action +
        '" data-id="' +
        esc(item.id) +
        '" data-tip="item:' +
        esc(item.id) +
        '" style="--rarity:' +
        rarityColors[item.rarity] +
        '"'
      : "") +
    ' data-bag-index="' +
    index +
    '" aria-label="' +
    esc(item ? item.name : "Espaço vazio " + (index + 1)) +
    '">' +
    (item
      ? icon(item.baseId) +
        '<span class="rarity-notches">' +
        "·".repeat(item.rarity + 1) +
        "</span>"
      : "<i></i>") +
    "</button>"
  );
}
export function itemDetails(item: Item, c?: Character) {
  const compatible =
    !c ||
    !itemBaseRegistry[item.baseId].classes ||
    itemBaseRegistry[item.baseId].classes!.includes(c.classId);
  return (
    '<div class="tooltip-heading" style="--rarity:' +
    rarityColors[item.rarity] +
    '">' +
    icon(item.baseId) +
    "<div><h3>" +
    esc(item.name) +
    "</h3><span>" +
    rarityNames[item.rarity] +
    " · " +
    slotNames[item.slot] +
    '</span></div></div><p class="item-level ' +
    (!compatible ? "negative" : "") +
    '">Nível do item ' +
    item.level +
    " · requer nível " +
    item.requiredLevel +
    (!compatible ? " · classe incompatível" : "") +
    '</p><dl class="stat-list">' +
    Object.entries(item.stats)
      .map(
        ([k, v]) =>
          "<div><dt>" +
          statNames[k] +
          "</dt><dd>" +
          value(k, v) +
          "</dd></div>",
      )
      .join("") +
    '</dl><p class="item-tags">' +
    esc(item.tags.join(" · ")) +
    '</p><p class="muted">Valor de venda: ' +
    item.value +
    " prata</p>"
  );
}
export function comparison(item: Item, c: Character) {
  const old = c.equipment[item.slot];
  return (
    '<div class="comparison-pair"><article>' +
    itemDetails(item, c) +
    "</article>" +
    (old
      ? "<article><small>Equipado</small>" +
        itemDetails(old, c) +
        "<p>" +
        Object.entries(item.stats)
          .map(([k, v]) => {
            const d = v - (old.stats[k as keyof typeof old.stats] ?? 0);
            return (
              '<span class="' +
              (d >= 0 ? "positive" : "negative") +
              '">' +
              (d >= 0 ? "+" : "") +
              value(k, d) +
              " " +
              statNames[k] +
              "</span>"
            );
          })
          .join("<br>") +
        "</p></article>"
      : "") +
    "</div>"
  );
}
export function jewelDetails(id: string, c: Character) {
  const j = jewelRegistry[id];
  return (
    '<div class="tooltip-heading">' +
    gem(id) +
    "<h3>" +
    j.name +
    "</h3></div><p>Joia rara · nível " +
    j.requiredLevel +
    "</p><p>" +
    esc(
      j.effectsByClass[c.classId]?.description ??
        "Aprimora os atributos do portador.",
    ) +
    '</p><dl class="stat-list">' +
    Object.entries(j.globalEffects)
      .map(
        ([k, v]) =>
          "<div><dt>" +
          statNames[k] +
          "</dt><dd>+" +
          value(k, v) +
          "</dd></div>",
      )
      .join("") +
    "</dl>"
  );
}
export function statSummary(c: Character) {
  const s = statsFor(c);
  const allocated = c.allocatedStats ?? {
    vitality: 0,
    armor: 0,
    speed: 0,
    mana: 0,
    luck: 0,
    charisma: 0,
  };
  const points = c.statPoints ?? 0;

  const resourceTitle =
    c.classId === "fighter"
      ? "Estamina"
      : c.classId === "shooter"
        ? "Foco"
        : c.classId === "tank"
          ? "Determinação"
          : "Mana";

  const statEntries: Array<{
    id: import("../core/types").StatPointType;
    label: string;
    curVal: number;
    effVal: string;
  }> = [
    { id: "vitality", label: "Vida", curVal: allocated.vitality, effVal: `${Math.round(s.health)} HP` },
    { id: "armor", label: "Armadura", curVal: allocated.armor, effVal: `${Math.round(s.armor)}` },
    { id: "speed", label: "Velocidade", curVal: allocated.speed, effVal: s.speed.toFixed(1) },
    { id: "mana", label: resourceTitle, curVal: allocated.mana, effVal: `${100 + allocated.mana * 15}` },
    { id: "luck", label: "Sorte", curVal: allocated.luck, effVal: `+${Math.round((s.coins - 1) * 100)}%` },
    { id: "charisma", label: "Carisma", curVal: allocated.charisma, effVal: `${allocated.charisma}` },
  ];

  return (
    '<div class="character-stats-panel">' +
    (points > 0
      ? `<div class="stat-points-available">+${points} ponto de atributo disponível</div>`
      : "") +
    '<dl class="character-stats">' +
    statEntries
      .map((entry) => {
        return (
          `<div><dt>${entry.label}</dt><dd><span>${entry.effVal}</span>` +
          (points > 0
            ? `<button class="stat-add-btn" data-action="stat" data-id="${entry.id}" data-tip="stat:${entry.id}">+</button>`
            : "") +
          `</dd></div>`
        );
      })
      .join("") +
    "</dl></div>"
  );
}
