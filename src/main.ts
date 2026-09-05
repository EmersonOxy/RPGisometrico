import Phaser from "phaser";
import "./ui/style.css";
import { Engine } from "./core/Engine";
import { EventBus } from "./core/EventBus";
import { freshGame } from "./core/Run";
import type { ClassId, MetaProgress, RunState } from "./core/types";
import { SaveRepository, defaultMeta } from "./persistence/SaveRepository";
import { UI } from "./ui/UI";
import { WorldScene } from "./game/WorldScene";
import { AudioFeedback } from "./game/Audio";
import { InputManager } from "./core/InputManager";
import { CursorManager } from "./ui/CursorManager";
const repository = new SaveRepository(),
  bus = new EventBus();
let engine: Engine | undefined;
let meta: MetaProgress = defaultMeta(),
  run: RunState | null = null;
let saveError = "";
let sandboxSnapshot: {meta: MetaProgress; run: RunState} | undefined;
try {
  const save = await repository.load();
  meta = save.meta;
  run = save.run;
} catch {
  saveError =
    "Não foi possível ler o save. O progresso existente não será sobrescrito automaticamente.";
}
const save = async () => {
  if (sandboxSnapshot) return;
  if (saveError) throw Error(saveError);
  await repository.save(meta, engine?.run ?? run);
};
const inputManager = new InputManager(meta.settings.keybindings);
const cursorManager = new CursorManager(
  document.body,
  meta.settings.cursorStyle ?? "classic",
);
const worldScene = new WorldScene(
  () => engine,
  () => inputManager,
  () => cursorManager,
);
const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: "game",
  backgroundColor: "#3d5949",
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  render: { antialias: true, pixelArt: false },
  scene: [worldScene],
  audio: { noAudio: true },
  banner: false,
});
const app = {
  get meta() {
    return meta;
  },
  get run() {
    return engine?.run ?? run;
  },
  get engine() {
    return engine;
  },
  get input() {
    return inputManager;
  },
  get cursor() {
    return cursorManager;
  },
  get radial() {
    return () => worldScene.getRadialWheel();
  },
  cancelGestures: () => worldScene.cancelGestures(),
  get sandbox() { return !!sandboxSnapshot; },
  beginSandbox() {
    if (!engine || sandboxSnapshot) return;
    void engine.save();
    sandboxSnapshot = structuredClone({meta, run: engine.run});
    engine.sandboxActive = true;
  },
  endSandbox(keep: boolean) {
    if (!sandboxSnapshot || !engine) return;
    const state = keep ? structuredClone({meta, run:engine.run}) : sandboxSnapshot;
    worldScene.cancelGestures(); inputManager.clear(); engine.destroy();
    sandboxSnapshot = undefined; meta = state.meta; run = state.run;
    engine = new Engine(run, meta, bus, save);
    void engine.save();
  },
  start(seed: string, cls: ClassId) {
    if (cls !== "fighter") throw Error("Uma nova jornada começa com o Lutador.");
    worldScene.cancelGestures(); inputManager.clear(); cursorManager.setTargeting(false);
    engine?.destroy();
    sandboxSnapshot = undefined;
    const fresh = freshGame(seed, meta);
    meta = fresh.meta; run = fresh.run;
    engine = new Engine(run, meta, bus, save);
    void engine.save();
  },
  resume() {
    if (run && !run.ended) {
      engine?.destroy();
      engine = new Engine(run, meta, bus, save);
    }
  },
  menu() {
    if (sandboxSnapshot) app.endSandbox(false);
    if (engine) {
      run = engine.run.ended ? null : engine.run;
      engine.destroy();
      engine = undefined;
    }
  },
  save,
  pointer: () => worldScene.pointerWorld,
  screen: (p: { x: number; y: number }) => {
    const c = worldScene.cameras.main;
    return {
      x: ((p.x - p.y) * 32 - c.scrollX - c.width / 2) * c.zoom + c.width / 2,
      y: ((p.x + p.y) * 16 - c.scrollY - c.height / 2) * c.zoom + c.height / 2,
    };
  },
  fps: () => game.loop.actualFps,
};
const ui = new UI(app, bus),
  audio = new AudioFeedback(bus, () => meta.settings);
document.addEventListener("pointerdown", () => audio.unlock(), { once: true });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) void engine?.save();
});
if (saveError) ui.notice(saveError);
if (import.meta.env.DEV) {
  Object.defineProperty(window, "__game", {
    value: {
      get engine() {
        return engine;
      },
      get meta() {
        return meta;
      },
      get run() {
        return engine?.run ?? run;
      },
      save,
      game,
      ui,
    },
    configurable: true,
  });
}
