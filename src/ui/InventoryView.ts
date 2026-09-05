import type { Engine } from "../core/Engine";
import type { Item, Slot } from "../core/types";
import { balance } from "../data/balance";
import { icon, gem, portrait } from "./Icons";
import {
  esc,
  itemSlot,
  slotNames,
  statSummary,
  comparison,
  gameButton,
} from "./Components";
import { itemBaseRegistry } from "../data/items";
export function bagSlots(
  items: Item[],
  layout: Record<string, number>,
  capacity = 36,
) {
  const result: Array<Item | undefined> = Array(capacity).fill(undefined);
  for (const item of items) {
    const i = layout[item.id];
    if (Number.isInteger(i) && i >= 0 && i < capacity && !result[i])
      result[i] = item;
  }
  for (const item of items)
    if (!result.includes(item)) {
      const i = result.indexOf(undefined);
      if (i >= 0) {
        result[i] = item;
        layout[item.id] = i;
      }
    }
  for (const id of Object.keys(layout))
    if (!items.some((i) => i.id === id)) delete layout[id];
  return result;
}
export function inventoryView(e: Engine, selected?: string) {
  const c = e.selected,
    layout = (e.run.bagLayout ??= {}),
    slots = bagSlots(e.run.inventory, layout, balance.inventorySize),
    item = e.run.inventory.find((i) => i.id === selected);
  return (
    '<div class="inventory-spread"><section class="doll-leaf"><header><small>O viajante</small><h2>' +
    esc(c.name) +
    "</h2><p>Nível " +
    c.level +
    ' · Equipamento & vínculos</p></header><div class="paper-doll"><div class="doll-inscription"></div>' +
    portrait(c.classId, true) +
    Object.keys(slotNames)
      .map((slot, i) => {
        const worn = c.equipment[slot as Slot];
        return (
          '<button class="equipment-slot ' +
          slot +
          (worn ? " occupied" : "") +
          '" data-slot="' +
          slot +
          '" ' +
          (worn
            ? 'draggable="true" data-equipped="' +
              slot +
              '" data-item="' +
              esc(worn.id) +
              '" data-action="unequip" data-id="' +
              slot +
              '" data-tip="item:' +
              esc(worn.id) +
              '"'
            : 'data-tip="empty:' + slot + '"') +
          ' aria-label="' +
          slotNames[slot] +
          '">' +
          icon(worn?.baseId ?? slot) +
          "<span>" +
          slotNames[slot] +
          "</span></button>"
        );
      })
      .join("") +
    "</div>" +
    statSummary(c) +
    '<div class="socket-line"><span>Vínculos</span>' +
    Array.from(
      { length: c.level >= 15 ? 2 : 1 },
      (_, i) =>
        '<button class="jewel-socket ' +
        (c.jewels[i] ? "occupied" : "") +
        '" data-socket="' +
        i +
        '" ' +
        (c.jewels[i]
          ? 'data-action="unjewel" data-id="' +
            c.jewels[i] +
            '" data-tip="jewel:' +
            c.jewels[i] +
            '"'
          : 'data-tip="socket:empty"') +
        ' aria-label="Receptáculo de joia">' +
        (c.jewels[i] ? gem(c.jewels[i]) : icon("ring")) +
        "</button>",
    ).join("") +
    '<small>Segundo vínculo · nível 15</small></div></section><section class="bag-leaf"><header><div><small>Pertences da expedição</small><h2>A mochila</h2></div><span class="bag-capacity">' +
    e.run.inventory.length +
    " / 36</span>" +
    gameButton("Ordenar", "sort") +
    '</header><div class="bag-grid" role="group" aria-label="Mochila com 36 espaços">' +
    slots.map((it, i) => itemSlot(it, i, it?.id === selected)).join("") +
    '</div><div class="gem-pouch"><span>Bolsa de joias</span>' +
    e.run.jewels
      .map(
        (id) =>
          '<button draggable="true" class="pouch-gem" data-jewel="' +
          id +
          '" data-action="jewel" data-id="' +
          id +
          '" data-tip="jewel:' +
          id +
          '" aria-label="Inserir ' +
          id +
          '">' +
          gem(id) +
          "</button>",
      )
      .join("") +
    (!e.run.jewels.length ? "<small>Nenhuma joia guardada</small>" : "") +
    '</div><div class="inventory-selection">' +
    (item
      ? "<b>" +
        esc(item.name) +
        "</b>" +
        gameButton("Equipar", "equip", item.id) +
        "<small>Duplo clique também equipa</small>"
      : "<p>Selecione um achado para examiná-lo.</p><small>Arraste para equipar · Duplo clique para vestir · Shift + clique para equipar</small>") +
    "</div></section></div>"
  );
}
export class InventoryDrag {
  private abort = new AbortController();
  private drag?: { item?: string; equipped?: Slot; jewel?: string };
  constructor(
    private root: HTMLElement,
    private engine: () => Engine | undefined,
    private refresh: () => void,
  ) {
    const opts = { signal: this.abort.signal };
    root.addEventListener(
      "dragstart",
      (ev) => {
        const target = (ev.target as HTMLElement).closest<HTMLElement>(
          "[draggable]",
        );
        if (!target) return;
        this.drag = {
          item: target.dataset.item,
          equipped: target.dataset.equipped as Slot,
          jewel: target.dataset.jewel,
        };
        ev.dataTransfer?.setData(
          "text/plain",
          this.drag.item ?? this.drag.jewel ?? "",
        );
        if (ev.dataTransfer) ev.dataTransfer.effectAllowed = "move";
        root.classList.add("dragging-item");
        this.highlight();
      },
      opts,
    );
    root.addEventListener(
      "dragover",
      (ev) => {
        if (
          (ev.target as HTMLElement).closest(
            "[data-slot],[data-bag-index],[data-socket]",
          )
        )
          ev.preventDefault();
      },
      opts,
    );
    root.addEventListener(
      "drop",
      (ev) => {
        ev.preventDefault();
        const e = engine(),
          t = (ev.target as HTMLElement).closest<HTMLElement>(
            "[data-slot],[data-bag-index],[data-socket]",
          ),
          drag = this.drag;
        if (!e || !t || !drag) return;
        try {
          if (drag.jewel && t.dataset.socket !== undefined)
            e.command({ type: "jewel", id: drag.jewel });
          else if (drag.item) {
            const item =
              e.run.inventory.find((x) => x.id === drag.item) ??
              Object.values(e.selected.equipment).find(
                (x) => x?.id === drag.item,
              );
            if (!item) return;
            if (t.dataset.slot) {
              if (t.dataset.slot !== item.slot)
                throw Error("Este equipamento não cabe neste espaço.");
              e.command({ type: "equip", id: item.id });
            } else if (t.dataset.bagIndex) {
              if (drag.equipped)
                e.command({ type: "unequip", slot: drag.equipped });
              const layout = (e.run.bagLayout ??= {}),
                old = layout[item.id],
                index = Number(t.dataset.bagIndex),
                other = Object.keys(layout).find((id) => layout[id] === index);
              if (other) layout[other] = old ?? e.run.inventory.length - 1;
              layout[item.id] = index;
              void e.save();
            }
          }
        } catch (err) {
          e.bus.emit("notice", String((err as Error).message));
        }
        this.end();
        refresh();
      },
      opts,
    );
    root.addEventListener("dragend", () => this.end(), opts);
    root.addEventListener(
      "dblclick",
      (ev) => {
        const t = (ev.target as HTMLElement).closest<HTMLElement>(
          "[data-item]:not([data-equipped])",
        );
        if (t?.dataset.item) {
          engine()?.command({ type: "equip", id: t.dataset.item });
          refresh();
        }
      },
      opts,
    );
    root.addEventListener(
      "click",
      (ev) => {
        if (!ev.shiftKey) return;
        const t = (ev.target as HTMLElement).closest<HTMLElement>(
          "[data-item]",
        );
        if (t?.dataset.item) {
          engine()?.command({ type: "equip", id: t.dataset.item });
          refresh();
        }
      },
      opts,
    );
  }
  private highlight() {
    const e = this.engine(),
      item = e?.run.inventory.find((x) => x.id === this.drag?.item);
    this.root
      .querySelectorAll<HTMLElement>("[data-slot],[data-socket]")
      .forEach((t) => {
        const valid = this.drag?.jewel
          ? t.dataset.socket !== undefined
          : !!item &&
            t.dataset.slot === item.slot &&
            (!itemBaseRegistry[item.baseId].classes ||
              itemBaseRegistry[item.baseId].classes!.includes(
                e!.selected.classId,
              ));
        t.classList.add(valid ? "drop-valid" : "drop-invalid");
      });
  }
  private end() {
    this.drag = undefined;
    this.root.classList.remove("dragging-item");
    this.root
      .querySelectorAll(".drop-valid,.drop-invalid")
      .forEach((t) => t.classList.remove("drop-valid", "drop-invalid"));
  }
  destroy() {
    this.abort.abort();
  }
}
