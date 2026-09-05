import { icon } from "./Icons";
import { rarityColors, rarityNames } from "../data/items";
import type { Item } from "../core/types";
import { jewelRegistry } from "../data/jewels";

export interface LootFeedEntry {
  id: string; // key for merging
  key: string;
  name: string;
  iconName: string;
  amount: number;
  rarity?: number;
  color?: string;
  element: HTMLElement;
  timer: ReturnType<typeof setTimeout>;
  updatedAt: number;
}

export class LootFeed {
  private container: HTMLElement;
  private entries: LootFeedEntry[] = [];
  private readonly maxEntries = 5;
  private readonly mergeWindow = 1400; // ms
  private duration(rarity = 0) {
    return (Math.max(2, Math.min(6, this.options().lootFeedDuration ?? 3)) + (rarity >= 2 ? 2 : 0)) * 1000;
  }

  constructor(root: HTMLElement, private options: () => {lootFeedDuration?: number} = () => ({})) {
    this.container = document.createElement("div");
    this.container.className = "loot-acquired-feed";
    this.container.setAttribute("aria-live", "polite");
    root.appendChild(this.container);
  }

  mount(root:HTMLElement){root.appendChild(this.container)}

  addItem(item: Item, amount = 1) {
    const key = `item:${item.name}:${item.rarity}`;
    const color = rarityColors[item.rarity] ?? "#d4cfba";
    const iconName = item.baseId ?? "bag";
    this.addOrMerge(key, item.name, iconName, amount, item.rarity, color);
  }

  addCurrency(kind: "silver" | "gold", amount: number) {
    const key = `currency:${kind}`;
    const name = kind === "gold" ? "Ouro" : "Prata";
    const iconName = kind === "gold" ? "fortune" : "coin";
    const color = kind === "gold" ? "#dfbe6e" : "#c9cebe";
    this.addOrMerge(key, name, iconName, amount, undefined, color);
  }

  addJewel(jewelId: string, amount = 1) {
    const key = `jewel:${jewelId}`;
    const name = jewelRegistry[jewelId]?.name ?? "Joia Antiga";
    const iconName = jewelId ?? "stone";
    const color = "#e2a4c0";
    this.addOrMerge(key, name, iconName, amount, 3, color);
  }

  private addOrMerge(
    key: string,
    name: string,
    iconName: string,
    amount: number,
    rarity?: number,
    color?: string,
  ) {
    const now = Date.now();
    const existing = this.entries.find(
      (e) => e.key === key && now - e.updatedAt < this.mergeWindow,
    );

    if (existing) {
      existing.amount += amount;
      existing.updatedAt = now;
      clearTimeout(existing.timer);
      this.updateEntryElement(existing, true);
      existing.timer = setTimeout(() => this.removeEntry(existing), this.duration(existing.rarity));
      return;
    }

    if (this.entries.length >= this.maxEntries) {
      const oldest = this.entries.shift();
      if (oldest) {
        clearTimeout(oldest.timer);
        oldest.element.remove();
      }
    }

    const el = document.createElement("div");
    el.className = "loot-feed-item enter";
    if (rarity !== undefined) {
      el.classList.add(`rarity-${rarity}`);
    }

    const entry: LootFeedEntry = {
      id: `${key}_${now}`,
      key,
      name,
      iconName,
      amount,
      rarity,
      color,
      element: el,
      timer: setTimeout(() => this.removeEntry(entry), this.duration(rarity)),
      updatedAt: now,
    };

    this.updateEntryElement(entry, false);
    this.container.appendChild(el);
    this.entries.push(entry);

    requestAnimationFrame(() => {
      el.classList.remove("enter");
    });
  }

  private updateEntryElement(entry: LootFeedEntry, pulse = false) {
    const rarityLabel =
      entry.rarity !== undefined ? rarityNames[entry.rarity] : "";
    const colorStyle = entry.color ? `color:${entry.color};` : "";

    entry.element.innerHTML = `
      <span class="loot-feed-count${pulse ? " pulse" : ""}">+${entry.amount}</span>
      <span class="loot-feed-icon">${icon(entry.iconName)}</span>
      <span class="loot-feed-name" style="${colorStyle}">${entry.name}</span>
      ${rarityLabel ? `<small class="loot-feed-rarity">${rarityLabel}</small>` : ""}
    `;

    if (pulse) {
      setTimeout(() => {
        entry.element.querySelector(".loot-feed-count")?.classList.remove("pulse");
      }, 300);
    }
  }

  private removeEntry(entry: LootFeedEntry) {
    entry.element.classList.add("leave");
    setTimeout(() => {
      entry.element.remove();
      this.entries = this.entries.filter((e) => e !== entry);
    }, 250);
  }

  clear() {
    for (const e of this.entries) {
      clearTimeout(e.timer);
      e.element.remove();
    }
    this.entries = [];
  }

  destroy() {
    this.clear();
    this.container.remove();
  }
}
