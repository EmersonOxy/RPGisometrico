import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Engine } from "../src/core/Engine";
import { EventBus } from "../src/core/EventBus";
import { defaultMeta } from "../src/persistence/SaveRepository";
import { newRun } from "../src/core/Run";
import { formatKeyBinding } from "../src/core/InputManager";
import { ORDER_OPTIONS, PING_OPTIONS } from "../src/ui/RadialWheel";
import { createCharacter } from "../src/progression/Character";
import { generateChunk } from "../src/world/generation/WorldGenerator";
import type { MetaProgress, RunState } from "../src/core/types";

describe("Quarta Passagem de Polimento - Sistemas Centrais", () => {
  let bus: EventBus;
  let meta: MetaProgress;
  let run: RunState;
  let engine: Engine;

  beforeEach(() => {
    bus = new EventBus();
    meta = defaultMeta();
    run = newRun("seed-pass4", "fighter", meta);
    engine = new Engine(run, meta, bus, async () => {});
  });
  afterEach(() => engine.destroy());

  it("preserva alvo descarregado durante a tolerância, depois o remove", () => {
    engine.command({type:"targetQueueAdd",id:"unloaded"});
    for(let i=0;i<20;i++)engine.update(.05);
    expect(run.focusTargetId).toBe("unloaded");
    for(let i=0;i<90;i++)engine.update(.05);
    expect(run.targetQueue).toEqual([]);
    expect(run.focusTargetId).toBeUndefined();
  });
  it("remove alvo próximo sem caminho somente após tolerância",()=>{
    const c=engine.selected;
    engine.world.cell=(x,y)=>({x,y,biome:"plains",blocked:x>Math.floor(c.x),cost:1,decor:0,variant:0});
    engine.enemies.set("blocked",{id:"blocked",definition:"slime",x:c.x+3,y:c.y,home:{x:c.x+3,y:c.y},level:1,hp:100,maxHp:100,elite:false,modifier:"swift",statuses:[],path:[],threat:{},state:"IDLE",timer:0,aiTime:999,attackTime:999});
    engine.command({type:"targetQueueAdd",id:"blocked"});
    for(let i=0;i<20;i++)engine.update(.05);
    expect(run.focusTargetId).toBe("blocked");
    for(let i=0;i<90;i++)engine.update(.05);
    expect(run.targetQueue).toEqual([]);
  });

  for(const kind of ["move-here","regroup-here","defend-here","attack-here"]) it(`${kind}: respeita apenas aliado selecionado e mantém ordem persistente`,()=>{
    const c=createCharacter("mage","ping-ally",engine.selected.x+1,engine.selected.y,1);
    run.party.push(c);c.partyOrder="passive";run.commandSelection=[c.id];
    engine.command({type:"ping",kind,point:{x:engine.selected.x+4,y:engine.selected.y}});
    expect(c.path.length).toBeGreaterThan(0);expect(engine.orders.has(c.id)).toBe(true);
    expect(engine.orders.has(engine.selected.id)).toBe(false);expect(engine.selected.path).toEqual([]);
    expect(c.partyOrder).toBe("passive");
  });

  it("perigo não muda ordens; marcador substitui posição; limpar remove fila",()=>{
    const point={x:engine.selected.x+3,y:engine.selected.y};
    engine.command({type:"ping",kind:"danger",point});
    expect(engine.orders.size).toBe(0);expect(engine.selected.path).toEqual([]);
    engine.command({type:"ping",kind:"marker",point});
    engine.command({type:"ping",kind:"marker",point:{x:point.x+1,y:point.y}});
    expect(run.marker).toEqual({x:point.x+1,y:point.y});
    engine.command({type:"targetQueueAdd",id:"queued"});
    engine.command({type:"ping",kind:"clear-targets",point});
    expect(run.targetQueue).toEqual([]);expect(run.focusTargetId).toBeUndefined();
  });

  it("investigar agenda aproximação ao POI e interage ao chegar",()=>{
    const c=engine.selected, poi={id:"ping-shrine",kind:"shrine" as const,x:c.x,y:c.y};
    engine.world.chunks.set("0,0", {...generateChunk(run.seed,0,0),pois:[poi],spawns:[]});
    c.hp=10;engine.command({type:"ping",kind:"investigate",point:poi});
    expect(engine.orders.get(c.id)?.poi).toBe(poi.id);
    engine.update(.1);expect(c.hp).toBeGreaterThan(10);expect(engine.orders.has(c.id)).toBe(false);
  });

  describe("Target Queue & Priority", () => {
    it("adiciona inimigos à targetQueue e define o primeiro como focusTargetId", () => {
      engine.command({ type: "targetQueueAdd", id: "enemy-1" });
      expect(run.targetQueue).toContain("enemy-1");
      expect(run.focusTargetId).toBe("enemy-1");

      engine.command({ type: "targetQueueAdd", id: "enemy-2" });
      expect(run.targetQueue).toEqual(["enemy-1", "enemy-2"]);
      expect(run.focusTargetId).toBe("enemy-1");
    });

    it("respeita limite máximo de 8 alvos na fila FIFO", () => {
      for (let i = 1; i <= 10; i++) {
        engine.command({ type: "targetQueueAdd", id: `enemy-${i}` });
      }
      expect(run.targetQueue?.length).toBe(8);
      expect(run.targetQueue).toEqual(Array.from({length:8}, (_,i)=>`enemy-${i+1}`));
      expect(run.focusTargetId).toBe("enemy-1");
    });

    it("limpa fila de alvos com targetQueueClear", () => {
      engine.command({ type: "targetQueueAdd", id: "enemy-1" });
      engine.command({ type: "targetQueueAdd", id: "enemy-2" });
      engine.command({ type: "targetQueueClear" });
      expect(run.targetQueue).toEqual([]);
      expect(run.focusTargetId).toBeUndefined();
    });

    it("remove alvos mortos e promove o próximo alvo da fila durante update", () => {
      // Create mock enemies
      engine.enemies.set("foe-1", {
        id: "foe-1",
        definition: "golem",
        level: 1,
        hp: 100,
        maxHp: 100,
        elite: false,
        modifier: "swift",
        statuses: [],
        path: [],
        state: "IDLE",
        timer: 0,
        aiTime: 0.5,
        attackTime: 1,
        home: { x: 0, y: 0 },
        threat: {},
        x: 0,
        y: 0,
      });
      engine.enemies.set("foe-2", {
        id: "foe-2",
        definition: "golem",
        level: 1,
        hp: 100,
        maxHp: 100,
        elite: false,
        modifier: "armored",
        statuses: [],
        path: [],
        state: "IDLE",
        timer: 0,
        aiTime: 0.5,
        attackTime: 1,
        home: { x: 0, y: 0 },
        threat: {},
        x: 0,
        y: 0,
      });

      engine.command({ type: "targetQueueAdd", id: "foe-1" });
      engine.command({ type: "targetQueueAdd", id: "foe-2" });
      expect(run.focusTargetId).toBe("foe-1");

      // foe-1 dies
      engine.enemies.get("foe-1")!.hp = 0;
      engine.update(0.1);

      expect(run.targetQueue).toEqual(["foe-2"]);
      expect(run.focusTargetId).toBe("foe-2");
    });
  });

  describe("Command Selection & Formation Movement", () => {
    it("atribui membros para commandSelection e limpa corretamente", () => {
      expect(run.commandSelection).toEqual([]);
      const heroIds = run.party.map((m) => m.id);

      engine.command({ type: "commandSelection", ids: heroIds.slice(0, 2) });
      expect(run.commandSelection).toEqual(heroIds.slice(0, 2));

      engine.command({ type: "commandSelection", ids: [] });
      expect(run.commandSelection).toEqual([]);
    });

    it("move múltiplos membros selecionados com formação em posições distintas", () => {
      for (const [i, cls] of (["mage", "tank", "shooter"] as const).entries()) run.party.push(createCharacter(cls, `ally-${i}`, engine.selected.x + i + 1, engine.selected.y, 1));
      const heroIds = run.party.map((m) => m.id);
      engine.command({ type: "commandSelection", ids: heroIds });

      const dest = { x: engine.selected.x + 5, y: engine.selected.y };
      engine.command({ type: "move", point: dest, silent: true });

      // All party members should have destinations near dest
      for (const m of run.party) {
        expect(m.path.length).toBeGreaterThan(0);
        if (m.path.length > 0) {
          const finalStep = m.path[m.path.length - 1];
          expect(Math.hypot(finalStep.x - dest.x, finalStep.y - dest.y)).toBeLessThan(5);
        }
      }
      expect(new Set(run.party.map(m=>JSON.stringify(m.path.at(-1)))).size).toBe(4);
    });

    it("aplica ordem de reagrupamento movendo aliados para perto do líder", () => {
      const leader = engine.selected;
      const companion = createCharacter("mage", "regroup-ally", leader.x + 5, leader.y, 1);
      run.party.push(companion);
      engine.command({type:"commandSelection", ids:[companion.id]});
      engine.command({ type: "party", command: "regroup" });

      for (const ally of run.party) {
        if (ally.id !== leader.id) {
          expect(ally.path.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("Radial Wheel Options & Pages", () => {
    it("possui 6 opções na página de ordens incluindo Reagrupar", () => {
      expect(ORDER_OPTIONS.length).toBe(6);
      expect(ORDER_OPTIONS.map((o) => o.id)).toContain("regroup");
      expect(ORDER_OPTIONS.map((o) => o.id)).toContain("follow");
      expect(ORDER_OPTIONS.map((o) => o.id)).toContain("hold");
      expect(ORDER_OPTIONS.map((o) => o.id)).toContain("focus");
      expect(ORDER_OPTIONS.map((o) => o.id)).toContain("passive");
      expect(ORDER_OPTIONS.map((o) => o.id)).toContain("aggressive");
    });

    it("possui as 8 opções propostas na página de pings", () => {
      expect(PING_OPTIONS.length).toBe(8);
      const pingIds = PING_OPTIONS.map((p) => p.id);
      expect(pingIds).toContain("attack-here");
      expect(pingIds).toContain("move-here");
      expect(pingIds).toContain("defend-here");
      expect(pingIds).toContain("danger");
      expect(pingIds).toContain("regroup-here");
      expect(pingIds).toContain("investigate");
      expect(pingIds).toContain("clear-targets");
      expect(pingIds).toContain("marker");
    });
  });

  describe("Keybinding Formatting", () => {
    it("formata códigos de tecla de maneira legível", () => {
      expect(formatKeyBinding("KeyQ")).toBe("Q");
      expect(formatKeyBinding("KeyW")).toBe("W");
      expect(formatKeyBinding("Digit1")).toBe("1");
      expect(formatKeyBinding("Space")).toBe("Espaço");
      expect(formatKeyBinding("Escape")).toBe("Esc");
      expect(formatKeyBinding("Tab")).toBe("Tab");
      expect(formatKeyBinding("AltLeft")).toBe("Alt");
      expect(formatKeyBinding("Mouse2")).toBe("Mouse 2");
      expect(formatKeyBinding("Mouse0")).toBe("Mouse 1");
      expect(formatKeyBinding("Mouse1")).toBe("Mouse 3");
    });
  });

  describe("Loot Pickup & Full Inventory Notice", () => {
    it("emite aviso de mochila cheia e não adquire item se inventário lotado", () => {
      // Fill inventory to balance.inventorySize (36)
      run.inventory = Array.from({ length: 36 }, (_, i) => ({
        id: `mock-item-${i}`,
        baseId: "sword",
        name: "Espada Antiga",
        slot: "weapon",
        rarity: 0,
        level: 1,
        requiredLevel: 1,
        stats: {},
        affixes: [],
        tags: [],
        value: 10,
      }));

      // Add ground drop right on the hero
      run.drops = [
        {
          id: "ground-drop-1",
          kind: "item",
          amount: 1,
          x: engine.selected.x,
          y: engine.selected.y,
          item: {
            id: "overflow-item",
            baseId: "armor",
            name: "Armadura Pesada",
            slot: "armor",
            rarity: 1,
            level: 1,
            requiredLevel: 1,
            stats: {},
            affixes: [],
            tags: [],
            value: 20,
          },
        },
      ];

      let noticeReceived = "";
      bus.on("notice", (msg) => {
        noticeReceived = msg;
      });

      engine.pickup();

      // Drop should remain on ground because backpack was full
      expect(run.drops.length).toBe(1);
      expect(noticeReceived).toBe("Mochila cheia");
    });
  });

  describe("Santuário - Ressurreição e Bênçãos", () => {
    it("revive membro caído da equipe ao interagir com o santuário pagando moedas", () => {
      const companion = createCharacter("mage", "comp-1", engine.selected.x + 0.5, engine.selected.y, 1);
      companion.alive = false;
      companion.hp = 0;
      companion.path = [];
      run.party.push(companion);

      // Give player sufficient silver
      meta.silver = 50;

      let noticeMsg = "";
      bus.on("notice", (m) => { noticeMsg = m; });

      // Add shrine POI to an active chunk
      const shrinePoi = { id: "test-shrine", kind: "shrine" as const, x: engine.selected.x, y: engine.selected.y };
      engine.world.chunks.set("0,0", {
        key: "0,0",
        cx: 0,
        cy: 0,
        pois: [shrinePoi],
      } as any);

      engine.interact("test-shrine");

      // Companion should be revived with positive health
      expect(companion.alive).toBe(true);
      expect(companion.hp).toBeGreaterThan(0);
      expect(meta.silver).toBe(25); // 50 - 25
      expect(noticeMsg).toContain("foi revivido pelo santuário");
    });

    it("não revive companheiro se moedas forem insuficientes e avisa jogador", () => {
      const companion = createCharacter("mage", "comp-2", engine.selected.x + 0.5, engine.selected.y, 1);
      companion.alive = false;
      companion.hp = 0;
      run.party.push(companion);
      meta.silver = 10; // less than 25 required

      let noticeMsg = "";
      bus.on("notice", (m) => { noticeMsg = m; });

      const shrinePoi = { id: "test-shrine-poor", kind: "shrine" as const, x: engine.selected.x, y: engine.selected.y };
      engine.world.chunks.set("0,0", {
        key: "0,0",
        cx: 0,
        cy: 0,
        pois: [shrinePoi],
      } as any);

      engine.interact("test-shrine-poor");

      expect(companion.alive).toBe(false);
      expect(meta.silver).toBe(10);
      expect(noticeMsg).toContain("Moedas insuficientes");
    });

    it("restaura a vida do grupo quando todos os membros estão vivos", () => {
      for (const m of run.party) {
        m.alive = true;
        m.hp = 10; // damaged
      }

      let noticeMsg = "";
      bus.on("notice", (m) => { noticeMsg = m; });

      const shrinePoi = { id: "test-shrine-heal", kind: "shrine" as const, x: engine.selected.x, y: engine.selected.y };
      engine.world.chunks.set("0,0", {
        key: "0,0",
        cx: 0,
        cy: 0,
        pois: [shrinePoi],
      } as any);

      engine.interact("test-shrine-heal");

      for (const m of run.party) {
        expect(m.hp).toBeGreaterThan(10);
      }
      expect(noticeMsg).toContain("restaurou a vida");
    });
  });

  describe("Comandos de Tropas Subordinadas", () => {
    it("ordens para membros afetam apenas tropas não controladas", () => {
      const leader = engine.selected;
      const initialLeaderOrder = leader.partyOrder;
      const companion = createCharacter("mage", "comp-sub", leader.x + 1, leader.y, 1);
      run.party.push(companion);

      // Assign hold order to companion
      engine.command({
        type: "memberOrder",
        memberId: companion.id,
        order: "hold",
      });

      expect(companion.partyOrder).toBe("hold");
      expect(leader.partyOrder).toBe(initialLeaderOrder);
    });
  });
});
