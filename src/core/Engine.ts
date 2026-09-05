import { rollEnemyLoot, mergeCoins } from "../loot/LootSystem";
import { summarizeChunk } from "../world/Cartography";
import type {
  Character,
  Chunk,
  Command,
  Effect,
  Enemy,
  Hazard,
  MetaProgress,
  Point,
  Poi,
  Projectile,
  RunState,
} from "./types";
import { EventBus } from "./EventBus";
import { ChunkManager } from "../world/ChunkManager";
import { CombatSystem } from "../combat/CombatSystem";
import { ShopSystem } from "../shops/ShopSystem";
import { SeededRandom } from "../utils/SeededRandom";
import { balance, regionLevel } from "../data/balance";
import { enemyRegistry } from "../data/enemies";
import { lootTableRegistry } from "../data/lootTables";
import { classRegistry } from "../data/classes";
import { generateItem } from "../loot/ItemGenerator";
import { DiscoveryMask } from "../world/DiscoveryMask";
import { TargetingSystem } from "../combat/TargetingSystem";
import {
  addExperience,
  coinMultiplier,
  statsFor,
} from "../progression/Character";
import { killCharacter } from "./Run";
import { findPath, smoothPath, lineWalkable } from "../world/navigation/AStar";
import { chunkAt, distance } from "../world/WorldCoordinates";
import { sampleBiome } from "../world/generation/WorldGenerator";
import { moveEntities, tickAI } from "../entities/AI";
export class Engine {
  sandboxActive = false;
  debugOptions = {godMode:false,freezeEnemies:false,noCooldowns:false,unlimitedResource:false,timeScale:1};
  readonly orders = new Map<string, { kind: "move" | "defend" | "attack" | "investigate"; point: Point; remaining: number; poi?: string }>();
  private missingTargets = new Map<string, number>();
  private unreachableTargets = new Map<string, { elapsed: number; probe: number; blocked: boolean }>();
  commandMembers() {
    const ids = this.run.commandSelection?.length ? this.run.commandSelection : [this.selected.id];
    return this.run.party.filter(m => m.alive && ids.includes(m.id));
  }
  orderMove(members: Character[], point: Point, kind: "move" | "defend" | "attack" | "investigate" = "move", poi?: string) {
    const used: Point[] = [];
    for (const [index, member] of members.entries()) {
      let destination: Point | undefined;
      for (let attempt = 0; attempt < 80; attempt++) {
        const angle = (index + attempt) * 2.39996;
        const radius = attempt === 0 && index === 0 ? 0 : .65 * Math.sqrt(index + attempt + 1);
        const candidate = { x: point.x + Math.cos(angle) * radius, y: point.y + Math.sin(angle) * radius };
        if (this.world.cell(Math.floor(candidate.x), Math.floor(candidate.y)).blocked || used.some(p => distance(p, candidate) < .8)) continue;
        this.move(member, candidate);
        if (member.path.length || distance(member, candidate) < .3) { destination = candidate; break; }
      }
      if (!destination) { this.bus.emit("notice", "Sem passagem livre para " + member.name); continue; }
      used.push(destination);
      this.combat.cancelForMove(member);
      this.orders.set(member.id, { kind, point: destination, remaining: kind === "defend" || kind === "attack" ? 12 : 40, poi });
    }
  }
  basicAttack(point: Point, targetId?: string) {
    const c = this.selected;
    const target = this.enemies.get(targetId ?? this.run.focusTargetId ?? "");
    this.orders.delete(c.id);
    this.pendingInteraction = undefined;
    c.target = target?.hp && target.hp > 0 ? target.id : undefined;
    this.combat.cancelForMove(c);
    if (target && target.hp > 0 && distance(c, target) > classRegistry[c.classId].range) this.approach(c, target, classRegistry[c.classId].range);
    else this.combat.request(c, -1, target ?? point);
  }
  world: ChunkManager;
  combat: CombatSystem;
  shop: ShopSystem;
  random: SeededRandom;
  discoveryMask: DiscoveryMask;
  targeting: TargetingSystem;
  enemies = new Map<string, Enemy>();
  effects: Effect[] = [];
  hazards: Hazard[] = [];
  projectiles: Projectile[] = [];
  hovered?: { kind: "enemy" | "poi" | "drop"; id: string };
  showLootLabels = false;
  tactical = false;
  debugGrid = false;
  paused = false;
  saveStatus = "Pronto";
  private lastDangerLevel = 0;
  private serial = Date.now();
  private changedTime = 0;
  private saveTime = 0;
  private disposed = false;
  private pendingInteraction?: string;
  private off: () => void;
  constructor(
    public run: RunState,
    public meta: MetaProgress,
    public bus: EventBus,
    private persist: () => Promise<void>,
  ) {
    this.run.cartography ??= {};
    this.run.targetQueue ??= [];
    this.run.commandSelection ??= [];
    this.meta.tutorials ??= {};
    this.random = new SeededRandom(run.rng);
    this.discoveryMask = new DiscoveryMask(
      this.run.discoveryMask,
      this.run.discovered,
    );
    this.world = new ChunkManager(
      run.seed,
      (c) => this.loaded(c),
      (key) => {
        for (const [id, enemy] of this.enemies) {
          const c = chunkAt(enemy.home.x, enemy.home.y);
          if (c.x + "," + c.y === key) this.enemies.delete(id);
        }
      },
      run.worldVersion ?? 1,
    );
    this.combat = new CombatSystem(this);
    this.targeting = new TargetingSystem(this);
    this.shop = new ShopSystem(this);
    this.off = bus.on("command", (c) => this.command(c));
    this.world.update(this.selected);
  }
  get selected() {
    return (
      this.run.party.find((c) => c.id === this.run.selected) ??
      this.run.party[0]
    );
  }
  nextId() {
    return ++this.serial;
  }
  fx(
    p: Point,
    kind: Effect["kind"],
    color: number,
    duration: number,
    radius: number,
    to?: Point,
    text?: string,
  ) {
    const effect = {
      x: p.x,
      y: p.y,
      id: this.nextId(),
      kind,
      color,
      duration,
      remaining: duration,
      radius,
      to: to ? { x: to.x, y: to.y } : undefined,
      text,
    };
    this.effects.push(effect);
    if (this.effects.length > 100) this.effects.shift();
    this.bus.emit("effect", effect);
  }
  loaded(chunk: Chunk) {
    if (this.disposed) return;
    if (this.run.discovered.includes(chunk.key))
      this.run.cartography![chunk.key] = summarizeChunk(chunk);
    for (const spawn of chunk.spawns) {
      if (this.run.deltas[spawn.id]) continue;
      const def = enemyRegistry[spawn.definition],
        maxHp =
          def.health * (1 + 0.18 * (spawn.level - 1)) * (spawn.elite ? 2.5 : 1);
      this.enemies.set(spawn.id, {
        ...spawn,
        hp: maxHp,
        maxHp,
        modifier: new SeededRandom(this.run.seed + ":elite:" + spawn.id).pick([
          "swift",
          "armored",
          "regenerating",
        ]),
        statuses: [],
        path: [],
        state: "IDLE",
        timer: 0,
        aiTime: 0.5,
        attackTime: 1,
        home: { x: spawn.x, y: spawn.y },
        threat: {},
      });
    }
  }
  nearestEnemy(p: Point, range: number) {
    return [...this.enemies.values()]
      .filter((e) => e.hp > 0 && distance(e, p) < range)
      .sort((a, b) => distance(a, p) - distance(b, p))[0];
  }
  approach(c: Character, target: Point, range: number) {
    const d = distance(c, target);
    if (d <= range) {
      c.path = [];
      return;
    }
    const p = {
      x: target.x + ((c.x - target.x) / d) * (range - 0.18),
      y: target.y + ((c.y - target.y) / d) * (range - 0.18),
    };
    this.move(c, p, true);
  }
  move(entity: Character | Enemy, point: Point, keepTarget = false) {
    if (!keepTarget && "classId" in entity) entity.target = undefined;
    const d = distance(entity, point);
    if (d > 45) {
      point = {
        x: entity.x + ((point.x - entity.x) / d) * 44,
        y: entity.y + ((point.y - entity.y) / d) * 44,
      };
    }
    if (this.world.cell(Math.floor(point.x), Math.floor(point.y)).blocked) {
      entity.path = [];
      return;
    }
    entity.path = lineWalkable(entity, point, this.world.cell)
      ? [{ x: point.x, y: point.y }]
      : smoothPath(
          entity,
          findPath(entity, point, this.world.cell),
          this.world.cell,
        );
  }
  directMove(vx: number, vy: number, dt: number) {
    if (this.run.ended || this.paused || this.tactical) return;
    const c = this.selected;
    if (
      !c ||
      !c.alive ||
      c.statuses.some((s) => s.id === "stun") ||
      this.combat.movementLocked(c.id)
    )
      return;

    c.path = [];
    this.pendingInteraction = undefined;
    this.combat.cancelForMove(c);
    this.meta.tutorials.move = true;

    const speed =
      statsFor(c).speed *
      (c.statuses.some((s) => s.id === "slow") ? 0.5 : 1);
    const step = speed * dt;
    const dx = vx * step;
    const dy = vy * step;

    const targetX = c.x + dx;
    const targetY = c.y + dy;

    if (!this.world.cell(Math.floor(targetX), Math.floor(targetY)).blocked) {
      c.x = targetX;
      c.y = targetY;
    } else {
      // Wall sliding
      const tryX = c.x + dx;
      if (!this.world.cell(Math.floor(tryX), Math.floor(c.y)).blocked) {
        c.x = tryX;
      } else {
        const tryY = c.y + dy;
        if (!this.world.cell(Math.floor(c.x), Math.floor(tryY)).blocked) {
          c.y = tryY;
        }
      }
    }

    c.facing = vx >= 0 ? 1 : -1;
    c.facingAngle = Math.atan2(vy, vx);
  }
  command(cmd: Command) {
    if (this.run.ended) return;
    try {
      const c = this.selected;
      switch (cmd.type) {
        case "move": {
          this.pendingInteraction = undefined;
          this.meta.tutorials.move = true;
          this.orderMove(this.commandMembers(), cmd.point);
          if (!cmd.silent && this.meta.settings.clickIndicator !== false) {
            this.fx(cmd.point, "move", 0xe2d5a6, 0.65, 0.5);
          }
          break;
        }
        case "target":
          this.pendingInteraction = undefined;
          c.target = cmd.id;
          {
            const enemy = this.enemies.get(cmd.id);
            if (enemy) this.approach(c, enemy, classRegistry[c.classId].range);
          }
          break;
        case "ability":
          this.meta.tutorials.skill = true;
          this.combat.request(c, cmd.slot, cmd.point);
          break;
        case "select": {
          const next = this.run.party.filter((c) => c.alive)[cmd.index];
          if (next) this.run.selected = next.id;
          break;
        }
        case "tactical":
          this.tactical = !this.tactical;
          break;
        case "party":
          if (cmd.command === "regroup") {
            this.orderMove(this.commandMembers(), c);
            this.bus.emit("notice", "Grupo reagrupando...");
          } else {
            for (const member of this.commandMembers()) this.command({type: "memberOrder", memberId: member.id, order: cmd.command});
          }
          break;
        case "memberOrder": {
          const member = this.run.party.find((m) => m.id === cmd.memberId);
          if (member) {
            if (cmd.order === "regroup") {
              this.orderMove([member], c);
              this.bus.emit("notice", `${member.name} reagrupando...`);
            } else {
              this.orders.delete(member.id);
              member.partyOrder = cmd.order;
              if (cmd.order === "focus") member.target = this.run.focusTargetId;
              if (cmd.order === "hold" || cmd.order === "passive") { member.path = []; member.target = undefined; }
            }
          }
          break;
        }
        case "focusTarget":
          this.run.focusTargetId = cmd.id;
          break;
        case "targetQueueAdd": {
          this.run.targetQueue ??= [];
          const idx = this.run.targetQueue.indexOf(cmd.id);
          if (idx >= 0) {
            this.run.targetQueue.splice(idx, 1);
          } else {
            if (this.run.targetQueue.length >= balance.targetQueueLimit) { this.bus.emit("notice", "Fila de alvos completa."); break; }
            this.run.targetQueue.push(cmd.id);
          }
          this.run.focusTargetId = this.run.targetQueue[0];
          this.bus.emit("changed", undefined);
          break;
        }
        case "targetQueueRemove": {
          this.run.targetQueue ??= [];
          this.run.targetQueue = this.run.targetQueue.filter((id) => id !== cmd.id);
          this.run.focusTargetId = this.run.targetQueue[0];
          this.bus.emit("changed", undefined);
          break;
        }
        case "targetQueueClear": {
          this.run.targetQueue = [];
          this.run.focusTargetId = undefined;
          this.bus.emit("notice", "Fila de alvos limpa.");
          this.bus.emit("changed", undefined);
          break;
        }
        case "commandSelection": {
          this.run.commandSelection = [...new Set(cmd.ids)].filter(id => this.run.party.some(m => m.id === id && m.alive));
          this.bus.emit("changed", undefined);
          break;
        }
        case "ping": {
          const pingColors: Record<string, number> = {
            "attack-here": 0xe56754,
            "move-here": 0x82b27a,
            "defend-here": 0x7fa2c7,
            danger: 0xdf8445,
            "regroup-here": 0xd8c278,
            investigate: 0xb5a0d0,
            "clear-targets": 0xc0baa0,
            marker: 0xdfa058,
          };
          this.fx(cmd.point, "ring", pingColors[cmd.kind] ?? 0xd8c278, 1.2, 1.2);
          if (cmd.kind === "attack-here") {
            const enemy = this.nearestEnemy(cmd.point, 2.5);
            if (enemy) {
              this.run.targetQueue = [enemy.id, ...(this.run.targetQueue ?? []).filter(id => id !== enemy.id)].slice(0,balance.targetQueueLimit);
              this.run.focusTargetId = enemy.id;
              for (const member of this.commandMembers()) this.command({type:"memberOrder",memberId:member.id,order:"focus"});
            } else {
              this.orderMove(this.commandMembers(), cmd.point, "attack");
            }
          } else if (cmd.kind === "move-here") {
            this.command({ type: "move", point: cmd.point });
          } else if (cmd.kind === "defend-here") {
            this.orderMove(this.commandMembers(), cmd.point, "defend");
            this.bus.emit("notice", "Defender a área por 12 segundos.");
          } else if (cmd.kind === "regroup-here") {
            this.orderMove(this.commandMembers(), cmd.point);
            this.bus.emit("notice", "Reagrupando na posição...");
          } else if (cmd.kind === "clear-targets") {
            this.command({ type: "targetQueueClear" });
          } else if (cmd.kind === "marker") {
            this.run.marker = {...cmd.point};
            void this.save();
            this.bus.emit("notice", "Marcador pessoal adicionado ao atlas.");
          } else if (cmd.kind === "investigate") {
            const poi = [...this.world.chunks.values()].flatMap(ch=>ch.pois).filter(p=>distance(p,cmd.point)<3).sort((a,b)=>distance(a,cmd.point)-distance(b,cmd.point))[0];
            if(poi) this.orderMove(this.commandMembers(), poi, "investigate", poi.id);
            this.bus.emit("notice", poi ? "A caminho da interação." : "Área marcada para investigar.");
          }
          break;
        }
        case "stat": {
          const targetChar =
            (cmd.memberId
              ? this.run.party.find((m) => m.id === cmd.memberId)
              : undefined) ?? this.selected;
          if (targetChar && (targetChar.statPoints ?? 0) > 0) {
            targetChar.statPoints = (targetChar.statPoints ?? 0) - 1;
            targetChar.allocatedStats ??= {
              vitality: 0,
              armor: 0,
              speed: 0,
              mana: 0,
              luck: 0,
              charisma: 0,
            };
            targetChar.allocatedStats[cmd.stat] =
              (targetChar.allocatedStats[cmd.stat] ?? 0) + 1;
            if (cmd.stat === "vitality") {
              targetChar.hp = Math.min(
                targetChar.hp,
                statsFor(targetChar).health,
              );
            }
          }
          break;
        }
        case "interact":
          this.interact(cmd.id);
          break;
        case "equip":
          this.shop.equip(cmd.id);
          break;
        case "unequip":
          this.shop.unequip(cmd.slot);
          break;
        case "jewel":
          this.shop.jewel(cmd.id);
          break;
        case "unjewel": {
          const i = c.jewels.indexOf(cmd.id);
          if (i >= 0) {
            c.jewels.splice(i, 1);
            this.run.jewels.push(cmd.id);
            c.hp = Math.min(c.hp, statsFor(c).health);
          }
          break;
        }
        case "buy":
          this.shop.buy(cmd.id);
          break;
        case "sell":
          this.shop.sell(cmd.id);
          break;
        case "unlock":
          this.shop.unlock(cmd.classId);
          break;
        case "recruit":
          this.shop.recruit(cmd.classId);
          break;
        case "mastery":
          if (c.points > 0) {
            c.points--;
            c.mastery++;
          }
          break;
        case "passive":
          if (
            c.points > 0 &&
            !c.passives.includes(cmd.id) &&
            classRegistry[c.classId].passives.includes(cmd.id)
          ) {
            c.points--;
            c.passives.push(cmd.id);
          }
          break;
      }
      this.bus.emit("changed", undefined);
      if (
        [
          "equip",
          "unequip",
          "jewel",
          "unjewel",
          "buy",
          "sell",
          "unlock",
          "recruit",
          "mastery",
          "passive",
        ].includes(cmd.type)
      )
        void this.save();
    } catch (e) {
      this.bus.emit("notice", e instanceof Error ? e.message : String(e));
    }
  }
  canInteract(poi: Poi) {
    return poi.kind === "merchant" || !this.run.deltas[poi.id] ||
      (poi.kind === "shrine" && this.run.party.some(c => !c.alive));
  }
  interact(id: string, actor = this.selected) {
    const poi = [...this.world.chunks.values()]
      .flatMap((c) => c.pois)
      .find((p) => p.id === id);
    if (!poi || !actor.alive || !this.canInteract(poi)) return;
    if (distance(actor, poi) > 1.7) {
      this.meta.tutorials.move = true;
      this.pendingInteraction = undefined;
      this.orderMove([actor], poi, "investigate", id);
      this.bus.emit("notice", "A caminho do ponto de interesse…");
      return;
    }
    this.pendingInteraction = undefined;
    this.orders.delete(actor.id);
    actor.path = [];
    if (poi.kind === "merchant") {
      this.shop.active = id;
      this.paused = true;
      this.bus.emit("shop", id);
      return;
    }
    if (poi.kind === "shrine") {
      const deadMembers = this.run.party.filter((c) => !c.alive);
      const reviveCost = balance.reviveSilver ?? 25;
      if (deadMembers.length > 0) {
        if (this.meta.silver >= reviveCost) {
          const toRevive = deadMembers[0];
          this.meta.silver -= reviveCost;
          toRevive.alive = true;
          toRevive.hp = Math.round(statsFor(toRevive).health * 0.6);
          toRevive.x = this.selected.x + (Math.random() - 0.5) * 1.5;
          toRevive.y = this.selected.y + (Math.random() - 0.5) * 1.5;
          toRevive.path = [];
          this.fx(poi, "heal", 0x82b27a, 1.2, 5);
          this.bus.emit("notice", `${toRevive.name} foi revivido pelo santuário (${reviveCost} moedas).`);
          this.bus.emit("audio", "pickup");
          this.bus.emit("changed", undefined);
          void this.save();
        } else {
          this.bus.emit("notice", `Moedas insuficientes para reviver ${deadMembers[0].name} (Necessário: ${reviveCost} moedas).`);
        }
        return;
      }
      if (this.run.deltas[id]) {
        this.bus.emit("notice", "As bênçãos deste santuário já foram consumidas.");
        return;
      }
      this.run.deltas[id] = true;
      for (const c of this.run.party) if (c.alive) c.hp = statsFor(c).health;
      this.fx(poi, "heal", 0xd3e1b0, 0.7, 3);
      this.bus.emit("notice", "O santuário restaurou a vida do grupo.");
      void this.save();
      return;
    }
    if (this.run.deltas[id]) return;
    this.run.deltas[id] = true;
      this.run.drops.push(
        {
          ...poi,
          id: id + ":item",
          kind: "item",
          amount: 1,
          item: generateItem(
            this.run.seed + ":" + id,
            Math.max(1, this.selected.level),
            undefined,
            2,
          ),
        },
        { ...poi, id: id + ":jewel", kind: "jewel", amount: 1, jewel: "fire" },
        { ...poi, id: id + ":gold", kind: "gold", amount: 1 },
      );
      this.bus.emit(
        "notice",
        "Um achado entre as cinzas. Aproxime-se para recolher.",
      );
    void this.save();
  }
  update(realDt: number) {
    if (this.run.ended || this.paused) return;
    const dt = Math.min(realDt, 0.06) * (this.tactical ? 0 : this.debugOptions.timeScale);
    this.run.stats.seconds += dt;
    for (const c of this.run.party)
      if (c.alive) {
        if(this.debugOptions.noCooldowns)c.cooldowns={};
        if(this.debugOptions.unlimitedResource)c.resource=100;
        c.attackTime = Math.max(0, c.attackTime - dt);
        for (const id of Object.keys(c.cooldowns))
          c.cooldowns[id] = Math.max(0, c.cooldowns[id] - dt);
        c.resource = Math.min(100, c.resource + statsFor(c).regen * dt);
        this.combat.statuses(c, dt);
      }
    for (const enemy of this.enemies.values()) {
      enemy.attackTime -= dt;
      this.combat.statuses(enemy, dt);
      if (enemy.elite && enemy.modifier === "regenerating")
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + dt * 1.5);
    }
    if (!this.tactical) {
      for (const [id, task] of this.orders) {
        const member = this.run.party.find(m=>m.id===id && m.alive);
        task.remaining -= dt;
        if(!member || task.remaining<=0){if(member)member.target=undefined;this.orders.delete(id);continue;}
        if(task.kind==="investigate" && task.poi){const poi=[...this.world.chunks.values()].flatMap(ch=>ch.pois).find(p=>p.id===task.poi);if(poi && distance(member,poi)<=1.7){this.orders.delete(id);this.interact(poi.id,member);continue;}}
        if(task.kind==="attack" && !member.path.length){const enemy=this.nearestEnemy(task.point,5);if(enemy){member.target=enemy.id;if(distance(member,enemy)>classRegistry[member.classId].range)this.approach(member,enemy,classRegistry[member.classId].range);else this.combat.cast(member,-1);}continue;}
        if(task.kind==="defend" && !member.path.length){const enemy=this.nearestEnemy(member,classRegistry[member.classId].range);member.target=enemy?.id;if(enemy)this.combat.cast(member,-1);continue;}
        if(task.kind==="move" && !member.path.length) this.orders.delete(id);
      }
      tickAI(this, dt);
      const c = this.selected,
        t = this.enemies.get(c.target ?? "");
      if (t && this.orders.get(c.id)?.kind !== "defend") {
        if (distance(c, t) > classRegistry[c.classId].range) {
          c.aiTime -= dt;
          if (c.aiTime <= 0) {
            this.approach(c, t, classRegistry[c.classId].range);
            c.aiTime = 0.16;
          }
        } else {
          c.path = [];
          this.combat.cast(c, -1);
        }
      }
      moveEntities(this, dt);
      this.combat.update(dt);
      this.targeting.update(dt);
      this.pickup();

      // Invalidate dead or removed targets in targetQueue
      if (this.run.targetQueue && this.run.targetQueue.length > 0) {
        const prevPrimary = this.run.targetQueue[0];
        this.run.targetQueue = this.run.targetQueue.filter((id) => {
          const en = this.enemies.get(id);
          if (en) {
            this.missingTargets.delete(id);
            if (en.hp <= 0) return false;
            const state = this.unreachableTargets.get(id) ?? {elapsed:0, probe:0, blocked:false};
            state.probe -= dt;
            if (state.probe <= 0) {
              state.probe = 1;
              // Only classify nearby loaded targets; distant targets may need new chunks.
              state.blocked = distance(this.selected, en) < 20 &&
                !lineWalkable(this.selected, en, this.world.cell) &&
                findPath(this.selected, en, this.world.cell).length === 0;
            }
            state.elapsed = state.blocked ? state.elapsed + dt : 0;
            this.unreachableTargets.set(id, state);
            return state.elapsed < balance.targetMissingGrace;
          }
          if(this.run.deltas[id])return false;
          const missing=(this.missingTargets.get(id)??0)+dt;this.missingTargets.set(id,missing);return missing<balance.targetMissingGrace;
        });
        const newPrimary = this.run.targetQueue[0];
        for (const id of this.missingTargets.keys()) if (!this.run.targetQueue.includes(id)) this.missingTargets.delete(id);
        for (const id of this.unreachableTargets.keys()) if (!this.run.targetQueue.includes(id)) this.unreachableTargets.delete(id);
        if (newPrimary !== prevPrimary) {
          this.run.focusTargetId = newPrimary;
          this.bus.emit("changed", undefined);
        }
      }
    }
    for (const f of this.effects) f.remaining -= realDt;
    this.effects = this.effects.filter((f) => f.remaining > 0);
    this.world.update(this.selected);
    if (this.pendingInteraction) {
      const p = [...this.world.chunks.values()]
        .flatMap((c) => c.pois)
        .find((p) => p.id === this.pendingInteraction);
      if (p && distance(p, this.selected) <= 1.7) this.interact(p.id);
    }
    const disc = this.discoveryMask.discoverAround(
      this.selected.x,
      this.selected.y,
    );
    if (disc.cellCount > 0) {
      for (const key of disc.newlyTouchedChunks) {
        if (!this.run.discovered.includes(key)) {
          this.run.discovered.push(key);
          const discovered = this.world.chunks.get(key);
          if (discovered)
            this.run.cartography![key] = summarizeChunk(discovered);
        }
      }
      this.run.discoveryMask = this.discoveryMask.serialize();
      this.saveTime = balance.autosave;
    }
    const biome = sampleBiome(this.run.seed, this.selected.x, this.selected.y);
    const dangerLvl = regionLevel(this.selected.x, this.selected.y);
    if (
      dangerLvl >= this.selected.level + 4 &&
      this.lastDangerLevel !== dangerLvl
    ) {
      this.lastDangerLevel = dangerLvl;
      this.bus.emit("notice", "Terras perigosas — nível " + dangerLvl);
    }
    if (!this.run.stats.biomes.includes(biome))
      this.run.stats.biomes.push(biome);
    this.run.stats.distance = Math.max(
      this.run.stats.distance,
      Math.hypot(this.selected.x, this.selected.y),
    );
    this.run.rng = this.random.state;
    this.changedTime += realDt;
    this.saveTime += realDt;
    if (this.changedTime > 0.15) {
      this.changedTime = 0;
      this.bus.emit("changed", undefined);
    }
    if (this.saveTime > balance.autosave) {
      this.saveTime = 0;
      void this.save();
    }
  }
  pickup() {
    let changed = false;
    this.run.drops = this.run.drops.filter((drop) => {
      if (
        !this.run.party.some(
          (c) => c.alive && distance(c, drop) < balance.pickupRadius,
        )
      )
        return true;
      if (drop.kind === "item") {
        if (this.run.inventory.length >= balance.inventorySize) {
          this.bus.emit("notice", "Mochila cheia");
          return true;
        }
        if (drop.item) {
          this.run.inventory.push(drop.item);
          this.bus.emit("lootAcquired", {
            kind: "item",
            item: drop.item,
            amount: 1,
          });
        }
        this.bus.emit("audio", "pickup");
      } else if (drop.kind === "jewel") {
        if (drop.jewel) {
          this.run.jewels.push(drop.jewel);
          this.bus.emit("lootAcquired", {
            kind: "jewel",
            jewel: drop.jewel,
            amount: 1,
          });
        }
        this.bus.emit("audio", "pickup");
      } else {
        this.bus.emit("audio", "coin");
        this.bus.emit("currency", {
          x: drop.x,
          y: drop.y,
          kind: drop.kind,
          amount: drop.amount,
        });
        this.bus.emit("lootAcquired", {
          kind: drop.kind,
          amount: drop.amount,
        });
        this.meta[drop.kind] += drop.amount;
        this.run.stats[drop.kind] += drop.amount;
      }
      this.fx(
        drop,
        "heal",
        0xd8c28e,
        0.5,
        0.5,
        undefined,
        drop.kind === "silver"
          ? "+ " + drop.amount + " prata"
          : drop.kind === "gold"
            ? "+ " + drop.amount + " ouro"
            : drop.kind === "jewel"
              ? "◆ Joia encontrada"
              : "◇ Equipamento",
      );
      changed = true;
      return false;
    });
    if (changed) {
      if (!this.meta.tutorials.inventory && this.run.inventory.length)
        this.bus.emit("notice", "Um achado na mochila · I para examinar");
      void this.save();
    }
  }
  enemyDied(enemy: Enemy, source: string) {
    if (!this.enemies.has(enemy.id)) return;
    this.enemies.delete(enemy.id);
    this.run.deltas[enemy.id] = true;
    this.run.stats.kills++;
    this.meta.statistics.kills++;
    for (const c of this.run.party)
      if (c.alive && distance(c, enemy) < 16) {
        const levels = addExperience(
          c,
          Math.round(
            (enemy.elite ? 85 : 34) * enemy.level * (source === c.id ? 1.1 : 1),
          ),
        );
        if (levels) {
          this.fx(c, "heal", 0xe5d4a0, 1, 2, undefined, "NÍVEL " + c.level);
          this.bus.emit("level:up", c.id);
          this.bus.emit(
            "notice",
            `${c.name} · Nível ${c.level} · +${levels} ponto(s) de atributo e +${levels} de habilidade`,
          );
        }
        this.run.stats.highestLevel = Math.max(
          this.run.stats.highestLevel,
          c.level,
        );
      }
    this.run.drops.push(
      ...rollEnemyLoot(
        enemy,
        this.run.seed,
        this.random,
        coinMultiplier(this.run.party, enemy),
      ),
    );
    this.run.drops = mergeCoins(this.run.drops);
    this.fx(enemy, "death", 0xd5c6a0, 0.5, 1.2);
    this.bus.emit("enemy:killed", enemy.id);
    void this.save();
  }
  die(c: Character) {
    killCharacter(this.run, c.id);
    this.fx(c, "death", 0xcdbca1, 1, 2);
    for (const item of Object.values(c.equipment))
      if (item)
        this.run.drops.push({
          id: "corpse:" + this.nextId(),
          x: c.x,
          y: c.y,
          kind: "item",
          amount: 1,
          item,
        });
    c.equipment = {};
    for (const jewel of c.jewels)
      this.run.drops.push({
        id: "corpse:" + this.nextId(),
        x: c.x,
        y: c.y,
        kind: "jewel",
        amount: 1,
        jewel,
      });
    c.jewels = [];
    this.bus.emit("character:died", c.id);
    this.bus.emit(
      "notice",
      c.name + " caiu. Seus achados permanecem no local.",
    );
    if (this.run.ended) this.bus.emit("run:ended", undefined);
    void this.save();
  }
  async save() {
    if(this.sandboxActive){this.saveStatus="Sandbox · não salvo";return;}
    this.run.rng = this.random.state;
    this.saveStatus = "Salvando…";
    try {
      await this.persist();
      this.saveStatus = this.sandboxActive ? "Sandbox · não salvo" : "Salvo";
      this.bus.emit("save", this.saveStatus);
    } catch {
      this.saveStatus = "Erro ao salvar";
      this.bus.emit(
        "notice",
        "Não foi possível salvar. Mantenha esta aba aberta e tente novamente.",
      );
      this.bus.emit("save", this.saveStatus);
    }
  }
  destroy() {
    this.disposed = true;
    this.off();
    this.world.destroy();
  }
}
