import { InputBuffer } from "./InputBuffer";
import type { Character, Enemy, Point, StatusId } from "../core/types";
import type { Engine } from "../core/Engine";
import { abilityRegistry, type AbilityDefinition } from "../data/abilities";
import { classRegistry } from "../data/classes";
import { activeAbilities, statsFor } from "../progression/Character";
import { jewelRegistry } from "../data/jewels";
import { distance } from "../world/WorldCoordinates";
import { lineWalkable } from "../world/navigation/AStar";
import { applyStatus, armorFor, isStunned, mitigatedDamage } from "./DamageSystem";
import { effectiveAbility, hasCondition } from "../progression/SkillTree";
interface Cast {
  slot: number;
  c: Character;
  a: AbilityDefinition;
  point: Point;
  target?: string;
  remaining: number;
}
export class CombatSystem {
  /** Janela anti-spam após dano direto (DoTs periódicos passam direto). */
  static readonly HURT_IFRAMES = 0.4;
  /** Empurrão por dano direto (elites resistem metade). */
  static readonly KNOCKBACK = 0.5;
  /** Decaimento exponencial da velocidade de knockback (total ≈ KNOCKBACK). */
  static readonly KNOCKBACK_DECAY = 8;
  /** Atordoamento do knockback (< HURT_IFRAMES p/ não travar em sequência). */
  static readonly KNOCKBACK_STUN = 0.35;
  private pressure = new Map<string,{target:string;count:number;until:number}>();
  busy(id:string) { return this.casts.some(x=>x.c.id===id)||this.recovery.has(id); }
  readonly buffer = new InputBuffer();
  private recovery = new Map<
    string,
    { remaining: number; cancelable: boolean }
  >();
  private casts: Cast[] = [];
  constructor(private e: Engine) {}
  ability(c: Character, slot: number) {
    return effectiveAbility(c, slot < 0 ? classRegistry[c.classId].basic : activeAbilities(c)[slot]);
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
      isStunned(c) ||
      this.casts.some((x) => x.c.id === c.id) ||
      this.recovery.has(c.id)
    )
      return false;
    const id =
        slot < 0 ? classRegistry[c.classId].basic : activeAbilities(c)[slot],
      a = effectiveAbility(c,id);
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
    if(a.healthCost && c.hp<=statsFor(c).health*a.healthCost)return false;
    if(a.healthCost)c.hp-=statsFor(c).health*a.healthCost;
    c.combatUntil=this.e.run.stats.seconds+5;
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
    this.casts = this.casts.filter(cast => cast.c.alive && !cast.c.statuses.some(s => (s.id === "stun" || s.id === "stagger") && s.remaining > 0));
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
    if(a.selfStatus)applyStatus(c,a.selfStatus,c.id,0,a.duration??3);
    const strike=(enemy:Enemy)=>this.hit(c.id,enemy,damage*(a.executeBelow&&enemy.hp/enemy.maxHp<a.executeBelow?2:1),status,a.color);
    switch (a.handler) {
      case "melee":
        if (t && distance(c, t) <= a.range + 0.5) {
          strike(t);
          this.e.fx(t, "slash", a.color, 0.25, 1, undefined, undefined, Math.atan2(t.y - c.y, t.x - c.x));
        } else if (!t) {
          const dx=point.x-c.x,dy=point.y-c.y,length=Math.hypot(dx,dy)||1;
          for(const enemy of this.e.enemies.values()){
            const d=distance(c,enemy);
            if(d<=a.range && ((enemy.x-c.x)*dx+(enemy.y-c.y)*dy)/(length*(d||1))>.45) strike(enemy);
          }
          this.e.fx({x:c.x+dx/length,y:c.y+dy/length},"slash",a.color,.25,1,undefined,undefined,Math.atan2(dy,dx));
        }
        break;
      case "projectile":
        for (let i = 0; i < (a.count ?? 1); i++) {
          const angle=Math.atan2(point.y-c.y,point.x-c.x)+(i-((a.count??1)-1)/2)*(a.spread??0);
          const dx=Math.cos(angle),dy=Math.sin(angle),d=1;
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
          if (distance(c, enemy) < a.range && (!a.cone || Math.cos(Math.atan2(enemy.y-c.y,enemy.x-c.x)-Math.atan2(point.y-c.y,point.x-c.x))>=Math.cos(a.cone*Math.PI/360)))
            strike(enemy);
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
          if (ally.alive && distance(c, ally) < a.range) {
            applyStatus(ally, "guard", c.id, 0, a.duration);
            const heal=a.healFraction??(a.id==="protect"&&hasCondition(c,"rescue")?.06:0);
            if(heal){const amount=Math.min(statsFor(ally).health-ally.hp,statsFor(ally).health*heal);ally.hp+=amount;this.e.fx(ally,"heal",0x91d89e,.6,1,undefined,String(Math.round(amount)));}
          }
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
          remaining: a.delay ?? 1.1,
          radius: a.radius ?? 2,
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
    const now = this.e.run.stats.seconds;
    // Cooldown de dano tomado: ignora dano direto em rajada.
    if (!periodic && (target.invulnUntil ?? 0) > now) return;
    if (!periodic) target.invulnUntil = now + CombatSystem.HURT_IFRAMES;
    const attacker = this.e.run.party.find((c) => c.id === source),
      critical = !!attacker && this.e.random.next() < statsFor(attacker).crit;
    const direct=!!attacker&&!periodic;
    if(attacker)attacker.combatUntil=this.e.run.stats.seconds+5;
    if("classId" in target)target.combatUntil=this.e.run.stats.seconds+5;
    if(direct) {
      const max="classId" in target?statsFor(target).health:target.maxHp;
      if(hasCondition(attacker,"execution")&&target.hp/max<.3)base*=1.25;
      if(hasCondition(attacker,"distance")&&distance(attacker,target)>=5)base*=1.2;
      if(hasCondition(attacker,"exposed")&&target.statuses.some(s=>s.id==="slow"))base*=1.2;
      if(hasCondition(attacker,"elemental")&&target.statuses.some(s=>s.id==="burn"))base*=1.15;
    }
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
    if (!periodic && target.hp > 0) {
      const from =
        this.e.run.party.find((c) => c.id === source) ?? this.e.enemies.get(source);
      if (from && from !== target) {
        this.knockback(target, from);
        // Stagger (sem indicador): trava como stun, mas só "stun" de
        // habilidade mostra as estrelinhas. Stuns maiores prevalecem.
        const elite = !("classId" in target) && target.elite;
        applyStatus(target, "stagger", source, 0,
          elite ? CombatSystem.KNOCKBACK_STUN * 0.5 : CombatSystem.KNOCKBACK_STUN);
      }
    }
    const wasBurning=target.statuses.some(s=>s.id==="burn"&&s.remaining>0);
    if (thermalShock) {
      target.statuses = target.statuses.filter(s => s.id !== "burn" && s.id !== "slow");
      applyStatus(target, "armorBreak", source, 0, 2);
      this.e.fx(target, "ring", 0xbdeafa, 0.7, 1.1, undefined, "Choque térmico");
      if(attacker&&hasCondition(attacker,"thermalRefund")) {
        attacker.resource=Math.min(100,attacker.resource+10);
        for(const id of Object.keys(attacker.cooldowns))attacker.cooldowns[id]=Math.max(0,attacker.cooldowns[id]-2);
      }
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
      if(!periodic&&target.statuses.some(s=>s.id==="guard")) {
        if(hasCondition(target,"guardResource"))target.resource=Math.min(100,target.resource+6);
        const reflect=target.statuses.some(s=>s.id==="riposte")?.3:hasCondition(target,"guardCounter")?.15:0;
        const enemy=this.e.enemies.get(source);
        if(reflect&&enemy)this.hit(target.id,enemy,base*reflect,undefined,0xd9c389,true);
      }
      for (const tank of this.e.run.party)
        if (tank.alive && tank.classId === "tank" && distance(tank, target) < 7)
          tank.resource = Math.min(100, tank.resource + 2);
    }
    if(direct) {
      if(critical&&hasCondition(attacker,"criticalRefund"))attacker.resource=Math.min(100,attacker.resource+8);
      const leech=attacker.statuses.some(s=>s.id==="leech")?.15:hasCondition(attacker,"leech")&&attacker.hp<statsFor(attacker).health*.4?.12:0;
      if(leech)attacker.hp=Math.min(statsFor(attacker).health,attacker.hp+n*leech);
      if(hasCondition(attacker,"pressure")) {
        const old=this.pressure.get(source),same=old?.target===target.id&&old.until>=this.e.run.stats.seconds;
        const count=same?old!.count+1:1;
        this.pressure.set(source,{target:target.id,count:count%3,until:this.e.run.stats.seconds+3});
        if(count===3)applyStatus(target,"armorBreak",source,0,2);
      }
      if(target.hp<=0&&wasBurning&&hasCondition(attacker,"burnSpread")) {
        for(const other of [...this.e.enemies.values()].filter(x=>x.id!==target.id&&distance(x,target)<3).slice(0,2))applyStatus(other,"burn",source,base*.17,4);
      }
    }
    if (target.hp <= 0) {
      if ("classId" in target) this.e.die(target);
      else this.e.enemyDied(target, source);
    }
  }
  /** Aplica velocidade de knockback; o deslocamento suave acontece em moveEntities. */
  private knockback(target: Character | Enemy, from: Point) {
    const dx = target.x - from.x, dy = target.y - from.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.001) return;
    const dist = CombatSystem.KNOCKBACK * (!("classId" in target) && target.elite ? 0.5 : 1);
    target.knockX = (dx / d) * dist * CombatSystem.KNOCKBACK_DECAY;
    target.knockY = (dy / d) * dist * CombatSystem.KNOCKBACK_DECAY;
  }
  statuses(target: Character | Enemy, dt: number) {
    for (const s of target.statuses) {
      s.remaining -= dt;
      s.tick += dt;
      if ((s.id === "burn" || s.id === "bleed") && s.tick >= 1) {
        s.tick -= 1;
        this.hit(s.source, target, s.power, undefined, 0xee9a66, true);
      }
    }
    target.statuses = target.statuses.filter((s) => s.remaining > 0);
  }
}
