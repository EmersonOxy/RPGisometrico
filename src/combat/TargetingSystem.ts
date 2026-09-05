import type { AbilityDefinition } from "../data/abilities";
import type { Character, Enemy, Point } from "../core/types";
import type { Engine } from "../core/Engine";
import { distance } from "../world/WorldCoordinates";
import { lineWalkable } from "../world/navigation/AStar";

export interface TargetingState {
  active: boolean;
  slot: number;
  ability: AbilityDefinition;
  pointerWorld: Point;
  valid: boolean;
  targetUnitId?: string;
  targetUnitKind?: "enemy" | "ally";
}

export interface PendingSkill {
  slot: number;
  ability: AbilityDefinition;
  targetId?: string;
  targetPoint?: Point;
  reevaluateTime: number;
}

export class TargetingSystem {
  state: TargetingState | null = null;
  pendingSkill: PendingSkill | null = null;

  constructor(private engine: Engine) {}

  startPreview(slot: number, pointerWorld: Point) {
    const c = this.engine.selected;
    if (!c || !c.alive) return;
    const ability = this.engine.combat.ability(c, slot);
    if (!ability) return;

    const evalResult = this.evaluateTarget(ability, pointerWorld);
    this.state = {
      active: true,
      slot,
      ability,
      pointerWorld,
      valid: evalResult.valid,
      targetUnitId: evalResult.targetUnitId,
      targetUnitKind: evalResult.targetUnitKind,
    };
  }

  updatePreview(pointerWorld: Point) {
    if (!this.state || !this.state.active) return;
    this.state.pointerWorld = pointerWorld;
    const evalResult = this.evaluateTarget(this.state.ability, pointerWorld);
    this.state.valid = evalResult.valid;
    this.state.targetUnitId = evalResult.targetUnitId;
    this.state.targetUnitKind = evalResult.targetUnitKind;
  }

  cancelPreview() {
    this.state = null;
  }

  confirmPreview(): boolean {
    if (!this.state || !this.state.active) return false;
    const { slot, pointerWorld, valid, targetUnitId } = this.state;
    this.state = null;

    const c = this.engine.selected;
    if (!c || !c.alive) return false;

    if (targetUnitId) {
      c.target = targetUnitId;
    }

    return this.executeAbility(slot, pointerWorld);
  }

  executeAbility(slot: number, pointerWorld: Point): boolean {
    const c = this.engine.selected;
    if (!c || !c.alive) return false;

    const ability = this.engine.combat.ability(c, slot);
    if (!ability) return false;

    // Check if hover unit can be resolved
    const hoverUnit = this.getHoveredUnit(pointerWorld);
    if (hoverUnit?.kind === "enemy") {
      c.target = hoverUnit.id;
    }

    const targetEnemy = c.target ? this.engine.enemies.get(c.target) : undefined;
    const distToTarget = targetEnemy ? distance(c, targetEnemy) : distance(c, pointerWorld);

    // If target requires target and is out of range, initiate Smart Approach
    const autoApproachEnabled = this.engine.meta.settings.autoApproach !== false;
    if (ability.target === "TARGET" && targetEnemy) {
      if (distToTarget > ability.range + 0.3) {
        if (autoApproachEnabled) {
          this.startSmartApproach(slot, ability, targetEnemy.id, undefined);
          return true;
        } else {
          this.engine.bus.emit("notice", "Alvo fora de alcance.");
          return false;
        }
      }
    }

    // Try direct cast
    return this.engine.combat.request(c, slot, pointerWorld);
  }

  startSmartApproach(
    slot: number,
    ability: AbilityDefinition,
    targetId?: string,
    targetPoint?: Point,
  ) {
    const c = this.engine.selected;
    this.pendingSkill = {
      slot,
      ability,
      targetId,
      targetPoint,
      reevaluateTime: 0.2,
    };

    if (targetId) {
      const target = this.engine.enemies.get(targetId);
      if (target) {
        this.engine.approach(c, target, ability.range);
        this.engine.bus.emit("notice", "Aproximando-se para executar habilidade...");
      }
    } else if (targetPoint) {
      this.engine.approach(c, targetPoint, ability.range);
    }
  }

  cancelPendingSkill() {
    this.pendingSkill = null;
  }

  update(dt: number) {
    if (!this.pendingSkill) return;

    const c = this.engine.selected;
    if (!c || !c.alive || this.engine.paused || this.engine.tactical) {
      this.pendingSkill = null;
      return;
    }

    const { slot, ability, targetId, targetPoint } = this.pendingSkill;

    if (targetId) {
      const target = this.engine.enemies.get(targetId);
      if (!target || target.hp <= 0) {
        // Target died or disappeared
        this.pendingSkill = null;
        c.path = [];
        return;
      }

      const dist = distance(c, target);
      if (dist <= ability.range + 0.2) {
        // In range! Cancel approach and cast
        c.path = [];
        this.pendingSkill = null;
        c.facing = target.x >= c.x ? 1 : -1;
        c.facingAngle = Math.atan2(target.y - c.y, target.x - c.x);
        this.engine.combat.cast(c, slot, target);
        return;
      }

      // Re-evaluate path periodically (~0.2s)
      this.pendingSkill.reevaluateTime -= dt;
      if (this.pendingSkill.reevaluateTime <= 0) {
        this.pendingSkill.reevaluateTime = 0.2;
        this.engine.approach(c, target, ability.range);
      }
    } else if (targetPoint) {
      const dist = distance(c, targetPoint);
      if (dist <= ability.range + 0.2) {
        c.path = [];
        this.pendingSkill = null;
        this.engine.combat.cast(c, slot, targetPoint);
      }
    }
  }

  private evaluateTarget(
    ability: AbilityDefinition,
    pointerWorld: Point,
  ): { valid: boolean; targetUnitId?: string; targetUnitKind?: "enemy" | "ally" } {
    const c = this.engine.selected;
    if (!c) return { valid: false };

    const hover = this.getHoveredUnit(pointerWorld);
    const dist = distance(c, pointerWorld);

    if (ability.target === "SELF") {
      return { valid: true };
    }

    if (ability.target === "AOE_AROUND_SELF") {
      return { valid: true };
    }

    if (ability.target === "TARGET") {
      if (hover?.kind === "enemy") {
        const enemy = this.engine.enemies.get(hover.id);
        if (enemy && enemy.hp > 0) {
          const inRange = distance(c, enemy) <= ability.range + 0.5;
          const hasLoS = lineWalkable(c, enemy, this.engine.world.cell);
          return {
            valid: inRange && hasLoS,
            targetUnitId: enemy.id,
            targetUnitKind: "enemy",
          };
        }
      }
      return { valid: false };
    }

    if (ability.target === "GROUND") {
      const inRange = dist <= ability.range + 0.8;
      const unblocked = !this.engine.world.cell(
        Math.floor(pointerWorld.x),
        Math.floor(pointerWorld.y),
      ).blocked;
      return { valid: inRange && unblocked };
    }

    if (ability.target === "DIRECTION") {
      return { valid: true };
    }

    return { valid: dist <= ability.range };
  }

  private getHoveredUnit(
    point: Point,
  ): { kind: "enemy" | "ally"; id: string } | null {
    // Check enemies
    for (const enemy of this.engine.enemies.values()) {
      if (enemy.hp > 0 && distance(enemy, point) < 1.2) {
        return { kind: "enemy", id: enemy.id };
      }
    }
    // Check party allies
    for (const ally of this.engine.run.party) {
      if (ally.alive && distance(ally, point) < 1.2) {
        return { kind: "ally", id: ally.id };
      }
    }
    return null;
  }
}
