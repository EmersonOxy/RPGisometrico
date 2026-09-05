import type { Command, Effect, Item } from "./types";

export interface Events {
  audio: "hover" | "click" | "equip" | "coin" | "pickup" | "cast";
  currency: { x: number; y: number; kind: "silver" | "gold"; amount: number };
  command: Command;
  changed: undefined;
  notice: string;
  effect: Effect;
  shop: string;
  save: string;
  "run:ended": undefined;
  "enemy:killed": string;
  "character:died": string;
  "level:up": string;
  lootAcquired: {
    kind: "item" | "silver" | "gold" | "jewel";
    amount: number;
    item?: Item;
    jewel?: string;
  };
  inputBindingsChanged: undefined;
}

export class EventBus {
  private handlers = new Map<keyof Events, Set<(data: never) => void>>();
  on<K extends keyof Events>(key: K, fn: (data: Events[K]) => void) {
    const set = this.handlers.get(key) ?? new Set();
    set.add(fn as (data: never) => void);
    this.handlers.set(key, set);
    return () => set.delete(fn as (data: never) => void);
  }
  emit<K extends keyof Events>(key: K, data: Events[K]) {
    this.handlers.get(key)?.forEach((fn) => fn(data as never));
  }
}
