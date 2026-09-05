import Phaser from "phaser";
import type { Engine } from "../core/Engine";
import { MOUSE_ACTIONS, type InputManager } from "../core/InputManager";
import type { CursorManager } from "../ui/CursorManager";
import { createTextures } from "../rendering/Textures";
import { loadPlayerSheets, createPlayerFrames } from "../rendering/PlayerSprites";
import { loadEnemySheets, createEnemyFrames } from "../rendering/EnemySprites";
import { WorldRenderer } from "../rendering/WorldRenderer";
import { EntityRenderer } from "../rendering/EntityRenderer";
import { isoToWorld, worldToIso, distance } from "../world/WorldCoordinates";
import { balance } from "../data/balance";
import { classRegistry } from "../data/classes";
import { SelectionBox } from "../ui/SelectionBox";
import { RadialWheel, type RadialPage } from "../ui/RadialWheel";
import type { PartyOrder, Point } from "../core/types";

export class WorldScene extends Phaser.Scene {
  private terrain?: WorldRenderer;
  private actors?: EntityRenderer;
  private last?: Engine;
  private marker?: Phaser.GameObjects.Zone;

  // Move hold state machine (max 2 markers: 1 on down, 1 on up if moved)
  private held = false;
  private heldMoved = false;
  private heldTime = 0;
  private heldStartPos = { x: 0, y: 0 };

  // Middle mouse state machine (quick click = target, hold = radial)
  private middleDown = false;
  private middleDownTime = 0;
  private middleDownPos = { x: 0, y: 0 };
  private radialOpened = false;
  private radialPoint: Point = {x:0,y:0};
  private inputAbort = new AbortController();
  private pointerOnCanvas = false;

  // Selection box state
  private selectionBoxActive = false;
  private selectionBox?: SelectionBox;
  private radialWheel?: RadialWheel;

  pointerWorld = { x: 0, y: 0 };

  constructor(
    private getEngine: () => Engine | undefined,
    private getInput?: () => InputManager | undefined,
    private getCursor?: () => CursorManager | undefined,
  ) {
    super("World");
  }

  getRadialWheel(): RadialWheel | undefined {
    return this.radialWheel;
  }
  cancelGestures() {
    this.held = this.middleDown = this.radialOpened = this.selectionBoxActive = false;
    this.selectionBox?.cancel();
    this.radialWheel?.cancel();
    this.applySlowMo(false);
  }

  worldToScreen(p: Point): { x: number; y: number } {
    const c = this.cameras.main;
    return {
      x: ((p.x - p.y) * 32 - c.scrollX - c.width / 2) * c.zoom + c.width / 2,
      y: ((p.x + p.y) * 16 - c.scrollY - c.height / 2) * c.zoom + c.height / 2,
    };
  }

  private handleRadialSelect(page: RadialPage, optionId: string) {
    const e = this.getEngine();
    if (!e || e.run.ended) return;

    if (page === "orders") {
      const targetIds = e.commandMembers().map(m=>m.id);

      if (targetIds.length === 0) {
        e.bus.emit("notice", "Nenhuma tropa selecionada.");
        return;
      }

      const orderLabels: Record<string, string> = {
        follow: "Seguir",
        hold: "Manter Posição",
        focus: "Focar Alvo",
        passive: "Passivo",
        aggressive: "Agressivo",
        regroup: "Reagrupar",
      };

      if (optionId === "regroup") {
        e.orderMove(e.commandMembers(), e.selected);
        e.bus.emit("notice", `${targetIds.length} tropa(s) reagrupando...`);
      } else {
        for (const memberId of targetIds) {
          e.command({
            type: "memberOrder",
            memberId,
            order: optionId as PartyOrder,
          });
        }
        e.bus.emit("notice", `Ordem para ${targetIds.length} tropa(s): ${orderLabels[optionId] ?? optionId}`);
      }
    } else if (page === "pings") {
      e.command({ type: "ping", kind: optionId, point: {...this.radialPoint} });
    }
  }

  private openRadial(screenX: number, screenY: number) {
    const e = this.getEngine();
    if (!e || e.paused || e.run.ended) return;

    this.radialOpened = true;
    this.radialPoint=isoToWorld(this.cameras.main.getWorldPoint(screenX,screenY));
    const nonControlled = e.run.party.filter((m) => m.alive && m.id !== e.selected.id);
    const markedCount = e.commandMembers().length;
    this.radialWheel?.open(screenX, screenY, {
      total: nonControlled.length,
      marked: markedCount,
    });
    this.getInput?.()?.setContext("RADIAL_ORDERS");
    this.applySlowMo(true);
  }

  private applySlowMo(active: boolean) {
    const e = this.getEngine();
    if (!e) return;
    if (active) {
      const mode = e.meta.settings.radialSlowMo;
      if (mode === "50") {
        this.time.timeScale = 0.5;
      } else if (mode === "25") {
        this.time.timeScale = 0.25;
      } else {
        this.time.timeScale = 1.0;
      }
    } else {
      this.time.timeScale = 1.0;
    }
  }

  preload() {
    loadPlayerSheets(this);
    loadEnemySheets(this);
  }

  create() {
    createTextures(this);
    createPlayerFrames(this);
    createEnemyFrames(this);
    this.cameras.main.setBackgroundColor("#4b6553");
    this.cameras.main.setZoom(balance.zoom);
    this.input.mouse?.disableContextMenu();

    // Instantiate DOM overlay controllers
    this.selectionBox = new SelectionBox(document.body);
    this.radialWheel = new RadialWheel(document.body, (page, id) =>
      this.handleRadialSelect(page, id),
    );

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      const e = this.getEngine();
      if (!e || e.paused || e.run.ended) return;
      const context=this.getInput?.()?.getContext();
      if(context && context!=="GAMEPLAY" && context!=="TARGETING")return;
      this.pointerWorld = isoToWorld(this.cameras.main.getWorldPoint(p.x, p.y));
      this.pointerOnCanvas = true;
      this.hover(p);

      const input = this.getInput?.();
      const isAltDown =
        input?.isActionDown("HIGHLIGHT_CHARACTER") || p.event.altKey;

      // 1. ALT + Left Button -> Selection Box for Party Members
      if (p.button === MOUSE_ACTIONS.move && isAltDown) {
        this.selectionBoxActive = true;
        input?.setContext("SELECTION_BOX");
        this.selectionBox?.begin(p.x, p.y);
        return;
      }

      // 2. Middle Button (button 1): begin hold detection
      if (p.button === MOUSE_ACTIONS.target) {
        this.middleDown = true;
        this.middleDownTime = Date.now();
        this.middleDownPos = { x: p.x, y: p.y };
        this.radialOpened = false;
        return;
      }

      // 3. Right Button (button 2): Basic Attack
      if (p.button === MOUSE_ACTIONS.basic) {
        if (e.targeting.state?.active) {
          e.targeting.cancelPreview();
          this.getCursor?.()?.setTargeting(false);
          return;
        }

        e.basicAttack(this.pointerWorld,e.hovered?.kind==="enemy"?e.hovered.id:undefined);
        return;
      }

      // 4. Left Button (button 0): Movement or Interact
      if (p.button === 0) {
        // If skill targeting active: confirm skill
        if (e.targeting.state?.active) {
          e.targeting.confirmPreview();
          this.getCursor?.()?.setTargeting(false);
          return;
        }

        // Interactions are available in both click-to-move and WASD modes.
        if (e.hovered?.kind === "poi") {
          this.held = false;
          e.command({ type: "interact", id: e.hovered.id });
          e.bus.emit("audio", "click");
          return;
        }
        if (e.hovered?.kind === "drop") {
          const drop = e.run.drops.find(d => d.id === e.hovered?.id);
          this.held = false;
          if (drop) {
            e.command({ type: "move", point: drop, silent: false });
            e.bus.emit("audio", "click");
          }
          return;
        }
        if(e.meta.settings.movementMode==="wasd")return;

        // Left click on ground -> movement
        this.held = true;
        this.heldMoved = false;
        this.heldTime = 0;
        this.heldStartPos = { x: p.x, y: p.y };
        e.command({ type: "move", point: this.pointerWorld, silent: false });
      }
    });

    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      this.pointerWorld = isoToWorld(this.cameras.main.getWorldPoint(p.x, p.y));
      this.hover(p);

      const e = this.getEngine();
      if (e?.targeting.state?.active) {
        e.targeting.updatePreview(this.pointerWorld);
        this.getCursor?.()?.setTargeting(true, e.targeting.state.valid);
      }

      // Selection box drag update
      if (this.selectionBoxActive) {
        this.selectionBox?.update(p.x, p.y);
        return;
      }

      // Radial wheel pointer update
      if (this.radialOpened && this.radialWheel?.isActive) {
        this.radialWheel.updatePointer(p.x, p.y);
        return;
      }

      // Middle button hold detection (180ms or moved > 16px)
      if (this.middleDown && !this.radialOpened) {
        const elapsed = Date.now() - this.middleDownTime;
        const dist = Math.hypot(
          p.x - this.middleDownPos.x,
          p.y - this.middleDownPos.y,
        );
        if (elapsed > 180 || dist > 16) {
          this.openRadial(this.middleDownPos.x, this.middleDownPos.y);
        }
      }

      // Track whether left button held position moved significantly
      if (this.held) {
        const d = Math.hypot(
          p.x - this.heldStartPos.x,
          p.y - this.heldStartPos.y,
        );
        if (d > 14) this.heldMoved = true;
      }
    });

    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      const e = this.getEngine();

      // Finish selection box
      if (this.selectionBoxActive) {
        this.selectionBoxActive = false;
        const box = this.selectionBox?.finish();
        if (box && e) {
          const selectedIds: string[] = [];
          for (const member of e.run.party) {
            if (!member.alive) continue;
            const s = this.worldToScreen(member);
            if (
              s.x >= box.left &&
              s.x <= box.right &&
              s.y >= box.top &&
              s.y <= box.bottom
            ) {
              selectedIds.push(member.id);
            }
          }
          e.command({ type: "commandSelection", ids: selectedIds });
          if (selectedIds.length > 0) {
            e.bus.emit("audio", "click");
            e.bus.emit(
              "notice",
              `${selectedIds.length} tropa(s) marcada(s).`,
            );
          }
        }
        this.getInput?.()?.setContext("GAMEPLAY");
        return;
      }

      // Finish radial wheel
      if (this.radialOpened) {
        this.middleDown = false;
        this.radialOpened = false;
        this.radialWheel?.close();
        this.applySlowMo(false);
        this.getInput?.()?.setContext("GAMEPLAY");
        return;
      }

      // Quick middle click -> add hovered enemy to Target Queue
      if (this.middleDown) {
        this.middleDown = false;
        if (e && e.hovered?.kind === "enemy") {
          e.command({ type: "targetQueueAdd", id: e.hovered.id });
          e.bus.emit("audio", "click");
          e.bus.emit("notice", "Alvo adicionado à fila.");
        }
        return;
      }

      // Release left hold -> spawn final marker if dragged
      if (this.held) {
        this.held = false;
        if (this.heldMoved && e) {
          e.command({ type: "move", point: this.pointerWorld, silent: false });
        }
      }
    });

    this.input.on(
      "wheel",
      (_p: unknown, _o: unknown, _x: number, y: number) => {
        if (this.getEngine()?.paused || this.getInput?.()?.getContext() !== "GAMEPLAY") return;
        this.cameras.main.setZoom(
          Phaser.Math.Clamp(
            this.cameras.main.zoom - y * 0.001,
            balance.zoomMin,
            balance.zoomMax,
          ),
        );
      },
    );

    window.addEventListener("pointermove", (event) => {
      this.pointerOnCanvas = event.target === this.game.canvas;
      if (!this.pointerOnCanvas) {
        const e = this.getEngine();
        if (e) e.hovered = undefined;
        this.held = false;
      }
    }, { capture: true, signal: this.inputAbort.signal });
    window.addEventListener("mouseup", (event) => {
      if(event.target===this.game.canvas)return;
      this.held = false;
      this.middleDown = false;
      if (this.radialOpened) {
        this.radialOpened = false;
        this.radialWheel?.cancel();
        this.applySlowMo(false);
      }
      if (this.selectionBoxActive) {
        this.selectionBoxActive = false;
        this.selectionBox?.cancel();
      }
      if(!this.getEngine()?.paused)this.getInput?.()?.setContext("GAMEPLAY");
    }, {signal:this.inputAbort.signal});

    window.addEventListener("keydown", (event) => {
      if (event.code !== "Escape" || !this.selectionBoxActive) return;
      this.selectionBoxActive = false;
      this.selectionBox?.cancel();
      this.held = false;
      this.getInput?.()?.setContext("GAMEPLAY");
      event.stopImmediatePropagation();
      event.preventDefault();
    }, {capture:true, signal:this.inputAbort.signal});

    window.addEventListener("blur", () => {
      this.held = false;
      this.middleDown = false;
      if (this.radialOpened) {
        this.radialOpened = false;
        this.radialWheel?.cancel();
        this.applySlowMo(false);
      }
      if (this.selectionBoxActive) {
        this.selectionBoxActive = false;
        this.selectionBox?.cancel();
      }
      this.getInput?.()?.setContext(this.getEngine()?.paused?"MENU":"GAMEPLAY");
    }, {signal:this.inputAbort.signal});
  }

  private hover(pointer: Phaser.Input.Pointer) {
    const e = this.getEngine();
    if (!e) return;
    e.hovered = undefined;
    if (e.paused || e.run.ended || !this.pointerOnCanvas) return;
    const context = this.getInput?.()?.getContext();
    if (context && context !== "GAMEPLAY" && context !== "TARGETING") return;
    e.combat.face(e.selected, this.pointerWorld);
    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    let best = Infinity;
    e.hovered = undefined;

    for (const enemy of e.enemies.values()) {
      if (enemy.hp <= 0) continue;
      const p = worldToIso(enemy),
        score = Math.hypot((point.x - p.x) / 27, (point.y - p.y + 32) / 40);
      if (score < 1.25 && score < best) {
        best = score;
        e.hovered = { kind: "enemy", id: enemy.id };
      }
    }

    if (!e.hovered) {
      const drop = this.actors?.hitDrop(point);
      const poi = this.terrain?.hitPoi(point);
      if (drop) e.hovered = { kind: "drop", id: drop };
      else if (poi) e.hovered = { kind: "poi", id: poi };
    }

    // Cursor style stays the chosen game cursor — object highlights instead
    const cursor = this.getCursor?.();
    if (cursor && cursor.getStyle() !== "system") {
      this.game.canvas.style.cursor = "none";
    }
  }

  update(time: number, delta: number) {
    const e = this.getEngine();
    if (e !== this.last) {
      this.terrain?.destroy();
      this.actors?.destroy();
      this.marker?.destroy();
      this.last = e;
      if (e) {
        this.terrain = new WorldRenderer(this, e);
        this.actors = new EntityRenderer(this, e);
        const p = worldToIso(e.selected);
        this.marker = this.add.zone(p.x, p.y, 1, 1);
        this.cameras.main.startFollow(this.marker, true, 0.09, 0.09);
        this.cameras.main.centerOn(p.x, p.y);
      }
    }
    if (!e) return;
    if(this.radialOpened && !this.radialWheel?.isActive){this.radialOpened=false;this.middleDown=false;this.applySlowMo(false);this.getInput?.()?.setContext(e.paused?"MENU":"GAMEPLAY");}
    if (e.paused) {
      this.held = false;
      this.middleDown = false;
    }

    // Mutually exclusive movement: ONLY run direct WASD when mode is "wasd"
    const input = this.getInput?.();
    if (input && !e.paused) {
      if (this.radialWheel?.isActive) input.setContext(this.radialWheel.currentPage === "orders" ? "RADIAL_ORDERS" : "RADIAL_PINGS");
      else if (["GAMEPLAY", "TARGETING"].includes(input.getContext())) input.setContext(e.targeting.state?.active ? "TARGETING" : "GAMEPLAY");
    }
    if (input && !e.paused && !e.run.ended && input.getContext()==="GAMEPLAY") {
      if (e.meta.settings.movementMode === "wasd") {
        const vec = input.getWorldMovementVector();
        if (vec.x !== 0 || vec.y !== 0) {
          e.directMove(vec.x, vec.y, delta / 1000);
          this.held = false;
        }
      }

      e.showLootLabels = e.meta.settings.groundLootLabels === "alt" ? input.isActionDown("HIGHLIGHT_CHARACTER") : Boolean(
        input.isActionDown("SHOW_LOOT") ||
          input.isActionDown("HIGHLIGHT_CHARACTER") ||
          e.meta.settings.alwaysShowLoot ||
          e.meta.settings.groundLootLabels === "always",
      );
    }

    // Continuous Left Mouse Hold -> update destination silently (no marker spam)
    if (this.held && !e.paused && e.meta.settings.movementMode!=="wasd" && input?.getContext()==="GAMEPLAY") {
      this.heldTime += delta / 1000;
      if (this.heldTime >= balance.heldMoveInterval) {
        this.heldTime = 0;
        const pointer = this.input.activePointer;
        this.pointerWorld = isoToWorld(
          this.cameras.main.getWorldPoint(pointer.x, pointer.y),
        );
        if (distance(this.pointerWorld, e.selected) > 0.6) {
          e.command({ type: "move", point: this.pointerWorld, silent: true });
        }
      }
    }

    // Middle button hold check in update loop
    if (this.middleDown && !this.radialOpened) {
      const elapsed = Date.now() - this.middleDownTime;
      if (elapsed > Math.max(180, Math.min(220, e.meta.settings.radialHoldDelay ?? 200))) {
        this.openRadial(this.middleDownPos.x, this.middleDownPos.y);
      }
    }

    const speed=this.radialWheel?.isActive ? (e.meta.settings.radialSlowMo==="25"?.25:e.meta.settings.radialSlowMo==="50"?.5:1) : 1;
    e.update(delta / 1000 * speed);
    // Camera movement can change the object under a stationary pointer.
    const pointer = this.input.activePointer;
    this.pointerWorld = isoToWorld(this.cameras.main.getWorldPoint(pointer.x, pointer.y));
    this.hover(pointer);
    this.terrain?.update();
    this.actors?.update(time);

    const p = worldToIso(e.selected);
    if (
      this.marker &&
      Phaser.Math.Distance.Between(this.marker.x, this.marker.y, p.x, p.y) > 900
    ) {
      this.marker.setPosition(p.x, p.y);
      this.cameras.main.centerOn(p.x, p.y);
    }
    this.marker?.setPosition(p.x, p.y);
  }

  destroy() {
    this.inputAbort.abort();
    this.selectionBox?.destroy();
    this.radialWheel?.destroy();
  }
}
