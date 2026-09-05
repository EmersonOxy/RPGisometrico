import { InputBuffer } from "./InputBuffer";
import type { Character, Enemy, Point, StatusId } from "../core/types";
import type { Engine } from "../core/Engine";
import { abilityRegistry, type AbilityDefinition } from "../data/abilities";
import { classRegistry } from "../data/classes";
import { activeAbilities, statsFor } from "../progression/Character";
import { jewelRegistry } from "../data/jewels";
import { distance } from "../world/WorldCoordinates";
import { lineWalkable } from "../world/navigation/AStar";
import { applyStatus, armorFor, mitigatedDamage } from "./DamageSystem";
interface Cast {
  slot: number;
  c: Character;
  a: AbilityDefinition;
  point: Point;
  target?: string;
  remaining: number;
}
export class CombatSystem {
  readonly buffer = new InputBuffer();
  private recovery = new Map<
    string,
    { remaining: number; cancelable: boolean }
  >();
  private casts: Cast[] = [];
  constructor(private e: Engine) {}
  ability(c: Character, slot: number) {
    return abilityRegistry[
      slot < 0 ? classRegistry[c.classId].basic : activeAbilities(c)[slot]
    ];
  }
  availability(c: Character, slot: number) {
    const a = this.ability(c, slot);
    if (!a || c.level < a.level) return "locked";
    if (c.resource < a.cost) return "resource";
    if ((c.cooldowns[a.id] ?? 0) > 0) return "cooldown";
    if (a.target === "TARGET" && slot >= 0) {
      const t =
        this.e.enemies.get(c.target ?? "") ?? this.e.nearestEnemy(c, a.range);
      if (!t) return "target";
      if (distance(c, t) > a.range + 0.4) return "range";
      if (!lineWalkable(c, t, this.e.world.cell)) return "blocked";
    }
    return "ready";
  }
  request(c: Character, slot: number, point?: Point) {
    if (this.cast(c, slot, point)) return true;
    const a = this.ability(c, slot);
    if (!a) return false;
    const wait =
      this.casts.find((x) => x.c.id === c.id)?.remaining ??
      this.recovery.get(c.id)?.remaining ??
      c.cooldowns[a.id] ??
      0;
    if (wait > 0 && wait <= a.inputBufferWindow) {
      this.buffer.put(c.id, slot, point, a.inputBufferWindow);
      return true;
    }
    const reason = this.availability(c, slot),
      messages: Record<string, string> = {
        range: "Fora de alcance — aproxime-se do alvo.",
        target: "Escolha um inimigo ao alcance.",
        resource: "Recurso insuficiente.",
        cooldown: "Habilidade em recarga.",
        locked: "Habilidade bloqueada.",
        blocked: "O caminho até o alvo está obstruído.",
        ready: "Ação em andamento.",
      };
    this.e.bus.emit("notice", messages[reason]);
    return false;
  }
  cancelForMove(c: Character) {
    this.buffer.clear();
    const state = this.recovery.get(c.id);
    if (state?.cancelable) this.recovery.delete(c.id);
  }
  face(c: Character, p: Point) {
    const cast = this.casts.find((x) => x.c.id === c.id);
    if (cast && cast.a.canRotateDuringCast) {
      c.facing = p.x >= c.x ? 1 : -1;
      c.facingAngle = Math.atan2(p.y - c.y, p.x - c.x);
    }
  }
  movementLocked(id: string) {
    return this.casts.some((x) => x.c.id === id && !x.a.canMoveDuringCast);
  }
  castingSlot(id: string) {
    return this.casts.find(x => x.c.id === id)?.slot;
  }
  cast(c: Character, slot: number, point?: Point) {
    if (
      !c.alive ||
      c.statuses.some((s) => s.id === "stun") ||
      this.casts.some((x) => x.c.id === c.id) ||
      this.recovery.has(c.id)
    )
      return false;
    const id =
        slot < 0 ? classRegistry[c.classId].basic : activeAbilities(c)[slot],
      a = abilityRegistry[id];
    if (
      !a ||
      c.level < a.level ||
      (c.cooldowns[id] ?? 0) > 0 ||
      c.resource < a.cost
    )
      return false;
    const t =
        this.e.enemies.get(c.target ?? "") ?? (slot < 0 && point ? undefined : this.e.nearestEnemy(c, a.range)),
      p = point ?? t ?? { x: c.x + c.facing * 2, y: c.y };
    if (slot >= 0 && a.target === "TARGET" && (!t || distance(c, t) > a.range + 0.4))
      return false;
    if (a.target === "TARGET" && t && !lineWalkable(c, t, this.e.world.cell))
      return false;
    if (!a.canMoveDuringCast) c.path = [];
    c.resource -= a.cost;
    c.cooldowns[id] =
      a.cooldown *
      (1 - Math.min(0.65, statsFor(c).cooldown)) *
      (c.statuses.some((s) => s.id === "fury") ? 0.7 : 1);
    c.attackTime = a.windup + a.activeTime + a.recovery;
    c.facing = p.x >= c.x ? 1 : -1;
    c.facingAngle = Math.atan2(p.y - c.y, p.x - c.x);
    this.casts.push({
      slot,
      c,
      a,
      point: { x: p.x, y: p.y },
      target: t?.id,
      remaining: a.windup,
    });
    if (slot >= 0) this.e.bus.emit("audio", "cast");
    this.e.fx(c, "ring", a.color, 0.16, 0.6);
    return true;
  }
  update(dt: number) {
    this.buffer.tick(dt);
    for (const [id, state] of this.recovery) {
      state.remaining -= dt;
      if (state.remaining <= 0) this.recovery.delete(id);
    }
    this.casts = this.casts.filter(cast => cast.c.alive && !cast.c.statuses.some(s => s.id === "stun" && s.remaining > 0));
    for (const cast of this.casts) cast.remaining -= dt;
    const ready = this.casts.filter((c) => c.remaining <= 0);
    this.casts = this.casts.filter((c) => c.remaining > 0);
    for (const cast of ready)
      if (cast.c.alive) {
        this.execute(cast);
        this.recovery.set(cast.c.id, {
          remaining: Math.max(
            0,
            cast.a.activeTime + cast.a.recovery + cast.remaining,
          ),
          cancelable: cast.a.canCancelRecovery,
        });
      }
    const queued = this.buffer.action;
    if (queued) {
      const c = this.e.run.party.find((c) => c.id === queued.character);
      if (c && this.cast(c, queued.slot, queued.point)) this.buffer.clear();
    }
    for (const p of this.e.projectiles) {
      p.remaining -= dt;
      const d = distance(p, p.target),
        step = p.speed * dt;
      if (d < step || d < 0.1) {
        p.remaining = 0;
      } else {
        p.x += ((p.target.x - p.x) / d) * step;
        p.y += ((p.target.y - p.y) / d) * step;
      }
      if (this.e.world.cell(Math.floor(p.x), Math.floor(p.y)).blocked) {
        p.remaining = 0;
        continue;
      }
      const targets = p.friendly
        ? [...this.e.enemies.values()]
        : this.e.run.party.filter((c) => c.alive);
      for (const t of targets) {
        if (!p.hit.includes(t.id) && distance(p, t) < 0.7) {
          this.hit(p.source, t, p.damage, p.status, p.color);
          p.hit.push(t.id);
          if (!p.pierce) { p.remaining = 0; break; }
        }
      }
    }
    this.e.projectiles = this.e.projectiles.filter((p) => p.remaining > 0);
    for (const h of this.e.hazards) {
      h.remaining -= dt;
      if (h.remaining <= 0) {
        const targets = h.friendly
          ? [...this.e.enemies.values()]
          : this.e.run.party.filter((c) => c.alive);
        for (const t of targets)
          if (distance(t, h) < h.radius)
            this.hit(h.source, t, h.damage, h.status, 0xe3a76c);
        this.e.fx(h, "ring", h.friendly ? 0xc7dca2 : 0xe89472, 0.4, h.radius);
      }
    }
    this.e.hazards = this.e.hazards.filter((h) => h.remaining > 0);
  }
  private execute({ c, a, point, target }: Cast) {
    const stats = statsFor(c),
      damage =
        stats.damage *
        a.damage *
        (a.tags.includes("FIRE") ? 1 + stats.fire : 1);
    let status = a.status;
    for (const id of c.jewels)
      status ??= jewelRegistry[id]?.effectsByClass[c.classId]?.status;
    const t = this.e.enemies.get(target ?? "");
    switch (a.handler) {
      case "melee":
        if (t && distance(c, t) <= a.range + 0.5) {
          this.hit(c.id, t, damage, status, a.color);
          this.e.fx(t, "slash", a.color, 0.25, 1);
        } else if (!t) {
          const dx=point.x-c.x,dy=point.y-c.y,length=Math.hypot(dx,dy)||1;
          for(const enemy of this.e.enemies.values()){
            const d=distance(c,enemy);
            if(d<=a.range && ((enemy.x-c.x)*dx+(enemy.y-c.y)*dy)/(length*(d||1))>.45) this.hit(c.id,enemy,damage,status,a.color);
          }
          this.e.fx({x:c.x+dx/length,y:c.y+dy/length},"slash",a.color,.25,1);
        }
        break;
      case "projectile":
        for (let i = 0; i < (a.count ?? 1); i++) {
          const dx = point.x - c.x,
            dy = point.y - c.y,
            d = Math.hypot(dx, dy) || 1;
          this.e.projectiles.push({
            id: this.e.nextId(),
            x: c.x - (dx / d) * i * 0.45,
            y: c.y - (dy / d) * i * 0.45,
            source: c.id,
            target: {
              x: c.x + (dx / d) * a.range,
              y: c.y + (dy / d) * a.range,
            },
            speed: 12,
            damage,
            friendly: true,
            pierce: !!a.pierce,
            hit: [],
            remaining: 2,
            color: a.color,
            status,
          });
        }
        break;
      case "area":
        for (const enemy of this.e.enemies.values())
          if (distance(c, enemy) < a.range)
            this.hit(c.id, enemy, damage, status, a.color);
        this.e.fx(c, "ring", a.color, 0.4, a.range);
        break;
      case "dash": {
        let dx = point.x - c.x,
          dy = point.y - c.y,
          d = Math.hypot(dx, dy) || 1;
        const sign = a.id === "retreat" ? -1 : 1,
          steps = Math.ceil(Math.min(a.range, d) * 8);
        for (let i = 0; i < steps; i++) {
          const next = {
            x: c.x + (dx / d) * 0.125 * sign,
            y: c.y + (dy / d) * 0.125 * sign,
          };
          if (!lineWalkable(c, next, this.e.world.cell)) break;
          c.x = next.x;
          c.y = next.y;
          for (const enemy of this.e.enemies.values())
            if (damage && distance(c, enemy) < 1.1) {
              this.hit(c.id, enemy, damage, "stun", a.color);
              i = steps;
              break;
            }
        }
        c.path = [];
        this.e.fx(c, "ring", a.color, 0.35, 1.3);
        break;
      }
      case "buff":
        if (a.status) applyStatus(c, a.status, c.id, 0, a.duration);
        break;
      case "protect":
        for (const ally of this.e.run.party)
          if (ally.alive && distance(c, ally) < a.range)
            applyStatus(ally, "guard", c.id, 0, a.duration);
        this.e.fx(c, "ring", 0xc4d4b0, 0.5, a.range);
        break;
      case "taunt":
        for (const enemy of this.e.enemies.values())
          if (distance(c, enemy) < a.range) {
            enemy.threat[c.id] = (enemy.threat[c.id] ?? 0) + 200;
            enemy.target = c.id;
          }
        this.e.fx(c, "ring", 0xd9bd85, 0.5, a.range);
        break;
      case "chain": {
        let last: Point = c;
        const hit = new Set<string>();
        for (let i = 0; i < (a.count ?? 4); i++) {
          const enemy = [...this.e.enemies.values()]
            .filter((t) => !hit.has(t.id) && distance(last, t) < a.range)
            .sort((x, y) => distance(last, x) - distance(last, y))[0];
          if (!enemy) break;
          this.e.fx(last, "projectile", a.color, 0.3, 1, enemy);
          this.hit(c.id, enemy, damage * (1 - i * 0.12), status, a.color);
          hit.add(enemy.id);
          last = enemy;
        }
        break;
      }
      case "trap": {
        const d = distance(c, point),
          p =
            d > a.range
              ? {
                  x: c.x + ((point.x - c.x) / d) * a.range,
                  y: c.y + ((point.y - c.y) / d) * a.range,
                }
              : point;
        this.e.hazards.push({
          ...p,
          id: this.e.nextId(),
          remaining: 1.1,
          radius: 2,
          damage,
          source: c.id,
          friendly: true,
          status,
        });
        break;
      }
    }
  }
  hit(
    source: string,
    target: Character | Enemy,
    base: number,
    status?: StatusId,
    color = 0xe8c692,
    periodic = false,
  ) {
    if (target.hp <= 0) return;
    if (this.e.debugOptions.godMode && "classId" in target) return;
    const attacker = this.e.run.party.find((c) => c.id === source),
      critical = !!attacker && this.e.random.next() < statsFor(attacker).crit;
    const thermalShock = !periodic && !!attacker && !("classId" in target) &&
      target.statuses.some(s => s.remaining > 0 &&
        ((status === "burn" && s.id === "slow") || (status === "slow" && s.id === "burn")));
    const n = mitigatedDamage(
      base * (thermalShock ? 1.35 : 1),
      armorFor(target),
      target.statuses.some((s) => s.id === "guard"),
      critical,
    );
    target.hp = Math.max(0, target.hp - n);
    if (thermalShock) {
      target.statuses = target.statuses.filter(s => s.id !== "burn" && s.id !== "slow");
      applyStatus(target, "armorBreak", source, 0, 2);
      this.e.fx(target, "ring", 0xbdeafa, 0.7, 1.1, undefined, "Choque térmico");
    } else if (status)
      applyStatus(
        target,
        status,
        source,
        base * 0.17,
        status === "stun" ? 0.8 : 4,
      );
    this.e.fx(
      target,
      "hit",
      color,
      0.35,
      0.7,
      undefined,
      (critical ? "✦ " : "") + n,
    );
    if ("threat" in target)
      target.threat[source] = (target.threat[source] ?? 0) + n;
    else {
      for (const tank of this.e.run.party)
        if (tank.alive && tank.classId === "tank" && distance(tank, target) < 7)
          tank.resource = Math.min(100, tank.resource + 2);
    }
    if (target.hp <= 0) {
      if ("classId" in target) this.e.die(target);
      else this.e.enemyDied(target, source);
    }
  }
  statuses(target: Character | Enemy, dt: number) {
    for (const s of target.statuses) {
      s.remaining -= dt;
      s.tick += dt;
      if (s.id === "burn" && s.tick >= 1) {
        s.tick -= 1;
        this.hit(s.source, target, s.power, undefined, 0xee9a66, true);
      }
    }
    target.statuses = target.statuses.filter((s) => s.remaining > 0);
  }
}
