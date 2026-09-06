import { describe, it, expect } from "vitest";
import "fake-indexeddb/auto";
import { SaveRepository, defaultMeta } from "../src/persistence/SaveRepository";
import { newRun } from "../src/core/Run";
import { Engine } from "../src/core/Engine";
import { EventBus } from "../src/core/EventBus";

describe("save manual (menu Esc > Salvar agora)", () => {
  it("engine.save() persiste e load() devolve o progresso", async () => {
    const repo = new SaveRepository("test-manual-save");
    const meta = defaultMeta();
    const run = newRun("seed-teste", "fighter", meta);
    const bus = new EventBus();
    const engine = new Engine(run, meta, bus, () => repo.save(meta, run));
    try {
      // muta estado como a gameplay faria
      engine.selected.x = 12.5;
      engine.selected.y = -3.25;
      meta.silver = 777;
      engine.run.stats.kills = 5;
      // equivale ao case "save" do menu de pausa
      await engine.save();
      expect(engine.saveStatus).toBe("Salvo");
      const loaded = await repo.load();
      expect(loaded.run?.party[0].x).toBeCloseTo(12.5);
      expect(loaded.run?.party[0].y).toBeCloseTo(-3.25);
      expect(loaded.meta.silver).toBe(777);
      expect(loaded.run?.stats.kills).toBe(5);
    } finally {
      engine.destroy();
      repo.close();
    }
  });
});
