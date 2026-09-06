import type { Engine } from "../core/Engine";
import type { ClassId, Slot } from "../core/types";
import { generateItem } from "../loot/ItemGenerator";
import { shopRegistry } from "../data/shops";
import { balance, regionLevel } from "../data/balance";
import { createCharacter, statsFor } from "../progression/Character";
import { itemBaseRegistry } from "../data/items";
import { jewelRegistry } from "../data/jewels";
import { biomeRegistry } from "../data/biomes";
import { sampleBiome } from "../world/generation/WorldGenerator";
import { classRequirement, playerLevel } from "../progression/ClassUnlocks";
export class ShopSystem {
  active?: string;
  constructor(private e: Engine) {}
  stock() {
    const poi = [...this.e.world.chunks.values()]
      .flatMap((c) => c.pois)
      .find((p) => p.id === this.active) ?? { x: 0, y: 0 };
    const level = regionLevel(
      poi.x,
      poi.y,
      biomeRegistry[sampleBiome(this.e.run.seed, poi.x, poi.y, this.e.run.worldSettings)].danger,
    );
    return shopRegistry.general.items.map((id) =>
      generateItem(
        this.e.run.seed + ":shop:" + this.active + ":" + id,
        level,
        id,
        1,
      ),
    );
  }
  buy(id: string) {
    if (!this.active) return;
    const e = this.e;
    if (id === "potion") {
      if (e.meta.silver < shopRegistry.general.potionSilver)
        throw Error("Prata insuficiente");
      e.meta.silver -= shopRegistry.general.potionSilver;
      for (const c of e.run.party)
        if (c.alive) {
          c.hp = statsFor(c).health;
          c.resource = 100;
        }
      return;
    }
    if (jewelRegistry[id]) {
      if (e.meta.gold < shopRegistry.general.jewelGold)
        throw Error("Ouro insuficiente");
      e.meta.gold -= shopRegistry.general.jewelGold;
      e.run.jewels.push(id);
      return;
    }
    const item = this.stock().find((x) => x.baseId === id);
    if (!item) return;
    if (e.run.inventory.length >= balance.inventorySize)
      throw Error("Inventário cheio");
    if (e.meta.silver < shopRegistry.general.itemPrice)
      throw Error("Prata insuficiente");
    e.meta.silver -= shopRegistry.general.itemPrice;
    e.run.inventory.push({ ...item, id: item.id + ":" + e.nextId() });
  }
  sell(id: string) {
    if (!this.active) return;
    const i = this.e.run.inventory.findIndex((x) => x.id === id);
    if (i < 0) return;
    this.e.meta.silver += this.e.run.inventory[i].value;
    this.e.run.inventory.splice(i, 1);
  }
  unlock(classId: ClassId) {
    if (!this.active || this.e.meta.unlockedClasses.includes(classId)) return;
    const requirement = classRequirement(this.e.meta, classId);
    if (!requirement) throw Error("Classe inválida");
    if (playerLevel(this.e.run) < requirement.level) throw Error(`Requer nível ${requirement.level}`);
    if (this.e.meta.silver < requirement.silver) throw Error("Prata insuficiente");
    this.e.meta.silver -= requirement.silver;
    this.e.meta.unlockedClasses.push(classId);
  }
  recruit(classId: ClassId) {
    const e = this.e;
    if (!this.active) return;
    if (!e.meta.unlockedClasses.includes(classId))
      throw Error("Desbloqueie a classe primeiro");
    if (e.run.party.filter((c) => c.alive).length >= balance.maxParty)
      throw Error("Grupo completo");
    if (e.meta.silver < balance.recruitSilver)
      throw Error("Prata insuficiente");
    e.meta.silver -= balance.recruitSilver;
    const c = createCharacter(
      classId,
      e.run.id + ":recruit:" + e.nextId(),
      e.selected.x + 1,
      e.selected.y,
      Math.max(1, e.selected.level - 1),
    );
    e.run.party.push(c);
  }
  equip(id: string) {
    const e = this.e,
      c = e.selected,
      index = e.run.inventory.findIndex((i) => i.id === id),
      item = e.run.inventory[index];
    if (!item) return;
    if (c.level < item.requiredLevel) throw Error("Nível insuficiente");
    const base = itemBaseRegistry[item.baseId];
    if (base.classes && !base.classes.includes(c.classId))
      throw Error("Arma incompatível com esta classe");
    const old = c.equipment[item.slot];
    e.run.inventory.splice(index, 1);
    if (old) e.run.inventory.push(old);
    c.equipment[item.slot] = item;
    c.hp = Math.min(c.hp, statsFor(c).health);
  }
  unequip(slot: Slot) {
    const c = this.e.selected,
      item = c.equipment[slot];
    if (!item) return;
    if (this.e.run.inventory.length >= balance.inventorySize)
      throw Error("Inventário cheio");
    this.e.run.inventory.push(item);
    delete c.equipment[slot];
    c.hp = Math.min(c.hp, statsFor(c).health);
  }
  jewel(id: string) {
    const e = this.e,
      c = e.selected,
      i = e.run.jewels.indexOf(id);
    if (i < 0) return;
    const max = c.level >= balance.secondJewelLevel ? 2 : 1;
    if (c.jewels.length >= max)
      throw Error("Remova a joia atual para abrir um receptáculo");
    if (c.jewels.includes(id)) throw Error("Joia já equipada");
    c.jewels.push(id);
    e.run.jewels.splice(i, 1);
  }
}
