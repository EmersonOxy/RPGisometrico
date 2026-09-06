import { describe, it, expect } from "vitest";
import "fake-indexeddb/auto";
import { SaveRepository, defaultMeta } from "../src/persistence/SaveRepository";
import { newRun } from "../src/core/Run";
import { Engine } from "../src/core/Engine";
import { EventBus } from "../src/core/EventBus";
import { applySandbox } from "../src/ui/SandboxView";

describe("sandbox keep (Incorporar a partida e salvar)", () => {
  it("replica begin -> mutar -> endSandbox(keep) -> load", async () => {
    const repo = new SaveRepository("test-sandbox-keep");
    let meta = defaultMeta();
    let run = newRun("seed-sandbox", "fighter", meta);
    const bus = new EventBus();
    const save = async () => {
      await repo.save(meta, run);
    };
    let engine: Engine | undefined = new Engine(run, meta, bus, save);
    let sandboxSnapshot: { meta: typeof meta; run: typeof run } | undefined;
    try {
      // beginSandbox
      await engine.save();
      sandboxSnapshot = structuredClone({ meta, run: engine.run });
      engine.sandboxActive = true;
      // mutações do laboratório
      applySandbox(engine, {
        level: 5, silver: 111, gold: 222, hp: 50, resource: 60,
        points: 3, statPoints: 2, timeScale: 1,
        godMode: false, freezeEnemies: false, noCooldowns: false,
        unlimitedResource: false,
        shooterLevel: 1, shooterPrice: 0, tankLevel: 1, tankPrice: 0,
        mageLevel: 1, magePrice: 0,
      });
      // endSandbox(true)
      const state = structuredClone({ meta, run: engine.run });
      engine.destroy();
      sandboxSnapshot = undefined;
      meta = state.meta;
      run = state.run;
      engine = new Engine(run, meta, bus, save);
      await engine.save();
      const loaded = await repo.load();
      expect(loaded.meta.silver).toBe(111);
      expect(loaded.run?.party[0].level).toBe(5);
    } finally {
      engine?.destroy();
      repo.close();
    }
  });
});
