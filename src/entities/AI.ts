import type { Engine } from "../core/Engine";
import { enemyRegistry } from "../data/enemies";
import { classRegistry } from "../data/classes";
import { distance } from "../world/WorldCoordinates";
import { statsFor } from "../progression/Character";
import { difficultyRegistry, populationBalance, defaultWorldSettings } from "../data/worldSettings";
import { SeededRandom } from "../utils/SeededRandom";
import { lineWalkable } from "../world/navigation/AStar";
import { isStunned } from "../combat/DamageSystem";
export function tickAI(e: Engine, dt: number) {
  const leader = e.selected;
  for (const c of e.run.party) {
    if (!c.alive || c.id === leader.id) continue;
    if (e.orders.has(c.id)) continue;
    c.aiTime -= dt;
    if (c.aiTime > 0) continue;
    c.aiTime = 0.4;
    const gap = distance(c, leader);
    const order = c.partyOrder ?? e.run.command;
    if (order === "hold") continue;
    if (gap > 18) {
      e.move(c, { x: leader.x + 1, y: leader.y });
      continue;
    }
    let foe: import("../core/types").Enemy | undefined;
    if (order === "focus") {
      let focusId = e.run.focusTargetId ?? leader.target ?? "";
      foe = e.enemies.get(focusId);
      if (focusId && !foe && e.run.targetQueue?.includes(focusId) && !e.run.deltas[focusId]) continue;
      if (!foe || foe.hp <= 0) {
        const nextInQueue = (e.run.targetQueue ?? []).find((id) => {
          const en = e.enemies.get(id);
          return en && en.hp > 0;
        });
        if (nextInQueue) {
          e.run.focusTargetId = nextInQueue;
          foe = e.enemies.get(nextInQueue);
        } else {
          foe = e.nearestEnemy(c, 7);
        }
      }
    } else if (order === "aggressive") {
      const focusId = e.run.focusTargetId;
      const focusFoe = focusId ? e.enemies.get(focusId) : undefined;
      if (focusFoe && focusFoe.hp > 0 && distance(c, focusFoe) < 14) {
        foe = focusFoe;
      } else {
        foe = e.nearestEnemy(c, 12);
      }
    } else if (order === "passive") {
      foe = undefined;
    } else {
      // follow
      foe = e.nearestEnemy(c, 6.5);
    }

    const maxLeash = order === "aggressive" ? 22 : 16;
    if (
      foe &&
      foe.hp > 0 &&
      gap < maxLeash &&
      (order !== "passive" || distance(c, foe) < 4)
    ) {
      c.target = foe.id;
      if (distance(c, foe) > classRegistry[c.classId].range)
        e.approach(c, foe, classRegistry[c.classId].range);
      else {
        c.path = [];
        const slots=[0,1,2,3].filter(slot=>e.combat.availability(c,slot)==="ready");
        if (!slots.some(slot=>e.combat.cast(c,slot,foe)))
          e.combat.cast(c, -1);
      }
    } else {
      c.target = undefined;
      const index = e.run.party.indexOf(c),
        p = {
          x: leader.x + Math.cos(index * 2.2) * 1.8,
          y: leader.y + Math.sin(index * 2.2) * 1.8,
        };
      if (distance(c, p) > (order === "passive" ? 1.5 : 2.2)) e.move(c, p);
    }
  }
  for (const enemy of e.enemies.values()) {
    if(e.debugOptions.freezeEnemies){enemy.path=[];continue;}
    if (distance(enemy, leader) > populationBalance.activeRadius) {
      enemy.path = [];
      continue;
    }
    enemy.aiTime -= dt;
    enemy.timer -= dt;
    if (isStunned(enemy)) {
      enemy.state = "STUNNED";
      enemy.path = [];
      continue;
    }
    if (enemy.aiTime > 0) continue;
    enemy.aiTime = 0.25;
    const def = enemyRegistry[enemy.definition];
    const profile=enemy.encounterId?def.environment:undefined;
    const difficulty=difficultyRegistry[(e.run.worldSettings??defaultWorldSettings).difficulty];
    if(profile && enemy.state==="RETURN_HOME") {
      enemy.target=undefined; enemy.threat={};
      if(distance(enemy,enemy.home)>1) {if(!enemy.path.length)e.move(enemy,enemy.home);continue;}
      enemy.state="REST";enemy.alerted=false;enemy.ambientTime=profile.rest;
    }
    const party = e.run.party
      .filter(
        (c) =>
          c.alive &&
          distance(c, enemy) < (profile && enemy.target===c.id?profile.pursuit:def.aggro*difficulty.perception) &&
          Math.hypot(c.x - 4, c.y - 2) > 3.2,
      )
      .sort(
        (a, b) =>
          (enemy.threat[b.id] ?? 0) - (enemy.threat[a.id] ?? 0) ||
          distance(enemy, a) - distance(enemy, b),
      );
    let target = party[0];
    if(profile && !target && profile.assist>0) {
      const ally=[...e.enemies.values()].find(a=>a.id!==enemy.id&&a.encounterId===enemy.encounterId&&a.target&&distance(a,enemy)<profile.assist);
      const candidate=e.run.party.find(c=>c.id===ally?.target&&c.alive);
      if(candidate && distance(candidate,enemy.home)<profile.leash) target=candidate;
    }
    if (!target || distance(enemy, enemy.home) > (profile?.leash ?? 18) || (profile && distance(target,enemy.home)>profile.leash+2)) {
      const returning=!!profile && (!!enemy.target || distance(enemy,enemy.home)>profile.radius+2);
      enemy.state = returning?"RETURN_HOME":profile?.mode??"IDLE";
      enemy.target = undefined;
      if(returning) {enemy.threat={};enemy.alerted=false;e.move(enemy,enemy.home);continue;}
      if(profile) {
        enemy.ambientTime=(enemy.ambientTime??0)-.25;
        if(enemy.ambientTime<=0) {
          const r=new SeededRandom(`${e.run.seed}:${enemy.encounterId}:${enemy.id}:${enemy.ambientStep??0}`);
          enemy.ambientStep=(enemy.ambientStep??0)+1;
          enemy.ambientTime=profile.rest+r.next()*3;
          const rest=r.next()<.28;
          enemy.state=rest?"REST":profile.mode==="REST"?"WANDER":profile.mode;
          const angle=profile.mode==="PATROL"?(enemy.ambientStep%4)*Math.PI/2:r.next()*Math.PI*2;
          const p={x:enemy.home.x+Math.cos(angle)*profile.radius,y:enemy.home.y+Math.sin(angle)*profile.radius};
          // Ambient decisions never invoke A*: blocked strolls simply wait.
          enemy.path=!rest&&lineWalkable(enemy,p,e.world.cell)?[p]:[];
        }
      } else if (distance(enemy, enemy.home) > 2) e.move(enemy, enemy.home);
      continue;
    }
    if(profile && !enemy.alerted) {
      if(enemy.state!=="ALERT") {enemy.state="ALERT";enemy.timer=profile.alert*difficulty.alert;enemy.path=[];enemy.target=target.id;e.fx(enemy,"ring",0xe2c278,.5,.5,undefined,"!");}
      if(enemy.timer>0)continue;
      enemy.alerted=true;
    }
    enemy.target = target.id;
    for (const id of Object.keys(enemy.threat)) enemy.threat[id] *= 0.98;
    const d = distance(enemy, target),
      damage =
        def.damage * (1 + 0.13 * (enemy.level - 1)) * (enemy.elite ? 1.35 : 1) * difficulty.damage;
    if (enemy.state === "CAST") {
      if (enemy.timer > 0) continue;
      if (def.behavior === "charger") {
        const destination = { x: target.x, y: target.y };
        e.move(enemy, destination);
        enemy.state = "CHARGE";
        enemy.timer = 0.65;
        enemy.attackTime = 2;
        continue;
      }
    }
    if (enemy.state === "CHARGE") {
      if (d < 1.8 && enemy.timer > 0) {
        e.combat.hit(enemy.id, target, damage * 1.5, "stun");
        enemy.timer = 0;
      }
      if (enemy.timer > 0) continue;
      enemy.state = "CHASE";
      enemy.attackTime = 2.5;
    }
    if (def.behavior === "kiter" && d < 3) {
      enemy.state = "RETREAT";
      e.move(enemy, {
        x: enemy.x + ((enemy.x - target.x) / (d || 1)) * 3,
        y: enemy.y + ((enemy.y - target.y) / (d || 1)) * 3,
      });
      continue;
    }
    if (def.behavior === "charger" && d > 2 && d < 7 && enemy.attackTime <= 0) {
      enemy.state = "CAST";
      enemy.timer = 0.8;
      enemy.path = [];
      e.fx(enemy, "projectile", 0xedaa7c, 0.8, 1, target);
      continue;
    }
    if (d > def.range) {
      enemy.state = "CHASE";
      e.move(enemy, target, true);
      continue;
    }
    enemy.path = [];
    enemy.state = "ATTACK";
    if (enemy.attackTime > 0) continue;
    enemy.attackTime =
      def.behavior === "caster" ? 3 : def.behavior === "guardian" ? 1.8 : 1.3;
    if (def.behavior === "caster") {
      e.hazards.push({
        id: e.nextId(),
        x: target.x,
        y: target.y,
        remaining: 1.15,
        radius: 2,
        damage,
        source: enemy.id,
        friendly: false,
        status: "slow",
      });
      enemy.state = "CAST";
      enemy.timer = 0.6;
    } else if (def.behavior === "kiter") {
      e.projectiles.push({
        id: e.nextId(),
        x: enemy.x,
        y: enemy.y,
        source: enemy.id,
        target: { x: target.x, y: target.y },
        speed: 7,
        damage,
        friendly: false,
        pierce: false,
        hit: [],
        remaining: 2,
        color: 0xe0a57d,
      });
    } else {
      const pack =
        def.behavior === "pack"
          ? [...e.enemies.values()].filter(
              (x) =>
                x.definition === enemy.definition && distance(x, enemy) < 4,
            ).length - 1
          : 0;
      e.combat.hit(enemy.id, target, damage * (1 + Math.min(3, pack) * 0.2));
      e.fx(enemy, "slash", 0xd8b792, 0.2, 1, undefined, undefined, Math.atan2(target.y - enemy.y, target.x - enemy.x));
    }
  }
}
export function moveEntities(e: Engine, dt: number) {
  for (const c of [
    ...e.run.party.filter((c) => c.alive),
    ...e.enemies.values(),
  ]) {
    // Knockback suave: desliza com decaimento, mesmo atordoado/parado.
    if (c.knockX || c.knockY) {
      const kx = c.knockX ?? 0, ky = c.knockY ?? 0;
      const blocked = (x: number, y: number) =>
        e.world.cell(Math.floor(x), Math.floor(y)).blocked;
      const nx = c.x + kx * dt, ny = c.y + ky * dt;
      if (!blocked(nx, ny)) {
        c.x = nx;
        c.y = ny;
      } else if (!blocked(nx, c.y)) c.x = nx;
      else if (!blocked(c.x, ny)) c.y = ny;
      const decay = Math.exp(-8 * dt); // espelha CombatSystem.KNOCKBACK_DECAY
      c.knockX = kx * decay;
      c.knockY = ky * decay;
      if (Math.hypot(c.knockX, c.knockY) < 0.05) {
        c.knockX = 0;
        c.knockY = 0;
      }
    }
    if (
      isStunned(c) ||
      ("classId" in c && e.combat.movementLocked(c.id))
    )
      continue;
    const p = c.path[0];
    if (!p) continue;
    const speed =
      ("classId" in c
        ? statsFor(c).speed
        : enemyRegistry[c.definition].speed *
          (c.state === "CHARGE" ? 4 : 1) *
          (c.elite && c.modifier === "swift" ? 1.4 : 1)) *
      (c.statuses.some((s) => s.id === "slow") ? 0.5 : 1);
    const d = distance(c, p),
      step = Math.min(d, speed * dt);
    if (d < 0.06) {
      c.path.shift();
      continue;
    }
    const next = {
      x: c.x + ((p.x - c.x) / d) * step,
      y: c.y + ((p.y - c.y) / d) * step,
    };
    if (e.world.cell(Math.floor(next.x), Math.floor(next.y)).blocked) {
      c.path = [];
      continue;
    }
    if ("facing" in c) {
      c.facing = p.x >= c.x ? 1 : -1;
      const dx = p.x - c.x;
      const dy = p.y - c.y;
      if (Math.hypot(dx, dy) > 0.005) {
        c.facingAngle = Math.atan2(dy, dx);
      }
    }
    c.x = next.x;
    c.y = next.y;
  }
}
