import type { Save, MetaProgress, RunState } from "../core/types";
export const defaultMeta = (): MetaProgress => ({
  silver: 45,
  gold: 2,
  unlockedClasses: [],
  settings: {
    sound: true,
    volume: 0.25,
    damageNumbers: true,
    wasd: false,
    secondary: 0,
    uiScale: 1,
    fontScale: 1,
    reducedMotion: false,
    movementMode: "click",
    quickCast: true,
    minimapOrientation: "north-up",
    minimapSize: 180,
    minimapOpacity: 0.9,
    hoverHighlight: true,
    highlightIntensity: "normal",
    highlightPalette: "default",
    xpDisplay: "current-required",
    characterIndicator: "hold",
    autoPickup: true,
    alwaysShowLoot: false,
    confirmStats: true,
    autoApproach: true,
    cursorStyle: "classic",
    cursorSize: 1,
    overheadLevel: true,
    overheadResource: true,
    vfxQuality: "high",
    particles: true,
    screenShake: true,
    fpsCounter: false,
    fpsLimit: 60,
    audioMaster: 0.8,
    audioMusic: 0.7,
    audioEffects: 0.8,
    audioInterface: 0.8,
    audioAmbient: 0.7,
    muteMaster: false,
    muteMusic: false,
    muteEffects: false,
    muteInterface: false,
    muteAmbient: false,
    keybindings: {},
  },
  tutorials: {},
  statistics: { runs: 0, kills: 0 },
});
export function migrateSave(value: unknown): Save {
  if (!value || typeof value !== "object") throw Error("Save inválido");
  const v = value as Partial<Save> & {
    schemaVersion?: number;
    version?: number;
    wallet?: { silver: number; gold: number };
    unlockedClasses?: MetaProgress["unlockedClasses"];
  };
  if (Number(v.schemaVersion ?? v.version ?? 1) > 4)
    throw Error("Save de versão mais recente");
  const meta = { ...defaultMeta(), ...v.meta };
  meta.settings = { ...defaultMeta().settings, ...v.meta?.settings };
  meta.tutorials = { ...v.meta?.tutorials };
  if (v.wallet) {
    meta.silver = v.wallet.silver;
    meta.gold = v.wallet.gold;
    meta.unlockedClasses = v.unlockedClasses ?? [];
  }
  const run = v.run ?? null;
  if (run) {
    if (!Array.isArray(run.party) || typeof run.seed !== "string")
      throw Error("Expedição inválida");
    run.worldVersion ??= 1;
    run.cartography ??= {};
    run.drops ??= [];
    run.deltas ??= {};
    run.discovered ??= [];
    run.discoveryMask ??= {};
    run.command ??= "follow";
    run.rng ??= 1;
    run.jewels ??= [];
    run.ended ??= !run.party.some((c) => c.alive);
    for (const c of run.party) {
      c.statPoints ??= Math.max(0, c.level - 1);
      c.allocatedStats ??= {
        vitality: 0,
        armor: 0,
        speed: 0,
        mana: 0,
        luck: 0,
        charisma: 0,
      };
      c.partyOrder ??= "follow";
      c.facingAngle ??= 0;
    }
  }
  return { schemaVersion: 4, meta, run: run?.ended ? null : run };
}
export class SaveRepository {
  private db?: IDBDatabase;
  private queue: Promise<void> = Promise.resolve();
  constructor(private name = "cinzas-horizonte") {}
  private open(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.name, 3);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains("state"))
          req.result.createObjectStore("state");
      };
      req.onsuccess = () => {
        this.db = req.result;
        resolve(req.result);
      };
      req.onerror = () => reject(req.error);
    });
  }
  async load(): Promise<Save> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const req = db
        .transaction("state", "readonly")
        .objectStore("state")
        .get("current");
      req.onsuccess = () => {
        try {
          resolve(
            req.result
              ? migrateSave(req.result)
              : { schemaVersion: 3, meta: defaultMeta(), run: null },
          );
        } catch (e) {
          reject(e);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }
  save(meta: MetaProgress, run: RunState | null): Promise<void> {
    const snapshot: Save = structuredClone({
      schemaVersion: 4,
      meta,
      run: run?.ended ? null : run,
    });
    const operation = this.queue
      .catch(() => {})
      .then(async () => {
        const db = await this.open();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction("state", "readwrite");
          tx.objectStore("state").put(snapshot, "current");
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error ?? Error("Save interrompido"));
        });
      });
    this.queue = operation;
    return operation;
  }
  async clear() {
    await this.queue;
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("state", "readwrite");
      tx.objectStore("state").clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  close() {
    this.db?.close();
    this.db = undefined;
  }
}
