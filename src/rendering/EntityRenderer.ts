import { balance } from "../data/balance";
import { rarityNames, rarityColors } from "../data/items";
import { jewelRegistry } from "../data/jewels";
import Phaser from "phaser";
import type { Engine } from "../core/Engine";
import type { Enemy } from "../core/types";
import { worldToIso } from "../world/WorldCoordinates";
import { statsFor } from "../progression/Character";
import { enemyRegistry } from "../data/enemies";
import { PlayerAnimation, playerFrameRegistration } from "./PlayerSprites";
import { EnemyAnimation, enemyFrameRegistration } from "./EnemySprites";
import { enemySpriteConfig } from "./EnemySpriteConfig";
import { playerSpriteConfig } from "./PlayerSpriteConfig";
export class EntityRenderer {
  private dropLabels = new Map<string, Phaser.GameObjects.Text>();
  private sprites = new Map<string, Phaser.GameObjects.Image>();
  private playerAnimations = new Map<string, PlayerAnimation>();
  private enemyAnimations = new Map<string, EnemyAnimation>();
  private labels = new Map<string, Phaser.GameObjects.Text>();
  private levelLabels = new Map<string, Phaser.GameObjects.Text>();
  private shadowOverlay: Phaser.GameObjects.Graphics;
  private groundOverlay: Phaser.GameObjects.Graphics;
  private overlay: Phaser.GameObjects.Graphics;
  private effectLabels = new Map<number, Phaser.GameObjects.Text>();
  private damageTrails = new Map<string, { trailHp: number; timer: number }>();
  private altIndicatorAlpha = 0;
  private lastTime = 0;
  hitDrop(point: { x: number; y: number }) {
    let hit: string | undefined, best = Infinity;
    for (const drop of this.e.run.drops) {
      const p = worldToIso(drop), label = this.dropLabels.get(drop.id);
      const score = Math.hypot((point.x - p.x) / 13, (point.y - p.y + 7) / 14);
      if ((score < 1 || label?.getBounds().contains(point.x, point.y)) && score < best) {
        hit = drop.id; best = score;
      }
    }
    return hit;
  }
  constructor(
    private scene: Phaser.Scene,
    private e: Engine,
  ) {
    this.shadowOverlay = scene.add.graphics().setDepth(5);
    this.groundOverlay = scene.add.graphics().setDepth(10);
    this.overlay = scene.add.graphics().setDepth(100000);
  }
  update(time: number) {
    const dt = this.lastTime ? Math.min(0.1, (time - this.lastTime) / 1000) : 0.016;
    this.lastTime = time;
    if (this.e.meta.settings.reducedMotion) time = 0;
    const alive = new Set<string>();
    this.shadowOverlay.clear();
    this.groundOverlay.clear();
    this.overlay.clear();

    // ALT character indicator fade in/out
    const indicatorMode = this.e.meta.settings.characterIndicator ?? "hold";
    const wantsIndicator =
      indicatorMode === "always" ||
      (indicatorMode === "hold" && (this.scene.input.keyboard?.checkDown(this.scene.input.keyboard.addKey("ALT")) || this.e.showLootLabels));
    if (wantsIndicator) {
      this.altIndicatorAlpha = Math.min(1, this.altIndicatorAlpha + dt * 10);
    } else {
      this.altIndicatorAlpha = Math.max(0, this.altIndicatorAlpha - dt * 10);
    }

    // Targeting preview overlay
    const targetState = this.e.targeting?.state;
    if (targetState?.active) {
      const selP = worldToIso(this.e.selected);
      const pointerIso = worldToIso(targetState.pointerWorld);
      const range = targetState.ability.range;
      const isValid = targetState.valid;

      // Range circumference around player (on ground)
      this.groundOverlay.lineStyle(1.5, isValid ? 0xdfd2a0 : 0xe06050, 0.45);
      this.groundOverlay.strokeEllipse(selP.x, selP.y, range * 64, range * 32);

      // Impact area preview (on ground)
      const targetMode = targetState.ability.targetMode ?? targetState.ability.target;
      if (targetMode === "CIRCLE" || targetMode === "GROUND") {
        const radius = targetState.ability.radius ?? 2.2;
        this.groundOverlay.fillStyle(isValid ? 0xd8c890 : 0xe05545, 0.15);
        this.groundOverlay.fillEllipse(pointerIso.x, pointerIso.y, radius * 64, radius * 32);
        this.groundOverlay.lineStyle(1.5, isValid ? 0xd8c890 : 0xe05545, 0.7);
        this.groundOverlay.strokeEllipse(pointerIso.x, pointerIso.y, radius * 64, radius * 32);
      } else if (targetMode === "DIRECTION" || targetMode === "LINE") {
        this.overlay.lineStyle(3, isValid ? 0xd8c890 : 0xe05545, 0.65);
        this.overlay.lineBetween(selP.x, selP.y - 15, pointerIso.x, pointerIso.y - 15);
      }
    }

    for (const entity of [...this.e.run.party, ...this.e.enemies.values()]) {
      alive.add(entity.id);
      const hero = "classId" in entity,
        tex = hero ? entity.classId : entity.definition;
      const config = hero ? playerSpriteConfig[entity.classId] : undefined;
      const eConfig = hero ? undefined : enemySpriteConfig[entity.definition];
      const visualH = hero ? config!.height : 78 * (eConfig?.scale ?? 1) * (entity.elite ? 1.18 : 1);
      const hasSheets = config && Object.values(config.sheets).every(sheet => this.scene.textures.exists(sheet.key));
      let sprite = this.sprites.get(entity.id);
      if (!sprite) {
        sprite = this.scene.add.image(0, 0, tex).setOrigin(0.5, 0.88);
        this.sprites.set(entity.id, sprite);
      }
      const p = worldToIso(entity),
        moving = entity.path.length > 0;
      const dead = entity.hp <= 0;
      sprite.setVisible(
        Math.hypot(entity.x - this.e.selected.x, entity.y - this.e.selected.y) <
          35,
      );
      sprite
        .setPosition(
          p.x,
          p.y +
            (moving
              ? Math.sin(time * 0.015) * 2
              : Math.sin(time * 0.002) * 0.8),
        )
        .setDepth(p.y)
        .setAlpha(dead ? 0.28 : 1)
        .setRotation(dead ? -1.4 : 0);
      sprite.setScale(
        hero ? balance.characterScale : entity.elite ? 1.28 : 1.08,
      );
      if (!dead && entity.attackTime > 0 && !moving)
        sprite.rotation = Math.sin(time * 0.04) * 0.035;
      sprite.setFlipX(
        hero
          ? entity.facing < 0
          : !!entity.path[0] && entity.path[0].x < entity.x,
      );
      // Global soft contact shadow (light from NW, shadow projected SE)
      const shadowSetting = this.e.meta.settings.worldShadows ?? "high";
      const shadowAlpha = shadowSetting === "low" ? 0.22 : shadowSetting === "medium" ? 0.35 : 0.42;
      const shadowScale = hero ? 1 : entity.elite ? 1.4 : 1.1;
      const shadowW = 32 * shadowScale;
      const shadowH = 14 * shadowScale;
      this.shadowOverlay.fillStyle(0x0a140f, shadowAlpha);
      this.shadowOverlay.fillEllipse(p.x + 2, p.y + 3, shadowW, shadowH);

      // Procedural animations (bob, attack shake, hit reaction recoil)
      const hitEffect = this.e.effects.find(
        (f) =>
          f.kind === "hit" &&
          f.remaining > f.duration - 0.12 &&
          Math.hypot(f.x - entity.x, f.y - entity.y) < 0.4,
      );
      const isHit = Boolean(hitEffect);
      const isFacingLeft = hero
        ? entity.facing < 0
        : Boolean(entity.path[0] && entity.path[0].x < entity.x);
      const hitRecoilX = isHit && !this.e.meta.settings.reducedMotion ? (isFacingLeft ? 3 : -3) : 0;
      const hitRecoilY = isHit && !this.e.meta.settings.reducedMotion ? -2 : 0;
      const walkBob = moving
        ? Math.sin(time * 0.016) * 2.2
        : Math.sin(time * 0.002) * 0.7;

      sprite.setPosition(p.x + hitRecoilX, p.y + walkBob + hitRecoilY);
      if (hero && config && hasSheets) {
        let animation = this.playerAnimations.get(entity.id);
        if (!animation) { animation = new PlayerAnimation(entity); this.playerAnimations.set(entity.id, animation); }
        const frame = animation.update(entity, dt * this.e.debugOptions.timeScale * (this.scene.time.timeScale || 1), this.e.paused || this.e.tactical || entity.statuses.some(s => s.id === "stun"), this.e.meta.settings.reducedMotion);
        sprite.setTexture(frame.key, frame.frame).setFlipX(false);
        const registration = playerFrameRegistration(sprite.texture, sprite.frame);
        sprite.setOrigin(registration.x / sprite.frame.width, registration.y / sprite.frame.height);
        sprite.setScale(config.height / registration.height);
        sprite.setPosition(p.x + hitRecoilX, p.y + hitRecoilY);
      }

      if (!hero && eConfig) {
        const hasEnemySheets = [eConfig.idle, eConfig.walk].filter(Boolean).every(s => this.scene.textures.exists(s!.key));
        if (hasEnemySheets) {
          let eAnim = this.enemyAnimations.get(entity.id);
          if (!eAnim) { eAnim = new EnemyAnimation(entity as Enemy); this.enemyAnimations.set(entity.id, eAnim); }
          const frame = eAnim.update(entity as Enemy, dt * this.e.debugOptions.timeScale * (this.scene.time.timeScale || 1), this.e.paused || this.e.tactical || entity.statuses.some(s => s.id === "stun"), this.e.meta.settings.reducedMotion);
          if (frame) {
            sprite.setTexture(frame.key, frame.frame).setFlipX(false);
            const registration = enemyFrameRegistration(sprite.texture, sprite.frame);
            sprite.setOrigin(registration.x / sprite.frame.width, registration.y / sprite.frame.height);
            sprite.setScale(visualH / registration.height);
            sprite.setPosition(p.x + hitRecoilX, p.y + hitRecoilY);
          }
        }
      }

      sprite.clearTint();
      if (isHit) {
        sprite.setTint(0xffeedd);
        sprite.setTintFill();
      } else if (entity.statuses.some((s) => s.id === "burn")) {
        sprite.setTint(0xffbc83);
      } else if (entity.statuses.some((s) => s.id === "slow")) {
        sprite.setTint(0xaadfff);
      } else if (entity.statuses.some((s) => s.id === "armorBreak")) {
        sprite.setTint(0xe8b4ef);
      } else {
        sprite.clearTint();
      }

      if (!dead && entity.statuses.some(s => s.id === "stun")) {
        this.overlay.lineStyle(2, 0xffdf84, .9);
        this.overlay.strokeEllipse(p.x, p.y - visualH - 12, 22, 8);
        for (let i = 0; i < 3; i++) {
          const angle = time * .004 + i * Math.PI * 2 / 3;
          this.overlay.fillStyle(0xffdf84, .95);
          this.overlay.fillCircle(p.x + Math.cos(angle) * 11, p.y - visualH - 12 + Math.sin(angle) * 4, 2);
        }
      }

      // Highlight configuration (rendered on groundOverlay behind entity sprite, above shadows)
      const highlightMode = this.e.meta.settings.hoverHighlight !== false;
      const isColorblind = this.e.meta.settings.highlightPalette === "colorblind";
      const intensity = this.e.meta.settings.highlightIntensity ?? "normal";
      const alphaVal = intensity === "subtle" ? 0.5 : intensity === "strong" ? 1.0 : 0.8;

      const isHovered = entity.id === this.e.hovered?.id;
      const isTargeted = entity.id === this.e.selected.target;
      const isControlled = hero && entity.id === this.e.selected.id;
      const isCommandSelected =
        hero && (this.e.run.commandSelection?.includes(entity.id) ?? false);

      if (hero && entity.alive) {
        // Base ring for controlled / allies (ground level, behind sprite)
        this.groundOverlay.lineStyle(
          isControlled ? 2 : 1,
          isControlled ? 0xe4d39d : 0x9ab9a4,
          isControlled ? 0.85 : 0.45,
        );
        this.groundOverlay.strokeEllipse(p.x, p.y + 2, 35, 16);

        // Command selection ring (ground level, behind sprite)
        if (isCommandSelected) {
          this.groundOverlay.lineStyle(1.8, 0x82b27a, 0.9);
          this.groundOverlay.strokeEllipse(p.x, p.y + 2, 41, 19);
        }

        if (isHovered && highlightMode && !isControlled) {
          const allyColor = isColorblind ? 0x4c9ae2 : 0x50c878;
          this.groundOverlay.lineStyle(2, allyColor, alphaVal);
          this.groundOverlay.strokeEllipse(p.x, p.y + 2, 38, 18);
        }
      }

      if (!hero && (isTargeted || isHovered)) {
        const enemyColor = isColorblind ? 0xe8853b : 0xdf4f4f;
        const color = isHovered && highlightMode ? enemyColor : 0xe0a581;
        this.groundOverlay.lineStyle(2, color, alphaVal);
        this.groundOverlay.strokeEllipse(p.x, p.y + 2, 43, 20);
      }

      // Target Queue Visual Markers on enemies
      if (!hero && entity.hp > 0) {
        const queueIdx = (this.e.run.targetQueue ?? []).indexOf(entity.id);
        const isPrimary =
          this.e.run.focusTargetId === entity.id || queueIdx === 0;

        if (isPrimary) {
          // Primary Target ground indicator (behind sprite, above shadow)
          this.groundOverlay.lineStyle(1.5, 0xffe2b8, 0.9);
          this.groundOverlay.strokeEllipse(p.x, p.y + 2, 46, 22);

          // Primary Target: prominent artisan chevron mark (overhead)
          const ty = p.y - visualH - (entity.elite ? 26 : 16);
          this.overlay.fillStyle(0xe55d49, 0.95);
          this.overlay.fillPoints(
            [
              new Phaser.Math.Vector2(p.x - 7, ty - 8),
              new Phaser.Math.Vector2(p.x + 7, ty - 8),
              new Phaser.Math.Vector2(p.x, ty),
            ],
            true,
          );
        } else if (queueIdx > 0 && this.e.meta.settings.targetQueueNumbers !== false) {
          // Queued Targets 2..8: subtle numbered indicator
          const ty = p.y - visualH - (entity.elite ? 22 : 12);
          this.overlay.fillStyle(0x24332b, 0.88);
          this.overlay.fillCircle(p.x, ty - 4, 8);
          this.overlay.lineStyle(1, 0xd4be8c, 0.75);
          this.overlay.strokeCircle(p.x, ty - 4, 8);

          let qLabel = this.levelLabels.get("q:" + entity.id);
          if (!qLabel) {
            qLabel = this.scene.add
              .text(p.x, ty - 4, `${queueIdx + 1}`, {
                fontFamily: "Georgia",
                fontSize: "10px",
                color: "#e2d2a4",
              })
              .setOrigin(0.5)
              .setDepth(p.y + 200);
            this.levelLabels.set("q:" + entity.id, qLabel);
          }
          qLabel
            .setPosition(p.x, ty - 4)
            .setText(`${queueIdx + 1}`)
            .setVisible(true);
        }
      }

      // Overhead HP and Level Bar
      const max = hero ? statsFor(entity).health : entity.maxHp;
      if (entity.hp < max || hero || isHovered || isTargeted) {
        // Delayed Damage Trail update
        let trail = this.damageTrails.get(entity.id);
        if (!trail) {
          trail = { trailHp: entity.hp, timer: 0.35 };
          this.damageTrails.set(entity.id, trail);
        }
        if (entity.hp < trail.trailHp) {
          trail.timer -= dt;
          if (trail.timer <= 0) {
            trail.trailHp = Math.max(entity.hp, trail.trailHp - (max * 0.9) * dt);
          }
        } else {
          trail.trailHp = entity.hp;
          trail.timer = 0.35;
        }

        const barW = 44, barH = 5;
        const bx = p.x - barW / 2;
        const by = p.y - visualH - 4;

        // Background
        this.overlay.fillStyle(0x131e19, 0.92);
        this.overlay.fillRect(bx, by, barW, barH);

        // Delayed Trail
        const trailRatio = Math.max(0, Math.min(1, trail.trailHp / max));
        this.overlay.fillStyle(0xe2be82, 0.85);
        this.overlay.fillRect(bx, by, barW * trailRatio, barH);

        // Main Fill
        const hpRatio = Math.max(0, Math.min(1, entity.hp / max));
        const isLowHealth = hpRatio < 0.25;
        const pulse = isLowHealth ? 0.75 + 0.25 * Math.sin(time * 0.015) : 1;
        this.overlay.fillStyle(
          hero ? (isLowHealth ? 0xa83232 : 0x82b27a) : 0xb86250,
          pulse,
        );
        this.overlay.fillRect(bx, by, barW * hpRatio, barH);

        // Border
        this.overlay.lineStyle(1, 0x3d4f42, 0.75);
        this.overlay.strokeRect(bx, by, barW, barH);

        // Thinner Resource Bar for hero
        if (hero && this.e.meta.settings.overheadResource !== false) {
          const rx = p.x - 20, ry = by + 6;
          this.overlay.fillStyle(0x131e19, 0.85);
          this.overlay.fillRect(rx, ry, 40, 2);
          const resRatio = Math.max(0, Math.min(1, entity.resource / 100));
          const resColor =
            entity.classId === "fighter"
              ? 0xd8c278
              : entity.classId === "shooter"
                ? 0x78c2a8
                : entity.classId === "tank"
                  ? 0xd09472
                  : 0x8ea8e2;
          this.overlay.fillStyle(resColor, 0.9);
          this.overlay.fillRect(rx, ry, 40 * resRatio, 2);
        }

        // Overhead Level Label
        if (this.e.meta.settings.overheadLevel !== false && entity.level) {
          let lvlLabel = this.levelLabels.get(entity.id);
          if (!lvlLabel) {
            lvlLabel = this.scene.add
              .text(0, 0, `${entity.level}`, {
                fontFamily: "Georgia",
                fontSize: "10px",
                fontStyle: "bold",
              })
              .setOrigin(1, 0.5)
              .setDepth(p.y + 100);
            this.levelLabels.set(entity.id, lvlLabel);
          }

          const diff = entity.level - this.e.selected.level;
          const lvlColor =
            diff <= -4
              ? "#7c9182"
              : diff <= 2
                ? "#d4cfba"
                : diff <= 5
                  ? "#dfa058"
                  : "#df5858";
          lvlLabel.setColor(lvlColor);
          lvlLabel.setText(`${entity.level}`);
          lvlLabel.setPosition(bx - 3, by + barH / 2).setVisible(true);
        }
      } else {
        const lvlLabel = this.levelLabels.get(entity.id);
        if (lvlLabel) lvlLabel.setVisible(false);
      }

      // ALT Character Indicator above controlled character
      if (isControlled && this.altIndicatorAlpha > 0.01) {
        const cy = p.y - 94 + Math.sin(time * 0.006) * 2;
        this.overlay.fillStyle(0xe2be82, this.altIndicatorAlpha * 0.85);
        this.overlay.fillPoints(
          [
            new Phaser.Math.Vector2(p.x - 6, cy - 10),
            new Phaser.Math.Vector2(p.x + 6, cy - 10),
            new Phaser.Math.Vector2(p.x, cy),
          ],
          true,
        );
        this.overlay.lineStyle(1, 0x223528, this.altIndicatorAlpha * 0.7);
        this.overlay.strokePoints(
          [
            new Phaser.Math.Vector2(p.x - 6, cy - 10),
            new Phaser.Math.Vector2(p.x + 6, cy - 10),
            new Phaser.Math.Vector2(p.x, cy),
          ],
          true,
        );
      }

      if (!hero && entity.elite) {
        let label = this.labels.get(entity.id);
        if (!label) {
          label = this.scene.add
            .text(0, 0, "◆ " + enemyRegistry[entity.definition].name, {
              fontFamily: "Georgia",
              fontSize: "12px",
              color: "#dfc17e",
            })
            .setOrigin(0.5);
          this.labels.set(entity.id, label);
        }
        label.setPosition(p.x, p.y - visualH - 10).setDepth(p.y + 100);
      }
      if (entity.statuses.some((s) => s.id === "guard")) {
        this.overlay.lineStyle(2, 0xc2d7bd, 0.7);
        this.overlay.strokeEllipse(p.x, p.y - visualH * 0.35, 49, 63);
      }
    }
    for (const [id, sprite] of this.sprites)
      if (!alive.has(id)) {
        sprite.destroy();
        this.sprites.delete(id);
        this.playerAnimations.delete(id);
        this.enemyAnimations.delete(id);
        this.labels.get(id)?.destroy();
        this.labels.delete(id);
        this.levelLabels.get(id)?.destroy();
        this.levelLabels.delete(id);
        this.damageTrails.delete(id);
      }
    for (const drop of this.e.run.drops) {
      const p = worldToIso(drop);
      if (this.e.hovered?.kind === "drop" && this.e.hovered.id === drop.id && this.e.meta.settings.hoverHighlight !== false) {
        this.overlay.lineStyle(2, 0xffe5a5, 1);
        this.overlay.strokeEllipse(p.x, p.y - 7, 24, 28);
      }
      this.overlay.fillStyle(
        drop.kind === "gold"
          ? 0xdfbe6e
          : drop.kind === "jewel"
            ? 0xe2a4c0
            : drop.kind === "silver"
              ? 0xc9cebe
              : 0xb1c9bb,
      );
      this.overlay.fillPoints(
        [
          { x: p.x, y: p.y - 13 },
          { x: p.x + 5, y: p.y - 7 },
          { x: p.x, y: p.y - 1 },
          { x: p.x - 5, y: p.y - 7 },
        ].map((p) => new Phaser.Math.Vector2(p.x, p.y)),
        true,
      );
      if (drop.kind === "jewel" || (drop.item?.rarity ?? 0) >= 2) {
        this.overlay.lineStyle(1, 0xddcfac, 0.3);
        this.overlay.lineBetween(p.x, p.y - 14, p.x, p.y - 34);
      }
    }
    for (const h of this.e.hazards) {
      const p = worldToIso(h);
      this.overlay.lineStyle(2, h.friendly ? 0xb4cd9c : 0xe5a27b, 0.9);
      this.overlay.fillStyle(h.friendly ? 0x7e995e : 0xc77853, 0.15);
      this.overlay.fillEllipse(p.x, p.y, h.radius * 64, h.radius * 32);
      this.overlay.strokeEllipse(p.x, p.y, h.radius * 64, h.radius * 32);
    }
    if (this.e.run.marker) {
      const p = worldToIso(this.e.run.marker);
      this.overlay.lineStyle(2, 0xdfc17e, .85);
      this.overlay.lineBetween(p.x, p.y, p.x, p.y - 38);
      this.overlay.strokeTriangle(p.x, p.y - 38, p.x + 17, p.y - 31, p.x, p.y - 24);
      this.overlay.strokeEllipse(p.x, p.y, 22, 10);
    }
    for (const pr of this.e.projectiles) {
      const p = worldToIso(pr);
      this.overlay.fillStyle(pr.color);
      this.overlay.fillEllipse(p.x, p.y - 20, 10, 5);
      this.overlay.lineStyle(2, pr.color, 0.4);
      this.overlay.lineBetween(p.x - 9, p.y - 19, p.x, p.y - 20);
    }
    const visibleDrops = new Set<string>();
    const labelRects: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
    }> = [];
    for (const d of this.e.run.drops
      .filter((d) => (d.kind === "item" || d.kind === "jewel") &&
        (this.e.meta.settings.groundLootLabels !== "alt" || this.e.showLootLabels))
      .filter(
        (d) =>
          Math.hypot(d.x - this.e.selected.x, d.y - this.e.selected.y) <
          (this.e.showLootLabels ? 24 : 7),
      )
      .slice(0, this.e.showLootLabels ? 20 : 4)) {
      visibleDrops.add(d.id);
      let label = this.dropLabels.get(d.id);
      const p = worldToIso(d);
      if (!label) {
        const text = d.item
          ? rarityNames[d.item.rarity] + " · " + d.item.name
          : jewelRegistry[d.jewel ?? "fire"].name;
        label = this.scene.add
          .text(p.x, p.y - 39, text, {
            fontFamily: "Georgia",
            fontSize: "12px",
            color: d.item ? rarityColors[d.item.rarity] : "#e6b5a4",
            backgroundColor: "#24382be6",
            padding: { x: 5, y: 3 },
          })
          .setOrigin(0.5)
          .setDepth(110000);
        this.dropLabels.set(d.id, label);
      }
      let ly = p.y - 39;
      for (let tries = 0; tries < 12; tries++) {
        if (
          !labelRects.some(
            (r) =>
              Math.abs(r.x - p.x) < (r.width + label.width) / 2 + 5 &&
              Math.abs(r.y - ly) < (r.height + label.height) / 2 + 3,
          )
        )
          break;
        ly -= label.height + 4;
      }
      label.setPosition(p.x, ly);
      label.setBackgroundColor(this.e.hovered?.id === d.id && this.e.meta.settings.hoverHighlight !== false ? "#526346ee" : "#24382be6");
      labelRects.push({
        x: p.x,
        y: ly,
        width: label.width,
        height: label.height,
      });
    }
    for (const [id, label] of this.dropLabels)
      if (!visibleDrops.has(id)) {
        label.destroy();
        this.dropLabels.delete(id);
      }
    if (this.e.debugGrid) {
      const c = this.e.selected;
      for (let x = Math.floor(c.x) - 6; x <= c.x + 6; x++)
        for (let y = Math.floor(c.y) - 6; y <= c.y + 6; y++) {
          const p = worldToIso({ x, y }),
            t = this.e.world.cell(x, y);
          this.overlay.lineStyle(1, t.blocked ? 0xee987e : 0xc9ddb0, 0.65);
          this.overlay.strokePoints(
            [
              new Phaser.Math.Vector2(p.x, p.y),
              new Phaser.Math.Vector2(p.x + 32, p.y + 16),
              new Phaser.Math.Vector2(p.x, p.y + 32),
              new Phaser.Math.Vector2(p.x - 32, p.y + 16),
            ],
            true,
          );
        }
    }
    const fxIds = new Set<number>();
    for (const f of this.e.effects) {
      fxIds.add(f.id);
      const p = worldToIso(f),
        t = 1 - f.remaining / f.duration;
      this.overlay.lineStyle(2, f.color, 1 - t);
      if (f.kind === "projectile" && f.to) {
        const to = worldToIso(f.to);
        this.overlay.lineBetween(p.x, p.y - 20, to.x, to.y - 20);
      } else if (f.kind === "hit" || f.kind === "slash") {
        if (f.kind === "slash") {
          this.overlay.lineStyle(3, f.color, (1 - t) * 0.8);
          this.overlay.beginPath();
          for (let j = 0; j <= 15; j++) {
            const a = -2.2 + j * 0.17 + t * 0.5,
              x = p.x + Math.cos(a) * 35,
              y = p.y - 22 + Math.sin(a) * 20;
            if (j === 0) this.overlay.moveTo(x, y);
            else this.overlay.lineTo(x, y);
          }
          this.overlay.strokePath();
        }
        for (let i = 0; i < 5; i++) {
          const angle = i * 1.25;
          this.overlay.lineBetween(
            p.x + Math.cos(angle) * t * 25,
            p.y - 27 + Math.sin(angle) * t * 15,
            p.x + Math.cos(angle) * (t * 25 + 7),
            p.y - 27 + Math.sin(angle) * (t * 15 + 4),
          );
        }
      } else
        this.overlay.strokeEllipse(
          p.x,
          p.y,
          f.radius * 64 * (0.5 + t),
          f.radius * 32 * (0.5 + t),
        );
      if (f.text && this.e.meta.settings.damageNumbers) {
        let label = this.effectLabels.get(f.id);
        if (!label) {
          const isHeal = f.kind === "heal" && /^\+?\d+$/.test(f.text);
          const isCrit = f.text.startsWith("✦ ");
          const fontSize = isCrit ? "20px" : isHeal ? "15px" : "13px";
          const color = isHeal ? "#78d890" : isCrit ? "#ffdd66" : "#f5e7bb";
          const stroke = isHeal ? "#163420" : "#24332b";
          label = this.scene.add
            .text(p.x, p.y - 70, isHeal ? `+${f.text.replace(/^\+/, "")}` : f.text, {
              fontFamily: "Georgia",
              fontSize,
              color,
              stroke,
              strokeThickness: 3,
            })
            .setOrigin(0.5)
            .setDepth(200000);
          this.effectLabels.set(f.id, label);
        }
        label.setPosition(p.x + (f.id % 3 - 1) * 14, p.y - 65 - (this.e.meta.settings.reducedMotion ? 0 : t * 28)).setAlpha(1 - t * 0.7);
      }
    }
    for (const [id, label] of this.effectLabels)
      if (!fxIds.has(id)) {
        label.destroy();
        this.effectLabels.delete(id);
      }
  }
  destroy() {
    this.shadowOverlay.destroy();
    this.groundOverlay.destroy();
    this.overlay.destroy();
    this.dropLabels.forEach((x) => x.destroy());
    this.sprites.forEach((x) => x.destroy());
    this.labels.forEach((x) => x.destroy());
    this.levelLabels.forEach((x) => x.destroy());
    this.effectLabels.forEach((x) => x.destroy());
    this.playerAnimations.clear();
    this.enemyAnimations.clear();
    this.damageTrails.clear();
  }
}
