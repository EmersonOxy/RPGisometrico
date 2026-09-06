import { giveTestKit } from "./skill-fixtures";
import { describe, it, expect, vi } from "vitest";
import { InputManager, DEFAULT_KEYBINDINGS } from "../src/core/InputManager";
import { DiscoveryMask } from "../src/world/DiscoveryMask";
import { newRun } from "../src/core/Run";
import { defaultMeta } from "../src/persistence/SaveRepository";
import { Engine } from "../src/core/Engine";
import { EventBus } from "../src/core/EventBus";
import { statsFor, addExperience } from "../src/progression/Character";
import { xpRequiredForLevel } from "../src/data/balance";
import { TargetingSystem } from "../src/combat/TargetingSystem";

describe("Terceira Passagem de Polimento - Input, Mascara, Atributos e Ordens", () => {
  describe("InputManager", () => {
    it("inicializa com mapeamentos padrão e detecta conflitos de teclas", () => {
      const input = new InputManager();
      expect(input.getBindings().MOVE_UP).toBe("KeyW");
      expect(input.getBindings().ABILITY_1).toBe("KeyQ");

      // Set conflict
      const conflict = input.findConflict("MOVE_DOWN", "KeyW");
      expect(conflict).toBe("MOVE_UP");

      // Rebind without conflict
      input.setBinding("ABILITY_1", "KeyZ");
      expect(input.getBindings().ABILITY_1).toBe("KeyZ");

      // Reset
      input.resetBindings();
      expect(input.getBindings().ABILITY_1).toBe("KeyQ");
    });

    it("calcula vetor isométrico normalizado a partir de teclas de movimento", () => {
      const input = new InputManager();

      // Simulate keydown on W and D
      input.simulateKeyDown("KeyW");
      input.simulateKeyDown("KeyD");

      const screenVec = input.getScreenMovementVector();
      expect(screenVec.x).toBeGreaterThan(0); // D = right
      expect(screenVec.y).toBeLessThan(0); // W = up

      const worldVec = input.getWorldMovementVector();
      const length = Math.hypot(worldVec.x, worldVec.y);
      expect(length).toBeCloseTo(1, 4);

      // Clear
      input.simulateKeyUp("KeyW");
      input.simulateKeyUp("KeyD");
      expect(input.getWorldMovementVector()).toEqual({ x: 0, y: 0 });
    });
  });

  describe("DiscoveryMask 16x16", () => {
    it("registra células 16x16 através de fronteiras de chunks e serializa", () => {
      const mask = new DiscoveryMask();
      const result = mask.discoverAround(0, 0, 11);

      expect(result.cellCount).toBeGreaterThan(0);
      expect(result.newlyTouchedChunks.length).toBeGreaterThan(0);

      // Verify discovered cell at center
      expect(mask.isDiscovered(0, 0)).toBe(true);

      // Serialize and reload in new mask
      const serialized = mask.serialize();
      expect(typeof serialized === "object").toBe(true);

      const reloaded = DiscoveryMask.deserialize(serialized);
      expect(reloaded.isDiscovered(0, 0)).toBe(true);
      expect(reloaded.getChunkBitfield(0, 0)).toBeDefined();
    });

    it("aplica máscara orgânica sem costuras artificiais", () => {
      const mask = new DiscoveryMask();
      mask.discoverAround(16, 16, 8); // near chunk border (chunk size is 32)
      // Cell (8, 8) in chunk (0, 0)
      expect(mask.isCellDiscovered(0, 0, 8, 8)).toBe(true);
    });
  });

  describe("Sistema de Pontos de Atributo", () => {
    it("concede pontos por nível e recalcula estatísticas com base nas fórmulas", () => {
      const meta = defaultMeta();
      const run = newRun("test-seed", "fighter", meta);
      const hero = run.party[0];

      // Starts with 1 point at level 1 to allow starting customization
      expect(hero.statPoints).toBe(1);
      const baseHealth = statsFor(hero).health;
      const baseArmor = statsFor(hero).armor;
      const baseSpeed = statsFor(hero).speed;

      // Create engine to issue command
      const bus = new EventBus();
      const engine = new Engine(run, meta, bus, async () => {});

      // Allocate starting vitality point
      engine.command({ type: "stat", stat: "vitality" });
      expect(hero.statPoints).toBe(0);
      expect(hero.allocatedStats?.vitality).toBe(3); // base 2 + 1
      expect(statsFor(hero).health).toBeGreaterThan(baseHealth);

      // Level up hero to level 2
      addExperience(hero, xpRequiredForLevel(1));
      expect(hero.level).toBe(2);
      expect(hero.statPoints).toBe(1);

      // Allocate armor
      engine.command({ type: "stat", stat: "armor" });
      expect(statsFor(hero).armor).toBeGreaterThan(baseArmor);

      // Level up to level 3 and allocate speed
      addExperience(hero, xpRequiredForLevel(2));
      engine.command({ type: "stat", stat: "speed" });
      expect(statsFor(hero).speed).toBeGreaterThan(baseSpeed);
    });
  });

  describe("Ordens Individuais da Comitiva", () => {
    it("atribui ordens individuais aos membros e respeita ordem de manter posição", () => {
      const meta = defaultMeta();
      const run = newRun("test-party", "fighter", meta);
      const bus = new EventBus();
      const engine = new Engine(run, meta, bus, async () => {});

      // Add companion to party
      const companion = {
        ...run.party[0],
        id: "companion:tank",
        name: "Guardião",
        classId: "tank" as const,
        partyOrder: "follow" as const,
        path: [{ x: 5, y: 5 }],
      };
      run.party.push(companion);

      expect(companion.partyOrder).toBe("follow");

      // Assign hold order
      engine.command({
        type: "memberOrder",
        memberId: companion.id,
        order: "hold",
      });
      expect(companion.partyOrder).toBe("hold");
      expect(companion.path.length).toBe(0);

      // Assign focus target
      engine.command({ type: "focusTarget", id: "enemy:boss" });
      expect(run.focusTargetId).toBe("enemy:boss");
    });
  });

  describe("TargetingSystem e Smart Approach", () => {
    it("inicia e confirma preview de targeting para habilidades de área ou solo", () => {
      const meta = defaultMeta();
      const run = newRun("test-targeting", "fighter", meta);
      const bus = new EventBus();
      const engine = new Engine(run, meta, bus, async () => {});

      const ts = engine.targeting;
      expect(ts.state).toBeNull();

      // Start preview for ability slot 0
      giveTestKit(engine.selected); ts.startPreview(0, { x: 5, y: 5 });
      expect(ts.state).not.toBeNull();
      expect(ts.state?.slot).toBe(0);

      // Update pointer
      ts.updatePreview({ x: 6, y: 6 });
      expect(ts.state?.pointerWorld).toEqual({ x: 6, y: 6 });

      // Cancel preview
      ts.cancelPreview();
      expect(ts.state).toBeNull();
    });

    it("executa smart approach quando habilidade requer alvo e este está fora de alcance", () => {
      const meta = defaultMeta();
      meta.settings.autoApproach = true;
      const run = newRun("test-smart", "fighter", meta);
      const bus = new EventBus();
      const engine = new Engine(run, meta, bus, async () => {});

      // Spawn an enemy far away
      const enemyId = "test:target";
      engine.enemies.set(enemyId, {
        id: enemyId,
        definition: "golem",
        x: 10,
        y: 10,
        level: 1,
        elite: false,
        hp: 100,
        maxHp: 100,
        modifier: "swift",
        statuses: [],
        path: [],
        state: "IDLE",
        timer: 0,
        aiTime: 1,
        attackTime: 1,
        home: { x: 10, y: 10 },
        threat: {},
      });

      engine.selected.x = 0;
      engine.selected.y = 0;
      engine.selected.target = enemyId;

      // Slot 0 for fighter is basic attack / skill
      giveTestKit(engine.selected); const result = engine.targeting.executeAbility(0, { x: 10, y: 10 });
      // Smart approach started
      expect(result).toBe(true);
      expect(engine.targeting.pendingSkill).not.toBeNull();
      expect(engine.targeting.pendingSkill?.targetId).toBe(enemyId);
    });
  });
});
