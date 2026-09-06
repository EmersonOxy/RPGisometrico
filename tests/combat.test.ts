import { afterEach, describe, it, expect } from "vitest";
import { Engine } from "../src/core/Engine";
import { EventBus } from "../src/core/EventBus";
import { defaultMeta } from "../src/persistence/SaveRepository";
import { newRun } from "../src/core/Run";
import { createCharacter, statsFor } from "../src/progression/Character";
import { enemyRegistry } from "../src/data/enemies";
import { tickAI, moveEntities } from "../src/entities/AI";
import { PlayerAnimation } from "../src/rendering/PlayerSprites";
import { EnemyAnimation } from "../src/rendering/EnemySprites";
import type { ClassId, Enemy } from "../src/core/types";
const engines: Engine[] = [];
afterEach(() => engines.splice(0).forEach((e) => e.destroy()));
function setup(cls: ClassId = "fighter") {
  const m = defaultMeta(),
    r = newRun("qa", cls, m),
    e = new Engine(r, m, new EventBus(), async () => {});
  engines.push(e);
  e.selected.x = 20;
  e.selected.y = 0.5;
  return e;
}
function enemy(e: Engine, definition = "slime", x = 21, y = 0.5): Enemy {
  const t: Enemy = {
    id: "test-" + e.nextId(),
    definition,
    x,
    y,
    home: { x, y },
    level: 1,
    hp: 1000,
    maxHp: 1000,
    elite: false,
    modifier: "swift",
    statuses: [],
    path: [],
    threat: {},
    state: "IDLE",
    timer: 0,
    aiTime: 0,
    attackTime: 0,
  };
  e.enemies.set(t.id, t);
  return t;
}
describe("Combate real sem renderer", () => {
  for (const [first, second] of [["slow", "burn"], ["burn", "slow"]] as const)
    it(`choque térmico: ${first} + ${second} consome efeitos e abre armadura`, () => {
      const e = setup(), t = enemy(e);
      e.random.next = () => 1;
      e.combat.hit(e.selected.id, t, 20, first);
      const hp = t.hp;
      e.run.stats.seconds += 1;
      e.combat.hit(e.selected.id, t, 20, second);
      expect(hp - t.hp).toBe(26);
      e.combat.statuses(t, 0.5); // expira o stun do knockback, mantém o resto
      expect(t.statuses.map(s => s.id)).toEqual(["armorBreak"]);
      expect(t.statuses[0].remaining).toBeCloseTo(1.5);
      expect(e.effects.some(f => f.text === "Choque térmico")).toBe(true);
      e.combat.statuses(t, 2.1);
      expect(t.statuses).toEqual([]);
    });
  it("efeito expirado não dispara choque térmico e burn periódico não o consome", () => {
    const e = setup(), t = enemy(e);
    t.statuses = [{id:"slow", remaining:0, tick:0, source:e.selected.id, power:1}];
    e.combat.hit(e.selected.id, t, 20, "burn");
    expect(t.statuses.some(s => s.id === "armorBreak")).toBe(false);
    t.statuses[0].remaining = 4;
    e.combat.statuses(t, 1);
    expect(t.statuses.map(s => s.id)).toEqual(["slow", "burn"]);
  });
  it("atordoamento interrompe habilidade durante preparação", () => {
    const e = setup(), t = enemy(e);
    e.selected.target = t.id;
    expect(e.combat.cast(e.selected, 0)).toBe(true);
    e.combat.hit(t.id, e.selected, 1, "stun");
    e.combat.update(.4);
    expect(t.hp).toBe(1000);
    expect(e.combat.castingSlot(e.selected.id)).toBeUndefined();
  });
  for (const pierce of [false, true]) it(`projétil sobreposto respeita perfuração=${pierce}`, () => {
    const e = setup(), a = enemy(e), b = enemy(e);
    e.projectiles.push({id:e.nextId(),x:21,y:.5,source:e.selected.id,target:{x:25,y:.5},speed:1,damage:10,friendly:true,pierce,hit:[],remaining:2,color:0xffffff});
    e.combat.update(.01);
    expect(a.hp).toBeLessThan(1000);
    expect(b.hp < 1000).toBe(pierce);
  });
  for (const cls of ["fighter", "tank", "shooter", "mage"] as const) it(`${cls}: ataque básico livre sem inimigo`, () => {
    const e = setup(cls);
    e.basicAttack({x:e.selected.x+2,y:e.selected.y});
    expect(e.combat.castingSlot(e.selected.id)).toBe(-1);
    e.combat.update(.5);
    expect(cls === "shooter" || cls === "mage" ? e.projectiles.length : e.effects.filter(f=>f.kind === "slash").length).toBeGreaterThan(0);
  });
  it("ataque explícito substitui alvo antigo e prioritário", () => {
    const e = setup(), a=enemy(e), b=enemy(e,"slime",20,.9);
    e.selected.target=a.id;e.run.focusTargetId=a.id;
    e.basicAttack(b,b.id);e.combat.update(.5);
    expect(e.selected.target).toBe(b.id);expect(a.hp).toBe(1000);expect(b.hp).toBeLessThan(1000);
  });
  it("ordem temporária protege destino do aliado contra Follow", () => {
    const e=setup(), c=createCharacter("mage","commanded",e.selected.x+2,e.selected.y,1);
    e.run.party.push(c);c.partyOrder="follow";e.run.commandSelection=[c.id];
    e.command({type:"move",point:{x:c.x+4,y:c.y}});
    const path=structuredClone(c.path);expect(path.length).toBeGreaterThan(0);
    tickAI(e,.5);expect(c.path).toEqual(path);expect(c.partyOrder).toBe("follow");
  });
  it("Fire modifica Q e causa Burn periódico", () => {
    const e = setup(),
      t = enemy(e);
    e.selected.jewels = ["fire"];
    e.selected.target = t.id;
    expect(e.combat.cast(e.selected, 0)).toBe(true);
    e.combat.update(0.4);
    expect(t.statuses.some((s) => s.id === "burn")).toBe(true);
    const hp = t.hp;
    e.combat.statuses(t, 1.1);
    expect(t.hp).toBeLessThan(hp);
  });
  it("Fortune Tank aumenta o drop consultado pelo LootSystem", () => {
    const normal = setup("tank"),
      lucky = setup("tank");
    lucky.selected.jewels = ["fortune"];
    const normalEnemy = enemy(normal);
    normalEnemy.elite = true;
    normal.enemyDied(normalEnemy, normal.selected.id);
    const luckyEnemy = enemy(lucky);
    luckyEnemy.elite = true;
    lucky.enemyDied(luckyEnemy, lucky.selected.id);
    expect(
      lucky.run.drops.find((d) => d.kind === "silver")!.amount,
    ).toBeGreaterThan(
      normal.run.drops.find((d) => d.kind === "silver")!.amount,
    );
  });
  it("cooldown e recurso impedem casts repetidos", () => {
    const e = setup(),
      t = enemy(e);
    e.selected.target = t.id;
    expect(e.combat.cast(e.selected, 0)).toBe(true);
    expect(e.combat.cast(e.selected, 0)).toBe(false);
    e.combat.update(0.5);
    e.selected.resource = 0;
    expect(e.combat.cast(e.selected, 2)).toBe(false);
  });
  for (const cls of ["fighter", "shooter", "mage", "tank"] as ClassId[])
    for (let slot = 0; slot < 4; slot++)
      it(cls + " slot " + slot + " executa seu efeito", () => {
        const e = setup(cls),
          c = e.selected,
          t = enemy(e);
        c.target = t.id;
        const ally = createCharacter("fighter", "ally", 20, 1);
        e.run.party.push(ally);
        expect(e.combat.cast(c, slot, { x: 23, y: 0.5 })).toBe(true);
        e.combat.update(0.4);
        const effect =
          t.hp < 1000 ||
          c.x !== 20 ||
          c.y !== 0.5 ||
          c.statuses.length > 0 ||
          ally.statuses.length > 0 ||
          e.projectiles.length > 0 ||
          e.hazards.length > 0 ||
          (t.threat[c.id] ?? 0) > 0;
        expect(effect).toBe(true);
      });
  it("Guarda protege o grupo de dano real", () => {
    const e = setup("tank"),
      c = e.selected;
    const hp = c.hp;
    e.combat.hit("enemy", c, 30);
    const normal = hp - c.hp;
    c.hp = hp;
    e.combat.cast(c, 3);
    e.combat.update(0.3);
    e.run.stats.seconds += 1;
    e.combat.hit("enemy", c, 30);
    expect(hp - c.hp).toBeLessThan(normal * 0.5);
  });
  it("dano direto abre cooldown, empurra e DoT periódico passa direto", () => {
    const e = setup(), t = enemy(e);
    const x0 = t.x;
    e.combat.hit(e.selected.id, t, 20);
    const afterFirst = t.hp;
    expect(afterFirst).toBeLessThan(1000);
    expect(t.x).toBe(x0); // deslocamento é animado, não teleporte
    expect(t.knockX ?? 0).toBeGreaterThan(0);
    expect(t.statuses.some((s) => s.id === "stagger")).toBe(true);
    expect(t.statuses.some((s) => s.id === "stun")).toBe(false);
    expect(t.invulnUntil ?? 0).toBeGreaterThan(e.run.stats.seconds);
    e.combat.hit(e.selected.id, t, 20);
    expect(t.hp).toBe(afterFirst);
    moveEntities(e, 0.5);
    expect(t.x).toBeGreaterThan(x0); // knockback suave concluiu o empurrão
    e.combat.statuses(t, 0.5);
    expect(t.statuses.some((s) => s.id === "stagger")).toBe(false);
    e.run.stats.seconds += 1;
    e.combat.hit(e.selected.id, t, 20);
    expect(t.hp).toBeLessThan(afterFirst);
    const hp = t.hp;
    e.combat.hit(e.selected.id, t, 20, undefined, 0xe8c692, true);
    expect(t.hp).toBeLessThan(hp);
  });
  it("knockback não vira o personagem para a direção do empurrão", () => {
    const e = setup();
    const c = e.selected;
    c.facingAngle = Math.PI;
    const a = new PlayerAnimation(c);
    const first = a.update(c, 0.1, false, false);
    c.knockX = 4;
    c.knockY = 0;
    c.x += 0.06;
    const knocked = a.update(c, 0.016, false, false);
    expect(knocked.frame).toBe(first.frame);
    expect(knocked.mode).toBe("idle");
    c.knockX = 0;
    c.knockY = 0;
    c.x += 0.06;
    const walking = a.update(c, 0.016, false, false);
    expect(walking.mode).toBe("walk");
    expect(walking.frame.split(":")[0]).toBe("3");
  });
  it("knockback não vira o inimigo para a direção do empurrão", () => {
    const e = setup(), t = enemy(e);
    const a = new EnemyAnimation(t);
    a.update(t, 0.1, false, false);
    t.knockX = 4;
    t.knockY = 0;
    t.x += 0.06;
    const knocked = a.update(t, 0.016, false, false)!;
    expect(knocked.frame.split(":")[0]).toBe("4");
    t.knockX = 0;
    t.knockY = 0;
    t.x += 0.06;
    const walking = a.update(t, 0.016, false, false)!;
    expect(walking.frame.split(":")[0]).toBe("3");
  });
});
describe("Seis decisões de IA", () => {
  it("perseguidor navega até alvo", () => {
    const e = setup(),
      t = enemy(e, "slime", 25, 0.5);
    tickAI(e, 0.3);
    expect(t.state).toBe("CHASE");
    expect(t.path.length).toBeGreaterThan(0);
  });
  it("arqueiro recua quando pressionado", () => {
    const e = setup(),
      t = enemy(e, "archer");
    tickAI(e, 0.3);
    expect(t.state).toBe("RETREAT");
  });
  it("investidor prepara telegraph antes da corrida", () => {
    const e = setup(),
      t = enemy(e, "boar", 25, 0.5);
    tickAI(e, 0.3);
    expect(t.state).toBe("CAST");
    expect(e.effects.some((f) => f.kind === "projectile")).toBe(true);
    tickAI(e, 1);
    expect(t.state).toBe("CHARGE");
  });
  it("matilha aumenta dano quando próxima", () => {
    const a = setup(),
      b = setup();
    enemy(a, "wolf");
    enemy(b, "wolf");
    enemy(b, "wolf", 22, 0.5);
    const ah = a.selected.hp,
      bh = b.selected.hp;
    tickAI(a, 0.3);
    tickAI(b, 0.3);
    expect(bh - b.selected.hp).toBeGreaterThan(ah - a.selected.hp);
  });
  it("conjurador deixa área antecipada no chão", () => {
    const e = setup();
    enemy(e, "witch", 24, 0.5);
    tickAI(e, 0.3);
    expect(e.hazards).toHaveLength(1);
    expect(e.hazards[0].remaining).toBeGreaterThan(0);
  });
  it("guardião resiste e ataca lentamente", () => {
    const e = setup(),
      t = enemy(e, "golem");
    const hp = e.selected.hp;
    tickAI(e, 0.3);
    expect(e.selected.hp).toBeLessThan(hp);
    expect(t.attackTime).toBe(1.8);
    expect(enemyRegistry.golem.health).toBeGreaterThan(
      enemyRegistry.slime.health,
    );
    expect(statsFor(e.selected).health).toBeGreaterThan(0);
  });
});

it("estoque da mesma loja independe do nível do comprador", () => {
  const e = setup();
  e.shop.active = "origin:merchant";
  const before = e.shop.stock();
  e.selected.level = 50;
  expect(e.shop.stock()).toEqual(before);
});
